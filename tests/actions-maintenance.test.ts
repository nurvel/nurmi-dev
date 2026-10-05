import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { isBookkeepingOnly, shouldDeploy } from "../scripts/deploy-required.mjs";

const ROOT = process.cwd();
const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/workers.yml"), "utf8");

function cleanupScript() {
  const start = workflow.indexOf("          script: |\n");
  const end = workflow.indexOf("\n  deploy-production:", start);
  if (start < 0 || end < 0) throw new Error("cleanup-preview script not found");
  return workflow
    .slice(start + "          script: |\n".length, end)
    .split("\n")
    .map((line) => line.startsWith("            ") ? line.slice(12) : line)
    .join("\n");
}

async function runCleanup({
  headOwner = "nurvel",
  headRepo = "nurmi-dev",
  openPullRequests = [],
  deployments = [],
  statusFailure = false,
}: {
  headOwner?: string;
  headRepo?: string;
  openPullRequests?: unknown[];
  deployments?: Array<{ id: number; environment?: string; ref?: string }>;
  statusFailure?: boolean;
} = {}) {
  const events: string[] = [];
  const paginationParams: unknown[] = [];
  const payload = {
    pull_request: {
      head: { ref: "topic", repo: headOwner ? { owner: { login: headOwner }, full_name: `${headOwner}/${headRepo}` } : null },
    },
  };
  const pullsList = vi.fn(async () => ({ data: openPullRequests }));
  const listDeployments = vi.fn(async () => ({ data: deployments }));
  const createDeploymentStatus = vi.fn(async ({ deployment_id }: { deployment_id: number }) => {
    events.push(`inactive:${deployment_id}`);
    if (statusFailure) throw new Error("status update failed");
    return { data: {} };
  });
  const deleteDeployment = vi.fn(async ({ deployment_id }: { deployment_id: number }) => {
    events.push(`delete:${deployment_id}`);
    return { data: {} };
  });
  const github = {
    paginate: async (_endpoint: (...args: never[]) => Promise<{ data: unknown[] }>, params: unknown) => {
      paginationParams.push(params);
      if (typeof params === "object" && params !== null && "head" in params) return openPullRequests;
      if (typeof params === "object" && params !== null && "environment" in params) {
        return deployments;
      }
      throw new Error("unexpected endpoint");
    },
    rest: {
      pulls: { list: pullsList },
      repos: { listDeployments, createDeploymentStatus, deleteDeployment },
    },
  };
  const logs: string[] = [];
  const context = { payload, repo: { owner: "nurvel", repo: "nurmi-dev" } };
  await expect(
    (async () => vm.runInNewContext(`(async () => {\n${cleanupScript()}\n})()`, {
      github,
      core: { info: (message: string) => logs.push(message) },
      context,
    }))(),
  ).resolves.toBeUndefined();
  return { events, logs, paginationParams, pullsList, listDeployments, createDeploymentStatus, deleteDeployment };
}

describe("deployment publication policy", () => {
  it("skips publication only when every changed path is explicit project bookkeeping", () => {
    expect(isBookkeepingOnly(["PRODUCT.md", "docs/project-management.yaml", "backlog/tasks/x.md"])).toBe(true);
    expect(isBookkeepingOnly(["integrations/hermes/README.md", "docs/project-conventions.md"])).toBe(true);
    expect(isBookkeepingOnly(["src/App.tsx"])).toBe(false);
    expect(isBookkeepingOnly(["public/docs/terms.html"])).toBe(false);
    expect(isBookkeepingOnly(["PRODUCT.md", "src/App.tsx"])).toBe(false);
    expect(isBookkeepingOnly(["docs/ci-cd.md"])).toBe(false);
    expect(isBookkeepingOnly([".github/workflows/workers.yml"])).toBe(false);
    expect(isBookkeepingOnly(["scripts/deploy-required.mjs"])).toBe(false);
    expect(isBookkeepingOnly(["tests/actions-maintenance.test.ts"])).toBe(false);
    expect(isBookkeepingOnly(["package-lock.json"])).toBe(false);
  });

  it("compares full push ranges and new branches against main, and fails open on missing bases", () => {
    const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "ci-efficiency-"));
    const originalCwd = process.cwd();
    const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
    const commit = (file: string, contents: string) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
      git("add", "--all");
      git("commit", "-m", "test commit");
      return git("rev-parse", "HEAD");
    };
    try {
      process.chdir(scratch);
      git("init", "--initial-branch=main");
      git("config", "user.name", "CI test");
      git("config", "user.email", "ci-test@example.invalid");
      const main = commit("src/App.tsx", "initial source");
      git("update-ref", "refs/remotes/origin/main", main);
      git("switch", "-c", "multi-commit");
      const before = commit("PRODUCT.md", "bookkeeping one");
      const target = commit("docs/project-conventions.md", "bookkeeping two");
      expect(shouldDeploy({ eventName: "push", before, sha: target })).toBe(false);
      const sourceTarget = commit("src/App.tsx", "changed source");
      expect(shouldDeploy({ eventName: "push", before, sha: sourceTarget })).toBe(true);

      git("switch", "-c", "new-branch", main);
      commit("PRODUCT.md", "new branch bookkeeping");
      const newBranchTarget = commit("public/docs/example.html", "public docs");
      expect(shouldDeploy({ eventName: "push", before: "0".repeat(40), sha: newBranchTarget })).toBe(true);
      expect(shouldDeploy({ eventName: "push", before: "f".repeat(40), sha: newBranchTarget })).toBe(true);
      expect(shouldDeploy({ eventName: "workflow_dispatch", before: "0".repeat(40), sha: main })).toBe(true);
      expect(shouldDeploy({ eventName: "push", sha: target })).toBe(true);

      git("switch", "-c", "source-then-bookkeeping", main);
      commit("src/App.tsx", "earlier source change");
      const bookkeepingTail = commit("PRODUCT.md", "latest bookkeeping change");
      expect(shouldDeploy({ eventName: "push", before: "0".repeat(40), sha: bookkeepingTail })).toBe(true);

      git("switch", "-c", "new-bookkeeping-only", main);
      const newBookkeeping = commit("PRODUCT.md", "bookkeeping only");
      expect(shouldDeploy({ eventName: "push", before: "0".repeat(40), sha: newBookkeeping })).toBe(false);

      git("switch", "-c", "rename-source-to-bookkeeping", main);
      fs.mkdirSync("backlog/tasks", { recursive: true });
      git("mv", "src/App.tsx", "backlog/tasks/renamed.md");
      git("commit", "-m", "rename site source");
      const renamed = git("rev-parse", "HEAD");
      expect(shouldDeploy({ eventName: "push", before: main, sha: renamed })).toBe(true);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("keeps PR validation including Dependabot and closed-PR cleanup, while excluding Dependabot pushes", () => {
    expect(workflow).toContain("pull_request:\n    branches: [main]\n    types: [opened, synchronize, reopened, closed]");
    expect(workflow).toContain("- '!dependabot/**'");
    expect(workflow).toContain("github.event.action == 'closed'");
    expect(workflow).toContain("deploy_required == 'true'");
    expect(workflow).toContain("needs: [validate, deploy-production]");
    expect(workflow).toContain("needs.deploy-production.result == 'success'");
    expect(workflow).toContain("actions/download-artifact@v8");
  });
});

