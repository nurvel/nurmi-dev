export function createThemeTransition() {
  let generation = 0;
  let active: ViewTransition | undefined;

  const cancel = () => {
    generation += 1;
    const current = active;
    active = undefined;
    document.documentElement.removeAttribute("data-theme-transition");
    try {
      current?.skipTransition();
    } catch {
      // A cancelled transition must not block the requested theme change.
    }
  };

  const change = (apply: () => void) => {
    cancel();
    const token = generation;
    let applied = false;
    let settled = false;
    const commit = () => {
      if (token !== generation || applied) return;
      applied = true;
      apply();
    };
    const settle = (applyFallback: boolean) => {
      if (token !== generation || settled) return;
      settled = true;
      if (applyFallback) commit();
      active = undefined;
      document.documentElement.removeAttribute("data-theme-transition");
      generation += 1;
    };

    let reducedMotion = false;
    try {
      reducedMotion = typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // Motion preference lookup must not disable the theme control.
    }
    if (reducedMotion || typeof document.startViewTransition !== "function") {
      commit();
      return;
    }

    let transition: ViewTransition;
    try {
      transition = document.startViewTransition(() => {
        if (token !== generation || settled) return;
        document.documentElement.setAttribute("data-theme-transition", "active");
        commit();
      });
    } catch {
      commit();
      settle(false);
      return;
    }

    active = transition;
    void transition.ready.catch(() => settle(true));
    void transition.updateCallbackDone.catch(() => settle(true));
    void transition.finished.then(
      () => settle(false),
      () => settle(true),
    );
  };

  return { change, cancel };
}
