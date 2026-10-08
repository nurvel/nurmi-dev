export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "nurmi-dev-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): ThemePreference | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

export function getInitialTheme(stored: unknown): ThemePreference {
  return isThemePreference(stored) ? stored : "dark";
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const background = window.getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim();
  if (background) themeColor?.setAttribute("content", background);
}

export function persistTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The in-memory preference remains active when browser storage is unavailable.
  }
}
