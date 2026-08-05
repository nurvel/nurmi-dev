#!/usr/bin/env node
/**
 * Preview-parity verifier (dependency-free).
 *
 * 1. Removes generated dist/.
 * 2. Runs the production build synchronously.
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
import net from "node:net";
import { join, dirname, resolve as pathResolve, relative as pathRelative, sep as pathSep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DIST_DIR = join(PROJECT_ROOT, "dist");
const VITE_PREVIEW_PORT = 49_152; // non-default, fixed for determinism
const VITE_PREVIEW_HOST = "127.0.0.1";

/* ---------- exported helpers (pure / testable) ---------- */

/**
 * Resolve the Vite CLI binary already installed in this project.
 * Uses import.meta.resolve on the vite package to locate its root,
 * then appends the known bin path.
 */
export function resolveViteCli() {
  const pkgUrl = import.meta.resolve("vite/package.json");
  const viteRoot = dirname(fileURLToPath(pkgUrl));
  return join(viteRoot, "bin", "vite.js");
}

/**
 * Resolve an asset source path to a filesystem path strictly under dist/assets.
 * Rejects traversal, encoded escape, absolute paths, URL protocols, NUL bytes,
 * query/fragment components, and directory-only references.
 * Returns null if the source is unsafe; returns the resolved path if safe.
 */
export function resolveDistAssetPath(assetSrc) {
  // Reject empty / non-string inputs
  if (!assetSrc || typeof assetSrc !== "string") return null;

  // Must start with /assets/ prefix
  if (!assetSrc.startsWith("/assets/")) return null;

  // Extract relative portion after /assets/
  const rel = assetSrc.slice("/assets/".length);

  // Must have a filename component (not just slashes)
  if (!rel || rel === "/" || rel === "") return null;

  // Reject NUL bytes anywhere in the source
  if (assetSrc.includes("\0")) return null;

  // Reject query strings or fragments anywhere in the source
  if (assetSrc.includes("?") || assetSrc.includes("#")) return null;

  // Decode percent-encoding; reject invalid encoding
  let decodedRel = rel;
  try {
    decodedRel = decodeURIComponent(rel);
  } catch {
    return null;
  }

  // After decoding, reject path traversal at any level
  if (decodedRel.includes("..")) return null;

  // Reject absolute paths (defense-in-depth)
  if (decodedRel.startsWith("/") || /^[a-zA-Z]:\\/.test(decodedRel)) return null;

  // Build candidate and enforce containment under dist/assets
  const assetsRoot = pathResolve(DIST_DIR, "assets");
  const candidate = pathResolve(assetsRoot, decodedRel);

  // Must be strictly inside assetsRoot (pathRelative starts with .. means escape)
  const relResolved = pathRelative(assetsRoot, candidate);
  if (!relResolved || relResolved === "." || relResolved.startsWith(`..${pathSep}`) || relResolved === "..") return null;

  return candidate;
}

/* ---------- lifecycle helpers (internal) ---------- */

function info(msg) {
  console.log(`[preview:check] ${msg}`);
}

/** Run a shell command (only for npm, which needs PATH). Piped output so it doesn't leak into capture. */
async function runShell(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/sh", ["-c", cmd], { stdio: "pipe", cwd: PROJECT_ROOT });
    // Discard npm build noise — we only need success/failure
    child.stdout.resume();
    child.stderr.resume();
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`shell '${cmd}' exited ${code}`));
      else resolve();
    });
  });
}

/** Wait for condition with polling, up to maxMs. */
async function waitFor(fn, maxMs = 15_000, interval = 200) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

/** Check if a TCP port is open on localhost via HTTP. */
async function checkPort(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch (_) {
    return false;
  }
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

/** Check if a TCP port is free by binding and immediately closing. */
async function isPortFree(port, host) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.listen(port, host || "127.0.0.1", () => {
      s.close(() => resolve(true));
    });
  });
}

/**
 * Wait up to `ms` for a promise with a timeout. Returns the settled value or
 * throws on timeout, but the original promise still settles for other waiters.
 */
async function withTimeout(promise, ms, label = "timeout") {
  let timer;
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  try {
    return await Promise.race([promise, t]);
  } finally {
    clearTimeout(timer);
  }
}

/** Confirm the child is fully reaped and port released. */
async function awaitChildReaped(child, exitPromise) {
  if (!child) return true;
  // Wait for the already-registered exit promise to settle (or timeout).
  try {
    await withTimeout(exitPromise, 10_000, "awaitChildReaped timeout");
  } catch (_) {
    // Child may still be alive after grace.
  }

  // Confirm port is free (stronger proof than grepping process list).
  return isPortFree(VITE_PREVIEW_PORT, VITE_PREVIEW_HOST);
}

