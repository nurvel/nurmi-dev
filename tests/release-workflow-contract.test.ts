import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (name: string) => fs.readFileSync(path.join(ROOT, name), "utf8");

describe("production release workflow contract", () => {
  const workflow = read(".github/workflows/workers.yml");

  it("runs on every branch push while keeping pull requests validate-only", () => {
    expect(workflow).toContain("  push:\n    branches:\n      - '**'");
    expect(workflow).toContain(
      "    if: >-\n      github.event_name == 'push' &&\n      github.ref != 'refs/heads/main' &&\n      !startsWith(github.ref, 'refs/heads/dependabot/')",
    );
    expect(workflow).toContain("pull_request:\n    branches: [main]");
  });

  it("serializes main runs without cancellation", () => {
    expect(workflow).toContain("group: worker-cicd-${{ github.ref }}");
    expect(workflow).toContain("cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}");
  });

  it("builds production assets with the candidate stable tag before deployment", () => {
    expect(workflow).toContain("VITE_RELEASE_VERSION");
    expect(workflow).toContain("needs: validate");
    expect(workflow).toContain("wrangler deploy");
    expect(workflow.indexOf("npm run build")).toBeLessThan(
      workflow.indexOf("wrangler deploy"),
    );
  });

  it("creates the tag only after successful deployment", () => {
    expect(workflow).toContain("needs.deploy-production.result == 'success'");
    expect(workflow).toContain("git push origin \"refs/tags/$release_tag\"");
    expect(workflow.indexOf("wrangler deploy")).toBeLessThan(
      workflow.indexOf("git push origin \"refs/tags/$release_tag\""),
    );
  });

  it("guards existing tags and releases for retries", () => {
    expect(workflow).toContain("git tag --points-at \"$GITHUB_SHA\"");
    expect(workflow).toContain("gh release view \"$release_tag\"");
    expect(workflow).toContain("gh release create \"$release_tag\"");
  });

  it("has one release workflow owner", () => {
    expect(fs.existsSync(path.join(ROOT, ".github/workflows/release.yml"))).toBe(false);
  });
});
