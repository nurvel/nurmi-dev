import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import Footer from "../components/Footer";
import { getBuildIdentity } from "../releaseIdentity";

describe("build identity footer", () => {
  it("renders a production version as an accessible release link", () => {
    render(
      <ThemeProvider theme={theme}>
        <Footer identity={getBuildIdentity("v1.2.3")} />
      </ThemeProvider>,
    );

    const footer = screen.getByRole("contentinfo", {
      name: "Build information",
    });
    const releaseLink = screen.getByRole("link", { name: "Version v1.2.3" });

    expect(footer).toHaveTextContent("Version v1.2.3");
    expect(releaseLink).toHaveAttribute(
      "href",
      "https://github.com/nurvel/nurmi-dev/releases",
    );
    expect(releaseLink).toHaveAttribute("target", "_blank");
    expect(releaseLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the preview marker instead of a production release", () => {
    render(
      <ThemeProvider theme={theme}>
        <Footer identity={getBuildIdentity(undefined)} />
      </ThemeProvider>,
    );

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Preview build preview-local",
    );
    expect(screen.queryByText("Version")).not.toBeInTheDocument();
  });
});
