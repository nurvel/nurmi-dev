export type CareerDate = string;
export interface Employer { id: string; label: string; start: CareerDate; end: CareerDate | null }
export interface Assignment { id: string; employerId: string; role: string; start: CareerDate; end: CareerDate | null; mode?: string; domainId: string; focusGroupIds: string[]; focusDetail: string; description: string }
export interface Education { id: string; type: "degree" | "studies" | "training" | "certificate"; label: string; institution: string; start?: CareerDate; end?: CareerDate; date?: CareerDate }
export interface CareerData { asOf: string; domains: { id: string; label: string }[]; focusGroups: { id: string; label: string }[]; employers: Employer[]; assignments: Assignment[]; education: Education[]; concurrentAssignments: string[][] }

// Client-neutral, owner-confirmed public career facts. Precision is preserved internally.
export const careerData: CareerData = {
  asOf: "2026-10-07",
  domains: [{ id: "marketing", label: "Marketing" }, { id: "it", label: "Software & IT" }],
  focusGroups: [{ id: "marketing", label: "Marketing" }, { id: "data", label: "Data & analytics" }, { id: "iam", label: "Identity & access management" }, { id: "services", label: "Service development" }, { id: "architecture", label: "Architecture" }, { id: "leadership", label: "Product & leadership" }, { id: "ai", label: "AI" }],
  employers: [
    { id: "freelance", label: "Freelance", start: "2004", end: "2009" }, { id: "seed", label: "Seed Digital Media", start: "2009-08", end: "2013-11" }, { id: "ace_chubb", label: "ACE / Chubb", start: "2013-11", end: "2015-12" }, { id: "voitto", label: "Mediatoimisto Voitto", start: "2016-03", end: "2017-09" }, { id: "kpmg", label: "KPMG", start: "2018-04", end: "2019-08" }, { id: "solidabis", label: "Solidabis", start: "2020-01", end: "2021-08" }, { id: "saashop", label: "SaaShop", start: "2021-08", end: "2023-03" }, { id: "twoday", label: "twoday", start: "2023-03", end: "2026-01" }, { id: "nitor", label: "Nitor", start: "2026-01", end: null },
  ],
  assignments: [
    { id: "freelance_web", employerId: "freelance", role: "Web Developer", start: "2004", end: "2009", mode: "freelance", domainId: "it", focusGroupIds: ["services"], focusDetail: "Web services", description: "Built websites and web services for businesses and associations." },
    { id: "seed_marketing", employerId: "seed", role: "Marketing / Project Manager", start: "2009-08", end: "2013-11", mode: "consultant", domainId: "marketing", focusGroupIds: ["marketing"], focusDetail: "CRM & marketing automation", description: "Developed customer journeys, CRM and marketing automation, coordinated campaign-site production, and analysed results." },
    { id: "ace_campaigns", employerId: "ace_chubb", role: "Campaign Manager", start: "2013-11", end: "2015-12", mode: "inhouse", domainId: "marketing", focusGroupIds: ["marketing", "data"], focusDetail: "Customer data & campaign optimisation", description: "Managed acquisition and cross-selling campaigns for insurance products, including budgeting, segmentation and campaign analysis." },
    { id: "voitto_performance", employerId: "voitto", role: "Analytics / SEM", start: "2016-03", end: "2017-09", mode: "consultant", domainId: "marketing", focusGroupIds: ["marketing", "data"], focusDetail: "Analytics, search engine marketing & conversion optimisation", description: "Created measurement plans and analytics implementations, improved conversions, and managed search and display advertising." },
    { id: "voitto_internal_data", employerId: "voitto", role: "Data / Project Manager", start: "2016-03", end: "2017-09", mode: "inhouse", domainId: "marketing", focusGroupIds: ["data"], focusDetail: "Data warehouses & reporting", description: "Developed an internal marketing data warehouse and reporting alongside consulting work." },
    { id: "kpmg_iam", employerId: "kpmg", role: "IAM Developer", start: "2018-04", end: "2019-08", mode: "consultant", domainId: "it", focusGroupIds: ["iam"], focusDetail: "Identity & access management / integrations", description: "Developed global identity and access processes and integrations using SailPoint IdentityIQ." },
    { id: "solidabis_hr", employerId: "solidabis", role: "Full-stack Developer", start: "2020-01", end: "2020-02", mode: "inhouse", domainId: "it", focusGroupIds: ["iam"], focusDetail: "Identity & access management / integrations", description: "Built the first version of an internal HR system, including authentication and integrations." },
    { id: "solidabis_portal", employerId: "solidabis", role: "Full-stack Developer", start: "2020-03", end: "2021-08", mode: "consultant", domainId: "it", focusGroupIds: ["services"], focusDetail: "Self-service subscription portal", description: "Developed a business self-service portal, including user interfaces, order and subscription features, and back-end integrations." },
    { id: "saashop_marketplace", employerId: "saashop", role: "Head of R&D", start: "2021-08", end: "2023-03", mode: "inhouse", domainId: "it", focusGroupIds: ["architecture", "leadership"], focusDetail: "Product ownership & architecture", description: "Led product development, the roadmap and architecture for a SaaS marketplace." },
    { id: "twoday_teamlead", employerId: "twoday", role: "Team Lead", start: "2023-03", end: "2024-06", mode: "inhouse", domainId: "it", focusGroupIds: ["leadership"], focusDetail: "Team leadership", description: "Led a team of six consultants alongside delivery work." },
    { id: "twoday_saas", employerId: "twoday", role: "Full-stack Developer", start: "2023-03", end: "2023-05", mode: "consultant", domainId: "it", focusGroupIds: ["services"], focusDetail: "SaaS product development", description: "Built the first SaaS version of an AI-agent service, including a Next.js application foundation and authentication." },
    { id: "twoday_product", employerId: "twoday", role: "Technical Product Owner", start: "2023-05", end: "2025-09", mode: "consultant", domainId: "it", focusGroupIds: ["architecture", "leadership"], focusDetail: "Product ownership & architecture", description: "Owned requirements, prioritisation, the roadmap, solution design and releases for contract monitoring. Work included expanded transport-mode coverage, contract hierarchies, role-based access control and a user-experience redesign." },
    { id: "twoday_configuration", employerId: "twoday", role: "Full-stack Developer", start: "2025-10", end: "2026-01", mode: "consultant", domainId: "it", focusGroupIds: ["architecture"], focusDetail: "User-interface architecture", description: "Developed a device-configuration interface with schema-driven forms, validation and reusable components." },
    { id: "nitor_current", employerId: "nitor", role: "Full-stack Developer", start: "2026-01", end: null, domainId: "it", focusGroupIds: ["architecture", "ai"], focusDetail: "Architecture & AI", description: "Full-stack development with a focus on architecture and AI." },
  ],
  education: [
    { id: "media", type: "degree", label: "Media Assistant", institution: "AMTEK / Espoo City College of Technology", start: "2001", end: "2004" }, { id: "bba", type: "degree", label: "Bachelor of Business Administration · Marketing", institution: "Haaga-Helia", start: "2006", end: "2012" }, { id: "saranen", type: "training", label: "Data Analytics", institution: "Saranen Consulting", date: "2016" }, { id: "academy", type: "training", label: "IT Consultant · Java", institution: "AW Academy Finland", date: "2018" }, { id: "cs", type: "studies", label: "Computer Science · 50 credits", institution: "University of Helsinki · Open University", start: "2018", end: "2020" }, { id: "psm1", type: "certificate", label: "Professional Scrum Master I", institution: "Scrum.org", date: "2018-02" }, { id: "safe4_devops", type: "certificate", label: "Certified SAFe 4 DevOps Practitioner", institution: "Scaled Agile, Inc.", date: "2019-04" }, { id: "itil_foundation", type: "certificate", label: "ITIL Foundation Certificate in IT Service Management", institution: "AXELOS", date: "2019-04" }, { id: "aws_cloud_practitioner", type: "certificate", label: "AWS Certified Cloud Practitioner", institution: "AWS", date: "2023-03" }, { id: "cspo", type: "certificate", label: "Certified Scrum Product Owner", institution: "Scrum Alliance, Inc.", date: "2023-11" },
  ],
  concurrentAssignments: [["voitto_performance", "voitto_internal_data"], ["twoday_teamlead", "twoday_saas"], ["twoday_teamlead", "twoday_product"]],
};

