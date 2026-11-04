---
id: NURMI-5
title: Document the planned owner-only local Drive read pilot
status: Done
assignee:
  - default
created_date: '2026-11-03 22:55'
updated_date: '2026-11-04 21:11'
labels: []
dependencies: []
references:
  - public/docs/integrations/google/
type: docs
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved public Google documentation update and publication after checks. PO accepted this one content-only slice. Keep existing GSC/GTM descriptions; document a separately owner-approved, not-activated local Drive read pilot. No consumer, token, Google scope/config, test file, live data, cloud-model file transfer, infrastructure or billing changes. Preserve current public contact and noindex standalone routes. Standard PR/independent review/required human GitHub approval/CI apply; owner publication authority does not bypass them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Overview, privacy and terms disclose the planned inactive owner-only pilot, whole-account-accessible drive.readonly scope, no write rights and future account/consent/test-file gates.
- [x] #2 Copy separates permitted future local-only file handling from current implementation, discloses operational statuses in assistant/cloud history and pending secure storage/log checks, and makes no unsupported compliance/training/retention claim.
- [x] #3 Existing GSC/GTM scope, static route/SEO/no-script/local-CSS boundaries and public data limits are preserved; Product source and patch release metadata agree.
- [x] #4 Focused contracts and full required checks pass; exact source receives independent review and preview parity; required GitHub human approval and CI precede verified production publication.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prepared the scoped public-copy and contract-test change as a v2.3.2 candidate. Local focused/full tests, build, preview check and whitespace/backlog validation passed. The pilot remains inactive; no account consent, test file or Google configuration was changed. Publication remains pending exact-source independent review, hosted preview parity, required GitHub review and production workflow verification.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The original planned local read-pilot disclosure was published through PR #113 as v2.3.2 (c6d33f9e78219098f8098a4c97d5a98bc8725072). This is delayed bookkeeping for that verified release, not a new authorization or a claim that the later optional writing tool is active. The new writing-tool disclosure is tracked separately in NURMI-6.
<!-- SECTION:FINAL_SUMMARY:END -->
