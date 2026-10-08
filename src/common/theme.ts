const theme = {
  colors: {
    // Compatibility tokens for retained legacy component modules; active page
    // styling uses the neutral design tokens below.
    brightPink: "var(--color-accent-decorative)",
    darkPink: "var(--color-accent)",
    violet: "var(--color-accent)",
    darkBlue: "var(--color-text-primary)",
    lightBlue: "var(--color-text-secondary)",
    cyan: "var(--color-accent)",
    darkViolet: "var(--color-text-primary)",
    headingShadow: "none",
    aboutAccent: "var(--color-accent)",
    aboutAccentGlow: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    aboutTextPrimary: "var(--color-text-primary)",
    aboutUnderlineEnd: "var(--color-accent)",
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    background: "var(--color-background)",
    surface: "var(--color-surface)",
    border: "var(--color-border)",
    accent: "var(--color-accent)",
    accentDecorative: "var(--color-accent-decorative)",
    focus: "var(--color-focus)",
  },
  typography: {
    family: "Inter, ui-sans-serif, system-ui, sans-serif",
    displayFamily: "'Space Grotesk', sans-serif",
    handwrittenFamily: "Caveat, cursive",
    scale: { h1: "5rem", h2: "4rem", body: "1.5rem", h1Mobile: "2.5rem", h2Mobile: "2rem", bodyMobile: "1rem" },
    weights: { light: 300, regular: 400, bold: 600 },
  },
  layout: {
    sectionMinHeight: "100vh",
    sectionPadding: "1em",
  },
  breakpoints: {
    mobile: "700px",
  },
} as const;

export type Theme = typeof theme;

export default theme;
