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

  it("preserves inclusive dates and ongoing as-of cutoff", () => {
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

  it("derives domain ownership and confirmed concurrency from assignments", () => {
    const layout = getCareerLayout(careerData);
    expect(layout.assignments.find(({ item }) => item.id === "seed_marketing")?.domain.label).toBe("Marketing");
    expect(layout.assignments.find(({ item }) => item.id === "freelance_web")?.domain.label).toBe("Software & IT");
    expect(layout.concurrency).toHaveLength(3);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_saas")?.alongside).toEqual(["Team Lead"]);
    expect(layout.assignments.find(({ item }) => item.id === "twoday_configuration")?.alongside).toEqual([]);
    const solidabis = layout.employers.find(({ item }) => item.id === "solidabis")!;
    expect(solidabis.modes).toEqual([
      { mode: "inhouse", intervals: [{ start: 2020 * 12, endExclusive: 2020 * 12 + 2 }] },
      { mode: "consultant", intervals: [{ start: 2020 * 12 + 2, endExclusive: 2021 * 12 + 8 }] },
    ]);
    expect(layout.employers.find(({ item }) => item.id === "voitto")?.modes.map(({ mode }) => mode)).toEqual(["consultant", "inhouse"]);
    expect(layout.employers.find(({ item }) => item.id === "nitor")?.modes).toEqual([]);
  });
});

