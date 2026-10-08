import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyTheme,
  DARK_MODE_QUERY,
  getInitialTheme,
  getSystemTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "../common/themePreference";

export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [ready, setReady] = useState(false);
  const hasExplicitPreference = useRef(false);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    hasExplicitPreference.current = true;
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DARK_MODE_QUERY);
    const applyResolvedTheme = () => {
      const stored = readStoredTheme();
      hasExplicitPreference.current = stored !== null;
      const nextTheme = getInitialTheme(stored, getSystemTheme(media));
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };

    applyResolvedTheme();
    setReady(true);
    const onSystemChange = () => {
      if (!hasExplicitPreference.current) applyResolvedTheme();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) applyResolvedTheme();
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { theme, setTheme, ready };
}
