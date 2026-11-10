# Product: nurmi.dev

## Current purpose

nurmi.dev is a public personal and professional website. Its primary rendered experience is an About page that helps readers understand Veli-Pekka Nurmi's professional profile, roles, current focus, recent work, and public contact links. A small, standalone `/docs/` area provides public application descriptions, privacy information and terms for the owner's integrations.

## Current behavior and boundary

The application is a React + Vite static site. `src/App.tsx` currently renders the About page, and `src/data/siteContent.ts` is the source for its visible profile, role, focus, recent-work, and contact content. The About page includes a filterable, client-neutral career timeline sourced from `src/data/career.ts`. Roles are visible by default; employers can be enabled independently. The responsive 2008–2027 axis keeps month-based placement. Timeline labels and rails are static: detail dialogs and the Career details list are not part of the current UI. Education and focus controls are not rendered; historical source data and descriptive career details remain retained. The site is built locally and published through the repository's documented GitHub Actions and Cloudflare Workers Static Assets workflow.

The public documentation source is `public/docs/`: English standalone HTML with shared local CSS, without the About application's scripts or tracking. It is accessible by direct URL, marked `noindex`, excluded from the sitemap and unlinked from the About page. Its first case is Aito Nurmi Integrations at `/docs/integrations/google/`, covering approved Search Console and Tag Manager read-only connections, the historical local-only Drive read pilot and a separately enabled optional owner-only, on-demand Drive tool. The Drive description distinguishes broad account-accessible permission from supported single-file operations, checkpoint copies from native revisions, and request-specific OpenAI processing from automated scanning. Disclosure, provider suitability, Google consent and operational checks remain separate activation conditions; publication does not enable a connection or certify those conditions. KHH is the first reference use case, not the permanent application name. Future approved cases can be added without empty placeholder pages or a separate documentation service. The documentation does not run those integrations, make Hermes a website dependency, authorize additional APIs or guarantee provider practices, OAuth approval or production readiness.

The planned personal-service disclosure additionally covers owner-only Gmail read-only access and Calendar/Tasks reading, creation and editing, with exact minimum scopes, separate credentials and individually requested processing in the owner's Hermes conversation and OpenAI service. It excludes Keep, background collection, email mutation, event/task deletion, calendar access administration and unrequested third-party notifications. Publication is not live authentication or evidence that write tools exist; provider data-use suitability, personal consent and operational checks remain required.

The repository is the canonical implementation source. `docs/ci-cd.md` remains the detailed authority for branch, validation, preview, production publication, and release behavior. This product document does not authorize a publication or change that workflow.

## Ownership and authority

- The repository owns the application source, current product description, planning files, and implementation history.
- `PRODUCT.md` records the current product purpose and boundary; it is not a roadmap or task list.
- `backlog/` is the durable planning source when future work is explicitly accepted.
- Git and the existing pull-request history record implementation and delivery history.
- External publication remains governed by the existing GitHub Actions and Cloudflare configuration documented in `docs/ci-cd.md`.

## Non-goals

This baseline does not define a new strategy, audience expansion, success metrics, priorities, roadmap, or future MVP. It does not promise future Contact or Timeline experiences merely because related source files exist. It does not make the product depend on Hermes, Backlog.md, a Kanban board, a server-side service, or an execution-card write path.
