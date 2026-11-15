import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPreview } from "../../scripts/gate.mjs";

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
