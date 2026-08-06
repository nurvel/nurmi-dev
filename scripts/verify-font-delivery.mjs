#!/usr/bin/env node
/** Deterministic cold-load first-party font delivery evidence (Node + Chrome CDP only). */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { resolveViteCli, createLifecycleObserver, stopPreview } from "./verify-preview.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 49152;
const HOST = "127.0.0.1";
const FONT_PATH = "/fonts/roboto-condensed-latin-wght-normal.woff2";
const TARGET = join(ROOT, "target", "font-delivery-evidence.json");
const VIEWPORTS = [{ name: "desktop", width: 1440, height: 900, mobile: false }, { name: "mobile", width: 390, height: 844, mobile: true }];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
    // The existing analytics integration is not part of this local oracle. Block it
    // before navigation so the harness never permits a non-loopback connection.
    await cdp.send("Network.setBlockedURLs", { urls: ["*googletagmanager.com/*", "*google-analytics.com/*"] });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PRELOAD });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    await cdp.send("Page.navigate", { url: base });
    await wait(1000);
    const result = await cdp.send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `
      (async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        const family = el => getComputedStyle(el).fontFamily; const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
        const weights = [300,400,500,600,700].map(weight => ({weight, loaded: document.fonts.check('normal '+weight+' 16px "Roboto Condensed"')}));
        const body = document.body, button = document.querySelector('button') || (() => { const el = document.createElement('button'); el.dataset.fontEvidenceRepresentative = 'true'; el.style.fontFamily = family(body); el.textContent = 'Font evidence'; document.body.append(el); return el; })();
        const boxes = []; for (let i=0;i<2;i++) { boxes.push({body:box(body),button:button?box(button):null}); await new Promise(requestAnimationFrame); }
        return { fontsReady:true, weights, bodyFamily:family(body), buttonFamily:button?family(button):null, synthesis:getComputedStyle(document.documentElement).fontSynthesis, boxes, performance:{...window.__fontEvidence, paints:((window.__fontEvidence && window.__fontEvidence.paints) || []).length ? window.__fontEvidence.paints : performance.getEntriesByType('paint').map(e => ({name:e.name,startTime:e.startTime}))} };
      })()` });
    const value = result.result.value;
    const fontRequests = requests.filter((r) => r.url.includes("/fonts/") || r.url.includes("fonts.googleapis.com") || r.url.includes("fonts.gstatic.com"));
    const blockedExternal = requests.filter((r) => !r.url.startsWith(base) && /googletagmanager\.com|google-analytics\.com/.test(r.url)).map((r) => ({ ...r, url: new URL(r.url).origin + new URL(r.url).pathname }));
    const external = requests.filter((r) => !r.url.startsWith(base) && !/googletagmanager\.com|google-analytics\.com/.test(r.url));
    const font = fontRequests.find((r) => r.url.includes(FONT_PATH));
    const stable = value.boxes.length === 2 && JSON.stringify(value.boxes[0]) === JSON.stringify(value.boxes[1]);
    const shift = (value.performance?.shifts || []).reduce((sum, e) => sum + e.value, 0);
    const unexpectedFailures = failures.filter((f) => f.errorText !== "net::ERR_BLOCKED_BY_CLIENT");
    const pass = !!font && font.status === 200 && !fontRequests.some((r) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(r.url)) && external.length === 0 && value.fontsReady && value.weights.every((w) => w.loaded) && /Roboto Condensed/i.test(value.bodyFamily) && /Roboto Condensed/i.test(value.buttonFamily || "") && value.synthesis === "none" && shift === 0 && stable && unexpectedFailures.length === 0;
    return { viewport: { name: viewport.name, width: viewport.width, height: viewport.height, mobile: viewport.mobile }, fontRequests, externalRequests: external, blockedExternalRequests: blockedExternal, requiredWeights: value.weights, computedFamily: { body: value.bodyFamily, button: value.buttonFamily }, fontSynthesis: value.synthesis, paint: value.performance?.paints || [], layoutShift: { entries: value.performance?.shifts || [], cumulative: shift }, boundingBoxes: value.boxes, chrome: { product: version.Browser, protocol: version["Protocol-Version"] }, pass };
  } finally { if (cdp) cdp.close(); try { browser.kill("SIGTERM"); } catch {} await Promise.race([lifecycle.settled, wait(1000)]); try { browser.kill("SIGKILL"); } catch {} await Promise.race([lifecycle.settled, wait(3000)]); }
}

async function main() {
  const evidence = { contract: "first-party-roboto-condensed-cold-load-v1", pass: false, viewports: [], cleanup: { beforePortFree: false, afterPortFree: false, viteStopped: false, browserProfilesRemoved: false } };
  let vite; let lifecycle; const profiles = [];
  try {
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
    const targetDir = dirname(TARGET); (await import("node:fs")).mkdirSync(targetDir, { recursive: true });
    (await import("node:fs")).writeFileSync(TARGET, JSON.stringify(evidence, null, 2) + "\n");
  }
  if (!evidence.pass) { console.error(`[font:check] FAIL: ${evidence.error || "font delivery contract failed"}`); process.exitCode = 1; } else console.log("[font:check] PASS: desktop and mobile cold-load font delivery verified; cleanup proven");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`[font:check] FAIL: ${e.message}`); process.exitCode = 1; });
