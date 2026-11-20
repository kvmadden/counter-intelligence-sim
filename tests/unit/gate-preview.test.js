import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPreviewReadyOutput, startPreview } from "../../scripts/gate.mjs";

const servers = [];
const testRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const viteBin = path.join(testRoot, "node_modules", "vite", "bin", "vite.js");
let fixtureRoot;

afterEach(async () => {
  for (const server of servers.splice(0)) {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
  if (fixtureRoot) await fs.rm(fixtureRoot, { recursive: true, force: true });
  fixtureRoot = undefined;
});

async function createPreviewFixture() {
  const workRoot = path.join(testRoot, "work");
  await fs.mkdir(workRoot, { recursive: true });
  fixtureRoot = await fs.mkdtemp(path.join(workRoot, "gate-preview-"));
  await fs.mkdir(path.join(fixtureRoot, "dist"));
  await fs.writeFile(path.join(fixtureRoot, "dist", "index.html"), "<!doctype html><title>owned preview</title>");
  return fixtureRoot;
}

async function freePort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

describe("gate preview ownership", () => {
  it("requires a complete, newline-ended Local URL for the requested preview port", () => {
    const colored = "\x1b[1m\x1b[36mLocal\x1b[39m\x1b[22m: \x1b[36mhttp://127.0.0.1:4186/\x1b[39m\n";
    expect(isPreviewReadyOutput(colored)).toBe(true);
    expect(isPreviewReadyOutput("  ➜  Local:   http://127.0.0.1:4186/\n")).toBe(true);
    expect(isPreviewReadyOutput("  ➜  Local:   http://127.0.0.1:4186/\r\n")).toBe(true);
    expect(isPreviewReadyOutput("  ➜  Local:   http://127.0.0.1:4186/")).toBe(false);
    expect(isPreviewReadyOutput("Local: http://127.0.0.1:4186/\n", 4187)).toBe(false);
    expect(isPreviewReadyOutput("Local: http://127.0.0.1:9/\n")).toBe(false);
    expect(isPreviewReadyOutput("Local: http://evil.example:4186/\n")).toBe(false);
    expect(isPreviewReadyOutput("Local: http://127.0.0.1:4186.evil.example/\n")).toBe(false);
    expect(isPreviewReadyOutput("Error: Local: http://127.0.0.1:4186/\n")).toBe(false);
    expect(isPreviewReadyOutput("\x1b[36mLocal\x1b[39m:\n")).toBe(false);
    expect(isPreviewReadyOutput("ready in 100 ms\n")).toBe(false);
  });

  it("waits for the launched Vite preview and returns its child", async () => {
    const port = await freePort();
    const cwd = await createPreviewFixture();
    const child = await startPreview({ port, cwd, viteBin });
    try {
      expect(child.exitCode).toBeNull();
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }, 15_000);

  it("recognizes ANSI-colored Vite readiness instead of timing out", async () => {
    const port = await freePort();
    const cwd = await createPreviewFixture();
    const fakeViteBin = path.join(cwd, "colored-preview.mjs");
    await fs.writeFile(
      fakeViteBin,
      String.raw`import http from "node:http";
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
http.createServer((_req, res) => res.end("colored preview")).listen(port, "127.0.0.1", () => {
  process.stdout.write("\u001b[1mLocal\u001b[22m: http://127.0.0.1:" + port + "/\n");
});`,
    );
    const child = await startPreview({ port, cwd, viteBin: fakeViteBin, timeoutMs: 3_000 });
    try {
      expect(child.exitCode).toBeNull();
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(await response.text()).toBe("colored preview");
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }, 8_000);
  it("recognizes an owned preview's readiness message on stderr", async () => {
    const port = await freePort();
    const cwd = await createPreviewFixture();
    const script = path.join(cwd, "stderr-preview.cjs");
    await fs.writeFile(script, [
      'const http = require("node:http");',
      'const port = Number(process.argv[process.argv.indexOf("--port") + 1]);',
      'http.createServer((_req, res) => res.end("owned stderr preview")).listen(port, "127.0.0.1", () => {',
      '  console.error("  ➜  Local: http://127.0.0.1:" + port + "/");',
      '});',
    ].join("\n"));
    const child = await startPreview({ port, cwd, viteBin: script, timeoutMs: 5_000 });
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("owned stderr preview");
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }, 12_000);

  it("rejects an occupied port even when its owner returns HTTP 200", async () => {
    const port = await freePort();
    const cwd = await createPreviewFixture();
    const fixture = http.createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("wrong server");
    });
    servers.push(fixture);
    await new Promise((resolve) => fixture.listen(port, "127.0.0.1", resolve));

    await expect(startPreview({ port, cwd, viteBin, timeoutMs: 5_000 })).rejects.toThrow(/exited before readiness/);
    expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toBe("wrong server");
  }, 10_000);
});
