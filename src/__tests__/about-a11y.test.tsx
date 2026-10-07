import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";

describe("About page accessibility and link security", () => {
  beforeEach(() => render(<ThemeProvider theme={theme}><About /></ThemeProvider>));
  it("uses one h1, named About/work sections and a contact landmark", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Recent work" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Contact" })).toBeInTheDocument();
  });
  it("retains secure external links and the original mailto destination", () => {
    for (const href of ["https://nitor.com/en", "https://kauneushoitolahanna.fi", "https://www.linkedin.com/in/veli-pekkanurmi", "https://github.com/nurvel"]) {
      const link = document.querySelector(`a[href="${href}"]`);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    const email = within(screen.getByRole("navigation", { name: "Contact links" })).getByRole("link", { name: "Email" });
    expect(email).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
    expect(email).not.toHaveAttribute("target");
    expect(email).not.toHaveAttribute("rel");
  });
});
