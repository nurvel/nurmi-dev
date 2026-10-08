import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

it("declares a bottom-up reveal and separate two-sided coin animations", async () => {
  const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
  expect(css).toContain("@keyframes nurmi-theme-reveal");
  expect(css).toContain("from { clip-path: inset(100% 0 0 0); }");
  expect(css).toContain("to { clip-path: inset(0 0 0 0); }");
  expect(css).toContain("::view-transition-new(root)");
  expect(css).toContain("@keyframes nurmi-coin-to-dark");
  expect(css).toContain("@keyframes nurmi-coin-to-light");
  expect(css).toContain("rotateY(540deg)");
  expect(css).toContain("rotateY(720deg)");
  expect(css).toContain("520ms");
  expect(css).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
});
