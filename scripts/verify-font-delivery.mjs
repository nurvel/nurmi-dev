#!/usr/bin/env node
/** Deterministic cold-load first-party font delivery evidence (Node + Chrome CDP only). */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import net from "node:net";
import { resolveViteCli, createLifecycleObserver, stopPreview } from "./verify-preview.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 49152;
const HOST = "127.0.0.1";
const FONT_PATHS = ["/fonts/inter-latin-wght-normal.woff2", "/fonts/space-grotesk-latin-wght-normal.woff2", "/fonts/caveat-latin-600-normal.woff2"];
const EVIDENCE_DIR = join(ROOT, "target", "visual-refresh");
const TARGET = join(EVIDENCE_DIR, "browser-evidence.json");
const FONT_DELAY_MS = 750;
const GOOGLE_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const FONT_HASHES = new Map([
  ["inter-latin-wght-normal.woff2", "3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62"],
  ["space-grotesk-latin-wght-normal.woff2", "0640890476fc1198ab4de571fb658de443c4d85b66466ec09534a8737ab1ce9d"],
  ["caveat-latin-600-normal.woff2", "d51e2283010e661d9f3dafdc9ff4b82b2ebcb2f7aa43ca48a105f5f68d46cc32"],
]);
const VIEWPORTS = [{ name: "1440", width: 1440, height: 900, mobile: false }, { name: "820", width: 820, height: 1000, mobile: false }, { name: "390", width: 390, height: 844, mobile: true }, { name: "320", width: 320, height: 844, mobile: true }];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function isGoogleFontUrl(value) {
  try {
    return GOOGLE_FONT_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}
async function removeProfile(profile) {
  for (let attempt = 0; attempt < 20 && existsSync(profile); attempt++) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (error) { if (attempt === 19) throw error; }
    if (existsSync(profile)) await wait(150);
  }
}

function portFree() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(PORT, HOST, () => server.close(() => resolve(true)));
  });
}
function chromePath() {
  for (const candidate of ["/usr/bin/google-chrome", "/snap/bin/chromium"]) if (existsSync(candidate)) return candidate;
  throw new Error("Chrome/Chromium not found; expected /usr/bin/google-chrome or /snap/bin/chromium");
}
async function command(child, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`${label} timed out`)); }, ms);
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("close", (code) => { clearTimeout(timer); code === 0 ? resolve(output) : reject(new Error(`${label} exited ${code}\n${output.slice(-2000)}`)); });
  });
}

