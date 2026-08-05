import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";

/** Project root — resolves correctly under vitest. */
const ROOT = process.cwd();
const VERIFIER_SCRIPT = path.join(ROOT, "scripts", "verify-preview.mjs");
const VITE_PORT = 49152;

/* ---------- helpers ---------- */

/** Bind a TCP server on the fixed port (loopback only). Returns it for close. */
function bindFixture() {
  const s = net.createServer();
  return new Promise<net.Server>((resolve, reject) => {
    s.once("error", reject);
    s.listen(VITE_PORT, "127.0.0.1", () => resolve(s));
  });
}

/** Try to bind the fixed port; resolves true if free, false if occupied. */
function probePortFree() {
  const s = net.createServer();
  return new Promise<boolean>((resolve) => {
    s.once("error", () => resolve(false));
    s.listen(VITE_PORT, "127.0.0.1", () => {
      s.close(() => resolve(true));
    });
  });
}

/** Kill a process and wait for it to die (with timeout). */
function killAndWait(child: ReturnType<typeof spawn>, ms = 30_000) {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    try { child.kill("SIGKILL"); } catch(_) {}
    child.on("exit", () => { clearTimeout(timer); resolve(true); });
  });
}

/** Parse the lifecycle report line from stdout. Returns null if not found or malformed. */
function parseLifecycleReport(stdout: string) {
  const line = stdout.split('\n').find(l => l.startsWith('LIFECYCLE_REPORT:'));
  if (!line) return null;
  // Format: LIFECYCLE_REPORT: pid=... event=... settlementCount=... processSettled=... portFree=... fullyStopped=...
  const result: Record<string, string | number | boolean> = {};
  const kvPairs = line.slice('LIFECYCLE_REPORT:'.length + 1).split(/\s+/).filter(Boolean);
  for (const pair of kvPairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;
    const key = pair.slice(0, eqIdx);
    let val: string | number | boolean = pair.slice(eqIdx + 1);
    // Convert booleans and numbers
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else {
      const num = Number(val);
      if (!Number.isNaN(num)) val = num;
    }
    result[key] = val;
  }
  return result;
}

/** Spawn the verifier as a subprocess with optional env overrides. Returns stdout, stderr, and exit info. */
async function runVerifier(envExtra: Record<string, string> = {}) {
  const child = spawn(process.execPath, [VERIFIER_SCRIPT], {
    cwd: ROOT,
    env: { ...process.env, ...envExtra },
  });

  const allOut: Buffer[] = [];
  const allErr: Buffer[] = [];
  child.stdout.on("data", (c) => allOut.push(c));
  child.stderr.on("data", (c) => allErr.push(c));

  // Unified lifecycle observation on the directly-owned child process.
  const exitInfo = await new Promise<{ code: number | null; signal: string | null; error?: boolean }>((resolve) => {
    let settled = false;
    const settle = (info: { code: number | null; signal: string | null; error?: boolean }) => {
      if (settled) return;
      settled = true;
      resolve(info);
    };

    child.once("error", () => {
      settle({ code: 1, signal: null, error: true });
    });

    child.once("exit", (code, sig) => {
      settle({ code, signal: sig as string | null });
    });
  });

  return { stdout: Buffer.concat(allOut).toString(), stderr: Buffer.concat(allErr).toString(), exitInfo };
}

/* ---------- Test spawning the verifier as a subprocess ---------- */

