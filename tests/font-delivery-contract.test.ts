import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Project root — resolves correctly under vitest. */
const ROOT = process.cwd();

/** Read a file relative to the project root. */
function read(name: string) {
  return fs.readFileSync(path.join(ROOT, name), "utf-8");
}

describe("font-delivery contract", () => {
  const globalStylesPath = "src/common/globalStyles.tsx";
  const stylesCssPath = "src/styles.css";
  const buttonPath = "src/components/Button.tsx";
  const indexPath = "index.html";

  const requiredWeights = [300, 400, 500, 600, 700];
  const fontUrl = "/fonts/roboto-condensed-latin-wght-normal.woff2";

  it("GlobalStyle does not contain any @import of Google fonts", () => {
    const content = read(globalStylesPath);
    expect(content).not.toMatch(/@import.*fonts\.googleapis\.com/i);
    expect(content).not.toMatch(/@import.*fonts\.gstatic\.com/i);
  });

  it("GlobalStyle enforces font-synthesis: none", () => {
    const content = read(globalStylesPath);
    expect(content).toMatch(/font-synthesis:\s*none/);
  });

  it("Button uses Roboto Condensed (not bare Roboto)", () => {
    const content = read(buttonPath);
    expect(content).toMatch(/font-family:.*"Roboto\s+Condensed"/i);
    // Reject a bare "Roboto" without "Condensed"
    expect(content).not.toMatch(/font-family:\s*"Roboto"[^C]/i);
  });

  it("index.html preloads the self-hosted font", () => {
    const content = read(indexPath);
    expect(content).toMatch(/rel="preload"/);
    expect(content).toMatch(/as="font"/);
    expect(content).toMatch(
      new RegExp('href="' + fontUrl.replace("/", "\\/") + '"'),
    );
  });

  it("styles.css @font-face points at the correct self-hosted URL", () => {
    const content = read(stylesCssPath);
    expect(content).toContain(`url("${fontUrl}")`);
  });

  it("styles.css @font-face uses the deliberate anti-swap optional display", () => {
    const content = read(stylesCssPath);
    expect(content).toMatch(/font-display:\s*optional/);
    expect(content).not.toMatch(/font-display:\s*swap/);
  });

  it("styles.css @font-face covers the full variable weight range 300-700", () => {
    const content = read(stylesCssPath);
    expect(content).toMatch(/font-weight:\s*300\s+700/);
  });

  it("styles.css @font-face declares normal/upright style (no italic)", () => {
    const content = read(stylesCssPath);
    expect(content).toMatch(/font-style:\s*normal/);
  });

  it(`all repository weights ${requiredWeights.join(", ")} fall inside the variable range`, () => {
    const content = read(stylesCssPath);
    const m = content.match(/font-weight:\s*(\d+)\s+(\d+)/);
    expect(m, "@font-face must declare a numeric weight range").toBeTruthy();

    const min = parseInt(m![1], 10);
    const max = parseInt(m![2], 10);
    for (const w of requiredWeights) {
      expect(w >= min && w <= max, `weight ${w} not in [${min}, ${max}]`).toBe(true);
    }
  });
});
