import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App smoke test", () => {
  it("renders the user identity", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Veli-Pekka Nurmi" })).toBeInTheDocument();
  });
});
