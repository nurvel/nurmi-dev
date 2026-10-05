import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routes = [
  ["/docs/", "Dokumentaatio"],
  ["/docs/hermes-integrations/", "Hermes Integrations"],
  ["/docs/hermes-integrations/privacy/", "Tietosuoja"],
  ["/docs/hermes-integrations/terms/", "Käyttöehdot"],
] as const;
const root = process.cwd();
const fileFor = (route: string) => path.join(root, "public", route, "index.html");

// These pages deliberately do not boot the About SPA or its tracking code.
describe("public documentation", () => {
  it.each(routes)("serves a standalone noindex document at %s", (route, title) => {
    const file = fileFor(route);
    expect(fs.existsSync(file), `Missing static document: ${route}`).toBe(true);
    const html = fs.readFileSync(file, "utf8");
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.documentElement.lang).toBe("fi");
    expect(document.title).toContain(title);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://nurmi.dev${route}`);
    expect(document.querySelectorAll("script, iframe, form, img")).toHaveLength(0);
    expect(html).not.toMatch(/TODO|\[REDACTED\]|\/home\/hermes|julkaisematon luonnos/i);
    expect(document.querySelector('link[rel="stylesheet"]')?.getAttribute("href")).toBe("/docs/styles.css");
    expect(fs.existsSync(path.join(root, "public/docs/styles.css"))).toBe(true);

    const links = [...document.querySelectorAll("a[href]")];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href")!;
      if (href.startsWith("/docs/")) {
        expect(routes.map(([url]) => url), `Unexpected docs route: ${href}`).toContain(href);
        expect(fs.existsSync(fileFor(href)), `Broken docs link: ${href}`).toBe(true);
      }
    }
    expect(fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8")).not.toContain(route);
  });
});
