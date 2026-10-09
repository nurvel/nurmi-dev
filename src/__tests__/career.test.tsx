import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import App from "../App";
import { careerData, getCareerLayout, parseMonth } from "../data/career";
import { clampEmployerLabelLeft } from "../pages/CareerTimeline";

afterEach(() => vi.restoreAllMocks());

function renderCombinedCareer() {
  render(<App />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Employers" }));
}

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
  it("defaults to roles only while allowing employers to be enabled", () => {
    render(<App />);
    const career = screen.getByRole("region", { name: "Career" });
    const employers = within(career).getByRole("checkbox", { name: "Employers" });
    expect(employers).not.toBeChecked();
    expect(within(career).getByRole("checkbox", { name: "Roles" })).toBeChecked();
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
    expect(career.querySelectorAll("[data-employer-label], [data-employer-rail]")).toHaveLength(0);
    fireEvent.click(employers);
    expect(career.querySelectorAll("[data-employer-label]")).toHaveLength(9);
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
  });
  it("clamps a natural-width employer label at the canvas edge without truncating it", () => {
    expect(clampEmployerLabelLeft(94.736842, 320, 56)).toBeCloseTo(264);
    expect(clampEmployerLabelLeft(72, 320, 52)).toBeCloseTo(230.4);
    expect(clampEmployerLabelLeft(94.736842, 320, 380)).toBe(0);
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const combined = career.querySelector<HTMLElement>('[data-employer-id="nitor"] [data-employer-label]')!;
    expect(combined).toHaveStyle({ width: "max-content", maxWidth: "100%", whiteSpace: "nowrap" });
    expect(combined.style.left).toMatch(/px$/);
    expect(combined.closest("[data-employer-id]")).toHaveAttribute("data-start-month");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    const employerOnly = career.querySelector<HTMLElement>('[data-employer-id="nitor"] [data-employer-label]')!;
    expect(employerOnly).toHaveStyle({ width: "max-content", maxWidth: "100%", whiteSpace: "nowrap" });
    expect(employerOnly.style.left).toMatch(/px$/);
  });

  it("keeps role rails centered with compact rows and puts employer rails below their names", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const combinedRole = career.querySelector('[data-employer-id="nitor"] [data-role-row]')!;
    const combinedRail = combinedRole.querySelector<HTMLElement>("[data-role-rail]")!;
    expect(getComputedStyle(combinedRole).minHeight).toBe("24px");
    expect(getComputedStyle(combinedRole.querySelector("span")!).top).toBe("50%");
    expect(getComputedStyle(combinedRail).top).toBe("50%");
    expect(getComputedStyle(combinedRail).transform).toBe("translateY(-50%)");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    for (const row of career.querySelectorAll<HTMLElement>('[data-row="employers"]')) {
      const label = row.querySelector<HTMLElement>("[data-employer-label]")!;
      const rail = row.querySelector<HTMLElement>("[data-employer-rail]")!;
      // 24px hit area minus 5px rail and 4px bottom inset.
      expect(parseFloat(rail.style.top) + 15).toBe(Math.max(16, label.offsetHeight, label.scrollHeight) + 4);
      expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(parseFloat(rail.style.top) + 24);
    }
  });

  it("filters employers and roles independently while keeping shared rows and truthful role segments", () => {
    renderCombinedCareer();
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

  it("starts the shared axis at 2008 and crops earlier history without changing career facts", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const axis = within(career).getByLabelText("Year axis");
    expect(axis.querySelector("span")?.textContent).toBe("2008");
    expect(career.querySelector('[data-role-rail="freelance_web"]')).toHaveAttribute("data-start-month", "-48");
    expect(careerData.assignments.find(({ id }) => id === "freelance_web")).toMatchObject({ start: "2004", end: "2009" });
    expect(career.querySelector('[data-role-rail="freelance_web"]')).toHaveAttribute("data-end-month", "24");
    expect(axis).toHaveAttribute("data-month-count", "228");
    expect(axis.textContent).toContain("2027");
    expect(axis.textContent).not.toContain("2028");
    expect(axis.lastElementChild).toHaveTextContent("2027");
  });

  it("fades only the cropped rail in each active filter mode while retaining its full hit area", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const employers = within(career).getByRole("checkbox", { name: "Employers" });
    const roles = within(career).getByRole("checkbox", { name: "Roles" });
    for (const mode of ["both", "roles", "employers"]) {
      if (mode === "roles") fireEvent.click(employers);
      if (mode === "employers") { fireEvent.click(employers); fireEvent.click(roles); }
      const rail = career.querySelector<HTMLElement>(mode === "employers" ? '[data-employer-rail="freelance"]' : '[data-role-rail="freelance_web"]')!;
      expect(rail).toHaveAttribute("data-continues-before", "true");
      expect(rail).toHaveAttribute("aria-description", "Continues from before the visible timeline.");
      expect(career.querySelectorAll('button[data-continues-before="true"]')).toHaveLength(1);
      expect(parseFloat(getComputedStyle(rail).left)).toBe(0);
      expect(Number(getComputedStyle(rail).width.match(/,\s*([\d.]+)%/)?.[1])).toBeCloseTo(24 / 228 * 100);
      expect(getComputedStyle(rail).height).toBe("24px");
      const rules = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules, rule => rule.cssText));
      expect(rules.some(rule => rule.includes('[data-continues-before="true"]:after'))).toBe(true);
      // jsdom omits mask-image declarations; real-browser acceptance checks the computed mask.
      expect([...document.querySelectorAll("style")].map(style => style.textContent).join(" ")).toContain("mask-image:linear-gradient(to right,transparent,black min(24px,40%))");
      fireEvent.click(rail);
      expect(screen.getByRole("dialog", { name: "Freelance" })).toHaveTextContent("Built websites and web services");
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(rail).toHaveFocus();
    }
  });

  it("fits the timeline to its container without native zoom or horizontal scrolling", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    expect(within(career).queryByRole("slider", { name: /zoom/i })).not.toBeInTheDocument();
    const scroll = within(career).getByLabelText("Career timeline");
    const scrollStyles = [...document.querySelectorAll("style")].map((style) => style.textContent).join(" ");
    expect(scrollStyles).toContain("overflow-x:hidden");
    expect(scrollStyles).not.toContain("min-width:900px");
    expect(scrollStyles).not.toContain("padding-right:190px");
    expect(scrollStyles).not.toContain("touch-action");
    expect(scroll.querySelector("[data-employer-id]")).toBeInTheDocument();
    expect(scroll.querySelector("[data-role-rail]")).toBeInTheDocument();
  });

  it("distinguishes employers with quiet typography instead of a colored badge", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const heading = within(career).getByRole("button", { name: "Nitor details" });
    expect(getComputedStyle(heading).borderRadius).toBe("4px");
    expect(heading).toHaveStyle({ width: "max-content", maxWidth: "100%", whiteSpace: "nowrap" });
    expect(getComputedStyle(heading).borderTopStyle).toBe("solid");
    expect(getComputedStyle(career).getPropertyValue("--career-employer")).toBe("#b3abbf");
    expect(getComputedStyle(heading).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(heading).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(heading).fontWeight).toBe("700");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    const label = career.querySelector('[data-employer-id="nitor"] span')!;
    expect(getComputedStyle(label).borderRadius).toBe("4px");
    expect(getComputedStyle(label).borderTopStyle).toBe("solid");
    expect(getComputedStyle(label).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(label).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(label).fontWeight).toBe("700");
  });

  it("keeps the employer heading close to its role rows", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches("button[data-employer-label]") ? 23 : 0;
    });
    renderCombinedCareer();
    const group = screen.getByRole("button", { name: "twoday details" }).parentElement!;
    expect(getComputedStyle(group).paddingTop).toBe("24px");
    expect(getComputedStyle(group.querySelector("button")!).minHeight).toBe("24px");
    const heading = group.querySelector('button[aria-label="twoday details"]')!;
    expect(getComputedStyle(heading).display).toBe("flex");
    expect(getComputedStyle(heading).alignItems).toBe("flex-end");
    const firstLabel = group.querySelector('[data-role-row] span')!;
    expect(firstLabel).toHaveAttribute("data-label-side", "left");
  });

  it("clamps employer headings inside their row while keeping the source start metadata", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    for (const heading of within(career).getAllByRole("button", { name: / details$/ })) {
      expect(heading.style.left).toMatch(/px$/);
      expect(getComputedStyle(heading).width).toBe("max-content");
      expect(getComputedStyle(heading).maxWidth).toBe("100%");
      expect(getComputedStyle(heading).whiteSpace).toBe("nowrap");
      expect(heading.parentElement).toHaveAttribute("data-start-month");
    }
  });

  it("omits employer duration decoration only when roles are also shown", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const nitor = career.querySelector('[data-employer-id="nitor"]')!;
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText));
    const classes = Array.from(nitor.classList);
    expect(rules.some((rule) => classes.some((name) => rule.includes(`.${name}:before`) && rule.includes("background: var(--domain-color)")))).toBe(false);
    expect(within(career).getByRole("button", { name: "Nitor details" })).toBeVisible();
    expect(career.querySelectorAll("[data-role-rail]")).toHaveLength(14);
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    expect(career.querySelectorAll("[data-employer-rail]")).toHaveLength(9);
  });

  it("places employer-only rails below their names with a measured row height", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    for (const row of career.querySelectorAll<HTMLElement>('[data-row="employers"]')) {
      const label = row.querySelector<HTMLElement>("[data-employer-label]")!;
      const rail = row.querySelector<HTMLElement>("[data-employer-rail]")!;
      expect(label.style.left).toMatch(/px$/);
      expect(getComputedStyle(label).top).toBe("0px");
      expect(getComputedStyle(label).transform).toBe("none");
      // 24px hit area minus 5px rail and 4px bottom inset.
      expect(parseFloat(rail.style.top) + 15).toBe(Math.max(16, label.offsetHeight, label.scrollHeight) + 4);
      expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(parseFloat(rail.style.top) + 24);
    }
  });

  it("places role labels on their approved side of the shared date axis", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const axis = within(career).getByLabelText("Year axis");
    expect(getComputedStyle(axis.parentElement!).getPropertyValue("--axis-left")).toBe("0px");
    const combinedTwoday = career.querySelector('[data-employer-id="twoday"] [data-role-row="Team Lead"] span');
    expect(combinedTwoday).toHaveAttribute("data-label-side", "left");
    expect(career.querySelector('[data-employer-id="nitor"] [data-role-row] span')).toHaveAttribute("data-label-side", "left");
    expect(career.querySelector('[data-employer-id="saashop"] [data-role-row="Head of R&D"] span')).toHaveAttribute("data-label-side", "left");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    const fullStack = career.querySelector('[data-role-row="Full-stack Developer"]')!;
    expect(fullStack.querySelector("span")).toHaveAttribute("data-label-side", "left");
    expect(fullStack.querySelectorAll("[data-role-rail]")).toHaveLength(5);
    expect(career.querySelector('[data-role-row="Team Lead"] span')).toHaveAttribute("data-label-side", "left");
    expect(career.querySelector('[data-role-row="Technical Product Owner"] span')).toHaveAttribute("data-label-side", "left");
    expect(career.querySelector('[data-role-row="Head of R&D"] span')).toHaveAttribute("data-label-side", "left");
    expect(axis.textContent).toContain("2027");
  });

  it("uses compact inline labels and identical employer-only and role-only row layouts", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    const roleRow = career.querySelector('[data-role-row="Full-stack Developer"]')!;
    expect(getComputedStyle(roleRow).minHeight).toBe("24px");
    expect(getComputedStyle(roleRow.querySelector("span")!).transform).toBe("translateY(-50%)");
    fireEvent.click(within(career).getByRole("checkbox", { name: "Employers" }));
    fireEvent.click(within(career).getByRole("checkbox", { name: "Roles" }));
    const employerRows = career.querySelectorAll('[data-row="employers"]');
    expect(employerRows).toHaveLength(9);
    employerRows.forEach((row) => {
      expect(parseFloat(getComputedStyle(row).minHeight)).toBeGreaterThanOrEqual(28);
      expect(parseFloat(getComputedStyle(row).minHeight)).toBeLessThanOrEqual(32);
      expect(row.querySelectorAll("button")).toHaveLength(1);
    });
  });

  it("keeps employers visually secondary and role segments easy to activate", () => {
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    const employer = within(career).getByRole("button", { name: "Nitor details" });
    const segment = career.querySelector<HTMLButtonElement>('[data-role-rail="nitor_current"]')!;
    const label = segment.parentElement!.querySelector("span")!;
    expect(parseFloat(getComputedStyle(employer).fontSize)).toBeGreaterThanOrEqual(12);
    expect(getComputedStyle(employer).fontWeight).toBe("700");
    expect(parseFloat(getComputedStyle(segment).height)).toBeGreaterThanOrEqual(24);
    expect(within(career).queryByRole("button", { name: /Education/ })).not.toBeInTheDocument();
  });

  it("groups repeated role titles within employers and opens the exact assignment in roles-only mode", () => {
    renderCombinedCareer();
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
    renderCombinedCareer();
    const career = screen.getByRole("region", { name: "Career" });
    expect(getComputedStyle(career).getPropertyValue("--career-it")).toBe("#55ccd1");
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText));
    expect(rules.some((rule) => rule.includes('html[data-theme="light"]') && rule.includes("--career-it: #087e8b"))).toBe(true);
  });

  it("shows roles on one career timeline with domain colors instead of work modes", () => {
    renderCombinedCareer();
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
    renderCombinedCareer();
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
    renderCombinedCareer();
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
    renderCombinedCareer();
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
