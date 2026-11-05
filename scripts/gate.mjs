// The un-piped gate. Every step's exit code is read directly from the child;
// the verdict is the last line and the process exit code.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.CI_PORT || 4186);
const BROWSER_PROJECTS = [
  "phone-portrait-430x932",
  "phone-portrait-390x844",
  "safari-iphone16promax-440x763",
  "safari-iphone14-390x664",
  "phone-portrait-375x667",
  "desktop-1440x900",
];

// The claims ledger goes first: an unsourced or unreviewed fact stops everything
// (the design notes). Only Kevin's review stamp turns it GREEN.
const steps = [
  ["claims ledger", "node", ["scripts/check-claims.mjs"]],
  ["claims RED proof", "node", ["scripts/check-claims.mjs", "--self-test"]],
  ["unit tests", "npx", ["vitest", "run"]],
  ["vite build", "npx", ["vite", "build"]],
  ["single file", "node", ["scripts/singlefile.mjs"]],
  ["scanner RED proof", "node", ["scripts/scan.mjs", "--self-test"]],
  ["scanner", "node", ["scripts/scan.mjs"]],
  ["conversation engine", "npx", ["vitest", "run", "tests/unit/counter-engine.test.js", "tests/unit/counter-trees.test.js", "tests/unit/counter-tiers.test.js", "tests/unit/counter-claims.test.js"]],
  // One Playwright project per step. A single 192-test run gets SIGKILL mid-suite on
  // this Mac (exit 128 with no failing assertion); each project alone stays green.
  // Gate holds one shared vite preview for all of them (see startPreview).
  ...BROWSER_PROJECTS.map((project) => [
    `browser ${project}`,
    "npx",
    ["playwright", "test", `--project=${project}`],
  ]),
];

export async function startPreview({ port = PORT, cwd = root, viteBin = path.join(cwd, "node_modules", "vite", "bin", "vite.js"), timeoutMs = 30_000 } = {}) {
  const child = spawn(
    process.execPath,
    [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
  );
  let output = "";
  let settled = false;
  let timer;
  const ready = new Promise((resolve, reject) => {
    child.once("error", (error) => reject(new Error(`could not start vite preview: ${error.message}`)));
    child.once("exit", (code, signal) => {
      if (!settled) reject(new Error(`vite preview exited before readiness (code ${code ?? "null"}, signal ${signal ?? "none"})${output ? `: ${output.trim()}` : ""}`));
    });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    const onOutput = (chunk) => {
      output += chunk;
      if (output.includes("Local:") && !settled) {
        settled = true;
        resolve(child);
      }
    };
    child.stdout.on("data", onOutput);
    child.stderr.on("data", (chunk) => { output += chunk; });
    timer = setTimeout(() => reject(new Error(`vite preview on ${port} did not become ready in ${timeoutMs}ms${output ? `: ${output.trim()}` : ""}`)), timeoutMs);
  });
  try {
    return await ready;
  } catch (error) {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode != null || child.signalCode != null) return resolve();
      child.once("exit", resolve);
      setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 2_000).unref();
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const only = process.argv.slice(2);
  const results = [];
  let preview = null;
  try {
    for (const [name, cmd, args] of steps) {
      if (only.length && !only.some((o) => name.includes(o))) continue;
      if (name.startsWith("browser ") && !preview) {
        preview = await startPreview();
      }
      const t0 = Date.now();
      const env = {
        ...process.env,
        CI: process.env.CI || "1",
        CI_PORT: String(PORT),
        ...(name.startsWith("browser ") ? { PLAYWRIGHT_REUSE_SERVER: "1" } : {}),
      };
      const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env });
      const code = r.status ?? (r.signal ? 128 : 1);
      results.push({ name, code, ms: Date.now() - t0 });
      console.log(`\n[gate] ${name}: ${code === 0 ? "PASS" : `FAIL (exit ${code})`} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
      if (code !== 0) break;
    }
  } catch (error) {
    results.push({ name: "preview startup", code: 1 });
    console.error(`[gate] preview startup: FAIL (${error.message})`);
  } finally {
    if (preview && preview.exitCode == null && preview.signalCode == null) {
      preview.kill("SIGTERM");
      await new Promise((resolve) => {
        preview.once("exit", resolve);
        setTimeout(() => { preview.kill("SIGKILL"); resolve(); }, 2_000).unref();
      });
    }
  }
  const failed = results.filter((r) => r.code !== 0);
  console.log("[gate] " + results.map((r) => `${r.name}=${r.code === 0 ? "PASS" : "FAIL"}`).join(" · "));
  console.log(failed.length ? `[gate] VERDICT: FAIL (${failed[0].name})` : "[gate] VERDICT: PASS");
  process.exitCode = failed.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
