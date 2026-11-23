import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "node_modules" || name === ".next") return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sources = ["app", "components"]
  .flatMap((d) => walk(path.join(root, d)))
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => ({ file: path.relative(root, f), src: readFileSync(f, "utf8") }));

const isClient = (src: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(src);

describe("server / client boundary", () => {
  it("server files get buttonVariants from button-variants, never from the client button module", () => {
    // button.tsx is a client module: calling its exports from a server component throws at runtime,
    // and `next build` does not catch it for dynamic pages.
    const bad = sources
      .filter(({ src }) => !isClient(src))
      .filter(({ src }) => /import\s*\{[^}]*\bbuttonVariants\b[^}]*\}\s*from\s*["']@\/components\/ui\/button["']/.test(src))
      .map(({ file }) => file);
    expect(bad).toEqual([]);
  });
});
