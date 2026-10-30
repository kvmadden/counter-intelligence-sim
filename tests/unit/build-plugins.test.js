import { describe, expect, it } from "vitest";
import { packageDir, packageOf, stripCommentLinks, stripLinks } from "../../scripts/vite-plugins.mjs";

describe("three.js link stripping", () => {
  it("rewrites links only inside comment bodies, and never swallows a comment's end", () => {
    const code = [
      "/* see http://example.invalid/a*/ const kept = 1;",
      "const glsl = `\n\t// https://example.invalid/paper\n\tvec3 x;`;",
      "document.createElementNS( 'http://www.w3.org/1999/xhtml', name );",
      'const address = "https://example.invalid/not-a-comment";',
    ].join("\n");
    const out = stripCommentLinks(code);
    expect(out).toContain("/* see (link removed)*/ const kept = 1;");
    expect(out).toContain("// (link removed)");
    expect(out).toContain("'http://www.w3.org/1999/xhtml'");
    expect(out).toContain('"https://example.invalid/not-a-comment"');
  });
});

describe("licence carrying", () => {
  it("names the package a module ships from", () => {
    expect(packageOf("/x/node_modules/three/build/three.module.js")).toBe("three");
    expect(packageOf("/x/node_modules/@fontsource/michroma/latin-400.css")).toBe("@fontsource/michroma");
    expect(packageOf("/x/src/counter/n64/post.js")).toBeNull();
  });

  it("reads a licence from the real package directory, even for Rollup's virtual CommonJS ids", () => {
    // React reaches Rollup as a "\0" id with a ?commonjs-module query; the first build
    // looked for its licence under that raw id and failed.
    expect(packageDir("\0/x/node_modules/react/index.js?commonjs-module")).toBe("/x/node_modules/react");
    expect(packageDir("/x/node_modules/@fontsource/michroma/latin-400.css")).toBe("/x/node_modules/@fontsource/michroma");
  });

  it("takes the links out of a licence and nothing else", () => {
    expect(stripLinks("Copyright 2011 The Michroma Project Authors (https://github.com/googlefonts/Michroma-font)")).toBe("Copyright 2011 The Michroma Project Authors");
    expect(stripLinks("with a FAQ at:\nhttp://scripts.sil.org/OFL\n\nPREAMBLE")).toBe("with a FAQ at:\n\n\nPREAMBLE");
  });
});
