import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "../common/themePreference";

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  const chooseTheme = useCallback((nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  }, []);

  useEffect(() => {
    const applyResolvedTheme = () => {
      const nextTheme = getInitialTheme(readStoredTheme());
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    applyResolvedTheme();
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) applyResolvedTheme();
    };
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { theme, setTheme: chooseTheme, ready };
}
