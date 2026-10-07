import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readJson = (file: string) =>
  JSON.parse(readFileSync(path.join(root, file), "utf8"));

describe("test toolchain Node support", () => {
  it("declares the Node range required by the installed Vitest toolchain", () => {
    const manifest = readJson("package.json");
    const lock = readJson("package-lock.json");
    const vitest = readJson("node_modules/vitest/package.json");

    expect(manifest.engines.node).toBe(vitest.engines.node);
    expect(lock.packages[""].engines.node).toBe(manifest.engines.node);
  });
});
