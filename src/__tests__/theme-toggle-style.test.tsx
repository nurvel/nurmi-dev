import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import ThemeToggle from "../components/ThemeToggle";

it("keeps the theme toggle transparent on hover while preserving keyboard focus", () => {
  const sheet = new ServerStyleSheet();
  try {
    renderToString(sheet.collectStyles(<ThemeToggle />));
    const styles = sheet.getStyleTags();
    expect(styles).toContain("background:transparent;");
    expect(styles).not.toMatch(/:hover\s*\{[^}]*background/);
    expect(styles).toContain("cursor:pointer;");
    expect(styles).toMatch(/:focus-visible\s*\{[^}]*outline:2px solid var\(--color-focus\)/);
  } finally {
    sheet.seal();
  }
});
