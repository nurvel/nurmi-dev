---
id: NURMI-1
title: Publish Aito Nurmi Integrations documentation
status: In Progress
assignee: []
created_date: '2026-10-05 10:19'
updated_date: '2026-10-05 11:22'
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
- [ ] #4 Required local checks and independent exact-snapshot review pass; approved publication is verified through CI and exact live routes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the four static documents and shared stylesheet. Local tests, build, preview byte parity, route checks and desktop/mobile browser checks passed. Independent review, required GitHub human approval and production readback remain pending; acceptance 4 is not complete.

Owner-approved refinement replaces the preview-only hermes-integrations routes with the Google provider hierarchy and English documents. Earlier review evidence applies to the old snapshot only. Fresh local/browser checks, independent review and required GitHub approval remain publication gates.
<!-- SECTION:NOTES:END -->