describe("preview deployment cleanup behavior", () => {
  it("marks every selected deployment inactive before deleting, even without active fields", async () => {
    const result = await runCleanup({ deployments: [{ id: 11, environment: "preview", ref: "topic" }, { id: 12, environment: "preview", ref: "topic" }] });
    expect(result.events).toEqual(["inactive:11", "delete:11", "inactive:12", "delete:12"]);
    expect(result.createDeploymentStatus).toHaveBeenCalledWith(expect.objectContaining({ state: "inactive", auto_inactive: false }));
  });

  it("preserves deployments while another open PR uses the same head branch", async () => {
    const result = await runCleanup({ openPullRequests: [{ number: 5 }], deployments: [{ id: 1 }] });
    expect(result.events).toEqual([]);
    expect(result.paginationParams).toHaveLength(1);
  });

  it("skips foreign fork PRs to avoid same-name branch collisions", async () => {
    const result = await runCleanup({ headOwner: "someone-else", deployments: [{ id: 1 }] });
    expect(result.events).toEqual([]);
    expect(result.pullsList).not.toHaveBeenCalled();
    expect(result.paginationParams).toEqual([]);
  });

  it("does not delete if inactivation fails", async () => {
    const events: string[] = [];
    const script = cleanupScript();
    const github = {
      paginate: async (_endpoint: () => Promise<{ data: unknown[] }>, params: unknown) =>
        typeof params === "object" && params !== null && "head" in params ? [] : [{ id: 3, environment: "preview", ref: "topic" }],
      rest: {
        pulls: { list: async () => ({ data: [] }) },
        repos: {
          listDeployments: async () => ({ data: [{ id: 3, environment: "preview", ref: "topic" }] }),
          createDeploymentStatus: async () => { events.push("inactive"); throw new Error("status update failed"); },
          deleteDeployment: async () => { events.push("delete"); return { data: {} }; },
        },
      },
    };
    await expect(vm.runInNewContext(`(async () => {\n${script}\n})()`, {
      github,
      core: { info: () => undefined },
      context: { payload: { pull_request: { head: { ref: "topic", repo: { owner: { login: "nurvel" }, full_name: "nurvel/nurmi-dev" } } } }, repo: { owner: "nurvel", repo: "nurmi-dev" } },
    })).rejects.toThrow("status update failed");
    expect(events).toEqual(["inactive"]);
  });

  it("lists and deletes only the exact preview environment and head ref", async () => {
    const result = await runCleanup({ deployments: [
      { id: 1, environment: "production", ref: "topic" },
      { id: 2, environment: "preview", ref: "other-branch" },
      { id: 3, environment: "preview", ref: "topic" },
    ] });
    expect(result.paginationParams).toContainEqual(expect.objectContaining({ environment: "preview", ref: "topic" }));
    expect(result.events).toEqual(["inactive:3", "delete:3"]);
  });

  it("skips a different repository even under the same owner, and deleted head repositories", async () => {
    expect((await runCleanup({ headRepo: "fork", deployments: [{ id: 1 }] })).events).toEqual([]);
    expect((await runCleanup({ headOwner: "", deployments: [{ id: 1 }] })).paginationParams).toEqual([]);
  });
});