describe("career timeline UI", () => {
  it("groups employers by domain with focus hidden and education separately disclosed", () => {
    render(<App />);
    const recent = screen.getByRole("heading", { name: "Recent work" }).closest("section")!;
    const career = screen.getByRole("region", { name: "Career" });
    const contact = screen.getByRole("region", { name: "Contact" });
    expect(recent.compareDocumentPosition(career) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(career.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(career).getAllByRole("button", { name: / details$/i })).toHaveLength(9);
    expect(within(career).getByRole("heading", { name: "Marketing" })).toBeVisible();
    expect(within(career).getByRole("heading", { name: "Software & IT" })).toBeVisible();
    expect(within(career).getByRole("button", { name: "Freelance details" })).toBeInTheDocument();
    expect(within(career).queryByText(/VR LOGISTICS|HSL|Aidon|Capgemini/i)).not.toBeInTheDocument();
    const focus = within(career).getByRole("checkbox", { name: "Areas of focus" });
    expect(focus).not.toBeChecked();
    expect(within(career).queryByText("Web services")).not.toBeInTheDocument();
    const modeCount = career.querySelectorAll("[data-mode]").length;
    expect(within(career).getByLabelText("Year axis").textContent).toBe("200120062011201620212026");
    fireEvent.click(focus);
    expect(within(career).getByText("Web services")).toBeVisible();
    expect(within(career.querySelector(".sc-focus-summary")!).getByText(/Freelance:/).closest("p")).toHaveTextContent("Web services");
    expect(career.querySelector('[data-employer-id="freelance"]')).not.toContainElement(within(career).getByText("Web services"));
    expect(career.querySelectorAll("[data-employer-id]")).toHaveLength(9);
    expect(career.querySelectorAll("[data-mode]")).toHaveLength(modeCount);
    const education = within(career).getByRole("button", { name: /Education & certificates/ });
    expect(education).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(education);
    expect(education).toHaveAttribute("aria-expanded", "true");
    expect(within(career).getByLabelText("Education year axis").textContent).toBe("200120062011201620212026");
    expect(within(career).getAllByRole("button", { name: /^Education detail:/ })).toHaveLength(10);
    expect(getComputedStyle(within(career).getByRole("button", { name: "Education detail: Media Assistant" })).minHeight).toBe("56px");
    expect(within(career).getByRole("button", { name: "Education detail: Data Analytics" })).toHaveAttribute("data-kind", "point");
    expect(within(career).getAllByRole("button", { name: / details$/i })).toHaveLength(9);
    expect(career.querySelectorAll("[data-employer-id]")).toHaveLength(9);
    expect(career.querySelectorAll('[data-mode="consultant"]')).toHaveLength(5);
    const nitor = career.querySelector('[data-employer-id="nitor"]');
    expect(nitor?.querySelector("[data-mode]")).toBeNull();
    expect(nitor).toHaveAttribute("data-end-month");
    expect(Number(nitor?.getAttribute("data-end-month"))).toBeCloseTo(25 * 12 + 9 + 7 / 31);
    education.focus();
    fireEvent.click(education);
    expect(education).toHaveAttribute("aria-expanded", "false");
    expect(education).toHaveFocus();
  });

  it("exposes all employer roles in one date-free dialog and restores focus after Escape", () => {
    render(<App />);
    const opener = screen.getByRole("button", { name: "Nitor details" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Nitor" });
    expect(dialog).toHaveAttribute("aria-describedby", "career-dialog-description");
    expect(within(dialog).getAllByRole("button", { name: /Full-stack Developer/ })).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole("button", { name: /^Full-stack Developer/ }));
    expect(within(dialog).getByText("Full-stack development with a focus on architecture and AI.")).toHaveAttribute("id", "career-dialog-description");
    expect(dialog.textContent).not.toMatch(/\b20\d{2}\b|VR LOGISTICS|HSL|Aidon|Capgemini/i);
    const close = within(dialog).getByRole("button", { name: "Close" });
    const role = within(dialog).getByRole("button", { name: /^Full-stack Developer/ });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab" });
    expect(role).toHaveFocus();
    fireEvent.keyDown(role, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nitor details" })).toHaveFocus();
  });

  it("keeps all fourteen distinct role selectors and only confirmed concurrency links", () => {
    render(<App />);
    const roleIds = new Set<string>();
    for (const employerButton of screen.getAllByRole("button", { name: / details$/i })) {
      fireEvent.click(employerButton);
      const dialog = screen.getByRole("dialog");
      dialog.querySelectorAll<HTMLButtonElement>("[data-role-id]").forEach((button) => roleIds.add(button.dataset.roleId!));
      fireEvent.keyDown(dialog, { key: "Escape" });
    }
    expect(roleIds.size).toBe(14);
    fireEvent.click(screen.getByRole("button", { name: "Solidabis details" }));
    const solidabis = screen.getByRole("dialog", { name: "Solidabis" });
    const duplicateTitles = within(solidabis).getAllByRole("button", { name: /^Full-stack Developer/ });
    expect(duplicateTitles).toHaveLength(2);
    expect(duplicateTitles[0].getAttribute("aria-label")).not.toBe(duplicateTitles[1].getAttribute("aria-label"));
    fireEvent.keyDown(solidabis, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "twoday details" }));
    const dialog = screen.getByRole("dialog", { name: "twoday" });
    const selectors = within(dialog).getAllByRole("button").filter((button) => button.hasAttribute("data-role-id"));
    expect(selectors).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^Team Lead/ }));
    expect(within(dialog).getByText("Alongside Full-stack Developer, Technical Product Owner")).toBeVisible();
  });

  it("shows education spans and points, with date-free detail", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Education & certificates/ }));
    const cs = screen.getByRole("button", { name: "Education detail: Computer Science · 50 credits" });
    expect(cs).toHaveAttribute("data-kind", "span");
    const cert = screen.getByRole("button", { name: "Education detail: Certified SAFe 4 DevOps Practitioner" });
    expect(cert).toHaveAttribute("data-kind", "point");
    fireEvent.click(cert);
    const dialog = screen.getByRole("dialog", { name: "Certified SAFe 4 DevOps Practitioner" });
    expect(dialog.textContent).toContain("Scaled Agile, Inc.");
    expect(dialog.textContent).not.toMatch(/\b20\d{2}\b|valid until|currently valid/i);
  });
});
