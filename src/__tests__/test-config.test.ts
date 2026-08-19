import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vitest discovery isolation", () => {
  it("excludes linked worktrees while preserving Vitest defaults", () => {
    const configSource = fs.readFileSync(
      path.join(process.cwd(), "vite.config.mts"),
      "utf8",
    );

    expect(configSource).toContain("defaultExclude");
    expect(configSource).toContain('"**/.worktrees/**"');
  });
});
