import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
const ROOT=process.cwd();
const read=(name:string)=>fs.readFileSync(path.join(ROOT,name),"utf-8");
describe("first-party font delivery contract",()=>{
 const globalStyles=read("src/common/globalStyles.tsx");
 it("declares self-hosted Inter, Space Grotesk and Caveat with synthesis disabled",()=>{
  for(const family of ["Inter","Space Grotesk","Caveat"]) expect(globalStyles).toContain(`font-family:${family==='Space Grotesk'?"'Space Grotesk'":family}`);
  expect(globalStyles).toMatch(/font-synthesis:none/);
  expect(globalStyles).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
 });
 it("preloads all three first-party faces with deliberate anti-swap display",()=>{
  for (const font of ["inter-latin-wght-normal", "space-grotesk-latin-wght-normal", "caveat-latin-600-normal"]) {
   expect(read("index.html")).toContain(`/fonts/${font}.woff2`);
   expect(globalStyles).toContain(`/fonts/${font}.woff2`);
  }
  expect(globalStyles.match(/font-display:optional/g)).toHaveLength(3);
  expect(globalStyles).not.toContain("font-display:swap");
  expect(globalStyles).toContain("font-weight:100 900");
  expect(globalStyles).toContain("font-weight:300 700");
  expect(globalStyles).toContain("font-weight:600");
 });
 it("combines documented byte hashes with cold-load CDP and cleanup verification",()=>{
  const script=read("scripts/verify-font-delivery.mjs");
  expect(script).toContain("createHash");
  expect(script).toContain("new URL(value).hostname.toLowerCase()");
  expect(script).toContain("GOOGLE_FONT_HOSTS");
  expect(script).toContain("Page.addScriptToEvaluateOnNewDocument");
  expect(script).toContain("Network.setBlockedURLs");
  expect(script).toContain("layout-shift");
  expect(script).toContain("first-party-inter-space-grotesk-caveat-cold-load-v1");
  expect(script).toContain("browserProfilesRemoved");
  for(const family of ["Inter","Space Grotesk","Caveat"]) expect(script).toContain(family);
 });
 it("vendors three Latin font files and licenses",()=>{
  for(const f of ["inter-latin-wght-normal.woff2","space-grotesk-latin-wght-normal.woff2","caveat-latin-600-normal.woff2","inter-OFL.txt","space-grotesk-OFL.txt","caveat-OFL.txt"]) expect(fs.existsSync(path.join(ROOT,"public/fonts",f))).toBe(true);
 });
});
