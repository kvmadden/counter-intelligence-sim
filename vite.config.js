import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { carryLicenses, stripThreeLinks } from "./scripts/vite-plugins.mjs";

// One JS chunk, one CSS file, fonts inlined as data URIs: the single-file edition
// (scripts/singlefile.mjs) only has to fold two files into index.html, and the
// scanner (scripts/scan.mjs) checks source literals and rejects network calls.
export default defineConfig({
  plugins: [react(), stripThreeLinks(), carryLicenses()],
  base: "./",
  build: {
    target: "es2020",
    assetsInlineLimit: 2500000,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{js,jsx}"],
  },
});
