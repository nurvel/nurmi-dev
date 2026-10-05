# Locally served typefaces

Fonts are vendored from Fontsource v5.3.0 npm packages and licensed under SIL Open Font License 1.1. Source tarballs used for this site redesign: `@fontsource-variable/inter`, `@fontsource-variable/space-grotesk`, and `@fontsource/caveat` (version 5.3.0). Each license is included beside its font.

| File | Family / subset / weight | SHA-256 |
|---|---|---|
| `inter-latin-wght-normal.woff2` | Inter, variable 100–900, Latin | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| `space-grotesk-latin-wght-normal.woff2` | Space Grotesk, variable 300–700, Latin | `0640890476fc1198ab4de571fb658de443c4d85b66466ec09534a8737ab1ce9d` |
| `caveat-latin-600-normal.woff2` | Caveat, 600, Latin | `d51e2283010e661d9f3dafdc9ff4b82b2ebcb2f7aa43ca48a105f5f68d46cc32` |

Inter and Space Grotesk supply the site UI and labels; Caveat supplies the decorative contact note. The previous Roboto Condensed file remains for legacy surfaces. No runtime font package dependency or third-party font request is used. All three active faces are preloaded and use `font-display: optional` to preserve the no-late-swap contract on slow connections. `npm run font:check` checks delayed cold-load geometry, real keyboard focus, network behavior and cleanup; its screenshots are taken separately after an unthrottled reload.
