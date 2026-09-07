# Project conventions

This repository uses repository-native planning without changing the existing application or Git delivery flow.

## Read order and source ownership

When the approved `AGENTS.md` is present, read it first. Then read `PRODUCT.md`, `docs/project-management.yaml`, `docs/project-conventions.md`, `backlog/config.yml` and the active `backlog/` contents, and `docs/ci-cd.md` for delivery truth. Read `integrations/hermes/README.md` only when optional execution mapping is relevant.

- `PRODUCT.md` owns the current product purpose and boundary.
- `backlog/` owns durable planning items, their lifecycle, and future horizon labels.
- Git and pull-request history own implementation history.
- `integrations/hermes/` is only an optional mapping from an existing durable task to an execution card.
- `docs/ci-cd.md` owns the project's existing branch, preview, production, and release workflow.

## Backlog baseline

Backlog.md 1.51.0 is configured in `backlog/config.yml` with local-only query behavior: remote operations are disabled, active-branch inspection is disabled for this empty baseline, automatic commits are disabled, and Git integration remains enabled. The task prefix is `NURMI` and the lifecycle statuses are `To Do`, `In Progress`, and `Done`.

The active task set is intentionally empty in this migration. This is a one-time current-population hold, not a permanent ban: a later Product/PO decision may populate the backlog with real, accepted work. Do not add filler tasks, a migration-done task, invented milestones, historical backfill, or task templates presented as work items. Use labels such as `horizon:now`, `horizon:next`, and `horizon:later` to separate planning horizons without adding a custom lifecycle status.

Useful local commands:

```text
backlog doctor
backlog task list --json
backlog task create "Accepted task title"
```

Creating a task is a later planning action and is not part of this baseline.

## Source-map compatibility exception

`docs/project-management.yaml` deliberately uses the legacy-compatible `k8-project-management` schema at version `1.0.0`, with project ID `nurmi-dev`. The Operations validator may classify this shape as `legacy-compatible`; that is not a claim of v1 source-map conformance. The v1 `ff-only` delivery field is not asserted because this project's existing documented flow is PR-based and must remain unchanged. `docs/ci-cd.md` is the delivery authority, and this exception does not authorize changes to the Git flow, validator, or Operations repository.

Shared references: [project planning](https://hermes.nurmi.dev/architecture/standards/project-planning/), [project setup](https://hermes.nurmi.dev/architecture/standards/project-setup/), [project source map](https://hermes.nurmi.dev/architecture/standards/project-source-map/), [Git Branch Lifecycle](https://hermes.nurmi.dev/architecture/standards/git-branch-lifecycle/), and [Delivery Closeout](https://hermes.nurmi.dev/operations/delivery-closeout-standard/).

## Existing delivery flow

`main` is the production branch and other branches are preview branches. Changes use the existing pull-request flow into `main`; the existing GitHub Actions workflow then governs Cloudflare preview or production publication and release behavior. This migration is local-only and does not authorize push, pull-request creation, merge, tag, release, deployment, remote configuration, or branch cleanup.

## Optional Hermes boundary

Hermes is a removable execution adapter, not a product, backlog, or runtime dependency. No execution card, board ID, graph, host path, runtime state, credential, or automatic mapping is created by this baseline. See `integrations/hermes/README.md` for the future-only boundary.

## Public repository handling

Keep this public repository limited to source-backed public site content and project conventions. Never commit credentials, tokens, private paths, session or runtime state, generated `node_modules`/`dist` artifacts, raw consultation reports, or personal information that is not already part of the published site content.

Required local checks for a planning-only change are `npm test`, `npm run build`, `npm run preview:check`, and `git diff --check`. These checks do not imply remote delivery or production smoke testing.
