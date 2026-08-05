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
 * Must NOT add project dependencies (uses only Node builtins). */

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

/**
 * Unified lifecycle observer. Registers BOTH `error` and `exit` on the child
 * immediately after spawn. Settles exactly once (on whichever fires first).
 * Preserves event diagnostics for all downstream consumers (readiness, cleanup, reaping).
 *
 * Enriched with:
 * - `event`: "error" | "exit" — which terminal event caused settlement
 * - `settlementCount`: read-only count of successful settlements (always 0 or 1)
 *
 * @param {import("node:child_process").ChildProcess} child
 * @returns {{ settled: Promise<{code?: number|null; signal?: string|null; error?: Error; event: string}>; settledState: 'pending'|'settled'; result: object|null; settlementCount: number }}
 */
export function createLifecycleObserver(child) {
  let settledState = "pending";
  let result = null;
  let settlementCount = 0;

  const settled = new Promise((resolve) => {
    const trySettle = (info) => {
      if (settledState !== "pending") return; // already settled — ignore
      settledState = "settled";
      settlementCount = 1;
      result = info;
      resolve(info);
    };

    child.once("error", (err) => {
      trySettle({ error: err, code: null, signal: null, event: "error" });
    });

    child.once("exit", (code, signal) => {
      trySettle({ code, signal, error: undefined, event: "exit" });
    });
  });

  const observer = {
    settled,
    get settledState() { return settledState; },
    get result() { return result; },
    get settlementCount() { return settlementCount; },
  };
  return observer;
}

/** Confirm the child is fully reaped and port released. Returns structured evidence. */
async function awaitChildReaped(child, lifecycle) {
  if (!child) return { pid: null, lifecycleEvent: null, settlementCount: 0, processSettled: false, portFree: true, fullyStopped: true };

  const pid = child.pid;

  // Wait for the already-registered exit promise to settle (or timeout).
  try {
    await withTimeout(lifecycle.settled, 10_000, "awaitChildReaped timeout");
  } catch (_) {
    // Child may still be alive after grace.
  }

  // Determine process settlement: observer settled with a terminal event AND Node child
  // state shows the process is terminated (exitCode set OR signalCode set).
  const terminalEvent = lifecycle.result?.event ?? null;
  const processSettled = lifecycle.settlementCount === 1 &&
    terminalEvent !== null &&
    (child.exitCode !== undefined || child.signalCode !== null);

  // Confirm port is free (stronger proof than grepping process list).
  const portFree = await isPortFree(VITE_PREVIEW_PORT, VITE_PREVIEW_HOST);

  return {
    pid,
    lifecycleEvent: terminalEvent,
    settlementCount: lifecycle.settlementCount,
    processSettled,
    portFree,
    fullyStopped: processSettled && portFree,
  };
}

/**
 * Idempotent stop routine. Sends SIGTERM → grace period → SIGKILL if needed.
 * Uses the lifecycle observer so it never misses a fast exit.
 * Used on every post-spawn path via a single outer finally block.
 *
 * @param {import("node:child_process").ChildProcess} child
 * @param {object} lifecycle  the lifecycle observer from createLifecycleObserver
 */
export async function stopPreview(child, lifecycle) {
  if (!child) return;
  if (child._stopping || child._stopped) return;
  child._stopping = true;

  // If the process still looks alive, kill it. Errors are harmless if the pid is gone.
  try { child.kill("SIGTERM"); } catch(_) {
    // Already dead — just wait for the settled lifecycle below.
  }

  // Grace period for SIGTERM → escalate to SIGKILL
  const graceMs = 5000;
  const tid = setTimeout(() => {
    try { child.kill("SIGKILL"); } catch(_) {}
  }, graceMs);
  tid.unref();

  // Await the same lifecycle observer registered at spawn time — it fires for all
  // listeners, and we won't miss an early exit.
  await withTimeout(lifecycle.settled, 15_000, "stopPreview reap timeout");
  child._stopped = true;
}

/* ---------- exported orchestrator (for test injection via ENV) ---------- */

/**
 * Check for the environment variable INJECT_POST_START_FAIL. If set, throw the
 * named error after preview has started. This is the executability seam: tests
 * spawn the script as a subprocess with this env var to verify real failure + cleanup.
 */
function checkInjectPostStartFail() {
  const inject = process.env.INJECT_POST_START_FAIL;
  if (inject) {
    throw new Error(`INJECTED_FAILURE: ${inject}`);
  }
}

/* ---------- main orchestration ---------- */

