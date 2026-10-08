import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import App from "../App";
import { careerData, getCareerLayout, parseMonth } from "../data/career";

afterEach(() => vi.restoreAllMocks());

describe("career data", () => {
  it("keeps the confirmed employers, assignments, education and concurrency", () => {
    expect(careerData.employers).toHaveLength(9);
    expect(careerData.assignments).toHaveLength(14);
    expect(careerData.education).toHaveLength(10);
    expect(careerData.concurrentAssignments).toEqual([
      ["voitto_performance", "voitto_internal_data"],
      ["twoday_teamlead", "twoday_saas"],
      ["twoday_teamlead", "twoday_product"],
    ]);
    expect(careerData.assignments.find(({ id }) => id === "nitor_current")).toMatchObject({ focusDetail: "Architecture & AI" });
    expect(careerData.assignments.find(({ id }) => id === "nitor_current")?.mode).toBeUndefined();
  });

  it("normalizes inclusive year/month boundaries and rejects invalid dates or references", () => {
    expect(parseMonth("2004")).toBe(2004 * 12);
    expect(parseMonth("2009-08")).toBe(2009 * 12 + 7);
    const layout = getCareerLayout(careerData);
    expect(layout.assignments.find(({ item }) => item.id === "seed_marketing")).toMatchObject({ start: 2009 * 12 + 7, end: 2013 * 12 + 10, endExclusive: 2013 * 12 + 11 });
    expect(layout.assignments.find(({ item }) => item.id === "saashop_marketplace")?.end).toBe(2023 * 12 + 2);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_configuration")?.end).toBe(2026 * 12);
    expect(layout.assignments.find(({ item }) => item.id === "nitor_current")?.endExclusive).toBe(2026 * 12 + 9 + 7 / 31);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_teamlead")?.endExclusive).toBe(2024 * 12 + 6);
    expect(() => parseMonth("2026-13")).toThrow(/Invalid career date/);
    expect(() => getCareerLayout({ ...careerData, assignments: [{ ...careerData.assignments[0], employerId: "missing" }], concurrentAssignments: [] })).toThrow(/Unknown employer/);
    expect(() => getCareerLayout({ ...careerData, assignments: [{ ...careerData.assignments[0], domainId: "missing" }], concurrentAssignments: [] })).toThrow(/Unknown domain/);
    expect(() => getCareerLayout({ ...careerData, concurrentAssignments: [["missing", "freelance_web"]] })).toThrow(/Invalid concurrent assignment reference/);
    expect(() => getCareerLayout({ ...careerData, employers: [{ ...careerData.employers[0], start: "2010", end: "2009" }] })).toThrow(/Employer interval ends before it starts/);
    expect(() => getCareerLayout({ ...careerData, asOf: "2026-02-30" })).toThrow(/Invalid career as-of date/);
  });

  it("derives domain and confirmed-concurrency presentation from the assignments", () => {
    const layout = getCareerLayout(careerData);
    expect(layout.assignments.find(({ item }) => item.id === "seed_marketing")?.domain.label).toBe("Marketing");
    expect(layout.concurrency).toHaveLength(3);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_saas")?.alongside).toEqual(["Team Lead"]);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_configuration")?.alongside).toEqual([]);
  });
});

