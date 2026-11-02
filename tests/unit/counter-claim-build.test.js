import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { expect, it } from "vitest"

const root = fileURLToPath(new URL("../../", import.meta.url))

it("stops the production build before Vite for an unsourced or unreviewed claim", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "counter-claim-build-"))
  try {
    for (const entry of ["src", "scripts", "docs/claims", "package.json", "index.html", "vite.config.js"]) {
      fs.cpSync(path.join(root, entry), path.join(fixture, entry), { recursive: true })
    }
    fs.symlinkSync(path.join(root, "node_modules"), path.join(fixture, "node_modules"), "dir")
    const ledger = path.join(fixture, "src/counter/claims.js")
    const original = fs.readFileSync(ledger, "utf8")
    const build = () => spawnSync("npm", ["run", "build"], { cwd: fixture, encoding: "utf8", env: { ...process.env, NODE_ENV: "production" }, timeout: 60_000 })
    const clean = build()
    expect(clean.status, clean.stdout + clean.stderr).toBe(0)
    for (const [field, rule] of [["source", "unsourced claim"], ["reviewedBy", "unreviewed claim"], ["reviewedOn", "unreviewed claim"]]) {
      fs.rmSync(path.join(fixture, "dist"), { recursive: true, force: true })
      fs.writeFileSync(ledger, original.replace(new RegExp(`^    ${field}:.*\\n`, "m"), ""))
      const broken = build()
      expect(broken.status, `missing ${field}: ${broken.stdout}${broken.stderr}`).toBe(1)
      expect(broken.stderr).toContain(rule)
      expect(broken.stdout).not.toContain("building client")
      expect(fs.existsSync(path.join(fixture, "dist"))).toBe(false)
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
}, 120_000)
