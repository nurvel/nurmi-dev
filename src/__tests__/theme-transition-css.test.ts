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

it("gives the coin a longer fade and keeps its transition alive until it settles", async () => {
  const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
  expect(css).toContain("--nurmi-coin-motion-duration: 1100ms;");
  expect(css).toContain("--nurmi-coin-motion-easing: cubic-bezier(0.4, 0, 0.2, 1);");
  for (const theme of ["dark", "light"]) {
    const keyframes = css.match(new RegExp(`@keyframes nurmi-coin-to-${theme} \\{([\\s\\S]*?)\\n\\}`))?.[1];
    expect(keyframes).toContain("opacity: 1;");
    expect(keyframes).toContain("45%, 55% { opacity: 0.3; }");
    expect(css).toContain(`animation: nurmi-coin-to-${theme} var(--nurmi-coin-motion-duration)`);
  }
  expect(css).toContain("@keyframes nurmi-toggle-hold");
  expect(css).toContain("animation: nurmi-toggle-hold var(--nurmi-coin-motion-duration) linear both;");
  expect(css).toContain("--nurmi-theme-motion-duration: 520ms;");
});

it("switches the displayed face once at the time midpoint instead of alternating during turns", async () => {
  const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
  expect(css).toContain("@keyframes nurmi-coin-face-out");
  expect(css).toContain("0% { visibility: visible; }");
  expect(css).toContain("50%, 100% { visibility: hidden; }");
  expect(css).toContain("@keyframes nurmi-coin-face-in");
  expect(css).toContain("0% { visibility: hidden; }");
  expect(css).toContain("50%, 100% { visibility: visible; }");
  const rule = (selector: string) => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)) + 1);
  for (const [theme, outgoing, incoming] of [["dark", "sun", "moon"], ["light", "moon", "sun"]]) {
    expect(rule(`html[data-theme-transition="active"][data-theme="${theme}"] .${outgoing}`))
      .toContain("animation: nurmi-coin-face-out var(--nurmi-coin-motion-duration) steps(1, end) both;");
    expect(rule(`html[data-theme-transition="active"][data-theme="${theme}"] .${incoming}`))
      .toContain("animation: nurmi-coin-face-in var(--nurmi-coin-motion-duration) steps(1, end) both;");
  }
  expect(css).toContain("backface-visibility: visible;");
});
