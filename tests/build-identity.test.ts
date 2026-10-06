import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveBuildIdentity } from "../scripts/build-identity.mjs";

const repositories: string[] = [];
const git = (cwd: string, args: string[]) => execFileSync("/usr/bin/git", args, { cwd, encoding: "utf8" }).trim();

function fixture() {
  const directory = fs.mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "build-identity-"));
  repositories.push(directory);
  git(directory, ["init", "-q"]);
  git(directory, ["config", "user.email", "test@example.invalid"]);
  git(directory, ["config", "user.name", "Test"]);
  fs.writeFileSync(path.join(directory, "file"), "fixture\n");
  git(directory, ["add", "file"]);
  git(directory, ["commit", "-qm", "fixture"]);
  return { directory, sha: git(directory, ["rev-parse", "HEAD"]) };
}

afterEach(() => {
  for (const directory of repositories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("build identity and production release guard", () => {
  it("uses the package version for a valid production candidate", () => {
    const repo = fixture();
    expect(resolveBuildIdentity({ ...repo, repository: repo.directory, version: "2.0.0", eventName: "push", ref: "refs/heads/main", deployRequired: true }))
      .toEqual({ buildIdentity: "v2.0.0", releaseTag: "v2.0.0" });
  });

  it("uses a seven-character preview SHA and does not require an unpublished version", () => {
    const repo = fixture();
    expect(resolveBuildIdentity({ ...repo, repository: repo.directory, version: "2.0.0", eventName: "push", ref: "refs/heads/feature", deployRequired: true }))
      .toEqual({ buildIdentity: `preview-${repo.sha.slice(0, 7)}`, releaseTag: "" });
  });

  it.each(["01.2.3", "1.02.3", "1.2.03", "-1.2.3", "1.2.3-beta", "1.2.3+build", "1.2", "v1.2.3", "2.0.0\n"])(
    "rejects noncanonical version %s", (version) => {
      const repo = fixture();
      expect(() => resolveBuildIdentity({ ...repo, repository: repo.directory, version, eventName: "push", ref: "refs/heads/feature", deployRequired: true }))
        .toThrow(/canonical MAJOR\.MINOR\.PATCH/);
    },
  );

  it("rejects a candidate tag pointing elsewhere before publication", () => {
    const repo = fixture();
    fs.writeFileSync(path.join(repo.directory, "file"), "different commit\n");
    git(repo.directory, ["add", "file"]);
    git(repo.directory, ["commit", "-qm", "different fixture"]);
    const differentSha = git(repo.directory, ["rev-parse", "HEAD"]);
    git(repo.directory, ["tag", "v2.0.0", differentSha]);
    expect(() => resolveBuildIdentity({ ...repo, repository: repo.directory, version: "2.0.0", eventName: "push", ref: "refs/heads/main", deployRequired: true }))
      .toThrow(/already points to a different commit/);
  });

  it("allows an exact-commit retry including an annotated tag", () => {
    const repo = fixture();
    git(repo.directory, ["tag", "-a", "v2.0.0", "-m", "release", repo.sha]);
    expect(resolveBuildIdentity({ ...repo, repository: repo.directory, version: "2.0.0", eventName: "workflow_dispatch", ref: "refs/heads/main", deployRequired: true }))
      .toEqual({ buildIdentity: "v2.0.0", releaseTag: "v2.0.0" });
  });

  it("rejects stale or regressed versions relative to the highest stable tag", () => {
    const repo = fixture();
    git(repo.directory, ["tag", "v2.0.0", repo.sha]);
    expect(() => resolveBuildIdentity({ ...repo, repository: repo.directory, version: "1.9.9", eventName: "push", ref: "refs/heads/main", deployRequired: true }))
      .toThrow(/must exceed highest stable tag v2.0.0/);
  });

  it("fails closed when Git cannot inspect the requested repository", () => {
    const directory = fs.mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "not-a-repo-"));
    repositories.push(directory);
    expect(() => resolveBuildIdentity({ repository: directory, sha: "a".repeat(40), version: "2.0.0", eventName: "push", ref: "refs/heads/main", deployRequired: true }))
      .toThrow(/Unable to inspect stable tags/);
  });

  it("validates but assigns no release to bookkeeping-only main pushes", () => {
    const repo = fixture();
    git(repo.directory, ["tag", "v2.0.0", "HEAD"]);
    expect(resolveBuildIdentity({ ...repo, repository: repo.directory, version: "2.0.0", eventName: "push", ref: "refs/heads/main", deployRequired: false }))
      .toEqual({ buildIdentity: "v2.0.0", releaseTag: "" });
  });
});
