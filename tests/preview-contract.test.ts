import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Project root — resolves correctly under vitest. */
const ROOT = process.cwd();

/** Read a file relative to the project root. */
function read(name: string) {
  return fs.readFileSync(path.join(ROOT, name), "utf-8");
}

describe("preview-parity contract", () => {
  it(".gitignore includes /dist so build output is not committed", () => {
    const gitignore = read(".gitignore");
    expect(gitignore.split("\n").some((l) => l.trim() === "/dist")).toBe(true);
  });

  it("package.json defines prepreview lifecycle hook", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.prepreview).toBe("npm run build");
  });

  it("package.json retains preview, predeploy, and deploy scripts", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.preview).toBe("vite preview");
    expect(pkg.scripts.predeploy).toBe("npm run build");
    expect(pkg.scripts.deploy).toBe("gh-pages -d dist");
  });

  it("package.json defines preview:check script pointing to verifier", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["preview:check"]).toBe("node scripts/verify-preview.mjs");
  });

  it("scripts/verify-preview.mjs exists and has the expected entry point", () => {
    const script = read("scripts/verify-preview.mjs");
    expect(script.includes("main()")).toBe(true);
    // Must not import external deps — only Node builtins allowed
    const importLines = script.match(/^import .* from "([^"]+)"/gm) || [];
    for (const line of importLines) {
      const mod = line.match(/from "([^"]+)"/)?.[1];
      if (mod) {
        expect(mod).toMatch(/^(node:)?(fs|child_process|path|http|os|url|net|util)/);
      }
    }
  });

  it("dist/ is not tracked by git", async () => {
    const { execFile } = await import("node:child_process");
    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        "git",
        ["ls-files", "dist/"],
        { cwd: ROOT },
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout.trim());
        }
      );
    });
    expect(result).toBe("");
  });

  it("README documents the supported preview command", () => {
    const readme = read("README.md");
    expect(readme).toContain("npm run preview");
    expect(readme).toContain("npm run preview:check");
    // Should explain why backgrounding is unsupported
    expect(readme).toMatch(/racy|race/i);
  });
});
