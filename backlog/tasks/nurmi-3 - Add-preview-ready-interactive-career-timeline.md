---
id: NURMI-3
title: Add preview-ready interactive career timeline
status: Done
assignee: []
created_date: '2026-10-08 21:25'
updated_date: '2026-10-08 21:57'
labels: []
dependencies: []
modified_files:
  - PRODUCT.md
  - package.json
  - package-lock.json
  - src/pages/About.tsx
  - src/pages/CareerTimeline.tsx
  - src/data/career.ts
  - src/__tests__/career.test.tsx
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved Career section after Recent work, implemented locally for review and Tailscale preview only. Preserve current English site, themes, existing content and PR-based publication workflow. Cleaned owner-confirmed data is staged in ignored target/career-input.json. No clients in the new career surface; Capgemini excluded. Dates are placement data only, with years on the shared axis but no dates in event labels or dialogs. Two toggles control focus overlay and education lane. Clickable roles and education open accessible details. No production publication, main merge, remote push, NURMI-2 prerendering or stack migration. Independent native same-card review follows implementation; Default owns preview exposure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Career follows Recent work; all nine employers and fourteen roles remain discoverable with years only on the common axis, no client names and no Capgemini in the new surface.
- [x] #2 Placement matches owner-confirmed data, inclusive year/month ends, ongoing Nitor Full-stack with Architecture and AI, task-derived domains and only explicitly confirmed concurrency.
- [x] #3 Focus and education toggles independently control their layers without hiding employers or roles; education distinguishes period studies from single events without certificate-validity claims.
- [x] #4 Role and education details open an accessible date-free dialog with close control, Escape, focus containment and return to the opener.
- [x] #5 Desktop, narrow mobile, both themes and reduced motion preserve readable content, functional controls and no horizontal overflow.
- [x] #6 Existing content is preserved; focused tests and full npm test, npm run build, npm run preview:check and git diff --check pass. Local candidate only; independent review and owner preview are not production approval.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Source and exact-candidate browser acceptance passed independent review on 778d2d9a5b4462ca49fb8a7c30df8b63e19b88c2. Primary verified desktop, tablet and narrow mobile in both themes, all role and education dialogs, keyboard focus and reduced motion. Mechanical local closeout only; final same-card review of this metadata update is pending. Private preview exposure is operator-owned. Production has not been released.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the owner-approved client-neutral Career timeline after Recent work, with focus and education toggles and accessible details. All acceptance criteria are verified for the local source candidate; source/browser review passed and the final local closeout snapshot remains subject to independent review. Private preview only; no production publication, main merge or remote push.
<!-- SECTION:FINAL_SUMMARY:END -->
