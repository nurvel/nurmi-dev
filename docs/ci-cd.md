# CI/CD

## Architecture

GitHub Actions owns validation and deployment. Cloudflare Workers Static Assets serves the built Vite output.

- Worker: `nurmi-dev`
- Worker fallback/debug URL: `https://nurmi-dev.nurmi-vp.workers.dev/`
- Production domain: `https://nurmi.dev/`
- Build output: `dist/`
- Cloudflare commands:
  - preview: `wrangler versions upload --preview-alias <branch-slug>`
  - production: `wrangler deploy`

Cloudflare Git integration is not used. The Worker custom domain is the production endpoint. GitHub Pages is disabled, and the legacy `gh-pages` branch has been removed.

## Branch workflow

Branch policy:

- `main` — production
- every other repository branch — preview

For a change:

```bash
git switch main
git pull --ff-only origin main
git switch -c short-description
# edit and verify locally
npm ci
npm test
npm run build
git push -u origin HEAD
```

A pull request to `main` runs validation only, including Dependabot pull requests. Push events for `dependabot/**` branches are excluded entirely because their pull requests provide validation and those automated branches do not receive repository Cloudflare secrets. Other branch pushes run tests and build validation; a Worker preview is uploaded only when the complete pushed range contains a non-bookkeeping path. Main pushes follow the same publication decision before production deployment. Project bookkeeping means only `backlog/**`, `docs/project-management.yaml`, `docs/project-conventions.md`, `PRODUCT.md`, and `integrations/hermes/**`. Mixed changes publish; `public/docs/**`, workflow, script, test, app, build, and dependency changes are not bookkeeping. An unavailable or ambiguous comparison publishes conservatively. Manual workflow dispatch forces publication for its selected branch (production on `main`, preview otherwise), except that Dependabot branches remain excluded from secret-bearing preview jobs. Validation is never skipped by this publication optimization. Preview aliases are normalized DNS-safe branch slugs, for example:

```text
ci-cd-canary
→ ci-cd-canary-nurmi-dev.nurmi-vp.workers.dev
```

The workflow publishes each preview URL through the shared GitHub Deployment Environment `preview`. For a branch with an open pull request to `main`, GitHub exposes the branch's deployment in the PR's **Deployments** section as a clickable **View deployment** link. The same link is also available in the workflow run summary. A branch push without an associated PR still gets the deployment URL in the workflow run. When a same-repository pull request closes, cleanup paginates matching open PRs and deployments for the exact `preview` environment and head branch. It preserves deployments if another open PR uses that branch; foreign-fork PRs are skipped to avoid same-name branch collisions. Every selected deployment is marked inactive before deletion, and failed inactivation stops cleanup.

Preview deployment does not promote production.

After review, merge the pull request to `main`. The push to `main` runs validation again and promotes the validated artifact with `wrangler deploy` unless the complete pushed range is bookkeeping-only. A bookkeeping-only main push does not deploy, create a release tag, or publish a GitHub Release.

## Release identity and tags

`src/releaseIdentity.ts` is the single UI source for build identity. Vite injects
`VITE_RELEASE_VERSION` at build time. A stable `vMAJOR.MINOR.PATCH` value is
shown as the production version; every other value (including local builds) is
shown with an explicit `Preview build` marker. No version is hand-maintained in
the application.

`package.json` is the release-version source. The `2.0.0` redesign was
published through PR #100 and its stable release; it is historical, not a pending
publication gate. Stable versions use canonical `MAJOR.MINOR.PATCH`
components without leading zeroes or prerelease/build metadata. The workflow
uses `v<package version>` as the production identity and validates it before
building or deploying. A candidate must exceed the highest existing canonical
stable tag. An exact candidate tag already pointing at the same commit permits
a safe retry, including an annotated tag; a collision or Git lookup failure
fails before publication. Release creation retains its independent collision
guard and happens only after successful production deployment.

For ordinary changes, the agent normally chooses a patch bump for fixes,
content, dependency, and maintenance changes; a minor bump for an approved new
visible feature; and a major bump only with explicit owner approval. Ask the
owner if classification is materially ambiguous. Choose one bump per pending
production release/PR, not per commit or preview: further fixes in the same
pending release retain its selected version until publication. For future automated dependency PRs, a maintainer
or agent must prepare a valid release version before production merge; CI never
guesses a semantic category. Bookkeeping-only changes need no release bump and
continue validation/testing without publishing or creating a release.

As a convenient manual equivalent, `npm version patch --no-git-tag-version`
(or `minor`) updates `package.json` and the root package-lock metadata without
creating a tag. The selected version should be visible in the PR. Obtain the
owner's explicit merge and production-publication authorization before merging:
the existing push-to-`main` flow then deploys automatically. Version selection,
a green preview, and a review PASS alone do not authorize that merge. No
release-tooling dependency is required.

The validated artifact is built with the selected identity. Only after a
successful production deployment does `release-production` create and push the
tag, then create the matching GitHub Release with generated notes.

Main pushes and manual dispatches share `worker-cicd-main` serialization with
`cancel-in-progress: false`. The release step checks whether the candidate tag
already exists, rejects a tag pointing at a different commit, and skips an
existing GitHub Release. A
retry after deployment therefore reuses the same tag/release instead of
allocating another patch or creating a duplicate. The old tag-triggered
`release.yml` was removed so there is only one release owner.

Non-main branch and pull-request builds never receive a stable release tag. They use a
`preview-<commit>` identity and preview deployments remain non-production.

## GitHub configuration

The production job targets the GitHub `production` environment and publishes the
current Worker URL to the repository's Deployments view:

- Environment: `production`
- Production URL: `https://nurmi.dev/`
- Worker fallback/debug URL: `https://nurmi-dev.nurmi-vp.workers.dev/`

Preview deployments use the shared GitHub `preview` environment described
above, which makes their URLs visible from workflow runs and associated pull
requests. Closed-PR cleanup removes matching GitHub deployment records; it does
not delete Cloudflare Worker versions or affect production deployments.

Repository-level Actions secrets:

- `CLOUDFLARE_API_TOKEN` — Account → Workers Scripts → Edit/Write, scoped to the account containing `nurmi-dev`.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

These are repository secrets, not Environment secrets. Do not expose them to pull request validation or commit them to the repository.

SonarQubeCloud is used as the complementary quality tool through its GitHub App. It reports PR analysis and comments independently from the repository workflows; the old repository Sonar Actions workflow was removed. Before adding its result as a required merge gate, verify that the Sonar project uses `main` as its default branch and that the Quality Gate is computed consistently.

## Cutover and rollback

`nurmi.dev` is now attached to the `nurmi-dev` Worker as its production custom domain. The cutover was verified against the `workers.dev` artifact by checking DNS, TLS, HTML parity, assets, fonts, manifest, and application routes.

For rollback, promote a known-good prior Worker version from Cloudflare's
Deployments view. If the application release also needs to be referenced,
select the corresponding prior GitHub Release/tag; do not rewrite or reuse
release tags. The production custom domain remains `nurmi.dev`.