export function parseMonth(value: string): number {
  const match = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/.exec(value);
  if (!match) throw new Error(`Invalid career date: ${value}`);
  return Number(match[1]) * 12 + (Number(match[2] ?? 1) - 1);
}
function inclusiveEndExclusive(value: string): number {
  return parseMonth(value.length === 4 ? `${value}-12` : value) + 1;
}
function asOfEndExclusive(value: string): number {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  if (!match) throw new Error(`Invalid career as-of date: ${value}`);
  const [, year, month, day] = match;
  const monthIndex = parseMonth(`${year}-${month}`);
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (Number(day) > daysInMonth) throw new Error(`Invalid career as-of date: ${value}`);
  return monthIndex + Number(day) / daysInMonth;
}
export function getCareerLayout(data: CareerData) {
  const employerIds = new Set(data.employers.map(({ id }) => id));
  for (const employer of data.employers) {
    const start = parseMonth(employer.start);
    const endExclusive = employer.end ? inclusiveEndExclusive(employer.end) : asOfEndExclusive(data.asOf);
    if (endExclusive <= start) throw new Error(`Employer interval ends before it starts: ${employer.id}`);
  }
  const assignmentIds = new Set(data.assignments.map(({ id }) => id));
  const domainById = new Map(data.domains.map((domain) => [domain.id, domain]));
  const focusIds = new Set(data.focusGroups.map(({ id }) => id));
  const baseAssignments = data.assignments.map((item) => {
    if (!employerIds.has(item.employerId)) throw new Error(`Unknown employer: ${item.employerId}`);
    const domain = domainById.get(item.domainId);
    if (!domain) throw new Error(`Unknown domain: ${item.domainId}`);
    for (const groupId of item.focusGroupIds) if (!focusIds.has(groupId)) throw new Error(`Unknown focus group: ${groupId}`);
    const start = parseMonth(item.start);
    const endExclusive = item.end ? inclusiveEndExclusive(item.end) : asOfEndExclusive(data.asOf);
    if (endExclusive <= start) throw new Error(`Career interval ends before it starts: ${item.id}`);
    return { item, start, end: item.end ? endExclusive - 1 : endExclusive, endExclusive, domain };
  });
  const concurrency = data.concurrentAssignments.map((pair) => {
    if (pair.length !== 2 || pair.some((id) => !assignmentIds.has(id))) throw new Error(`Invalid concurrent assignment reference: ${pair.join(", ")}`);
    return pair;
  });
  const assignmentById = new Map(baseAssignments.map(({ item }) => [item.id, item]));
  const assignments = baseAssignments.map((assignment) => ({ ...assignment, alongside: concurrency.filter((pair) => pair.includes(assignment.item.id)).flatMap((pair) => pair.filter((id) => id !== assignment.item.id).map((id) => assignmentById.get(id)!.role)) }));
  const employers = data.employers.map((item) => {
    const start = parseMonth(item.start);
    const endExclusive = item.end ? inclusiveEndExclusive(item.end) : asOfEndExclusive(data.asOf);
    const related = assignments.filter(({ item: assignment }) => assignment.employerId === item.id);
    const domainIds = [...new Set(related.map(({ item: assignment }) => assignment.domainId))];
    if (!domainIds.length) throw new Error(`Employer has no domain assignment: ${item.id}`);
    if (domainIds.length > 1) throw new Error(`Employer has assignments in multiple domains: ${item.id}`);
    const modes = [...new Set(related.flatMap(({ item: assignment }) => assignment.mode ? [assignment.mode] : []))].map((mode) => {
      const intervals = related.filter(({ item: assignment }) => assignment.mode === mode).map(({ start: intervalStart, endExclusive: intervalEnd }) => ({ start: intervalStart, endExclusive: intervalEnd })).sort((a, b) => a.start - b.start);
      const merged: { start: number; endExclusive: number }[] = [];
      for (const interval of intervals) {
        const last = merged.at(-1);
        if (last && interval.start <= last.endExclusive) last.endExclusive = Math.max(last.endExclusive, interval.endExclusive);
        else merged.push({ ...interval });
      }
      return { mode, intervals: merged };
    });
    return { item, start, endExclusive, domainId: domainIds[0], modes };
  }).sort((a, b) => a.start - b.start);
  return {
    assignments,
    employers,
    education: data.education.map((item) => {
      if (!item.start && !item.date) throw new Error(`Education date missing: ${item.id}`);
      const start = parseMonth(item.start ?? item.date!);
      const endExclusive = item.start && item.end ? inclusiveEndExclusive(item.end) : start + 1;
      if (endExclusive <= start) throw new Error(`Education interval ends before it starts: ${item.id}`);
      return { item, start, end: endExclusive - 1, endExclusive, kind: item.start && item.end ? "span" as const : "point" as const };
    }),
    concurrency,
  };
}