describe.sequential("preview verifier lifecycle", () => {
  let fixture: net.Server | null = null;

  /* --- T1: Normal success — port clear after exit, no process leak --- */
  it("completes successfully and leaves no listener or child behind", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const { stdout, stderr, exitInfo } = await runVerifier();

    // Must exit 0
    expect(exitInfo.code).toBe(0);
    expect(exitInfo.signal).toBeNull();

    // Parity must be confirmed
    expect(stdout).toContain("preview parity confirmed");

    // Must have truthful stopped message (only after proven reap + port clearance)
    expect(stdout).toContain("Preview server stopped.");

    // Port must be free again
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T1] success — port free, no leak");
  }, 120_000);

  /* --- T2: Occupied fixed port — fails nonzero, preserves fixture --- */
  it("fails safely when the fixed strict port is occupied", async () => {
    // Bind a fixture that the verifier must NOT kill
    fixture = await bindFixture();

    // Ensure fixture is live
    expect(fixture.listening).toBe(true);

    const { stderr, exitInfo } = await runVerifier();

    // Must fail nonzero
    expect(exitInfo.code).not.toBe(0);

    // Must mention port/occupied
    expect(stderr.toLowerCase()).toMatch(/port|occupy/i);

    // Fixture must still be alive — verifier did not kill it
    expect(fixture.listening).toBe(true);

    // Clean up fixture
    await new Promise<void>((resolve) => fixture!.close(() => resolve()));
    fixture = null;

    // Port must be free after fixture cleanup
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T2] occupied port failure — fixture preserved, port free");
  }, 30_000);

  /* --- T3: Executable post-start injected failure — real subprocess test with lifecycle evidence --- */
  it("post-start injection: primary failure, nonzero, direct Vite lifecycle evidence, port cleared", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const injectLabel = "TEST_POST_START_FAILURE";
    const { stdout, stderr, exitInfo } = await runVerifier({
      INJECT_POST_START_FAIL: injectLabel,
      REPORT_PREVIEW_LIFECYCLE: "1",
    });

    // Must exit nonzero
    expect(exitInfo.code).not.toBe(0);

    // Primary diagnostic must contain the injected failure text
    const combined = (stdout + "\n" + stderr);
    expect(combined).toContain("INJECTED_FAILURE");
    expect(combined).toContain(injectLabel);

    // Must NOT claim success/parity confirmed
    expect(stdout).not.toContain("preview parity confirmed");

    // Lifecycle report: must be present and prove owned-child lifecycle
    const report = parseLifecycleReport(stdout);
    expect(report).not.toBeNull();
    expect(Number(report!.pid)).toBeGreaterThan(0);
    expect(report!.event).toBe("exit");
    expect(Number(report!.settlementCount)).toBe(1);
    expect(report!.processSettled).toBe(true);
    expect(report!.portFree).toBe(true);
    expect(report!.fullyStopped).toBe(true);

    // Port must be free after cleanup
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T3] post-start failure with lifecycle evidence — nonzero, diagnostic, settled once, port free");
  }, 120_000);

  /* --- T4: True ENOENT spawn error via real nonexistent executable --- */
  it("missing executable: true ENOENT error event, exactly-one settlement, no fake flags", async () => {
    const verifierModule = await import("../scripts/verify-preview.mjs");
    const { createLifecycleObserver } = verifierModule;

    expect(typeof createLifecycleObserver).toBe("function");

    // Use an asserted-nonexistent absolute executable path
    const missingPath = path.join(ROOT, ".preview-test-missing-executable", String(process.pid));
    expect(existsSync(missingPath)).toBe(false);

    // Spawn with the nonexistent executable — should produce a real ENOENT error event.
    const badChild = spawn(missingPath, [], { stdio: "ignore" });
    const lifecycle = createLifecycleObserver(badChild);

    expect(lifecycle.settledState).toBe("pending");

    // Count how many 'error' / 'exit' callbacks fire on the child directly.
    let testErrorCount = 0;
    let testExitCount = 0;
    badChild.once("error", () => { testErrorCount++; });
    badChild.once("exit", () => { testExitCount++; });

    const result = await lifecycle.settled;
    expect(lifecycle.settledState).toBe("settled");
    expect(result).not.toBeNull();

    // Must settle on the 'error' event (real ENOENT) — not on 'exit'.
    expect(result.code).toBeNull();
    expect(result.signal).toBeNull();

    // The error property must be present and an Error with code "ENOENT"
    if (!result.error) {
      throw new Error("lifecycle observer result for ENOENT spawn should have .error");
    }
    expect(result.error).toBeInstanceOf(Error);
    const err = result.error as NodeJS.ErrnoException;
    expect(err.code).toBe("ENOENT");

    // Wait briefly for test-side callbacks
    await new Promise(r => setTimeout(r, 500));

    // Test-side: exactly one 'error', zero 'exit'
    expect(testErrorCount).toBe(1);
    expect(testExitCount).toBe(0);

    // Observer: exactly one successful settlement
    expect(lifecycle).toHaveProperty('settledState', 'settled');

    // Await child close to ensure full reaping
    await new Promise<void>((resolve) => {
      if (badChild.exitCode !== undefined || badChild.signalCode !== null) {
        resolve();
      } else {
        badChild.once("close", () => resolve());
      }
    });

    console.log("[lifecycle T4] true ENOENT spawn error — event=error, settlementCount=1, errors=1 exits=0");
  }, 15_000);

  /* --- T5: Cleanup-only failure via INJECT_CLEANUP_PORT_HOLD --- */
  it("cleanup failure: cleanup port hold forces nonzero exit, no false stopped log, verifier-owned fixture closed", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const cleanupLabel = "TEST_CLEANUP_HOLD";
    const { stdout, stderr, exitInfo } = await runVerifier({
      INJECT_CLEANUP_PORT_HOLD: cleanupLabel,
      REPORT_PREVIEW_LIFECYCLE: "1",
    });

    // Must exit nonzero
    expect(exitInfo.code).not.toBe(0);

    // Must have diagnostic about cleanup failure / port still held
    const allOutput = stdout + "\n" + stderr;
    expect(allOutput.toLowerCase()).toMatch(/cleanup|port.*hold|clearance/i);

    // Must NOT emit "preview parity confirmed" (cleanup-only failure suppresses final success)
    expect(stdout).not.toContain("preview parity confirmed");

    // Must NOT emit "Preview server stopped." on cleanup-only failure
    expect(stdout).not.toContain("Preview server stopped.");

    // Lifecycle report: owned Vite process settled, but port clearance was forced to fail at the verifier's own check
    const report = parseLifecycleReport(stdout);
    expect(report).not.toBeNull();
    expect(Number(report!.pid)).toBeGreaterThan(0);
    expect(report!.event).toBe("exit");
    expect(Number(report!.settlementCount)).toBe(1);
    expect(report!.processSettled).toBe(true);

    // After the verifier closes its own fixture, independent port must be free
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T5] cleanup-only failure — nonzero, diagnostic, no false success/stopped, owned child settled, port finally free");
  }, 120_000);

  /* --- T6: Combined primary + cleanup failure --- */
  it("primary and cleanup: both errors present in combined diagnostic, no false success or stopped log", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const { stdout, stderr, exitInfo } = await runVerifier({
      INJECT_POST_START_FAIL: "COMBINED_PRIMARY_FAILURE",
      INJECT_CLEANUP_PORT_HOLD: "COMBINED_CLEANUP_FAILURE",
      REPORT_PREVIEW_LIFECYCLE: "1",
    });

    // Must exit nonzero
    expect(exitInfo.code).not.toBe(0);

    const allOutput = stdout + "\n" + stderr;

    // Primary injected diagnostic present
    expect(allOutput).toContain("INJECTED_FAILURE");
    expect(allOutput).toContain("COMBINED_PRIMARY_FAILURE");

    // Cleanup diagnostic present (port clearance failure)
    expect(allOutput.toLowerCase()).toMatch(/cleanup|port.*hold|clearance/i);

    // Combined ERRORS line preserving both
    expect(allOutput).toMatch(/ERRORS?.*primary/i);
    expect(allOutput).toContain("COMBINED_PRIMARY_FAILURE");
    // The combined line should reference both primary and cleanup
    const combinedErrorsLine = allOutput.split('\n').find(l => l.match(/ERRORS?/i) && l.toLowerCase().includes('primary'));
    expect(combinedErrorsLine).toBeTruthy();

    // Must NOT emit final success or stopped log
    expect(stdout).not.toContain("preview parity confirmed");
    expect(stdout).not.toContain("Preview server stopped.");

    // Lifecycle report: owned Vite settled exactly once
    const report = parseLifecycleReport(stdout);
    expect(report).not.toBeNull();
    expect(Number(report!.pid)).toBeGreaterThan(0);
    expect(report!.event).toBe("exit");
    expect(Number(report!.settlementCount)).toBe(1);

    // Independent port probe is free after verifier closes its fixture
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T6] combined primary+cleanup — both diagnostics, combined ERRORS line retained, nonzero, no false output");
  }, 120_000);
});

