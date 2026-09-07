# Product: nurmi.dev

## Current purpose

nurmi.dev is a public personal and professional website. Its current rendered experience is an About page that helps readers understand Veli-Pekka Nurmi's professional profile, roles, current focus, recent work, and public contact links.

## Current behavior and boundary

The application is a React + Vite static site. `src/App.tsx` currently renders the About page, and `src/data/siteContent.ts` is the source for its visible profile, role, focus, recent-work, and contact content. The site is built locally and published through the repository's documented GitHub Actions and Cloudflare Workers Static Assets workflow.

The repository is the canonical implementation source. `docs/ci-cd.md` remains the detailed authority for branch, validation, preview, production publication, and release behavior. This product document does not authorize a publication or change that workflow.

## Ownership and authority

- The repository owns the application source, current product description, planning files, and implementation history.
- `PRODUCT.md` records the current product purpose and boundary; it is not a roadmap or task list.
- `backlog/` is the durable planning source when future work is explicitly accepted.
- Git and the existing pull-request history record implementation and delivery history.
- External publication remains governed by the existing GitHub Actions and Cloudflare configuration documented in `docs/ci-cd.md`.

## Non-goals

This baseline does not define a new strategy, audience expansion, success metrics, priorities, roadmap, or future MVP. It does not promise future Contact or Timeline experiences merely because related source files exist. It does not make the product depend on Hermes, Backlog.md, a Kanban board, a server-side service, or an execution-card write path.
