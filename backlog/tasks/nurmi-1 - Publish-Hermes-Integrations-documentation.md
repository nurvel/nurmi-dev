---
id: NURMI-1
title: Publish Hermes Integrations documentation
status: In Progress
assignee: []
created_date: '2026-10-05 10:19'
updated_date: '2026-10-05 10:29'
labels: []
dependencies: []
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved public /docs/ section; PO-approved single bounded increment. Four standalone static pages with shared local CSS; no root navigation link, noindex, excluded from sitemap. Truthful descriptive privacy/terms with explicit unknown provider controls and retention; no Google compliance/readiness guarantees. Preserve existing PR/CI, independent review and required human approval. No OAuth/DNS/paid-service changes.
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
<!-- SECTION:NOTES:END -->
