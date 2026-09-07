# nurmi.dev repository instructions

## Read order

Read `PRODUCT.md`, `docs/project-management.yaml`, `docs/project-conventions.md`, `backlog/config.yml` and active `backlog/` items, then `docs/ci-cd.md`. Read `integrations/hermes/README.md` only when optional execution mapping is relevant.

## Source ownership

- `PRODUCT.md` owns current product purpose and non-goals.
- `backlog/` owns durable planning items and lifecycle.
- Git and pull requests own implementation history.
- Optional Hermes mapping may connect an existing durable task to an authorized execution card; it is not product or backlog authority.
- `docs/ci-cd.md` owns the existing delivery and publication truth.

The current migration hold leaves the active backlog empty. This is a one-time population boundary, not a permanent ban: future tasks require a separate Product/PO decision. Do not create filler, historical backfill, or migration-done tasks.

## Git flow and verification

Keep the existing policy unchanged: `main` is production, other branches are previews, pull requests target `main`, and the existing GitHub Actions workflow governs Cloudflare publication. Plans do not authorize push, pull-request creation, merge, tag, release, deployment, or remote configuration.

Before local closeout run:

- `npm test`
- `npm run build`
- `npm run preview:check`
- `git diff --check`

The source map intentionally uses legacy-compatible `k8-project-management` format, not a v1 `ff-only` claim; preserve the PR-based flow documented in `docs/ci-cd.md`.

## Boundaries

Keep this public repository limited to source-backed public site content and conventions. Never commit credentials, secrets, private paths, session or runtime state, generated dependencies or build output, raw consultation reports, or unapproved personal information. Hermes is optional and removable; this repository must remain usable without it.

Follow the [Cross-project Delivery Closeout Standard](https://hermes.nurmi.dev/operations/delivery-closeout-standard/) and [Git Branch Lifecycle standard](https://hermes.nurmi.dev/architecture/standards/git-branch-lifecycle/) where applicable. Those shared standards do not override this project's documented PR-to-`main` flow or authorize an `ff-only` conversion.
