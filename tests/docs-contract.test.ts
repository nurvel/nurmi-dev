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

describe("owner-only on-demand Drive disclosure", () => {
  it.each(routes.slice(1))("distinguishes optional tools, broad scope and activation at %s", (route) => {
    const document = new DOMParser().parseFromString(fs.readFileSync(fileFor(route), "utf8"), "text/html");
    const section = document.querySelector('section[aria-labelledby="drive-tools"]');
    expect(section, "Missing on-demand Drive disclosure").not.toBeNull();
    const text = section!.textContent!.replace(/\s+/g, " ").trim();
    expect(text).toMatch(/when enabled/i);
    expect(text).toContain("all files accessible to the account");
    expect(text).toContain("owner");
    expect(text).toContain("Publication does not activate");
    expect([...section!.querySelectorAll("code")].map((node) => node.textContent)).toContain("https://www.googleapis.com/auth/drive");
    expect(text).not.toMatch(/tool is active|pilot is not activated/i);

    const history = document.querySelector('section[aria-labelledby="drive-read-history"]')?.textContent;
    expect(history).toContain("earlier local-only read pilot");
    expect(history).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(history).toContain("does not grant write");

    if (route.endsWith("/privacy/")) {
      expect(text).toContain("OpenAI");
      expect(text).toContain("individually requested task");
      expect(text).toContain("conversation history");
      expect(text).toContain("not been verified");
      expect(text).toContain("before transferring Drive data");
      expect(text).toContain("does not promise automatic deletion");
      expect(text).toContain("encrypted credential storage");
    }
    if (route === "/docs/integrations/google/") {
      expect(text).toContain("deletion and sharing");
      expect(text).toContain("1 MiB");
      expect(text).toContain("named copies");
      expect(text).toContain("inherited");
      expect(document.body.textContent).toContain("https://www.googleapis.com/auth/webmasters.readonly");
      expect(document.body.textContent).toContain("https://www.googleapis.com/auth/tagmanager.readonly");
    }
  });
});

describe("planned owner-only Gmail, Calendar and Tasks disclosure", () => {
  it.each(routes.slice(1))("keeps personal use conditional and request-scoped at %s", (route) => {
    const document = new DOMParser().parseFromString(fs.readFileSync(fileFor(route), "utf8"), "text/html");
    const section = document.querySelector('section[aria-labelledby="personal-tools"]');
    expect(section, "Missing personal-service disclosure").not.toBeNull();
    const text = section!.textContent!.replace(/\s+/g, " ").trim();
    expect(text).toMatch(/when separately enabled/i);
    for (const service of ["Gmail", "Calendar", "Tasks"]) expect(text).toContain(service);
    expect(text).toContain("individually requested task");
    expect(text).toContain("OpenAI");
    expect(text).toContain("Publication does not activate");
    expect(text).toContain("Keep is excluded");
    expect(text).not.toMatch(/connections are active|permanent access|guaranteed renewal/i);
    if (route === "/docs/integrations/google/") {
      expect([...section!.querySelectorAll("code")].map((node) => node.textContent)).toEqual([
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/tasks",
      ]);
      expect(text).toContain("technically permit event and task deletion");
      expect(text).toContain("do not authorize deletion");
    }
    if (route.endsWith("/privacy/")) {
      expect(text).toContain("before transferring personal-service data");
      expect(text).toContain("have not been verified");
      expect(text).toContain("no plaintext token-file fallback");
      expect(text).toContain("conversation history");
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