/**
 * Idempotent stop routine. Sends SIGTERM → grace period → SIGKILL if needed.
 * Uses the already-registered exit promise so it never misses a fast exit.
 * Used on every post-spawn path via a single outer finally block.
 *
 * @param {import("node:child_process").ChildProcess} child
 * @param {Promise<{code:number|null;signal:string|null}>} exitPromise  the promise registered immediately after spawn
 */
export async function stopPreview(child, exitPromise) {
  if (!child) return;
  if (child._stopping || child._stopped) return;
  child._stopping = true;

  // If the process still looks alive, kill it. Errors are harmless if the pid is gone.
  try { child.kill("SIGTERM"); } catch(_) {
    // Already dead — just wait for the settled exit promise below.
  }

  // Grace period for SIGTERM → escalate to SIGKILL
  const graceMs = 5000;
  const tid = setTimeout(() => {
    try { child.kill("SIGKILL"); } catch(_) {}
  }, graceMs);
  tid.unref();

  // Await the same exit promise registered at spawn time — it fires for all
  // listeners, and we won't miss an early exit.
  await withTimeout(exitPromise, 15_000, "stopPreview reap timeout");
  child._stopped = true;
}

/* ---------- main orchestration ---------- */

/** Optional callback seam for testing injected failures after preview starts. */
let _afterPreviewStarted = undefined;

/** Export ONLY for test injection. Not invoked by CLI. */
export function setAfterPreviewStarted(cb) {
  _afterPreviewStarted = cb;
}

