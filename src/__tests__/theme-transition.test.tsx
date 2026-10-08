import { act, fireEvent, render, screen } from "@testing-library/react";
import ThemeToggle from "../components/ThemeToggle";
import { THEME_STORAGE_KEY } from "../common/themePreference";

type TransitionRequest = {
  update: () => void;
  resolveReady: () => void;
  rejectReady: (reason: Error) => void;
  resolveUpdate: () => void;
  rejectUpdate: (reason: Error) => void;
  resolveFinished: () => void;
  rejectFinished: (reason: Error) => void;
  skip: ReturnType<typeof vi.fn>;
};

function installTransitions() {
  const requests: TransitionRequest[] = [];
  const start = vi.fn((update: () => void) => {
    let resolveReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    let resolveUpdate!: () => void;
    let rejectUpdate!: (reason: Error) => void;
    let resolveFinished!: () => void;
    let rejectFinished!: (reason: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const updateCallbackDone = new Promise<void>((resolve, reject) => {
      resolveUpdate = resolve;
      rejectUpdate = reject;
    });
    const finished = new Promise<void>((resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    });
    const skip = vi.fn();
    requests.push({
      update,
      resolveReady,
      rejectReady,
      resolveUpdate,
      rejectUpdate,
      resolveFinished,
      rejectFinished,
      skip,
    });
    return { ready, updateCallbackDone, finished, skipTransition: skip };
  });

  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: false,
    media: query,
  })));
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: start,
  });

  return { start, requests };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-transition");
});

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
  document.documentElement.removeAttribute("data-theme-transition");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("reveals an explicit choice through a browser transition", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  expect(browser.start).not.toHaveBeenCalled();

  fireEvent.click(toggle);
  expect(browser.start).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");

  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveReady();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).toHaveAttribute("data-theme-transition", "active");

  await act(async () => {
    browser.requests[0].resolveFinished();
    await Promise.resolve();
  });
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("switches immediately when the native transition API is absent", () => {
  installTransitions();
  Reflect.deleteProperty(document, "startViewTransition");
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("places both decorative faces in one coin without changing the hit target", () => {
  installTransitions();
  render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  const coin = toggle.querySelector(".theme-coin");
  expect(coin).not.toBeNull();
  expect(coin).toHaveAttribute("aria-hidden", "true");
  expect(coin?.querySelectorAll("svg")).toHaveLength(2);
  expect(coin?.querySelector(".sun")).not.toBeNull();
  expect(coin?.querySelector(".moon")).not.toBeNull();
  expect(toggle).toHaveAttribute("type", "button");
  expect(toggle).toHaveStyle({ width: "44px", height: "44px" });
});

it("switches immediately without motion when reduced motion is requested", () => {
  const browser = installTransitions();
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
  })));
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  expect(browser.start).not.toHaveBeenCalled();
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("ignores a stale callback after another explicit choice", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  expect(browser.requests[0].skip).toHaveBeenCalledTimes(1);
  await act(async () => {
    browser.requests[1].update();
    browser.requests[1].resolveUpdate();
    browser.requests[1].resolveReady();
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveReady();
  });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(document.documentElement).toHaveAttribute("data-theme-transition", "active");
  await act(async () => {
    browser.requests[1].resolveFinished();
    await Promise.resolve();
  });
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("lets a storage update override a pending animation without replaying it", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  fireEvent(window, new StorageEvent("storage", {
    key: THEME_STORAGE_KEY,
    newValue: "dark",
  }));
  expect(browser.start).toHaveBeenCalledTimes(1);
  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveReady();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(screen.getByRole("switch", { name: "Dark mode" })).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("cancels on unmount and does not apply a pending callback", async () => {
  const browser = installTransitions();
  const { unmount } = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  unmount();
  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveReady();
    browser.requests[0].resolveFinished();
    await Promise.resolve();
  });
  expect(browser.requests[0].skip).toHaveBeenCalledTimes(1);
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("applies the choice and clears the marker when transition setup throws", () => {
  const browser = installTransitions();
  browser.start.mockImplementation(() => { throw new Error("capture unavailable"); });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("applies the choice and clears the marker when readiness rejects", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  await act(async () => {
    browser.requests[0].rejectReady(new Error("capture unavailable"));
    await Promise.resolve();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");

  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveFinished();
    await Promise.resolve();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("applies the choice and clears the marker when the update callback rejects", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  await act(async () => {
    browser.requests[0].rejectUpdate(new Error("theme update failed"));
    await Promise.resolve();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");

  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveReady();
    browser.requests[0].resolveFinished();
    await Promise.resolve();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});

it("clears the marker when a running transition rejects", async () => {
  const browser = installTransitions();
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));
  await act(async () => {
    browser.requests[0].update();
    browser.requests[0].resolveUpdate();
    browser.requests[0].resolveReady();
  });
  expect(document.documentElement).toHaveAttribute("data-theme-transition", "active");

  await act(async () => {
    browser.requests[0].rejectFinished(new Error("animation interrupted"));
    await Promise.resolve();
  });
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
});
