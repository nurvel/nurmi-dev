import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { applyTheme, THEME_STORAGE_KEY } from "../src/common/themePreference";

const html = readFileSync("index.html", "utf8");
function extractBootstrap(source: string): string {
  // Parse HTML rather than using a regex with narrower tag syntax.
  const dom = new JSDOM(source);
  try {
    const script = dom.window.document.querySelector("script:not([src]):not([type])");
    if (!script?.textContent) throw new Error("Theme bootstrap script is missing");
    return script.textContent;
  } finally {
    dom.window.close();
  }
}
const bootstrap = extractBootstrap(html);

describe("early theme bootstrap", () => {
  afterEach(() => vi.restoreAllMocks());
  it("extracts the bootstrap with HTML case-insensitive script tags", () => {
    const uppercaseTags = html.replaceAll("<script", "<SCRIPT").replaceAll("</script>", "</SCRIPT>");
    expect(extractBootstrap(uppercaseTags)).toBe(bootstrap);
  });
  it("loads an unbundled blocking palette before the bootstrap", () => {
    expect(html).toContain('<link rel="stylesheet" href="/theme.css" />');
    expect(html.indexOf('/theme.css')).toBeLessThan(html.indexOf('<script>'));
  });
  for (const saved of [null, "light", "dark", "invalid"]) {
    for (const system of ["light", "dark"] as const) {
      it(`resolves ${saved} with ${system} system before React`, () => {
        const dom = new JSDOM('<meta name="theme-color"><body></body>', { url: "https://example.test/", runScripts: "outside-only" });
        const w = dom.window;
        if (saved) w.localStorage.setItem(THEME_STORAGE_KEY, saved);
        Object.defineProperty(w, "matchMedia", { value: () => ({ matches: system === "dark" }) });
        Object.defineProperty(w, "getComputedStyle", { value: () => ({ getPropertyValue: () => w.document.documentElement.dataset.theme === "dark" ? "#151515" : "#fcfcfc" }) });
        w.eval(bootstrap);
        expect(w.document.documentElement.dataset.theme).toBe(saved === "light" ? "light" : "dark");
        dom.window.close();
      });
    }
  }
  it("defaults to dark before React even when storage and system APIs are unavailable", () => {
    const dom = new JSDOM('<meta name="theme-color">', { url: "https://example.test/", runScripts: "outside-only" });
    Object.defineProperty(dom.window, "localStorage", { get: () => { throw new Error("denied"); } });
    Object.defineProperty(dom.window, "matchMedia", { get: () => { throw new Error("unavailable"); } });
    Object.defineProperty(dom.window, "getComputedStyle", { value: () => ({ getPropertyValue: () => "#151515" }) });
    dom.window.eval(bootstrap);
    expect(dom.window.document.documentElement.dataset.theme).toBe("dark");
    dom.window.close();
  });

  it("uses the CSS background rather than an independent bootstrap color map", () => {
    const dom = new JSDOM('<meta name="theme-color"><body></body>', { url: "https://example.test/", runScripts: "outside-only" });
    Object.defineProperty(dom.window, "matchMedia", { value: () => ({ matches: true }) });
    Object.defineProperty(dom.window, "getComputedStyle", { value: () => ({ getPropertyValue: () => " #123456 " }) });
    dom.window.eval(bootstrap);
    expect(dom.window.document.querySelector('meta[name="theme-color"]')!.getAttribute("content")).toBe("#123456");
    dom.window.close();

  });
  it("reads the runtime theme-color from the same CSS background", () => {
    const meta = document.createElement("meta"); meta.name = "theme-color"; document.head.append(meta);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ getPropertyValue: () => " #654321 " } as unknown as CSSStyleDeclaration);
    applyTheme("dark");
    expect(meta.content).toBe("#654321");
    meta.remove();
  });
  it("survives denied storage during early initialization", () => {
    const dom = new JSDOM('<meta name="theme-color">', { url: "https://example.test/", runScripts: "outside-only" });
    Object.defineProperty(dom.window, "localStorage", { get: () => { throw new Error("denied"); } });
    Object.defineProperty(dom.window, "matchMedia", { value: () => ({ matches: true }) });
    Object.defineProperty(dom.window, "getComputedStyle", { value: () => ({ getPropertyValue: () => "#151515" }) });
    expect(() => dom.window.eval(bootstrap)).not.toThrow();
    expect(dom.window.document.documentElement.dataset.theme).toBe("dark");
    dom.window.close();
  });
});
