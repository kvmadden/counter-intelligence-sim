// Build plugins for the standalone edition, kept out of vite.config.js so their
// pure helpers can be unit-tested (tests/unit/build-plugins.test.js).
import fs from "node:fs";
import path from "node:path";

// three.js keeps reference links in the comments of its GLSL chunks and a few JS
// comments. They are never fetched, but the bundle scanner fails closed on any URL
// so the links are removed from three's source text instead,
// and only inside comment bodies: the link pattern cannot contain `*`, so it can
// never swallow a `*/` and silently comment out the code after it. The XHTML
// namespace three passes to createElementNS (www.w3.org) is left alone.
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g;
const LINK = /https?:\/\/(?!www\.w3\.org\/)[^\s'"`)\]\\*]+/g;
export const stripCommentLinks = (code) => code.replace(COMMENT, (comment) => comment.replace(LINK, "(link removed)"));

export function stripThreeLinks() {
  return {
    name: "counter:strip-three-links",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/node_modules/three/")) return null;
      const next = stripCommentLinks(code);
      return next === code ? null : { code: next, map: null };
    },
  };
}

// Module ids can be virtual (a "\0" prefix) or carry a query ("?commonjs-module");
// reduce one to the file it stands for.
const fileOf = (id) => id.replace(/^\0/, "").split("?")[0];

// The npm package a module id belongs to, or null for our own source.
export function packageOf(id) {
  const file = fileOf(id);
  const at = file.lastIndexOf("/node_modules/");
  if (at === -1) return null;
  const parts = file.slice(at + "/node_modules/".length).split("/");
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

// Licence text with its links taken out (this edition is offline, and the scanner
// rejects any URL); nothing else is changed.
export const stripLinks = (text) =>
  text
    .replace(/\s*\(\s*https?:\/\/[^\s)]*\s*\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]+$/gm, "");

const asComment = (title, sections) =>
  `/*! ${title}\n${sections
    .map(({ heading, text }) => ` *\n * ${heading}\n *\n${text.replaceAll("*/", "* /").split("\n").map((line) => ` * ${line}`.trimEnd()).join("\n")}`)
    .join("\n")}\n */`;

// The directory of the npm package a module id ships from.
export function packageDir(id, pkg = packageOf(id)) {
  const file = fileOf(id);
  return file.slice(0, file.lastIndexOf("/node_modules/") + "/node_modules/".length) + pkg;
}

function readLicense(id, pkg) {
  const dir = packageDir(id, pkg);
  for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "license"]) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  }
  throw new Error(`carry-licenses: ${pkg} ships in the bundle but has no LICENSE file`);
}

// Licences travel with the build, whole. Rollup drops file-level comments, so this
// writes them once: at the head of the JS, the legal comments of our own source
// (the MIT dither port) and the full LICENSE text of every npm package whose code
// ships in the chunk; at the head of the CSS, the SIL Open Font License notice of
// every bundled font, each font's copyright with the licence body once.
export function carryLicenses() {
  const LEGAL = /\/\*(?:!|[*\s]*@license)[\s\S]*?\*\//g;
  const ownNotices = new Map();
  return [
    {
      name: "counter:collect-licenses",
      enforce: "pre",
      transform(code, id) {
        if (id.includes("/node_modules/") || !/\.[cm]?jsx?$/.test(id.split("?")[0])) return null;
        const found = code.match(LEGAL);
        if (found) ownNotices.set(id, found);
        return null;
      },
    },
    {
      // generateBundle runs after minification, so nothing can strip these again.
      name: "counter:emit-licenses",
      enforce: "post",
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== "chunk") continue;
          const entries = Object.entries(chunk.modules);
          const shipped = entries.filter(([, module]) => module.renderedLength > 0).map(([id]) => id);
          const own = [...new Set(shipped.flatMap((id) => ownNotices.get(id) ?? []))];
          const byText = new Map();
          for (const id of shipped) {
            const pkg = packageOf(id);
            if (!pkg || [...byText.values()].some((names) => names.has(pkg))) continue;
            const text = stripLinks(readLicense(id, pkg));
            byText.set(text, (byText.get(text) ?? new Set()).add(pkg));
          }
          const packages = [...byText].map(([text, names]) => ({ heading: `${[...names].sort().join(", ")}:`, text }));
          if (packages.length) own.push(asComment("Third-party licences, carried whole (links removed: this edition is offline).", packages));
          if (own.length) chunk.code = `${own.join("\n")}\n${chunk.code}`;
          const fonts = [...new Set(entries.map(([id]) => packageOf(id)).filter((pkg) => pkg?.startsWith("@fontsource/")))].sort();
          if (!fonts.length) continue;
          const firstId = new Map(entries.map(([id]) => [packageOf(id), id]));
          const bodies = new Set();
          const holders = fonts.map((pkg) => {
            const text = stripLinks(readLicense(firstId.get(pkg), pkg));
            const split = text.indexOf("-----------------------------------------------------------");
            bodies.add((split === -1 ? text : text.slice(split)).trim());
            return { heading: `${pkg}:`, text: (split === -1 ? "" : text.slice(0, split)).trim() };
          });
          const notice = asComment("Bundled fonts: SIL Open Font License 1.1 notices (links removed: this edition is offline).", [...holders, ...[...bodies].map((text) => ({ heading: "The licence, as it applies to every font above:", text }))]);
          for (const asset of Object.values(bundle)) {
            if (asset.type === "asset" && asset.fileName.endsWith(".css")) asset.source = `${notice}\n${asset.source}`;
          }
        }
      },
    },
  ];
}
