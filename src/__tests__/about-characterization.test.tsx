import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";

describe("approved one-page About page semantics", () => {
  beforeEach(() => render(<ThemeProvider theme={theme}><About /></ThemeProvider>));
  it("has a single hero heading and About/Recent work section headings", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Recent work" })).toBeInTheDocument();
  });
  it("preserves the approved profile, role, project and contact copy", () => {
    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("15+ years connecting business goals with technology.")).toBeInTheDocument();
    for (const role of ["Technical Product Owner", "Full-Stack Developer", "Head of R&D", "Performance Marketer"]) expect(screen.getByText(role)).toBeInTheDocument();
    for (const title of ["Contract monitoring system", "Configuration UI", "SaaS marketplace", "Website & SEO"]) expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
  });
});
