# CI/CD

## Architecture

GitHub Actions owns validation and deployment. Cloudflare Workers Static Assets serves the built Vite output.

- Worker: `nurmi-dev`
- Current non-production URL: `https://nurmi-dev.nurmi-vp.workers.dev/`
- Production domain: `https://nurmi.dev/` after the controlled cutover
- Build output: `dist/`
- Cloudflare commands:
  - preview: `wrangler versions upload --preview-alias <branch-slug>`
  - production: `wrangler deploy`

Cloudflare Git integration is not used. The Worker custom domain is the production endpoint; the historical GitHub Pages deployment is retained only as migration history until its repository setting and branch are removed.

## Branch workflow

Canonical branches:

- `main` — production
- `feature/<name>` — feature preview
- `fix/<name>` — fix preview
- `chore/<name>` — maintenance preview

For a change:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
# edit and verify locally
npm ci
npm test
npm run build
git push -u origin HEAD
```

A pull request to `main` runs validation only. A push to a repository branch runs validation and then uploads a Worker preview version. Preview aliases are normalized DNS-safe branch slugs, for example:

```text
feature/ci-cd-canary
→ feature-ci-cd-canary-nurmi-dev.nurmi-vp.workers.dev
```

Preview deployment does not promote production.

After review, merge the pull request to `main`. The push to `main` runs validation again and then promotes the validated artifact with `wrangler deploy`.

## Release tags

Tags are optional and identify production versions. Use stable SemVer tags only, and tag a commit already merged into `main`:

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

The tag workflow verifies the tag format and ancestry, then creates a GitHub Release with generated notes. A tag does not deploy Cloudflare and is not required for normal production deployment.

## GitHub configuration

The production job targets the GitHub `production` environment and publishes the
current Worker URL to the repository's Deployments view:

- Environment: `production`
- Current URL: `https://nurmi-dev.nurmi-vp.workers.dev/`
- Final URL after cutover: `https://nurmi.dev/`

Preview deployments are intentionally not registered as GitHub deployment
environments. Their branch-specific URLs are published in the Actions run
summary, while Cloudflare retains the deployed version history. This keeps the
repository's deployment list focused on production instead of accumulating
short-lived preview records.

Repository-level Actions secrets:

- `CLOUDFLARE_API_TOKEN` — Account → Workers Scripts → Edit/Write, scoped to the account containing `nurmi-dev`.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

These are repository secrets, not Environment secrets. Do not expose them to pull request validation or commit them to the repository.

SonarCloud is optional and remains skipped until both repository variables below are configured:

- `SONAR_PROJECT_KEY`
- `SONAR_ORGANIZATION`

## Cutover and rollback

`nurmi.dev` is now attached to the `nurmi-dev` Worker as its production custom domain. The cutover was verified against the `workers.dev` artifact by checking DNS, TLS, HTML parity, assets, fonts, manifest, and application routes.

For rollback, promote a known-good Worker version from Cloudflare's Deployments view and restore the previous DNS/custom-domain routing only if necessary. Do not rewrite release tags.
