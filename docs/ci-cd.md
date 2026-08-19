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

A pull request to `main` runs validation only. A push to any normal non-main repository branch runs validation and then uploads a Worker preview version, except that `main` continues to production. Dependabot branch pushes run validation only because GitHub does not expose repository Cloudflare secrets to those automated branches. Preview aliases are normalized DNS-safe branch slugs, for example:

```text
ci-cd-canary
→ ci-cd-canary-nurmi-dev.nurmi-vp.workers.dev
```

For a branch with an open pull request to `main`, the workflow adds or updates one sticky PR comment with a clickable **Open preview** link. The same link is also available in the workflow run summary. A branch push without an associated PR gets the summary link only.

Preview deployment does not promote production.

After review, merge the pull request to `main`. The push to `main` runs validation again and then promotes the validated artifact with `wrangler deploy`.

## Release identity and tags

`src/releaseIdentity.ts` is the single UI source for build identity. Vite injects
`VITE_RELEASE_VERSION` at build time. A stable `vMAJOR.MINOR.PATCH` value is
shown as the production version; every other value (including local builds) is
shown with an explicit `Preview build` marker. No version is hand-maintained in
the application.

The `workers.yml` main pipeline owns the complete production release contract:

1. `validate` fetches existing stable tags, runs tests, and computes the next
   patch tag (or reuses a stable tag already pointing at the current commit).
2. The validated artifact is built with that exact tag and deployed to
   Cloudflare production.
3. Only after a successful deployment does `release-production` create and push
   the tag, then create the matching GitHub Release with generated notes.

Main pushes and manual dispatches share `worker-cicd-main` serialization with
`cancel-in-progress: false`. The release step checks whether the candidate tag
already exists, rejects a tag pointing at a different commit, and skips an
existing GitHub Release. A retry after deployment therefore reuses the same
tag/release instead of allocating another patch or creating a duplicate. The
old tag-triggered `release.yml` was removed so there is only one release owner.

Non-main branch and pull-request builds never receive a stable release tag. They use a
`preview-<commit>` identity and preview deployments remain non-production.

## GitHub configuration

The production job targets the GitHub `production` environment and publishes the
current Worker URL to the repository's Deployments view:

- Environment: `production`
- Production URL: `https://nurmi.dev/`
- Worker fallback/debug URL: `https://nurmi-dev.nurmi-vp.workers.dev/`

Preview deployments are intentionally not registered as GitHub deployment
environments. Their branch-specific URLs are published in the Actions run
summary, while Cloudflare retains the deployed version history. This keeps the
repository's deployment list focused on production instead of accumulating
short-lived preview records.

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