describe("career timeline UI", () => {
  it("is placed between recent work and contact, has independent layers, and never hides roles", async () => {
    const { container } = render(<App />);
    const recent = screen.getByRole("heading", { name: "Recent work" }).closest("section")!;
    const career = screen.getByRole("region", { name: "Career" });
    const contact = screen.getByRole("region", { name: "Contact" });
    expect(recent.compareDocumentPosition(career) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(career.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(career).getAllByRole("button", { name: / at / })).toHaveLength(14);
    expect(within(career).queryByText(/VR LOGISTICS|HSL|Aidon|Capgemini/i)).not.toBeInTheDocument();
    const focus = within(career).getByRole("checkbox", { name: "Areas of focus" });
    const education = within(career).getByRole("checkbox", { name: "Education" });
    expect(focus).toBeChecked();
    expect(education).not.toBeChecked();
    expect(within(career).getByText("Web services")).toBeVisible();
    fireEvent.click(focus);
    expect(focus).not.toBeChecked();
    expect(education).not.toBeChecked();
    expect(within(career).queryByText("Web services")).not.toBeInTheDocument();
    expect(within(career).getAllByRole("button", { name: / at / })).toHaveLength(14);
    fireEvent.click(education);
    expect(within(career).getByText("Education & certificates")).toBeVisible();
    expect(within(career).getAllByRole("button").filter((button) => button.getAttribute("aria-label")?.startsWith("Education detail:"))).toHaveLength(10);
    expect(within(career).getByRole("button", { name: "Full-stack Developer at Nitor" })).toHaveTextContent("Full-stack Developer");
    expect(within(career).getByRole("button", { name: "Education detail: Data Analytics" })).toHaveAttribute("data-kind", "point");
    expect(within(career).getByRole("button", { name: "Education detail: Data Analytics" })).toHaveAttribute("data-position");
    expect(within(career).getAllByText("Alongside Team Lead")).toHaveLength(2);
    expect(within(career).queryByText("Alongside Technical Product Owner")).not.toBeInTheDocument();
    const nitorButton = within(career).getByRole("button", { name: "Full-stack Developer at Nitor" });
    expect(Number(nitorButton.parentElement?.querySelector("div[data-end-month]")?.getAttribute("data-end-month"))).toBeCloseTo(25 * 12 + 9 + 7 / 31);
    const axis = within(career).getByLabelText("Year axis");
    expect(within(axis).getAllByText(/^20\d{2}$/)).toHaveLength(6);
    expect(within(axis).getByText("2001")).toHaveStyle({ left: "0%" });
    expect(within(axis).getByText("2026")).toHaveStyle({ left: "100%", transform: "translateX(-100%)" });
  });

  it("opens a date-free detail dialog, closes on Escape, and restores focus to its opener", () => {
    const { rerender } = render(<App />);
    const opener = screen.getByRole("button", { name: "Full-stack Developer at Nitor" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Full-stack Developer" });
    expect(dialog).toHaveAttribute("aria-describedby", "career-dialog-description");
    expect(within(dialog).getByText("Full-stack development with a focus on architecture and AI.")).toHaveAttribute("id", "career-dialog-description");
    expect(dialog.textContent).toContain("Nitor");
    expect(dialog.textContent).not.toContain("Consulting");
    expect(dialog.textContent).not.toMatch(/\b20\d{2}\b/);
    expect(dialog.textContent).not.toMatch(/VR LOGISTICS|HSL|Aidon|Capgemini/i);
    rerender(<App />);
    const close = within(dialog).getByRole("button", { name: "Close" });
    fireEvent.keyDown(close, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full-stack Developer at Nitor" })).toHaveFocus();
  });

  it("shows study spans and point education events without date text or certificate validity claims", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Education" }));
    const cs = screen.getByRole("button", { name: "Education detail: Computer Science · 50 credits" });
    expect(cs).toHaveAttribute("data-kind", "span");
    const cert = screen.getByRole("button", { name: "Education detail: Certified SAFe 4 DevOps Practitioner" });
    expect(cert).toHaveAttribute("data-kind", "point");
    expect(cert.parentElement?.nextElementSibling?.querySelector("span")).toHaveStyle({ width: "5px" });
    fireEvent.click(cert);
    const dialog = screen.getByRole("dialog", { name: "Certified SAFe 4 DevOps Practitioner" });
    expect(dialog.textContent).toContain("Scaled Agile, Inc.");
    expect(dialog.textContent).not.toMatch(/\b20\d{2}\b|valid until|currently valid/i);
  });
});
