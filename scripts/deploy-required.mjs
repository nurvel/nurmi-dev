import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const bookkeepingFiles = new Set([
  "PRODUCT.md",
  "docs/project-management.yaml",
  "docs/project-conventions.md",
]);

export function isBookkeepingOnly(paths) {
  return Array.isArray(paths) && paths.length > 0 && paths.every((file) =>
    bookkeepingFiles.has(file) ||
    file.startsWith("backlog/") ||
    file.startsWith("integrations/hermes/"),
  );
}

// The workflow uses Ubuntu runners. Pin Git instead of trusting a caller-controlled PATH.
function git(args) {
  return execFileSync("/usr/bin/git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function changedPaths(base, sha) {
  const output = execFileSync("/usr/bin/git", ["diff", "--no-renames", "--name-only", "-z", `${base}..${sha}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return output.split("\0").filter(Boolean);
}

export function shouldDeploy({ eventName, before, sha }) {
  if (eventName === "workflow_dispatch") return true;
  if (eventName !== "push" || !sha || !before) return true;

  try {
    let base;
    if (before && !/^0+$/.test(before)) {
      // Reject missing, invalid, or unrelated event bases rather than under-reporting changes.
      git(["merge-base", "--is-ancestor", before, sha]);
      base = before;
    } else {
      // A new branch compares its complete history against main, not just the first-push tail.
      base = git(["merge-base", sha, "origin/main"]);
      if (!base) return true;
    }
    const paths = changedPaths(base, sha);
    return !isBookkeepingOnly(paths);
  } catch {
    // Any comparison ambiguity fails open to publication.
    return true;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const deployRequired = shouldDeploy({
    eventName: process.env.GITHUB_EVENT_NAME,
    before: process.env.CI_PUSH_BEFORE,
    sha: process.env.GITHUB_SHA,
  });
  const output = process.env.GITHUB_OUTPUT;
  if (!output) {
    console.error("GITHUB_OUTPUT is required");
    process.exitCode = 1;
  } else {
    fs.appendFileSync(output, `deploy_required=${deployRequired}\n`);
    console.log(`Deployment required: ${deployRequired}`);
  }
}