class CDP {
  constructor(ws) { this.ws = new WebSocket(ws); this.id = 0; this.pending = new Map(); this.events = new Map();
    this.ready = new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = ({ data }) => { const msg = JSON.parse(data); if (msg.id) { const p = this.pending.get(msg.id); if (!p) return; this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } else (this.events.get(msg.method) || []).forEach((fn) => fn(msg.params)); };
  }
  async send(method, params = {}) { await this.ready; return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(method, fn) { this.events.set(method, [...(this.events.get(method) || []), fn]); }
  close() { this.ws.close(); }
}

const PRELOAD = `(() => {
  window.__fontEvidence = { paints: [], shifts: [], boxes: [] };
  new PerformanceObserver(list => { window.__fontEvidence.paints = window.__fontEvidence.paints.concat(list.getEntries().map(e => ({name:e.name,startTime:e.startTime}))).slice(-20); }).observe({type:'paint', buffered:true});
  new PerformanceObserver(list => { window.__fontEvidence.shifts = window.__fontEvidence.shifts.concat(list.getEntries().filter(e => !e.hadRecentInput).map(e => ({value:e.value,startTime:e.startTime}))).slice(-50); }).observe({type:'layout-shift', buffered:true});
  ${process.env.FONT_DISPLAY_POLICY === "swap" ? 'const style=document.createElement("style"); style.textContent="@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(\\"/fonts/inter-latin-wght-normal.woff2\\") format(\\"woff2\\")}"; document.documentElement.appendChild(style);' : ''}
})()`;

async function collect(profile, viewport, base, chrome) {
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--disable-default-apps", "--no-first-run", "--no-zygote", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "pipe", "pipe"] });
  let diagnostic = ""; browser.stderr.on("data", (b) => { diagnostic += b.toString(); });
  const lifecycle = createLifecycleObserver(browser);
  let cdp;
  try {
    const ready = Date.now() + 15000; let endpoint;
    while (!endpoint && Date.now() < ready) { const match = diagnostic.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) endpoint = match[1]; else await wait(50); }
    if (!endpoint) throw new Error(`Chrome CDP did not start: ${diagnostic.slice(-1000)}`);
    const httpEndpoint = endpoint.replace(/^ws:/, "http:");
    const version = await (await fetch(httpEndpoint.replace(/\/devtools\/browser\/.*$/, "/json/version"))).json();
    const tabs = await (await fetch(httpEndpoint.replace(/\/devtools\/browser\/.*$/, "/json/list"))).json();
    cdp = new CDP(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
    const requests = [], failures = [], blockedIds = new Set();
    cdp.on("Network.requestWillBeSent", (e) => { requests.push({ url: e.request.url, type: e.type }); if (/googletagmanager\.com|google-analytics\.com/.test(e.request.url)) blockedIds.add(e.requestId); });
    cdp.on("Network.responseReceived", (e) => { const r = requests.find((x) => x.url === e.response.url); if (r) r.status = e.response.status; });
    cdp.on("Network.loadingFailed", (e) => { if (!blockedIds.has(e.requestId)) failures.push({ requestId: e.requestId, errorText: e.errorText }); });
    await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Fetch.enable", { patterns: FONT_PATHS.map((path) => ({ urlPattern: `*${path}`, requestStage: "Response" })) });
    cdp.on("Fetch.requestPaused", async (event) => {
      try {
        const response = await cdp.send("Fetch.getResponseBody", { requestId: event.requestId });
        await wait(FONT_DELAY_MS);
        await cdp.send("Fetch.fulfillRequest", { requestId: event.requestId, responseCode: event.responseStatus || 200, responseHeaders: event.responseHeaders || [], body: response.body });
      } catch { try { await cdp.send("Fetch.continueRequest", { requestId: event.requestId }); } catch {} }
    });
    // The existing analytics integration is not part of this local oracle. Block it
    // before navigation so the harness never permits a non-loopback connection.
    await cdp.send("Network.setBlockedURLs", { urls: ["*googletagmanager.com/*", "*google-analytics.com/*"] });
    await cdp.send("Page.enable");
    await cdp.send("Page.bringToFront");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PRELOAD });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    await cdp.send("Page.navigate", { url: base });
    if (process.env.FONT_DISPLAY_POLICY === "swap") {
      await wait(25);
      await cdp.send("Runtime.evaluate", { expression: `for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) if (rule.cssText.includes('Inter')) rule.style.fontDisplay = 'swap'; } catch {} }` });
    }
    await wait(100);
    const result = await cdp.send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `
      (async () => {
        const family = el => getComputedStyle(el).fontFamily;
        const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
        const metric = el => { const range=document.createRange(); range.selectNodeContents(el); const r=range.getBoundingClientRect(); return {width:r.width,height:r.height}; };
        const requiredFonts = [{family:'Inter',weights:[400,500,600]},{family:'Space Grotesk',weights:[400,500]},{family:'Caveat',weights:[600]}];
        const checkFonts = () => requiredFonts.flatMap(font => font.weights.map(weight => ({family:font.family,weight,loaded:document.fonts.check('normal '+weight+' 16px "'+font.family+'"')})));
        const body = document.body;
        // Browser evidence is limited to the actually rendered production document body.
        const sample = () => ({ body:box(body), bodyText:metric(body), status:document.fonts.status, weights:checkFonts().map(w=>w.loaded) });
        const preFont = sample();
        await document.fonts.ready; await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        const postFont = sample();
        const readyWeights = checkFonts();
        const boxes = [postFont, sample()];
        const focusVisible=false; // Verified below with real CDP keyboard events.
        const cards=[...document.querySelectorAll('article')]; const columns=getComputedStyle(document.querySelector('.about article')?.parentElement).gridTemplateColumns.split(' ').length;
        const nameLines=[...document.querySelector('h1').querySelectorAll('span')]; const nameFits=nameLines.length===2 && nameLines.every(line=>{const range=document.createRange();range.selectNodeContents(line);return range.getClientRects().length===1 && range.getBoundingClientRect().right<=line.getBoundingClientRect().right;}); const image=document.querySelector('.about img');
        const browserQA={viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth,mainCount:document.querySelectorAll('main').length,h1Count:document.querySelectorAll('h1').length,aboutHeading:!!document.querySelector('#about-heading'),workHeading:!!document.querySelector('#work-heading'),cardCount:cards.length,cardColumns:columns,portraitLoaded:!!image?.naturalWidth,portraitBeforeName:innerWidth>820||image.getBoundingClientRect().top<document.querySelector('h1').getBoundingClientRect().top,nameLinesFit:nameFits,emailLink:document.querySelector('a[href^="mailto:"]')?.textContent?.trim()==='Email',focusVisible};
        return { fontsReady:true, weights:readyWeights, bodyFamily:family(body), displayFamily:family(document.querySelector('.about header')), handwrittenFamily:family(document.querySelector('[aria-hidden="true"]')), synthesis:getComputedStyle(body).fontSynthesis, browserQA, preFont, postFont, boxes, performance:{...window.__fontEvidence, paints:((window.__fontEvidence && window.__fontEvidence.paints) || []).length ? window.__fontEvidence.paints : performance.getEntriesByType('paint').map(e => ({name:e.name,startTime:e.startTime}))} };
      })()` });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    const value = result.result.value;
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    const focus = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: `(() => {const el=document.activeElement;const style=getComputedStyle(el);return {tag:el.tagName,href:el.getAttribute('href'),visible:el.matches(':focus-visible') && style.outlineStyle!=='none' && parseFloat(style.outlineWidth)>=2};})()` });
    value.browserQA.focusVisible = focus.result.value.visible;
    value.browserQA.keyboardFocus = focus.result.value;
    await cdp.send("Runtime.evaluate", { expression: "document.activeElement.blur();window.scrollTo({top:0,behavior:'instant'})" });
    const baseOrigin = new URL(base).origin;
    const fontRequests = requests.filter((r) => {
      try {
        const parsed = new URL(r.url);
        return (parsed.origin === baseOrigin && parsed.pathname.startsWith("/fonts/")) || isGoogleFontUrl(r.url);
      } catch {
        return false;
      }
    });
    const blockedExternal = requests.filter((r) => !r.url.startsWith(base) && /googletagmanager\.com|google-analytics\.com/.test(r.url)).map((r) => ({ ...r, url: new URL(r.url).origin + new URL(r.url).pathname }));
    const external = requests.filter((r) => !r.url.startsWith(base) && !/googletagmanager\.com|google-analytics\.com/.test(r.url));
    const requiredFiles = FONT_PATHS.map((path) => fontRequests.find((r) => new URL(r.url).pathname === path));
    const stable = value.boxes.length === 2 && JSON.stringify(value.boxes[0]) === JSON.stringify(value.boxes[1]);
    const shift = (value.performance?.shifts || []).reduce((sum, e) => sum + e.value, 0);
    const zeroLayoutShift = shift === 0;
    const noLateSwap = JSON.stringify(value.preFont.body) === JSON.stringify(value.postFont.body) && JSON.stringify(value.preFont.bodyText) === JSON.stringify(value.postFont.bodyText);
    const unexpectedFailures = failures.filter((f) => f.errorText !== "net::ERR_BLOCKED_BY_CLIENT");
    const expectedColumns = viewport.width >= 901 ? 3 : viewport.width >= 561 ? 2 : 1;
    const qa = value.browserQA;
    const browserPass = qa.noHorizontalOverflow && qa.mainCount === 1 && qa.h1Count === 1 && qa.aboutHeading && qa.workHeading && qa.cardCount === 5 && qa.cardColumns === expectedColumns && qa.portraitLoaded && qa.portraitBeforeName && qa.nameLinesFit && qa.emailLink && qa.focusVisible;
    const pass = requiredFiles.every((font) => font?.status === 200) && !fontRequests.some((r) => isGoogleFontUrl(r.url)) && external.length === 0 && value.fontsReady && value.weights.every((w) => w.loaded) && /Inter/i.test(value.bodyFamily) && /Space Grotesk/i.test(value.displayFamily) && /Caveat/i.test(value.handwrittenFamily) && value.synthesis === "none" && shift === 0 && stable && zeroLayoutShift && noLateSwap && unexpectedFailures.length === 0 && browserPass;
    // Delayed cold-load evidence above proves no late swap. Capture the design
    // separately after an unthrottled reload, so screenshots show vendored fonts.
    await cdp.send("Fetch.disable");
    await cdp.send("Page.reload");
    await wait(300);
    const captureReady = await cdp.send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));await new Promise(requestAnimationFrame);return {height:document.body.getBoundingClientRect().height,fonts:document.fonts.status};})()` });
    if (captureReady.exceptionDetails) throw new Error(captureReady.exceptionDetails.text);
    const warm = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
      const links=[...document.querySelectorAll('a')].map(el=>({text:el.textContent.trim(),href:el.getAttribute('href'),target:el.getAttribute('target'),rel:el.getAttribute('rel'),height:el.getBoundingClientRect().height}));
      const name=[...document.querySelector('h1').querySelectorAll('span')].map(el=>{const range=document.createRange();range.selectNodeContents(el);return {text:el.textContent,lines:range.getClientRects().length,fits:range.getBoundingClientRect().right<=el.getBoundingClientRect().right};});
      const workPills=[...document.querySelectorAll('article')].flatMap(card=>[...card.lastElementChild.children].map(pill=>{
        const box=pill.getBoundingClientRect(), cardBox=card.getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(pill);const textBox=range.getBoundingClientRect();
        return {role:pill.textContent,tag:pill.tagName,radius:getComputedStyle(pill).borderRadius,inside:box.left>=cardBox.left && box.right<=cardBox.right && box.bottom<=cardBox.bottom,textFits:textBox.left>=box.left && textBox.right<=box.right && textBox.bottom<=box.bottom,belowDescription:box.top>=card.children[2].getBoundingClientRect().bottom-1};
      }));
      const footer=document.querySelector('footer');
      const portrait=document.querySelector('.about img');
      const circle=portrait.parentElement.getBoundingClientRect();
      const image=portrait.getBoundingClientRect();
      const portraitCrop={widthRatio:image.width/circle.width,leftRatio:(image.left-circle.left)/circle.width,topRatio:(image.top-circle.top)/circle.height,maxWidth:getComputedStyle(portrait).maxWidth,circleOverflow:getComputedStyle(portrait.parentElement).overflow};
      return {links,name,workPills,portraitCrop,footer:footer.textContent.trim(),footerCount:document.querySelectorAll('footer').length,scrollSnap:getComputedStyle(document.documentElement).scrollSnapType,overflow:document.documentElement.scrollWidth>innerWidth,excludedCopy:/Built with care|Available for select work/.test(document.body.innerText),portraitSize:circle.width};
    })()` });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{name:"prefers-reduced-motion",value:"reduce"}] });
    const reduced = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: "getComputedStyle(document.documentElement).scrollBehavior" });
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });
    const warmQA = {...warm.result.value,reducedMotionScroll:reduced.result.value};

    const crop = warmQA.portraitCrop;
    const portraitPass = Math.abs(crop.widthRatio-1.37)<0.002 && Math.abs(crop.leftRatio+0.44)<0.002 && Math.abs(crop.topRatio-0.02)<0.002 && crop.maxWidth==='none' && crop.circleOverflow==='hidden';
    const warmPass = warmQA.workPills.length===6 && warmQA.workPills.every(pill=>pill.tag==='SPAN' && pill.radius==='999px' && pill.inside && pill.textFits && pill.belowDescription) && !warmQA.overflow && !warmQA.excludedCopy && warmQA.footerCount===1 && (warmQA.footer.startsWith("Preview build") || /^Version v\d+\.\d+\.\d+$/.test(warmQA.footer)) && warmQA.scrollSnap==="none" && warmQA.reducedMotionScroll==="auto" && warmQA.name.length===2 && warmQA.name.every(line=>line.lines===1&&line.fits) && warmQA.links.filter(link=>['Email','LinkedIn','GitHub'].includes(link.text)).every(link=>link.height>=44) && warmQA.links.some(link=>link.href==='https://kauneushoitolahanna.fi') && warmQA.links.every(link=>!link.href.startsWith('http') || link.target==='_blank' && link.rel==='noopener noreferrer');
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: viewport.width, height: Math.ceil(captureReady.result.value.height), scale: 1 } });
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    const screenshotPath = join(EVIDENCE_DIR, `viewport-${viewport.width}.png`);
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
    return { viewport: { name: viewport.name, width: viewport.width, height: viewport.height, mobile: viewport.mobile }, screenshot: screenshotPath, browserQA: qa, warmQA, fontDelayMs: FONT_DELAY_MS, fontPolicy: process.env.FONT_DISPLAY_POLICY || "production", fontRequests, externalRequests: external, blockedExternalRequests: blockedExternal, requiredWeights: value.weights, computedFamily: { body: value.bodyFamily, display: value.displayFamily, handwritten: value.handwrittenFamily }, fontSynthesis: value.synthesis, paint: value.performance?.paints || [], layoutShift: { entries: value.performance?.shifts || [], cumulative: shift }, firstPaint: value.preFont, postFontReady: value.postFont, zeroLayoutShift, noLateSwap, boundingBoxes: value.boxes, chrome: { product: version.Browser, protocol: version["Protocol-Version"] }, pass: pass && warmPass && portraitPass };
  } finally { if (cdp) cdp.close(); try { browser.kill("SIGTERM"); } catch {} await Promise.race([lifecycle.settled, wait(1000)]); try { browser.kill("SIGKILL"); } catch {} await Promise.race([lifecycle.settled, wait(3000)]); }
}

