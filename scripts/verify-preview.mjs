#!/usr/bin/env node
/**
 * Preview-parity verifier (dependency-free).
 *
 * 1. Removes generated dist/.
 * 2. Runs the production build synchronously (npm run build).
 * 3. Starts `vite preview` on a fixed loopback port with strict port selection.
 * 4. Fetches the served index.html and verifies it is byte-for-byte equal to
 *    the just-built dist/index.html.
 * 5. Extracts the built module asset URL from that HTML, verifies the file
 *    exists under dist/, and confirms its bytes match what the server served.
 * 6. Terminates the child server on both success and failure.
 *
 * Must NOT use network resources beyond loopback.
 * Must NOT add project dependencies (uses only Node builtins).
 */

import { spawn } from "node:child_process";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DIST_DIR = join(PROJECT_ROOT, "dist");
const VITE_PREVIEW_PORT = 49_152; // non-default, fixed for determinism
const VITE_PREVIEW_HOST = "127.0.0.1";

/* ---------- helpers ---------- */

function fail(msg) {
  console.error(`[preview:check] FAIL: ${msg}`);
  process.exitCode = 1;
}

function info(msg) {
  console.log(`[preview:check] ${msg}`);
}

/**
 * Run a command via sh -c so npm resolves correctly from PROJECT_ROOT.
 */
function runShell(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/sh", ["-c", cmd], { stdio: "inherit", cwd: PROJECT_ROOT });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`shell '${cmd}' exited ${code}`));
      else resolve();
    });
  });
}

/** Fetch loopback URL with fetch (Node 18+). */
async function loopbackFetch(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return resp.arrayBuffer();
  } catch (e) {
    throw new Error(`fetch ${url} failed: ${e.message}`);
  }
}

/** Kill a process and ensure it stops. */
function kill(child) {
  try { child.kill("SIGTERM"); } catch (_) {}
}

/** Wait for condition with polling, up to maxMs. */
async function waitFor(fn, maxMs = 15_000, interval = 200) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    // Small sleep via setTimeout (non-blocking in event loop)
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

/** Check if a TCP port is open on localhost. */
async function checkPort(port) {
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
    return true; // Any response means the server is up
  } catch (_) {
    return false;
  }
}

/* ---------- main ---------- */

async function main() {
  /* --- Step 1: remove generated dist/ --- */
  info("Removing generated dist/");
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true });
  }

  /* --- Step 2: production build --- */
  info("Running production build…");
  await runShell("npm run build");

  // Verify dist/index.html exists
  const indexPath = join(DIST_DIR, "index.html");
  if (!existsSync(indexPath)) {
    fail(`dist/index.html missing after build`);
    return;
  }
  const builtIndexBytes = readFileSync(indexPath);
  const builtIndexText = builtIndexBytes.toString("utf-8");
  info(`Built dist/index.html (${builtIndexBytes.length} bytes)`);

  /* --- Step 3: start vite preview on fixed loopback port --- */
  info(`Starting vite preview on ${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`);

  const child = spawn("/bin/sh", ["-c", `vite preview --host ${VITE_PREVIEW_HOST} --port ${VITE_PREVIEW_PORT} --strictPort`], {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Accumulate stdout/stderr for debug logging
  const allOutput = [];
  child.stdout.on("data", (c) => allOutput.push(c));
  child.stderr.on("data", (c) => allOutput.push(c));

  // Wait until the port responds (more reliable than looking at log text)
  const started = await waitFor(
    () => checkPort(VITE_PREVIEW_PORT),
    30_000,
    500
  );

  if (!started) {
    kill(child);
    fail(`preview server did not start on ${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`);
    info("Server output: " + Buffer.concat(allOutput).toString().slice(0, 2048));
    return;
  }

  info("Preview server is up.");

  try {
    const base = `http://${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`;

    /* --- Step 4: fetch served index.html and compare with built file --- */
    info("Fetching served /index.html…");
    const servedIndexBuffer = await loopbackFetch(`${base}/index.html`);
    const servedIndexBytes = Buffer.from(servedIndexBuffer);
    const servedIndexText = servedIndexBytes.toString("utf-8");

    if (!builtIndexBytes.equals(servedIndexBytes)) {
      fail(`Served index.html differs from freshly built dist/index.html`);
      return;
    }
    info("index.html parity OK (served bytes === built bytes)");

    /* --- Step 5: extract the main module asset URL and verify --- */
    const assetMatch = servedIndexText.match(/src="\/assets\/([^"]+\.js)"/);
    if (!assetMatch) {
      fail(`Could not extract JS asset URL from index.html`);
      return;
    }
    const assetFile = assetMatch[1];
    const assetPath = join(DIST_DIR, "assets", assetFile);

    if (!existsSync(assetPath)) {
      fail(`Built asset ${assetFile} not found under dist/assets/`);
      return;
    }
    info(`Found asset ${assetFile} in dist/`);

    const builtAsset = readFileSync(assetPath);
    const servedAssetBuffer = await loopbackFetch(`${base}/assets/${assetFile}`);
    const servedAsset = Buffer.from(servedAssetBuffer);

    if (!builtAsset.equals(servedAsset)) {
      fail(`Served asset ${assetFile} differs from built file`);
      return;
    }
    info(`Asset ${assetFile} parity OK (${builtAsset.length} bytes)`);

    info("All checks passed — preview parity confirmed.");
  } finally {
    kill(child);
    try { await new Promise((r) => child.on("exit", r)); } catch(_) {}
    info("Preview server stopped.");
  }
}

main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  process.exit(1);
});
