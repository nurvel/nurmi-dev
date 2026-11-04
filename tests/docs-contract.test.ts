import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routes = [
  ["/docs/", "Documentation"],
  ["/docs/integrations/google/", "Aito Nurmi Integrations"],
  ["/docs/integrations/google/privacy/", "Privacy Policy"],
  ["/docs/integrations/google/terms/", "Terms of Use"],
] as const;
const root = process.cwd();
const fileFor = (route: string) => path.join(root, "public", route, "index.html");

describe("planned Drive pilot disclosure", () => {
  it.each(routes.slice(1))("keeps the pilot inactive and accurately bounded at %s", (route) => {
    const html = fs.readFileSync(fileFor(route), "utf8");
    const document = new DOMParser().parseFromString(html, "text/html");
    const section = document.querySelector('section[aria-labelledby="drive-pilot"]');
    expect(section, "Missing planned-pilot disclosure").not.toBeNull();
    const text = section!.textContent!.replace(/\s+/g, " ").trim();

    expect(text).toContain("not activated");
    expect(text).toContain("all files accessible to the account");
    expect(text).toContain("does not grant write");
    expect(text).toMatch(/before activation/i);
    expect(text).toContain("owner");
    expect(text).toContain("local");
    expect(section!.querySelector("code")?.textContent).toBe("https://www.googleapis.com/auth/drive.readonly");

    if (route.endsWith("/privacy/")) {
      expect(text).toContain("file names, contents and account metadata must not be supplied to a cloud model");
      expect(text).toContain("operational pass/fail results");
      expect(text).toContain("encrypted credential storage");
      expect(text).toContain("logging and error output");
      expect(text).toContain("not a claim that these checks have already passed");
    }
  });
});

// These pages deliberately do not boot the About SPA or its tracking code.
describe("public documentation", () => {
  it.each(routes)("serves a standalone noindex document at %s", (route, title) => {
    const file = fileFor(route);
    expect(fs.existsSync(file), `Missing static document: ${route}`).toBe(true);
    const html = fs.readFileSync(file, "utf8");
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toContain(title);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll('nav, [role="navigation"]')).toHaveLength(0);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://nurmi.dev${route}`);
    expect(document.querySelectorAll("script, iframe, form, img")).toHaveLength(0);
    expect(html).not.toMatch(/TODO|\[REDACTED\]|\/home\/hermes|julkaisematon luonnos/i);
    expect(document.querySelector('link[rel="stylesheet"]')?.getAttribute("href")).toBe("/docs/styles.css");
    expect(fs.existsSync(path.join(root, "public/docs/styles.css"))).toBe(true);

    const links = [...document.querySelectorAll("a[href]")];
    expect(links.length).toBeGreaterThan(0);
    const documentLinks = links
      .map((link) => link.getAttribute("href")!)
      .filter((href) => href.startsWith("/docs/"));
    const expectedDocumentLinks: Record<string, string[]> = {
      "/docs/": ["/docs/integrations/google/"],
      "/docs/integrations/google/": [
        "/docs/integrations/google/privacy/",
        "/docs/integrations/google/terms/",
      ],
      "/docs/integrations/google/privacy/": ["/docs/integrations/google/"],
      "/docs/integrations/google/terms/": ["/docs/integrations/google/privacy/"],
    };
    expect(documentLinks).toEqual(expectedDocumentLinks[route]);
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