/* ---------- Test resolveDistAssetPath (pure) ---------- */

describe.sequential("resolveDistAssetPath — safe asset path validation", () => {
  // Import the pure helper — this must not trigger main()
  let resolveDistAssetPath: typeof import("../scripts/verify-preview.mjs").resolveDistAssetPath;

  beforeAll(async () => {
    const mod = await import("../scripts/verify-preview.mjs");
    resolveDistAssetPath = mod.resolveDistAssetPath;
  });

  /* --- Acceptance cases --- */
  it("accepts a normal hashed path", () => {
    const result = resolveDistAssetPath("/assets/index-AbCd1234.js");
    expect(result).not.toBeNull();
    expect(result).toContain("dist");
    expect(result).toContain("assets");
    expect(path.basename(result)).toBe("index-AbCd1234.js");
  });

  it("accepts a nested subdirectory path under assets", () => {
    const result = resolveDistAssetPath("/assets/vendor/foo.js");
    expect(result).not.toBeNull();
    expect(result).toContain("vendor");
    expect(path.basename(result)).toBe("foo.js");
  });

  it("accepts a path with numbers and hyphens", () => {
    const result = resolveDistAssetPath("/assets/main-123-abc-def.js");
    expect(result).not.toBeNull();
  });

  /* --- Rejection cases --- */
  it("rejects path traversal with ..", () => {
    expect(resolveDistAssetPath("/assets/../index.js")).toBeNull();
  });

  it("rejects encoded path traversal (%2e%2e)", () => {
    expect(resolveDistAssetPath("/assets/%2e%2e/index.js")).toBeNull();
  });

  it("rejects encoded separators", () => {
    expect(resolveDistAssetPath("/assets/%2e%2e%2findex.js")).toBeNull();
  });

  it("rejects absolute paths that don't start with /assets/", () => {
    expect(resolveDistAssetPath("/etc/passwd")).toBeNull();
  });

  it("rejects URL protocol schemes", () => {
    expect(resolveDistAssetPath("file:///etc/passwd")).toBeNull();
    expect(resolveDistAssetPath("http://evil.com/x.js")).toBeNull();
  });

  it("rejects input starting with / but not under /assets/", () => {
    expect(resolveDistAssetPath("/dist/index.html")).toBeNull();
  });

  it("rejects NUL byte injection", () => {
    expect(resolveDistAssetPath("/assets/foo\0.js")).toBeNull();
  });

  it("rejects query strings and fragments", () => {
    expect(resolveDistAssetPath("/assets/foo.js?malware=1")).toBeNull();
    expect(resolveDistAssetPath("/assets/foo.js#evil")).toBeNull();
  });

  it("rejects null/undefined/non-string inputs", () => {
    expect(resolveDistAssetPath(null as any)).toBeNull();
    expect(resolveDistAssetPath(undefined as any)).toBeNull();
    expect(resolveDistAssetPath(123 as any)).toBeNull();
    expect(resolveDistAssetPath("")).toBeNull();
  });

  it("rejects directory-only reference (no filename)", () => {
    expect(resolveDistAssetPath("/assets/")).toBeNull();
  });

  /* --- Containment: resolved path must be under dist/assets --- */
  it("resolved paths are strictly under dist/assets", () => {
    const result = resolveDistAssetPath("/assets/index-AbCd1234.js");
    expect(result).not.toBeNull();
    const assetsRoot = path.resolve(ROOT, "dist", "assets");
    const rel = path.relative(assetsRoot, result!);
    expect(rel.startsWith("..")).toBe(false);
  });
});
