# Public documentation

The owner-approved `/docs/` area is for English public application descriptions, privacy information and terms. Aito Nurmi Integrations is the first case, grouped under Google as a provider. KHH is its first reference use case, not its permanent product boundary. This is not a private wiki, API runtime or administrative interface.

## Source and routes

- `public/docs/index.html` — documentation index at `/docs/`.
- `public/docs/integrations/google/index.html` — Google application description.
- `public/docs/integrations/google/privacy/index.html` — privacy information.
- `public/docs/integrations/google/terms/index.html` — terms.
- `public/docs/styles.css` — shared document styles and existing first-party font.

Vite copies these static files into `dist/`; Cloudflare Static Assets serves them directly. They do not load the React application's entry point or its tracking code. Do not move them behind the SPA fallback or add a client-side router just for these documents.

Every document has its own title, description, canonical URL, one H1 and `noindex, nofollow`. Keep document paths out of `public/sitemap.xml`; do not add a link from the About page, its header or footer. Do not disallow crawler access in `robots.txt`: OAuth providers must be able to read the public descriptions and policy links. Unlinked and noindex pages are still public, not confidential.

## Adding a case

Add a real, approved case under an appropriate category, such as `public/docs/integrations/<provider>/index.html`, with its own policy/terms pages where appropriate. The index links directly to the existing Google case; no empty intermediate `/docs/integrations/` page is required. Use provider identity rather than a technical Google Cloud project ID for navigation. Reuse the shared stylesheet and accessible document layout. Add the case to the documentation index and update the route/navigation tests. Do not create empty future pages, a CMS, a search service or a separate hosting project.

The owner selected Aito Nurmi Integrations as the public OAuth application name. The OAuth name, Cloud project display name, individual clients and consumer use cases are separate concepts. Keep descriptions consistent with the actual consent-screen name; a public name or route change does not enable providers, expand scopes or require new clients by itself. The prior `/docs/hermes-integrations/` routes were preview-only and were replaced before production publication; no production redirect is introduced.

Publish only source-backed public information. Never include credentials, raw provider data, private paths or runtime/session records. Distinguish credential storage from API-result processing. Unknown recipient, training, retention and deletion practices must not be converted into reassuring promises. The first case's bounded disclosure is not evidence of Google verification, Production publishing status, Limited Use compliance or long-lived API readiness.

## Checks and publication

Run `npm test`, `npm run build`, `npm run preview:check`, `backlog doctor` when planning changes, and `git diff --check`. The focused contract is `tests/docs-contract.test.ts`.

The existing preview parity check covers the About page. Additionally verify all document routes in the built preview and Cloudflare preview: expected H1/metadata and cross-links, CSS/font responses, no scripts or tracker requests, desktop/mobile overflow and keyboard navigation. Verify the root About page still has no docs link and its previous metadata remains intact.

Use the existing PR/CI publication workflow with independent review and required human approval. After release, read back every exact production document URL, check actual content rather than HTTP status alone, and verify the deployment's source identity. Revert the accepted source change through the same delivery process to remove the section; do not change DNS or billing for rollback.
