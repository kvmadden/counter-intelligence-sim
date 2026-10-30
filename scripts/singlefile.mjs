// Folds the Vite build into one HTML file: dist/counter-intelligence.html. Fonts and
// already data URIs (assetsInlineLimit), so only the JS and CSS get inlined.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const OUT = path.join(dist, "counter-intelligence.html");

let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const read = (rel) => fs.readFileSync(path.join(dist, rel.replace(/^\.?\//, "")), "utf8");

let scripts = 0;
html = html.replace(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)><\/script>/g, (m, a, src) => {
  scripts += 1;
  const js = read(src).replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
let styles = 0;
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  styles += 1;
  return `<style>${read(href)}</style>`;
});
if (scripts === 0 || styles === 0) { console.error(`singlefile: expected a script and a stylesheet, got ${scripts}/${styles}`); process.exit(1); }
if (/<script[^>]+src=|<link[^>]+href=/i.test(html)) { console.error("singlefile: an external reference survived"); process.exit(1); }
fs.writeFileSync(OUT, html);
console.log(`singlefile: dist/counter-intelligence.html ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB (${scripts} script, ${styles} stylesheet inlined)`);
