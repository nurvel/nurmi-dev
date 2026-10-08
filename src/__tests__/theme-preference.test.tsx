import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { getInitialTheme, THEME_STORAGE_KEY } from "../common/themePreference";
import { useThemePreference } from "../hooks/useThemePreference";
import ThemeToggle from "../components/ThemeToggle";
import { renderToString } from "react-dom/server";
import { StrictMode } from "react";

function setMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => media });
  return {
    set(value: boolean) {
      Object.defineProperty(media, "matches", { configurable: true, value });
      listeners.forEach((listener) => listener({ matches: value } as MediaQueryListEvent));
    },
    count: () => listeners.size,
  };
}

function Probe() {
  const { theme, setTheme } = useThemePreference();
  return <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme}</button>;
}

describe("theme preference", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    setMatchMedia(false);
  });

  it("uses valid saved preferences and falls back to system for absent or invalid values", () => {
    expect(getInitialTheme("dark", "light")).toBe("dark");
    expect(getInitialTheme("light", "dark")).toBe("light");
    expect(getInitialTheme(null, "dark")).toBe("dark");
    expect(getInitialTheme("sepia", "light")).toBe("light");
  });

  it("follows system changes until an explicit choice and persists the choice", async () => {
    const media = setMatchMedia(false);
    render(<Probe />);
    await screen.findByRole("button", { name: "light" });
    media.set(true);
    await screen.findByRole("button", { name: "dark" });
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    media.set(true);
    expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
  });

  it("accepts cross-tab updates and reverts to system when the preference is removed", async () => {
    const media = setMatchMedia(true);
    render(<Probe />);
    await screen.findByRole("button", { name: "dark" });
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    fireEvent(window, new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "light" }));
    expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
    localStorage.removeItem(THEME_STORAGE_KEY);
    fireEvent(window, new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: null }));
    expect(screen.getByRole("button", { name: "dark" })).toBeInTheDocument();
    media.set(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument());
  });

  it("still switches when local storage is unavailable", async () => {
    const user = userEvent.setup();
    const media = setMatchMedia(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<ThemeToggle />);
    const toggle = await screen.findByRole("switch", { name: "Dark mode" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    media.set(false);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("supports keyboard activation, preserves focus, and renders the location-free header", async () => {
    const user = userEvent.setup();
    render(<App />);
    const toggle = await screen.findByRole("switch", { name: "Dark mode" });
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText("Helsinki, FI")).not.toBeInTheDocument();
  });

  it("cleans up system listeners on unmount", async () => {
    const media = setMatchMedia(false);
    const { unmount } = render(<StrictMode><Probe /></StrictMode>);
    await screen.findByRole("button", { name: "light" });
    expect(media.count()).toBe(1);
    unmount();
    expect(media.count()).toBe(0);
  });

  it("does not present a functional switch before browser initialization", () => {
    const html = renderToString(<ThemeToggle />);
    const container = document.createElement("div"); container.innerHTML = html;
    expect(container.querySelector("button")).toHaveAttribute("disabled");
    expect(container.querySelector("button")).toHaveAttribute("hidden");
  });

  it("keeps bootstrap theme colors in sync with the blocking CSS palettes", async () => {
    const [{ readFile }, { resolve }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const html = await readFile(resolve(process.cwd(), "index.html"), "utf8");
    const css = await readFile(resolve(process.cwd(), "public/theme.css"), "utf8");
    for (const [theme, background] of [["light", "#fcfcfc"], ["dark", "#151515"]] as const) {
      expect(css).toContain(`[data-theme="${theme}"]`);
      expect(css).toContain(`--color-background: ${background}`);
    }
    expect(html.indexOf("data-theme") < html.indexOf("/src/main.tsx")).toBe(true);
    expect(html.indexOf("/theme.css") < html.indexOf("/src/main.tsx")).toBe(true);
    expect(css).toContain("background: var(--color-background);");
  });
});
