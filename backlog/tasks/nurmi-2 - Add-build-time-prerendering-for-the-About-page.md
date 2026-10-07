---
id: NURMI-2
title: Add build-time prerendering for the About page
status: To Do
assignee: []
created_date: '2026-10-06 20:03'
labels: []
dependencies: []
references:
  - src/App.tsx
  - src/data/siteContent.ts
  - index.html
documentation:
  - docs/ci-cd.md
type: enhancement
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The About page currently delivers an empty React root and adds its visible content after JavaScript runs. Generate the page HTML and styled-components CSS during the production build so the main content is available immediately to users and crawlers.

Use the existing React, Vite and styled-components implementation and Cloudflare Workers Static Assets hosting. Keep this a small build-time prerendering change for the About page.

Implementation direction:
- Add a build render entry that imports the existing App and content without executing the browser bootstrap. Choose a rendering API compatible with the installed React version.
- Collect styled-components CSS with ServerStyleSheet and write the rendered HTML and styles into the generated dist/index.html while retaining Vite's generated asset references and existing metadata.
- Hydrate the generated markup in the browser, with matching content and stable style identifiers. Keep development startup working when no prerendered HTML is present.
- Keep GTM and other window/document-dependent initialization in the browser entry.

Preserve the existing standalone public /docs/ pages, environment-specific indexing rules and documented build/preview/publication flow. Generated dist/ output remains uncommitted. Image optimization, copy changes and other SEO-audit items are separate work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run build generates an index.html whose initial HTML contains the About page headings, profile text, work descriptions and contact links, together with the CSS needed to display them.
- [ ] #2 With JavaScript disabled, the page content, responsive layout and ordinary links remain usable on desktop and mobile.
- [ ] #3 With JavaScript enabled, React hydrates the existing markup without hydration warnings, duplicate content or styled-components identifier mismatches; existing behavior and local development startup still work.
- [ ] #4 Build-time rendering does not execute GTM or other browser-only initialization, and browser analytics initialization retains its existing behavior.
- [ ] #5 Existing title, description, canonical and Person metadata are retained; production, preview and standalone /docs/ indexing rules remain correct, including preview/docs noindex and docs exclusion from the sitemap.
- [ ] #6 The existing Cloudflare Static Assets deployment consumes the prerendered build without a runtime rendering service or framework migration; generated files remain excluded from Git.
- [ ] #7 Focused verification covers initial HTML/CSS output and hydration. Required repository checks (npm test, npm run build, npm run preview:check and git diff --check) pass, and build instructions explain the added step.
<!-- AC:END -->
