import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  @font-face{font-family:Inter;src:url('/fonts/inter-latin-wght-normal.woff2') format('woff2');font-style:normal;font-weight:100 900;font-display:optional;}
  @font-face{font-family:'Space Grotesk';src:url('/fonts/space-grotesk-latin-wght-normal.woff2') format('woff2');font-style:normal;font-weight:300 700;font-display:optional;}
  @font-face{font-family:Caveat;src:url('/fonts/caveat-latin-600-normal.woff2') format('woff2');font-style:normal;font-weight:600;font-display:optional;}
  *,*::before,*::after{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  :root{--color-text-primary:${({ theme }) => theme.colors.textPrimary};--color-text-secondary:${({ theme }) => theme.colors.textSecondary};--color-text-muted:${({ theme }) => theme.colors.textMuted};--color-background:${({ theme }) => theme.colors.background};--color-surface:${({ theme }) => theme.colors.surface};--color-border:${({ theme }) => theme.colors.border};--color-accent:${({ theme }) => theme.colors.accent};--color-accent-decorative:${({ theme }) => theme.colors.accentDecorative};--color-focus:${({ theme }) => theme.colors.focus};--font-body:${({ theme }) => theme.typography.family};--font-display:${({ theme }) => theme.typography.displayFamily};--font-handwritten:${({ theme }) => theme.typography.handwrittenFamily};}
  body{margin:0;min-height:100vh;background:var(--color-background);color:var(--color-text-primary);font-family:var(--font-body);font-size:16px;line-height:1.5;font-synthesis:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
  #root{min-height:100vh;}
  a{color:inherit;}
  a:focus-visible{outline:3px solid var(--color-focus);outline-offset:3px;border-radius:2px;}
  img,svg{max-width:100%;}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;}}
`;
export default GlobalStyle;
