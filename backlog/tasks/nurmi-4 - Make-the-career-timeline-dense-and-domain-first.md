---
id: NURMI-4
title: Make the career timeline dense and domain-first
status: In Progress
assignee: []
created_date: '2026-10-09 04:44'
updated_date: '2026-10-09 04:54'
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
- [ ] #6 Fresh tests, build, preview parity and diff checks pass; primary verifies dense geometry, labels, both themes, desktop/tablet/320px, toggles/disclosure and all dialogs on the exact candidate. Independent same-card review passes before operator updates only the private preview.
<!-- AC:END -->
