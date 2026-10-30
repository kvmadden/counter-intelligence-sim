import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { counterTheme } from "../../src/counter/theme.js";

// Kevin ruled 2026-09-15 that the game is unbranded: no madden-tokens, no IBM
// Plex, and every colour and face defined once, as tokens, in theme.js.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (file) => path.relative(root, file);
const read = (file) => fs.readFileSync(file, "utf8");
const THEME = path.join(root, "src/counter/theme.js");
// Comments may name what the code must not use; only code counts. Line comments are
// removed only when they start a line or follow whitespace, so "a//b" in a string stays.
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/\s.*$/gm, "");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

// Every source file the game ships: the import graph from the entry point. The
// Phoenix provenance source elsewhere in src/ is never imported, so it is not
// here; the moment anything imports it, it is scanned like everything else.
function shippedSources(entry = path.join(root, "src/main.jsx")) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !/\.(jsx?|css)$/.test(file)) return;
    seen.add(file);
    // Static imports, re-exports, dynamic import() and CSS @import all count.
    for (const [, spec] of read(file).matchAll(/(?:\bimport\s+(?:[\w{}\s,*]+\s+from\s+)?|\bexport\s+(?:[\w{}\s,*]+\s+)?from\s+|\bimport\s*\(\s*|@import\s+)["'](\.[^"']+)["']/g)) {
      const target = path.resolve(path.dirname(file), spec);
      const found = [target, `${target}.js`, `${target}.jsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!found) throw new Error(`${rel(file)} imports ${spec}, which does not resolve`);
      visit(found);
    }
  };
  visit(entry);
  return [...seen];
}

const SOURCES = shippedSources();
const CSS = SOURCES.filter((file) => file.endsWith(".css"));

describe("one palette and one type system, all in theme.js (Kevin, 2026-09-15: unbranded)", () => {
  it("walks the whole shipped source graph, and none of the Phoenix provenance source", () => {
    const names = SOURCES.map(rel);
    expect(names.length, "shipped source files").toBeGreaterThanOrEqual(20);
    for (const file of ["src/main.jsx", "src/counter/theme.js", "src/counter/FileScreens.jsx", "src/counter/files.css", "src/counter/styles.css", "src/counter/n64/stage.js"]) {
      expect(names, file).toContain(file);
    }
    for (const file of ["src/App.jsx", "src/palette.js", "src/styles.css"]) expect(names, file).not.toContain(file);
  });

  it("sees every code file under src/counter, so none can slip past these checks", () => {
    const names = SOURCES.map(rel);
    const onDisk = walk(path.join(root, "src/counter")).filter((file) => /\.(jsx?|css)$/.test(file)).map(rel);
    expect(onDisk.length, "code files under src/counter").toBeGreaterThanOrEqual(20);
    expect(onDisk.filter((file) => !names.includes(file)), "not reached from src/main.jsx").toEqual([]);
  });

  it("keeps every colour literal in theme.js", () => {
    const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b0x[0-9a-fA-F]{6}\b/;
    const NAMED_IN_CSS = /(?:^|[\s:,(])(?:white|black|red|green|blue|yellow|orange|purple|pink|gr[ae]y|silver|maroon|navy|teal|brown|gold|beige|tan)(?=[\s;,)!]|$)/im;
    // In components a named colour only counts as a style or SVG paint value, so the
    // arcs' tone="orange" (which picks --enc-arc-orange-* from theme.js) is not one.
    const NAMED_IN_JS = /\b(?:color|background(?:Color)?|fill|stroke|stopColor|borderColor|outlineColor)\s*[:=]\s*\{?\s*["'](?:white|black|red|green|blue|yellow|orange|purple|pink|gr[ae]y|silver|maroon|navy|teal|brown|gold|beige|tan)["']/i;
    const offenders = SOURCES.filter((file) => file !== THEME).flatMap((file) => {
      const text = code(file);
      const hit = text.match(COLOUR) ?? text.match(file.endsWith(".css") ? NAMED_IN_CSS : NAMED_IN_JS);
      return hit ? [`${rel(file)}: ${hit[0].trim()}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it("names a typeface only through the theme's tokens", () => {
    for (const file of CSS) {
      const css = code(file);
      for (const [, value] of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) expect(value.trim(), rel(file)).toMatch(/^(?:var\(--[\w-]+\)|inherit)$/);
      for (const [, value] of css.matchAll(/(?<![-\w])font\s*:\s*([^;}]+)/g)) expect(value.trim(), rel(file)).toBe("inherit");
    }
    for (const file of SOURCES.filter((source) => source !== THEME)) {
      expect(code(file), rel(file)).not.toMatch(/Michroma|Oxanium|Share Tech|IBM|Arial|Helvetica|Roboto|system-ui|monospace|sans-serif|fontFamily/);
    }
  });

  it("carries no house style: no IBM Plex, no madden-tokens, only the three bundled OFL faces", () => {
    const pkg = JSON.parse(read(path.join(root, "package.json")));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((dep) => /ibm-plex|madden-tokens/i.test(dep))).toEqual([]);
    expect(read(path.join(root, "package-lock.json")), "nor in the lockfile").not.toMatch(/ibm-plex|madden-tokens/i);
    const fonts = deps.filter((dep) => dep.startsWith("@fontsource/")).sort();
    expect(fonts).toEqual(["@fontsource/michroma", "@fontsource/oxanium", "@fontsource/share-tech-mono"]);
    const imported = new Set([...read(path.join(root, "src/main.jsx")).matchAll(/["'](@fontsource\/[\w-]+)\//g)].map(([, name]) => name));
    expect([...imported].sort()).toEqual(fonts);
    for (const file of SOURCES) expect(code(file), rel(file)).not.toMatch(/IBM\s*Plex|ibm-plex|madden-tokens/i);
    // The frozen legacy colours went with the screens that used them.
    expect(read(THEME)).not.toMatch(/\blegacy\b/);
    for (const key of ["--ci-page", "--ci-paper-soft", "--ci-border-soft", "--ci-green", "--ci-blue", "--ci-teal", "--ci-red", "--ci-base", "--ci-muted"]) {
      expect(Object.keys(counterTheme), key).not.toContain(key);
    }
  });

  it("defines every custom property the styles and components read", () => {
    const all = SOURCES.map(code).join("\n");
    const defined = new Set([
      ...Object.keys(counterTheme),
      ...[...all.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name),
      ...[...all.matchAll(/["'](--[\w-]+)["']\s*:/g)].map(([, name]) => name),
    ]);
    // A name built in a template (`--enc-arc-${tone}-${index}`) ends in "-" here; theme.js defines those.
    const used = new Set([...all.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name).filter((name) => !name.endsWith("-")));
    expect(used.size, "custom properties read").toBeGreaterThan(40);
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });

  it("eases without bounce or spring: every curve stays between its start and its end", () => {
    const css = CSS.map(code).join("\n");
    const curves = [...css.matchAll(/cubic-bezier\(\s*([^)]+)\)/g)].map(([, args]) => args.split(",").map(Number));
    expect(curves.length, "curves found").toBeGreaterThan(0);
    for (const [, y1, , y2] of curves) {
      for (const y of [y1, y2]) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
    expect(css).not.toMatch(/\b(?:bounce|spring|elastic|overshoot)\b/i);
  });
});