async function main() {
  const evidence = { contract: "first-party-inter-space-grotesk-caveat-cold-load-v1", pass: false, viewports: [], cleanup: { beforePortFree: false, afterPortFree: false, viteStopped: false, browserProfilesRemoved: false } };
  let vite; let lifecycle; const profiles = [];
  try {
    for (const [file, expected] of FONT_HASHES) {
      const actual = createHash("sha256").update(readFileSync(join(ROOT, "public", "fonts", file))).digest("hex");
      if (actual !== expected) throw new Error(`Font hash mismatch for ${file}`);
    }
    if (!(evidence.cleanup.beforePortFree = await portFree())) throw new Error(`Fixed port ${PORT} is occupied`);
    rmSync(join(ROOT, "dist"), { recursive: true, force: true });
    await command(spawn("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }), 120000, "production build");
    vite = spawn(process.execPath, [resolveViteCli(), "preview", "--host", HOST, "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }); lifecycle = createLifecycleObserver(vite);
    const started = Date.now() + 15000; while (await portFree() && Date.now() < started) await wait(100); if (await portFree()) throw new Error("preview server failed to bind");
    const base = `http://${HOST}:${PORT}`;
    for (const viewport of VIEWPORTS) { const profile = mkdtempSync(join(tmpdir(), "font-delivery-")); profiles.push(profile); evidence.viewports.push(await collect(profile, viewport, base, chromePath())); await removeProfile(profile); }
    evidence.pass = evidence.viewports.every((v) => v.pass);
  } catch (error) { evidence.error = error.message; }
  finally {
    if (vite) { try { await stopPreview(vite, lifecycle); evidence.cleanup.viteStopped = true; } catch (e) { evidence.cleanup.viteError = e.message; } }
    for (const profile of profiles) await removeProfile(profile);
    evidence.cleanup.afterPortFree = await portFree(); evidence.cleanup.browserProfilesRemoved = profiles.every((p) => !existsSync(p));
    evidence.pass = evidence.pass && evidence.cleanup.viteStopped && evidence.cleanup.afterPortFree && evidence.cleanup.browserProfilesRemoved;
    mkdirSync(dirname(TARGET), { recursive: true });
    writeFileSync(TARGET, JSON.stringify(evidence, null, 2) + "\n");
  }
  if (!evidence.pass) { console.error(`[font:check] FAIL: ${evidence.error || "font delivery contract failed"}`); process.exitCode = 1; } else console.log("[font:check] PASS: desktop and mobile cold-load font delivery verified; cleanup proven");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`[font:check] FAIL: ${e.message}`); process.exitCode = 1; });