import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(version) {
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid package version ${JSON.stringify(version)}; expected canonical MAJOR.MINOR.PATCH`);
  }
  return version.split(".").map(BigInt);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function git(repository, args) {
  return execFileSync("/usr/bin/git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tagCommit(repository, tag) {
  return git(repository, ["rev-parse", "--verify", `${tag}^{commit}`]);
}

export function resolveBuildIdentity({
  repository = process.cwd(),
  sha,
  version,
  eventName,
  ref,
  deployRequired,
}) {
  parseVersion(version);
  const productionCandidate = ref === "refs/heads/main" &&
    (eventName === "push" || eventName === "workflow_dispatch");

  if (!productionCandidate) {
    if (typeof sha !== "string" || sha.length < 7) throw new Error("A full commit SHA is required for preview identity");
    return { buildIdentity: `preview-${sha.slice(0, 7)}`, releaseTag: "" };
  }

  if (deployRequired !== true && deployRequired !== "true") {
    return { buildIdentity: `v${version}`, releaseTag: "" };
  }
  if (typeof sha !== "string" || !/^[0-9a-f]{40,64}$/i.test(sha)) {
    throw new Error("A full commit SHA is required for production identity");
  }

  const candidate = `v${version}`;
  let tags;
  try {
    tags = git(repository, ["for-each-ref", "--format=%(refname:short)", "refs/tags"])
      .split("\n").filter((tag) => TAG_PATTERN.test(tag));
  } catch (error) {
    throw new Error(`Unable to inspect stable tags: ${error.message}`);
  }

  if (tags.includes(candidate)) {
    let commit;
    try {
      commit = tagCommit(repository, candidate);
    } catch (error) {
      throw new Error(`Unable to resolve candidate tag ${candidate}: ${error.message}`);
    }
    if (commit !== sha) throw new Error(`Candidate tag ${candidate} already points to a different commit (${commit})`);
    return { buildIdentity: candidate, releaseTag: candidate };
  }

  const highest = tags.reduce((max, tag) => {
    const versionTag = tag.slice(1);
    return max === null || compareVersions(versionTag, max) > 0 ? versionTag : max;
  }, null);
  if (highest !== null && compareVersions(version, highest) <= 0) {
    throw new Error(`Candidate ${candidate} must exceed highest stable tag v${highest}`);
  }
  return { buildIdentity: candidate, releaseTag: candidate };
}

function main() {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error("GITHUB_OUTPUT is required");
  const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const identity = resolveBuildIdentity({
    sha: process.env.GITHUB_SHA,
    version,
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    deployRequired: process.env.DEPLOY_REQUIRED,
  });
  fs.appendFileSync(output, `build_identity=${identity.buildIdentity}\nrelease_tag=${identity.releaseTag}\n`);
  console.log(`Build identity: ${identity.buildIdentity}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
