export interface ProfileData {
  name: string;
  nameLines: string[];
  location: string;
  role: string;
  subtitle: string;
  avatarAlt: string;
}
export interface WorkItem {
  client: string;
  title: string;
  description: string;
  role: string;
  href?: string;
}
export type AboutParagraph = Array<{ text: string; href?: string; emphasis?: boolean }>;
export interface AboutSiteContent {
  profile: ProfileData;
  about: AboutParagraph[];
  roles: string[];
  recentWorkTitle: string;
  recentWork: WorkItem[];
  contactPrompt: string;
  contacts: ContactLink[];
}
// Legacy component contracts retained for inactive component modules.
export interface FocusData { title: string; highlights: string[]; linkLabel: string; linkHref: string; afterHighlights: string; middle: string; outro: string }
export interface RecentWorkItemData { highlight: string; textA: string; linkLabel?: string; linkHref?: string; textB: string }
export interface ContactLink { label: string; href: string }

export const aboutSiteContent: AboutSiteContent = {
  profile: { name: "Veli-Pekka Nurmi", nameLines: ["Veli-Pekka", "Nurmi"], location: "Helsinki, FI", role: "Product Engineer", subtitle: "15+ years connecting business goals with technology. Working with software systems from problem framing to production.", avatarAlt: "Veli-Pekka Nurmi portrait" },
  about: [
    [{ text: "I work across SaaS platforms, private-sector digital services, and public-sector systems in technical, product, and leadership roles." }],
    [{ text: "Currently a Senior Software Developer at " }, { text: "Nitor", href: "https://nitor.com/en" }, { text: ", working with " }, { text: "agentic coding", emphasis: true }, { text: " and " }, { text: "spec-driven development", emphasis: true }, { text: " in real delivery. AI accelerates implementation; humans still own architecture, requirements, and product direction." }],
    [{ text: "The AI era is reshaping how software gets specified, built, and evolved. My span across business, product, and technology is built for exactly that shift." }]
  ],
  roles: ["Technical Product Owner", "Full-Stack Developer", "Head of R&D", "Performance Marketer"],
  recentWorkTitle: "Recent work",
  recentWork: [
    { client: "VR LOGISTICS - VIA NITOR", title: "Logistics visibility platform", description: "Real-time map-based shipment tracking, schedules, and reporting, available 24/7, including on mobile. Accessible transport data helps streamline, refine, and automate logistics operations.", role: "Full-Stack Developer" },
    { client: "HSL · via Twoday", title: "Contract monitoring system", description: "Expanding into multi-modal transport visibility and proactive contract KPIs and compensations to operators.", role: "Tecnical Product Owner" },
    { client: "Aidon · via Twoday", title: "Configuration UI", description: "Schema-driven forms with a durable persistence model for utilities.", role: "Full-Stack Developer" },
    { client: "SaaShop", title: "SaaS marketplace", description: "Grew ARR to EUR 1.4M while improving reliability, reducing customer support feedback, and expanding the SMB customer base.", role: "Head of R&D" },
    { client: "Kauneushoitola Hanna", title: "Website & SEO", description: "Created and optimised a site for a local beauty salon. Achieved #1 ranking for “Kosmetologi Järvenpää”.", href: "https://kauneushoitolahanna.fi", role: "Performance Marketer & Full-Stack Developer" }
  ],
  contactPrompt: "Got a product or platform that needs a steady hand?",
  contacts: [
    { label: "Email", href: "mailto:nurmi.vp@gmail.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/veli-pekkanurmi" },
    { label: "GitHub", href: "https://github.com/nurvel" }
  ]
};
