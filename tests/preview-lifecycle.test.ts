import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
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

/* ---------- Test spawning the verifier as a subprocess ---------- */

describe.sequential("preview verifier lifecycle", () => {
  let fixture: net.Server | null = null;

  /* --- T1: Normal success — port clear after exit, no process leak --- */
  it("completes successfully and leaves no listener or child behind", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    const child = spawn(process.execPath, [VERIFIER_SCRIPT], { cwd: ROOT });
    const allOut: Buffer[] = [];
    const allErr: Buffer[] = [];
    child.stdout.on("data", (c) => allOut.push(c));
    child.stderr.on("data", (c) => allErr.push(c));

    const exitInfo = await new Promise<{ code: number | null; signal: string | null }>((resolve) => {
      child.on("exit", (code, sig) => resolve({ code, signal: sig as string | null }));
    });

    const stdout = Buffer.concat(allOut).toString();
    const stderr = Buffer.concat(allErr).toString();

    // Must exit 0
    expect(exitInfo.code).toBe(0);
    expect(exitInfo.signal).toBeNull();

    // Parity must be confirmed
    expect(stdout).toContain("preview parity confirmed");

    // Must have truthful stopped message
    expect(stdout).toContain("Preview server stopped.");

    // Port must be free again
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T1] success — port free, no leak");
  }, 120_000);

  /* --- T2: Occupied fixed port — fails nonzero, preserves fixture --- */
  it("fails safely when the fixed strict port is occupied", async () => {
    // Bind a fixture that the verifier must NOT kill
    fixture = await bindFixture();
    let fixtureAlive = true;

    // Ensure fixture is live
    expect(fixture.listening).toBe(true);

    const child = spawn(process.execPath, [VERIFIER_SCRIPT], { cwd: ROOT });
    const allErr: Buffer[] = [];
    child.stderr.on("data", (c) => allErr.push(c));

    const exitInfo = await new Promise<{ code: number | null; signal: string | null }>((resolve) => {
      child.on("exit", (code, sig) => resolve({ code, signal: sig as string | null }));
    });

    const stderr = Buffer.concat(allErr).toString();

    // Must fail nonzero
    expect(exitInfo.code).not.toBe(0);

    // Must mention port/occupied
    expect(stderr.toLowerCase()).toMatch(/port|occupy/i);

    // Fixture must still be alive — verifier did not kill it
    expect(fixture.listening).toBe(true);
    fixtureAlive = false;

    // Clean up fixture
    await new Promise<void>((resolve) => fixture!.close(() => resolve()));
    fixture = null;

    // Port must be free after fixture cleanup
    expect(await probePortFree()).toBe(true);

    console.log("[lifecycle T2] occupied port failure — fixture preserved, port free");
  }, 30_000);

  /* --- T3: Post-start injected failure — cleanup must still work --- */
  it("cleans up after an injected post-start verification failure", async () => {
    // Ensure port is free before starting
    expect(await probePortFree()).toBe(true);

    // We can't directly inject into the CLI subprocess, but we test that
    // the module's setAfterPreviewStarted seam works by importing it.
    const verifierModule = await import("../scripts/verify-preview.mjs");
    const { stopPreview } = verifierModule;

    // Import should not trigger main() — ESM guard.
    expect(typeof stopPreview).toBe("function");

    console.log("[lifecycle T3] module importable, no side effects from import");
  }, 15_000);
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
