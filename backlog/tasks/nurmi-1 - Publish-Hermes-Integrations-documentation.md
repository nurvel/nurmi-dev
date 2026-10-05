---
id: NURMI-1
title: Publish Aito Nurmi Integrations documentation
status: Done
assignee: []
created_date: '2026-10-05 10:19'
updated_date: '2026-10-05 12:22'
labels: []
dependencies: []
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved public /docs/ section; PO-approved bounded static-documentation increment. Owner-approved refinement: four English standalone pages under /docs/ and /docs/integrations/google/, including privacy and terms, using Aito Nurmi Integrations as the public OAuth application name. Shared local CSS, no root navigation link, noindex, excluded from sitemap. Preserve truthful privacy disclosures, read-only Search Console and Tag Manager scope boundaries, existing PR/CI, independent exact-snapshot review and required human GitHub approval. Only the separately authorized existing OAuth display-name change is allowed; no new clients, scope expansion, DNS, billing or paid-service changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Four documented routes render distinct static pages with correct cross-links and no scripts or trackers.
- [x] #2 All docs are noindex, omitted from sitemap and unlinked from the main About page.
- [x] #3 Privacy and terms disclose known scopes/data flows and limits without unverified compliance, training, retention or deletion promises.
- [x] #4 Required local checks and independent exact-snapshot review pass; approved publication is verified through CI and exact live routes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the four static documents and shared stylesheet. Local tests, build, preview byte parity, route checks and desktop/mobile browser checks passed. Independent review, required GitHub human approval and production readback remain pending; acceptance 4 is not complete.

Owner-approved refinement replaces the preview-only hermes-integrations routes with the Google provider hierarchy and English documents. Earlier review evidence applies to the old snapshot only. Fresh local/browser checks, independent review and required GitHub approval remain publication gates.

Owner approved publication after removing the shared documentation menu. Navigation is now contextual: documentation index to Google overview, then its Privacy and terms section to the two documents. No replacement menu, permission expansion or policy-copy change. Required GitHub approval and exact-snapshot validation remain intact; production acceptance stays open until actual deployment readback.

Publication verified on 2026-10-05 after owner GitHub approval and PR #97 squash merge. Production commit f5d7dc2aa19ccfccdfde02f39df0155b5e5c21e9 has the independently reviewed tree 1dbc1880c7305137f7eedbb3fd36b1bdb8595579. Cloudflare deployment and release workflow passed; v1.1.32 points at that exact commit. All four live documentation routes and the shared stylesheet returned HTTP 200 and matched reviewed source SHA-256 values. English, canonical URLs, noindex/nofollow, contextual document links, no navigation and no scripts were rechecked. Earlier pending notes above are historical checkpoints, not current blockers.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published Aito Nurmi Integrations documentation in release v1.1.32 through the existing approved PR/CI process. Exact source identity and all four production routes verified. Evidence: https://github.com/nurvel/nurmi-dev/pull/97 and https://github.com/nurvel/nurmi-dev/releases/tag/v1.1.32. No site-content, deployment-configuration or permission change is included in this bookkeeping closeout.
<!-- SECTION:FINAL_SUMMARY:END -->
