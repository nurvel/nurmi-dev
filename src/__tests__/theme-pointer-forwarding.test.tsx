import { act, fireEvent, render, screen } from "@testing-library/react";
import ThemeToggle from "../components/ThemeToggle";
import { THEME_STORAGE_KEY } from "../common/themePreference";

function setup() {
  const start = vi.fn(() => ({
    ready: new Promise<void>(() => {}),
    updateCallbackDone: new Promise<void>(() => {}),
    finished: new Promise<void>(() => {}),
    skipTransition: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: start,
  });
  return { start };
}

function setToggleBounds(toggle: HTMLElement) {
  vi.spyOn(toggle, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 44, 44));
}

function dispatchRetargetedPointerClick(clientX: number, clientY: number) {
  act(() => {
    document.documentElement.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      detail: 1,
      clientX,
      clientY,
    }));
  });
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

it("forwards a root-retargeted pointer click inside the active toggle bounds", () => {
  const browser = setup();
  render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  setToggleBounds(toggle);
  document.documentElement.dataset.themeTransition = "active";

  dispatchRetargetedPointerClick(120, 220);

  expect(browser.start).toHaveBeenCalledTimes(1);
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
});

it("ignores outside and inactive root clicks and does not duplicate ordinary clicks", () => {
  const browser = setup();
  render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  setToggleBounds(toggle);

  dispatchRetargetedPointerClick(120, 220);
  expect(browser.start).not.toHaveBeenCalled();

  document.documentElement.dataset.themeTransition = "active";
  dispatchRetargetedPointerClick(99, 220);
  expect(browser.start).not.toHaveBeenCalled();

  fireEvent.click(toggle);
  expect(browser.start).toHaveBeenCalledTimes(1);
});

it("removes the root click forwarder on unmount", () => {
  const browser = setup();
  const { unmount } = render(<ThemeToggle />);
  const toggle = screen.getByRole("switch", { name: "Dark mode" });
  setToggleBounds(toggle);
  unmount();
  document.documentElement.dataset.themeTransition = "active";

  dispatchRetargetedPointerClick(120, 220);

  expect(browser.start).not.toHaveBeenCalled();
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});