async function main() {
  let primaryError = null;
  let child = null;
  let lifecycle = null;
  let reapingResult = null;
  let cleanupError = null;

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
    primaryError = new Error("dist/index.html missing after build");
    throw primaryError;
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
    primaryError = new Error(`Fixed port ${VITE_PREVIEW_PORT} is already occupied`);
    throw primaryError;
  }

  // Spawn Vite directly — no shell intermediary
  const viteCliPath = resolveViteCli();
  info(`Starting vite preview on ${VITE_PREVIEW_HOST}:${VITE_PREVIEW_PORT}`);

  child = spawn(process.execPath, [
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

  // Register unified lifecycle observer IMMEDIATELY — before any readiness polling or signals.
  // Observes both `error` and `exit`, settles exactly once, preserves diagnostics.
  lifecycle = createLifecycleObserver(child);

  let childExited = false;
  let childExitInfo = null;
  lifecycle.settled.then((info) => {
    childExited = true;
    childExitInfo = info;
  });

  // Install bounded SIGINT/SIGTERM handling that routes through cleanup
  let signalHandlersInstalled = false;
  const signalHandler = async () => {
    if (!signalHandlersInstalled) return;
    try { await stopPreview(child, lifecycle); } catch(_) {}
    // Preserve primary error
    if (primaryError) process.exitCode = 1;
    else process.exitCode = 130;
    setTimeout(() => process.exit(process.exitCode), 500);
  };

  /* ---------- outer try/finally covers all post-spawn paths ---------- */
  let parityConfirmed = false;
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
      primaryError = new Error("preview server did not start");
      throw primaryError;
    }

    info("Preview server is up.");

    // Executable post-start injection seam — env-based so subprocesses hit it
    checkInjectPostStartFail();

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

    parityConfirmed = true;
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    console.error(`[preview:check] PRIMARY ERROR: ${primaryError.message}`);
    process.exitCode = 1;
  } finally {
    // Remove signal handlers so they don't leak
    try { process.off("SIGINT", signalHandler); } catch(_) {}
    try { process.off("SIGTERM", signalHandler); } catch(_) {}

    // Always stop Vite and prove port release before emitting final success
    if (child) {
      let cleanupFixtureServer = null;
      try {
        await stopPreview(child, lifecycle);

        // INJECT_CLEANUP_PORT_HOLD seam: after Vite has settled, the verifier binds its own
        // loopback listener on the fixed port immediately before the ordinary clearance proof.
        // This forces port-clearance verification to fail deterministically.
        // The verifier-owned fixture is always closed in the nested finally below.
        if (process.env.INJECT_CLEANUP_PORT_HOLD) {
          cleanupFixtureServer = net.createServer();
          await new Promise((resolve, reject) => {
            cleanupFixtureServer.once("error", reject);
            cleanupFixtureServer.listen(VITE_PREVIEW_PORT, VITE_PREVIEW_HOST, resolve);
          });
        }

        reapingResult = await awaitChildReaped(child, lifecycle);

        if (!reapingResult.fullyStopped) {
          console.error("[preview:check] CLEANUP FAIL: child exited but port still held after graceful termination");
          cleanupError = new Error("port not cleared after reap");
        } else if (!primaryError) {
          // Only emit truthful stopped message when process and port are proven
          // and the orchestration itself succeeded.
          info("Preview server stopped.");
        }
      } catch(cleanErr) {
        console.error("[preview:check] CLEANUP ERROR: " + cleanErr.message);
        cleanupError = cleanErr;
      } finally {
        // Always close the verifier-owned test fixture (itself, not an unrelated listener).
        if (cleanupFixtureServer) {
          await new Promise((resolve) => {
            cleanupFixtureServer.close(() => resolve());
          });
        }
      }

      // Preserve primary error; surfacing cleanup failure does not mask it.
      if (primaryError && cleanupError) {
        // Both primary and cleanup failures: report both, exit nonzero.
        console.error(`[preview:check] ERRORS: primary="${primaryError.message}", cleanup="${cleanupError.message}"`);
        process.exitCode = 1;
      } else if (!primaryError && cleanupError) {
        // Only cleanup failure (no primary): still nonzero.
        process.exitCode = 1;
      }

      // Emit opt-in machine-readable lifecycle evidence (test contract only).
      if (process.env.REPORT_PREVIEW_LIFECYCLE === "1" && reapingResult && child.pid) {
        console.log(`LIFECYCLE_REPORT: pid=${child.pid} event=${reapingResult.lifecycleEvent ?? "none"} settlementCount=${reapingResult.settlementCount} processSettled=${reapingResult.processSettled} portFree=${reapingResult.portFree} fullyStopped=${reapingResult.fullyStopped}`);
      }
    }

    // Flush stdout so the final message reaches capture before Node exits.
    await new Promise((r) => setTimeout(r, 50));
  }

  // Emit overall success ONLY after cleanup is proven (fully stopped) and no errors exist.
  if (!primaryError && !cleanupError) {
    info("All checks passed — preview parity confirmed.");
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
    // Surface the error diagnostic — don't swallow it silently.
    if (err && err.message) {
      console.error("[preview:check] ORCHESTRATION ERROR: " + err.message);
    }
    if (!process.exitCode || process.exitCode === 0) process.exitCode = 1;
  });
}
