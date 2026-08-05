/**
 * Typed, read-only site content for the About page.
 * All copy is constant at module-load time; consumers should treat this as immutable.
 */

export interface ProfileData {
  name: string;
  subtitle: string;
  avatarAlt: string;
}

export interface FocusData {
  title: string;
  highlights: string[];
  linkLabel: string;
  linkHref: string;
  afterHighlights: string;
  middle: string;
  outro: string;
}

export interface RecentWorkItemData {
  highlight: string;
  textA: string;
  /** Optional inline link label. When present, the component renders it as <a>. */
  linkLabel?: string;
  linkHref?: string;
  textB: string;
}

export interface AboutSiteContent {
  profile: ProfileData;
  description: string;
  roles: string[];
  focus: FocusData;
  recentWorkTitle: string;
  recentWork: RecentWorkItemData[];
  contacts: ContactLink[];
}

export interface ContactLink {
  label: string;
  href: string;
}

/** Description paragraph — verbatim production copy (curly apostrophe U+2019 in "I'm"). */
const DESCRIPTION =
  "I’m a Product Engineer with more than 15 years of experience" +
  "\nconnecting business goals with technology. My work spans SaaS" +
  "\nplatforms, diverse private-sector environments, and public-sector" +
  "\nsystems and online services, across both technical and product-facing" +
  "\nroles.";

export const aboutSiteContent: AboutSiteContent = {
  profile: {
    name: "Veli-Pekka Nurmi",
    subtitle: "I work with software systems from problem framing to production.",
    avatarAlt: "Veli-Pekka Nurmi",
  },
  description: DESCRIPTION,
  roles: [
    "Technical Product Owner",
    "Full-Stack Developer",
    "Head of R&D",
    "Performance Marketer",
  ],
  focus: {
    title: "Current focus",
    highlights: ["agentic coding", "spec-driven development"],
    linkLabel: "Nitor",
    linkHref: "https://nitor.com/en",
    afterHighlights: ` \u2014 where AI is used as a tool for implementation while human expertise guides strategic direction, requirements engineering, and solution architecture.`,
    middle: ` My background in both business and technology positions me well for this shift. Working at`,
    outro: " as senior software developer.",
  },
  recentWorkTitle: "Recent work",
  recentWork: [
    {
      highlight: "Contract monitoring system",
      textA: "",
      textB: " for HSL (via Twoday) \u2014 expanding into multi-modal transport visibility and proactive contract KPIs and compensations to operators.",
    },
    {
      highlight: "Configuration UI",
      textA: "",
      textB: " for Aidon (via Twoday) \u2014 schema-driven forms with durable persistence model for utilities.",
    },
    {
      highlight: "SaaS marketplace",
      textA: "",
      textB: " for SaaShop \u2014 grew ARR to EUR 1.4M while improving reliability, reducing customer support feedback, and expanding the SMB customer base.",
    },
    {
      highlight: "Website & SEO",
      textA: " for ",
      linkLabel: "Kauneushoitola Hanna",
      linkHref: "https://kauneushoitolahanna.fi",
      textB: ' — created and optimised a site for a local beauty salon. Achieved #1 ranking for "Kosmetologi J\u00e4rvenp\u00e4\u00e4".',
    },
  ],
  contacts: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/veli-pekkanurmi",
    },
    { label: "Github", href: "https://github.com/nurvel" },
    { label: "Email", href: "mailto:nurmi.vp@gmail.com" },
  ],
};