async function main() {
  let primaryError = null;

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
    console.error("[preview:check] FAIL: dist/index.html missing after build");
    process.exitCode = 1;
    throw new Error("dist/index.html missing after build");
  }
  const builtIndexBytes = readFileSync(indexPath);
  const builtIndexText = builtIndexBytes.toString("utf-8");
  info(`Built dist/index.html (${builtIndexBytes.length} bytes)`);

  /* --- Step 3: start vite preview on fixed loopback port --- */
  // Port preflight: fail clearly if already occupied
  const portFree = await isPortFree(VITE_PREVIEW_PORT, VITE_PREVIEW_HOST);
  if (!portFree) {
    console.error(`[preview:check] FAIL: Fixed port ${VITE_PREVIEW_PORT} is already occupied. Aborting.`);
    process.exitCode = 1;
    throw new Error(`Fixed port ${VITE_PREVIEW_PORT} is already occupied`);
  }

  // Spawn Vite directly — no shell intermediary
  const viteCliPath = resolveViteCli();
  info(`Starting vite preview on ${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`);

  const child = spawn(process.execPath, [
    viteCliPath,
    "preview",
    "--host", VITE_PREVIEW_HOST,
    "--port", String(VITE_PREVIEW_PORT),
    "--strictPort",
  ], {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  // Accumulate stdout/stderr for bounded diagnostics (cap at 64KB)
  const allOutput = [];
  let outputBytes = 0;
  child.stdout.on("data", (c) => {
    if (outputBytes < 65536) { outputBytes += c.length; allOutput.push(c); }
  });
  child.stderr.on("data", (c) => {
    if (outputBytes < 65536) { outputBytes += c.length; allOutput.push(c); }
  });

  // Register exit/error promise IMMEDIATELY — before any readiness polling or signals.
  let childExited = false;
  let childExitInfo = null;
  const childExitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      childExited = true;
      childExitInfo = { code, signal };
      resolve(childExitInfo);
    });
  });

  // Install bounded SIGINT/SIGTERM handling that routes through cleanup
  let signalHandlersInstalled = false;
  const signalHandler = async () => {
    if (!signalHandlersInstalled) return;
    try { await stopPreview(child, childExitPromise); } catch(_) {}
    // Preserve primary error
    if (primaryError) process.exitCode = 1;
    else process.exitCode = 130;
    setTimeout(() => process.exit(process.exitCode), 500);
  };

  /* ---------- outer try/finally covers all post-spawn paths ---------- */
  try {
    signalHandlersInstalled = true;
    process.on("SIGINT", signalHandler);
    process.on("SIGTERM", signalHandler);

    // Wait for server readiness, racing against child exit.
    if (childExited) {
      // Child already exited before we could poll — Vite failed immediately
      const tail = Buffer.concat(allOutput).toString().slice(0, 2048);
      console.error(`[preview:check] FAIL: vite preview process exited early (code=${childExitInfo?.code}, signal=${childExitInfo?.signal})`);
      if (tail) info("Server output: " + tail);
      process.exitCode = 1;
      primaryError = new Error(`vite preview exited early (code=${childExitInfo?.code}, signal=${childExitInfo?.signal})`);
      throw primaryError;
    }

    const started = await waitFor(
      async () => {
        if (childExited) return false;
        return checkPort(VITE_PREVIEW_PORT);
      },
      30_000,
      500
    );

    if (!started || childExited) {
      const tail = Buffer.concat(allOutput).toString().slice(0, 2048);
      console.error(`[preview:check] FAIL: preview server did not start on ${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`);
      if (tail) info("Server output: " + tail);
      process.exitCode = 1;
      primaryError = new Error("preview server did not start");
      throw primaryError;
    }

    info("Preview server is up.");

    // Optional test injection point — allows tests to verify post-start failure cleanup
    if (typeof _afterPreviewStarted === "function") {
      try { await _afterPreviewStarted(); } catch(e) {
        primaryError = e;
        throw e;
      }
    }

    const base = `http://${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`;

    /* --- Step 4: fetch served index.html and compare with built file --- */
    info("Fetching served /index.html…");
    const servedIndexBuffer = await loopbackFetch(`${base}/index.html`);
    const servedIndexBytes = Buffer.from(servedIndexBuffer);
    const servedIndexText = servedIndexBytes.toString("utf-8");

    if (!builtIndexBytes.equals(servedIndexBytes)) {
      console.error("[preview:check] FAIL: Served index.html differs from freshly built dist/index.html");
      primaryError = new Error("index.html parity mismatch");
      throw primaryError;
    }
    info("index.html parity OK (served bytes === built bytes)");

    /* --- Step 5: extract the main module asset URL and verify --- */
    const assetMatch = servedIndexText.match(/src="\/assets\/([^"]+\.js)"/);
    if (!assetMatch) {
      console.error("[preview:check] FAIL: Could not extract JS asset URL from index.html");
      primaryError = new Error("Could not extract JS asset URL");
      throw primaryError;
    }

    const assetSrc = `/assets/${assetMatch[1]}`;

    // Validate the asset path BEFORE filesystem access
    const candidatePath = resolveDistAssetPath(assetSrc);
    if (!candidatePath) {
      console.error(`[preview:check] FAIL: Asset path ${assetSrc} rejected by safe-path containment check`);
      primaryError = new Error("Unsafe asset path");
      throw primaryError;
    }

    if (!existsSync(candidatePath)) {
      console.error(`[preview:check] FAIL: Built asset ${assetMatch[1]} not found under dist/assets/`);
      primaryError = new Error("Asset file missing on disk");
      throw primaryError;
    }
    info(`Found asset ${assetMatch[1]} in dist/`);

    const builtAsset = readFileSync(candidatePath);
    const servedAssetBuffer = await loopbackFetch(`${base}${assetSrc}`);
    const servedAsset = Buffer.from(servedAssetBuffer);

    if (!builtAsset.equals(servedAsset)) {
      console.error(`[preview:check] FAIL: Served asset ${assetMatch[1]} differs from built file`);
      primaryError = new Error("Asset parity mismatch");
      throw primaryError;
    }
    info(`Asset ${assetMatch[1]} parity OK (${builtAsset.length} bytes)`);

    info("All checks passed — preview parity confirmed.");
  } finally {
    // Remove signal handlers so they don't leak
    try { process.off("SIGINT", signalHandler); } catch(_) {}
    try { process.off("SIGTERM", signalHandler); } catch(_) {}

    // Always stop Vite and confirm port release
    if (child) {
      try {
        await stopPreview(child, childExitPromise);
        // Await exit + confirm port clear — crucial for "truthful" stopped message.
        const reaped = await awaitChildReaped(child, childExitPromise);
        if (reaped) {
          info("Preview server stopped.");
        } else {
          console.error("[preview:check] WARNING: child exited but port still held after graceful termination");
        }
      } catch(cleanErr) {
        console.error("[preview:check] WARNING: cleanup error:", cleanErr.message);
        // Preserve primary error; surfacing cleanup failure does not mask it.
        if (!primaryError && cleanErr) {
          process.exitCode = 1;
        }
      }
    }

    // Flush stdout so the final message reaches capture before Node exits.
    await new Promise((r) => setTimeout(r, 50));
  }

  // If primaryError was captured, ensure nonzero exit code.
  if (primaryError) {
    process.exitCode = 1;
  }
}

// Guard: only run as direct entry so importing from tests doesn't trigger CLI.
const isMainModule = typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    // Error was already logged inside main(); just ensure nonzero exit.
    if (!process.exitCode || process.exitCode === 0) process.exitCode = 1;
  });
}
