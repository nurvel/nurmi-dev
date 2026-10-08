import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "../common/themePreference";
import { createThemeTransition } from "../common/themeTransition";

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);
  const [transition] = useState(createThemeTransition);

  const chooseTheme = useCallback((nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    persistTheme(nextTheme);
    transition.change(() => applyTheme(nextTheme));
  }, [transition]);

  useEffect(() => {
    const applyResolvedTheme = () => {
      transition.cancel();
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

    return () => {
      window.removeEventListener("storage", onStorage);
      transition.cancel();
    };
  }, [transition]);

  return { theme, setTheme: chooseTheme, ready };
}
