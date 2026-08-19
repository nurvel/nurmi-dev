import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (name: string) => fs.readFileSync(path.join(ROOT, name), "utf8");

describe("SEO contract", () => {
  it("publishes canonical and social metadata for the production origin", () => {
    const html = read("index.html");

    expect(html).toContain('<link rel="canonical" href="https://nurmi.dev/" />');
    expect(html).toContain('<meta property="og:url" content="https://nurmi.dev/" />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).toContain('"@type": "Person"');
  });

  it("publishes a sitemap for the production origin", () => {
    const sitemap = read("public/sitemap.xml");

    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("<loc>https://nurmi.dev/</loc>");
  });

  it("advertises the sitemap to crawlers", () => {
    expect(read("public/robots.txt")).toContain(
      "Sitemap: https://nurmi.dev/sitemap.xml",
    );
  });
});
