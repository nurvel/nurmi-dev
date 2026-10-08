import styled from "styled-components";
import { useThemePreference } from "../hooks/useThemePreference";

const Toggle = styled.button`
  &[hidden] { visibility: hidden; }
  font: inherit;
  letter-spacing: normal;
  text-transform: none;
  display: inline-grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
  &:hover { background: color-mix(in srgb, var(--color-text-primary) 7%, transparent); }
  &:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
  svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  view-transition-name: nurmi-theme-toggle;
  perspective: 240px;
  .theme-coin {
    position: relative;
    display: block;
    width: 19px;
    height: 19px;
    transform-style: preserve-3d;
    transform: rotateY(0deg);
  }
  .theme-coin .sun,
  .theme-coin .moon {
    position: absolute;
    inset: 0;
    display: block;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .theme-coin .moon { transform: rotateY(180deg); }
  html[data-theme="dark"] & .theme-coin { transform: rotateY(180deg); }
  html[data-theme-transition="active"] & {
    background: var(--color-background);
    transition: none;
  }
`;

export default function ThemeToggle() {
  const { theme, setTheme, ready } = useThemePreference();
  const isDark = theme === "dark";

  return (
    <Toggle
      type="button"
      disabled={!ready}
      hidden={!ready}
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDark}
      title={isDark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="theme-coin" aria-hidden="true">
        <svg className="sun" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
        <svg className="moon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" />
        </svg>
      </span>
    </Toggle>
  );
}
