---
id: NURMI-4
title: Make the career timeline dense and domain-first
status: Done
assignee: []
created_date: '2026-10-09 04:44'
updated_date: '2026-10-09 05:14'
labels: []
dependencies: []
type: enhancement
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved iteration of the local Career preview. Use Marketing and Software & IT as top-level groups, link each employer to its task-derived domain, position employer names above their proportional employer bars, and place lighter working-mode intervals directly below with labels to the left. Focus starts hidden. Education opens separately through a click disclosure. Adapt the supplied compact timeline references, preserving confirmed career facts and discoverable task details. Same existing stack and themes; no clients or Capgemini in the Career surface. Local implementation and Tailscale preview update only; no main merge, remote push, production publication, new framework or stack migration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Marketing and Software & IT are the top-level career groups; all nine employers are linked from assignments to the correct group, including Freelance under Software & IT.
- [x] #2 Desktop uses compact collision-safe, time-positioned employer blocks, not nine full-width employer cards. Names are above accurate employer bars; lighter Consulting, In-house and Freelance intervals appear underneath with labels to the left. Unsupported working modes and unsupported gaps are not invented.
- [x] #3 Focus is hidden by default and can be enabled. Education opens as a separate collapsed click disclosure with all ten education items and correct interval-versus-point representation.
- [x] #4 All fourteen distinct assignments and their descriptions remain discoverable through employer details. Native dialogs preserve accessible name/description, close/Escape, focus containment and return, including role changes and education disclosure.
- [x] #5 Preserve confirmed dates, inclusive ends, ongoing asOf cutoff, only three explicit concurrent pairs, English copy, existing site/themes/content, no Career clients/Capgemini and date-free labels/dialogs with years on axes only.
- [x] #6 Fresh tests, build, preview parity and diff checks pass; primary verifies dense geometry, labels, both themes, desktop/tablet/320px, toggles/disclosure and all dialogs on the exact candidate. Independent same-card review passes before operator updates only the private preview.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Historical pilot record: the checked criteria and original findings below describe that completed iteration, not the final UI. Later owner-directed revisions supersede criteria #1–#4: independent Employers/Roles filters replace focus and education controls; Roles-only is the default; domains appear as line colors and a legend, not working-mode rows or top-level groups. All fourteen assignments remain in accessible date-free dialogs, while education history remains in source data only. The visible axis is 2008–2027 and fits mobile without horizontal scrolling. The owner subsequently authorized a branch push and PR for the completed timeline; production merge/publication still require separate approval.
Implemented and independently source-reviewed the dense domain-first Career layout. Exact application candidate 531551bd3a501b75b0c24c821371c96f1d227751 passed primary browser checks across both themes and four widths: nine employers, fourteen role details and ten education details, collision-safe truthful intervals, keyboard dialogs and disclosures. Local feature branch/private-preview scope only; no main merge, remote push or production publication. Final metadata-only successor requires same-lane reviewer confirmation before the operator swaps the private preview.
<!-- SECTION:NOTES:END -->
