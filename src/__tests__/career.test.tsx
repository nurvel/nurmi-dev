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
  it("filters employers and roles independently while keeping shared rows and truthful role segments", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const employersFilter = within(career).getByRole("checkbox", { name: "Employers" });
    const rolesFilter = within(career).getByRole("checkbox", { name: "Roles" });
    expect(employersFilter).toBeChecked();
    expect(rolesFilter).toBeChecked();
    fireEvent.click(employersFilter);
    expect(career.querySelectorAll('[data-row="employers"]')).toHaveLength(0);
    const roleRows = Array.from(career.querySelectorAll<HTMLElement>("[data-role-row]"));
    expect(new Set(roleRows.map((row) => row.getAttribute("data-role-row"))).size).toBe(roleRows.length);
    const fullStack = roleRows.find((row) => row.getAttribute("data-role-row") === "Full-stack Developer");
    expect(fullStack).toHaveAttribute("data-role-row", "Full-stack Developer");
    expect(fullStack?.querySelectorAll("[data-role-rail]")).toHaveLength(5);
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
    fireEvent.click(rolesFilter);
    expect(within(career).getByText(/Select employers or roles/)).toBeVisible();
    expect(career.querySelectorAll("[data-employer-id], [data-role-rail]")).toHaveLength(0);
    fireEvent.click(rolesFilter);
    fireEvent.click(employersFilter);
    fireEvent.click(rolesFilter);
    expect(career.querySelectorAll('[data-row="employers"]')).toHaveLength(9);
    expect(career.querySelectorAll("[data-employer-id]")).toHaveLength(9);
    fireEvent.click(within(career).getByRole("button", { name: "Nitor details" }));
    expect(within(screen.getByRole("dialog", { name: "Nitor" })).getAllByRole("button", { name: /Full-stack Developer/ })).toHaveLength(1);
  });

  it("starts the shared axis at Freelance and continues through the role label space", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const axis = within(career).getByLabelText("Year axis");
    expect(axis.querySelector("span")?.textContent).toBe("2004");
    expect(career.querySelector('[data-role-rail="freelance_web"]')).toHaveAttribute("data-start-month", "0");
    expect(axis).toHaveAttribute("data-month-count", "276");
    expect(getComputedStyle(axis).width).toBe("calc(100% + 190px)");
    expect(axis.textContent).toContain("2028");
  });

  it("distinguishes employers with a tinted bordered badge", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const heading = within(career).getByRole("button", { name: "Nitor details" });
    expect(getComputedStyle(heading).borderRadius).toBe("4px");
    expect(getComputedStyle(heading).width).toBe("max-content");
    expect(getComputedStyle(heading).borderTopStyle).toBe("solid");
    expect(getComputedStyle(career).getPropertyValue("--career-employer")).toBe("#b9a3ef");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    const label = career.querySelector('[data-employer-id="nitor"] span')!;
    expect(getComputedStyle(label).borderRadius).toBe("4px");
    expect(getComputedStyle(label).borderTopStyle).toBe("solid");
  });

  it("keeps the employer heading close to its role rows", () => {
    render(<App />);
    const group = screen.getByRole("button", { name: "twoday details" }).parentElement!;
    expect(getComputedStyle(group).paddingTop).toBe("24px");
  });

  it("aligns employer headings with the first role segment instead of the end of late intervals", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    for (const heading of within(career).getAllByRole("button", { name: / details$/ })) {
      const segments = Array.from(heading.parentElement!.querySelectorAll<HTMLElement>("[data-role-rail]"));
      const start = Math.min(...segments.map((segment) => parseFloat(getComputedStyle(segment).left)));
      expect(parseFloat(heading.style.left)).toBeCloseTo(start);
      expect(heading.style.transform).toBe("none");
    }
    for (const heading of within(career).getAllByRole("button", { name: / details$/ })) {
      expect(heading.style.maxWidth).toContain("+ 190px)");
      expect(Number(heading.style.maxWidth.match(/[\d.]+/)?.[0])).toBeCloseTo(100 - parseFloat(heading.style.left), 3);
    }
  });

  it("omits employer duration decoration only when roles are also shown", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const nitor = career.querySelector('[data-employer-id="nitor"]')!;
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText));
    const classes = Array.from(nitor.classList);
    expect(rules.some((rule) => classes.some((name) => rule.includes(`.${name}:before`)))).toBe(false);
    expect(within(career).getByRole("button", { name: "Nitor details" })).toBeVisible();
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    expect(career.querySelectorAll("[data-employer-rail]")).toHaveLength(9);
  });

  it("places employer-only names above their rails without changing row height", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    for (const row of career.querySelectorAll('[data-row="employers"]')) {
      const label = row.querySelector<HTMLElement>("span")!;
      const rail = row.querySelector<HTMLElement>("[data-employer-rail]")!;
      expect(parseFloat(getComputedStyle(label).left)).toBeCloseTo(parseFloat(getComputedStyle(rail).left));
      expect(getComputedStyle(label).top).toBe("0px");
      expect(getComputedStyle(label).transform).toBe("none");
      expect(getComputedStyle(row).height).toBe(row.hasAttribute("data-row") ? "28px" : "24px");
    }
  });

  it("puts each grouped role name just after its last rail with no left label gutter", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const axis = within(career).getByLabelText("Year axis");
    expect(getComputedStyle(axis.parentElement!).getPropertyValue("--axis-left")).toBe("0px");
    for (const both of [true, false]) {
      if (!both) fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
      for (const row of career.querySelectorAll("[data-role-row]")) {
        const label = row.querySelector<HTMLElement>("span")!;
        const end = Math.max(...Array.from(row.querySelectorAll<HTMLElement>("[data-role-rail]"), (rail) => Number(rail.dataset.endMonth)));
        expect(parseFloat(label.style.left)).toBeCloseTo(end / 276 * 100);
        expect(getComputedStyle(label).marginLeft).toBe("8px");
        expect(getComputedStyle(label).textAlign).toBe("left");
        expect(getComputedStyle(label).transform).toBe("translateY(-50%)");
        expect(getComputedStyle(row).height).toBe(row.hasAttribute("data-row") ? "28px" : "24px");
      }
    }
  });

  it("uses compact inline labels and identical employer-only and role-only row layouts", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    const roleRow = career.querySelector('[data-role-row="Full-stack Developer"]')!;
    expect(getComputedStyle(roleRow).height).toBe("24px");
    expect(getComputedStyle(roleRow.querySelector("span")!).transform).toBe("translateY(-50%)");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    const employerRows = career.querySelectorAll('[data-row="employers"]');
    expect(employerRows).toHaveLength(9);
    employerRows.forEach((row) => {
      expect(getComputedStyle(row).height).toBe(row.hasAttribute("data-row") ? "28px" : "24px");
      expect(row.querySelectorAll("button")).toHaveLength(1);
    });
  });

  it("keeps employers visually secondary and role segments easy to activate", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const employer = within(career).getByRole("button", { name: "Nitor details" });
    const segment = career.querySelector<HTMLButtonElement>('[data-role-rail="nitor_current"]')!;
    const label = segment.parentElement!.querySelector("span")!;
    expect(parseFloat(getComputedStyle(employer).fontSize)).toBeLessThan(parseFloat(getComputedStyle(label).fontSize));
    expect(parseFloat(getComputedStyle(segment).height)).toBeGreaterThanOrEqual(24);
    expect(within(career).queryByRole("button", { name: /Education/ })).not.toBeInTheDocument();
  });

  it("groups repeated role titles within employers and opens the exact assignment in roles-only mode", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const repeatedRows = Array.from(career.querySelectorAll<HTMLElement>('[data-role-row="Full-stack Developer"]'));
    expect(repeatedRows).toHaveLength(3);
    expect(repeatedRows.map((row) => row.querySelectorAll("[data-role-rail]").length)).toEqual([2, 2, 1]);
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    const sharedRow = career.querySelector('[data-role-row="Full-stack Developer"]')!;
    expect(sharedRow.querySelectorAll("[data-role-rail]")).toHaveLength(5);
    const nitorSegment = sharedRow.querySelector<HTMLButtonElement>('[data-role-rail="nitor_current"]')!;
    fireEvent.click(nitorSegment);
    expect(screen.getByRole("dialog", { name: "Nitor" })).toHaveTextContent("Full-stack development with a focus on architecture and AI.");
  });

  it("uses a dedicated IT accent instead of the text color", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    expect(getComputedStyle(career).getPropertyValue("--career-it")).toBe("#55ccd1");
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText));
    expect(rules.some((rule) => rule.includes('html[data-theme="light"]') && rule.includes("--career-it: #087e8b"))).toBe(true);
  });

  it("shows roles on one career timeline with domain colors instead of work modes", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    expect(within(career).queryByRole("heading", { name: "Marketing" })).not.toBeInTheDocument();
    expect(within(career).queryByRole("heading", { name: "Software & IT" })).not.toBeInTheDocument();
    const legend = within(career).getByLabelText("Career line colors");
    expect(legend).toHaveTextContent("Marketing");
    expect(legend).toHaveTextContent("Software & IT");
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
    expect(within(career).queryByText(/^(In-house|Consulting)$/)).not.toBeInTheDocument();
    expect(career.querySelector('[data-role-rail="nitor_current"]')?.parentElement).toHaveTextContent("Full-stack Developer");
    const employers = Array.from(career.querySelectorAll<HTMLElement>("[data-employer-id]"));
    expect(employers.map((e) => e.dataset.employerId)).toEqual(["freelance", "seed", "ace_chubb", "voitto", "kpmg", "solidabis", "saashop", "twoday", "nitor"]);
    expect(career.querySelector('[data-employer-id="seed"]')).toHaveAttribute("data-domain", "marketing");
    expect(career.querySelector('[data-employer-id="nitor"]')).toHaveAttribute("data-domain", "it");
  });

  it("removes education and focus controls while retaining career placement and details", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const recent = screen.getByRole("heading", { name: "Recent work" }).closest("section")!;
    const contact = screen.getByRole("region", { name: "Contact" });
    expect(recent.compareDocumentPosition(career) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(career.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(career).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(career).queryByRole("checkbox", { name: "Areas of focus" })).not.toBeInTheDocument();
    expect(within(career).queryByRole("button", { name: /Education/ })).not.toBeInTheDocument();
    expect(career.querySelector('#career-education')).toBeNull();
    expect(within(career).getAllByRole("button", { name: / details$/ })).toHaveLength(9);
    expect(career.querySelectorAll('[data-role-rail]')).toHaveLength(14);
    fireEvent.click(within(career).getByRole("button", { name: "Nitor details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Architecture & AI");
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


});
