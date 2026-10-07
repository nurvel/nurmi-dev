const theme = {
  colors: {
    // Compatibility tokens for retained legacy component modules; active page
    // styling uses the neutral design tokens below.
    brightPink: "#e37816",
    darkPink: "#9a4700",
    violet: "#9a4700",
    darkBlue: "#171717",
    lightBlue: "#343434",
    cyan: "#9a4700",
    darkViolet: "#171717",
    headingShadow: "none",
    aboutAccent: "#9a4700",
    aboutAccentGlow: "rgba(154, 71, 0, 0.12)",
    aboutTextPrimary: "#171717",
    aboutUnderlineEnd: "#9a4700",
    textPrimary: "#171717",
    textSecondary: "#343434",
    textMuted: "#595959",
    background: "#fcfcfc",
    surface: "#ffffff",
    border: "#e5e5e5",
    accent: "#9a4700",
    accentDecorative: "#e37816",
    focus: "#9a4700",
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
