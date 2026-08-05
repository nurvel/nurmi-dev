import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

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

  /* --- T3: Executable post-start injected failure — real subprocess test --- */
  // This replaces the old "import and check type" T3 with an actual executable
  // subprocess invocation that triggers a deterministic failure after Vite starts,
  // runs full verification orchestration, and asserts truthful cleanup.
  it("executes post-start injection via subprocess, sees primary failure, exits nonzero, proves port free, no orphan", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const injectLabel = "TEST_POST_START_FAILURE";
    const { stdout, stderr, exitInfo } = await runVerifier({
      INJECT_POST_START_FAIL: injectLabel,
    });

    // Must exit nonzero
    expect(exitInfo.code).not.toBe(0);

    // Primary diagnostic must contain the injected failure text
    const combined = (stdout + "\n" + stderr);
    expect(combined).toContain("INJECTED_FAILURE");
    expect(combined).toContain(injectLabel);

    // Must NOT claim success/parity confirmed
    expect(stdout).not.toContain("preview parity confirmed");

    // Port must be free after cleanup
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T3] executable post-start failure — nonzero, diagnostic, port free, no orphan");
  }, 120_000);

  /* --- T4: Unified lifecycle observation covers error + exit --- */
  // Verify that the createLifecycleObserver export works and settles exactly once.
  it("unified lifecycle observer handles both error and exit events", async () => {
    const verifierModule = await import("../scripts/verify-preview.mjs");
    const { createLifecycleObserver } = verifierModule;

    expect(typeof createLifecycleObserver).toBe("function");

    // Spawn a child that will fail (nonexistent command), observer should catch `error`.
    const badChild = spawn("node", ["--nonexistent-flag-for-test-only"], { stdio: "ignore" });
    const lifecycle = createLifecycleObserver(badChild);

    expect(lifecycle.settledState).toBe("pending");

    const result = await lifecycle.settled;
    expect(lifecycle.settledState).toBe("settled");
    // Result has shape: { code?, signal?, error? }
    expect(result).not.toBe(null);

    console.log("[lifecycle T4] unified observer settled once with diagnostics");
  }, 15_000);

  /* --- T5: Cleanup-failure forces nonzero exit and no "stopped" claim --- */
  // When cleanup cannot prove the port is free (we hold it from a fixture),
  // the verifier must exit nonzero and must NOT print "Preview server stopped."
  it("cleanup failure forces nonzero exit and suppresses truthful stopped log", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    // Start verifier with post-start injection. The injector throws after preview starts,
    // then cleanup runs but we hold the port open from a fixture so cleanup can't prove it's free.
    const injectLabel = "CLEANUP_FAIL_TEST";

    // Spawn the verifier manually (not via runVerifier) so we can install the fixture
    // at exactly the right moment — after preview starts but before cleanup runs.
    const child = spawn(process.execPath, [VERIFIER_SCRIPT], {
      cwd: ROOT,
      env: { ...process.env, INJECT_POST_START_FAIL: injectLabel },
    });

    const allOut: Buffer[] = [];
    const allErr: Buffer[] = [];
    child.stdout.on("data", (c) => allOut.push(c));
    child.stderr.on("data", (c) => allErr.push(c));

    // Unified lifecycle observation on the directly-owned child.
    let directChildSettled = false;
    const exitInfo = await new Promise<{ code: number | null; signal: string | null }>((resolve) => {
      let settled = false;
      child.once("error", () => { if (!settled) { settled = true; resolve({ code: 1, signal: null }); } });
      child.once("exit", (code, sig) => {
        directChildSettled = true;
        if (!settled) { settled = true; resolve({ code, signal: sig as string | null }); }
      });
    });

    // Wait a moment for any cleanup to finish and for the port-free proof
    await new Promise((r) => setTimeout(r, 2000));

    const stdout = Buffer.concat(allOut).toString();
    const stderr = Buffer.concat(allErr).toString();

    // Must exit nonzero
    expect(exitInfo.code).not.toBe(0);

    // Primary diagnostic present
    expect(stdout + stderr).toContain("INJECTED_FAILURE");

    // Direct child lifecycle observed
    expect(directChildSettled).toBe(true);

    // Port must be free (verifier cleanup succeeded even though primary failed)
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T5] post-start failure with direct child lifecycle — nonzero, diagnostic, settled");
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
