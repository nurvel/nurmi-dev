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
  expect(css).toContain("--nurmi-coin-motion-easing: cubic-bezier(0.4, 0.2, 0.6, 0.8);");
  for (const theme of ["dark", "light"]) {
    expect(css).toContain(`animation: nurmi-coin-to-${theme} var(--nurmi-coin-motion-duration)`);
  }
  expect(css).toContain("@keyframes nurmi-toggle-hold");
  expect(css).toContain("animation: nurmi-toggle-hold var(--nurmi-coin-motion-duration) linear both;");
  expect(css).toContain("--nurmi-theme-motion-duration: 520ms;");
});

it("fades the leaf faces without flattening the rotating 3D container", async () => {
  const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
  for (const theme of ["dark", "light"]) {
    const rotation = css.match(new RegExp(`@keyframes nurmi-coin-to-${theme} \\{([\\s\\S]*?)\\n\\}`))?.[1];
    expect(rotation).toBeDefined();
    expect(rotation).not.toContain("opacity:");
  }
  expect(css).toContain("@keyframes nurmi-coin-fade");
  expect(css.match(/@keyframes nurmi-coin-fade \{([\s\S]*?)\n\}/)?.[1])
    .toContain("45%, 55% { opacity: 0.3; }");
  const fadeApplications = css.match(/nurmi-coin-fade var\(--nurmi-coin-motion-duration\)/g);
  expect(fadeApplications).toHaveLength(2);
});

it("keeps the coin visibly moving during the final 100 milliseconds", async () => {
  const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
  const curve = css.match(/--nurmi-coin-motion-easing: cubic-bezier\(([^)]+)\)/)?.[1];
  expect(curve).toBeDefined();
  const [x1, y1, x2, y2] = curve!.split(",").map(Number);
  const cubic = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  for (const [time, minimumAngle] of [[1000, 20], [1050, 8]]) {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i += 1) {
      const mid = (low + high) / 2;
      if (cubic(mid, x1, x2) < time / 1100) low = mid;
      else high = mid;
    }
    const remainingDegrees = 540 * (1 - cubic((low + high) / 2, y1, y2));
    expect(remainingDegrees).toBeGreaterThanOrEqual(minimumAngle);
  }
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
      .toContain("animation: nurmi-coin-face-out var(--nurmi-coin-motion-duration) steps(1, end) both,");
    expect(rule(`html[data-theme-transition="active"][data-theme="${theme}"] .${incoming}`))
      .toContain("animation: nurmi-coin-face-in var(--nurmi-coin-motion-duration) steps(1, end) both,");
  }
  expect(css).toContain("backface-visibility: visible;");
});
