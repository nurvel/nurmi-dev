import styled, { useTheme } from "styled-components";
import ProfilePic from "../assets/img/veli-pekka-nurmi-profile.png";
import { PageContainer, PageContent } from "../components/Page";
import { BodyText } from "../components/typography";
import { ProfileCard } from "../components/about/ProfileCard";
import { RolesList } from "../components/about/RolesList";
import { ContactLinks } from "../components/about/ContactLinks";

const Content = styled(PageContent)`
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  padding-top: min(30vh, 200px);
  color: #1a1a1a;

  @media (max-width: 768px) {
    padding: 0 1.5rem;
  }
`;

const Description = styled(BodyText)`
  margin: 0 0 2.5rem;
`;

const Focus = styled.div`
  padding-top: 3rem;

  @media (max-width: 768px) {
    padding-top: 2rem;
  }
`;

const FocusTitle = styled.h2`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #e91e8c;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const FocusContent = styled(BodyText)`
  font-size: 1rem;
  line-height: 1.6;
`;

const Highlight = styled.span`
  color: #1a1a1a;
  font-weight: 600;
  background: linear-gradient(
    180deg,
    transparent 60%,
    rgba(233, 30, 140, 0.2) 60%
  );
`;

const RecentWorkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const RecentWorkItem = styled(FocusContent)`
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid rgba(26, 26, 26, 0.08);
  background: #ffffff;
  color: #1a1a1a;
`;

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 12px;
  background: linear-gradient(90deg, #7209b7, #be296a);
`;

const ContactLinksContainer = styled.div`
  width: 100%;
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-bottom: 1rem;
  padding-top: 4rem;

  @media (max-width: 768px) {
    padding-bottom: 1.5rem;
  }
`;

export default function About() {
  const theme = useTheme();

  return (
    <PageContainer className="about" id="about" background="#ffffff">
      <TopBar />
      <Content>
        <ProfileCard
          name="Veli-Pekka Nurmi"
          subtitle="I work with software systems from problem framing to production."
          avatarSrc={ProfilePic}
          avatarAlt="Veli-Pekka Nurmi"
        />

        <Description>
          I’m a Product Engineer with more than 15 years of experience
          connecting business goals with technology. My work spans SaaS
          platforms, diverse private-sector environments, and public-sector
          systems and online services, across both technical and product-facing
          roles.
        </Description>

        <RolesList
          roles={[
            "Technical Product Owner",
            "Full-Stack Developer",
            "Head of R&D",
            "Performance Marketer",
          ]}
        />

        <Divider />
        <Focus>
          <FocusTitle>Current focus</FocusTitle>
          <FocusContent>
            Exploring <Highlight>agentic coding</Highlight> and{" "}
            <Highlight>spec-driven development</Highlight> — where AI is used as
            a tool for implementation while human expertise guides strategic
            direction, requirements engineering, and solution architecture. My
            background in both business and technology positions me well for
            this shift. Working at{" "}
            <a href="https://nitor.com/en" target="_blank">
              Nitor
            </a>{" "}
            as senior software developer.
          </FocusContent>
        </Focus>
        <Focus>
          <FocusTitle>Recent work</FocusTitle>
          <RecentWorkGrid>
            <RecentWorkItem>
              <Highlight>Contract monitoring system</Highlight> for HSL (via
              Twoday) — expanding into multi-modal transport visibility and
              proactive contract KPIs and compensations to operators.
            </RecentWorkItem>
            <RecentWorkItem>
              <Highlight>Configuration UI</Highlight> for Aidon (via Twoday) —
              schema-driven forms with durable persistence model for utilities.
            </RecentWorkItem>
            <RecentWorkItem>
              <Highlight>SaaS marketplace</Highlight> for SaaShop — grew ARR to
              EUR 1.4M while improving reliability, reducing customer support
              feedback, and expanding the SMB customer base.
            </RecentWorkItem>
            <RecentWorkItem>
              <Highlight>Website & SEO</Highlight> for{" "}
              <a href="https://kauneushoitolahanna.fi" target="_blank">
                Kauneushoitola Hanna{" "}
              </a>
              — created and optimised a site for a local beauty salon. Achieved
              #1 ranking for “Kosmetologi Järvenpää”.
            </RecentWorkItem>
          </RecentWorkGrid>
        </Focus>
        <ContactLinksContainer>
          <ContactLinks
            links={[
              {
                label: "LinkedIn",
                href: "https://www.linkedin.com/in/veli-pekkanurmi",
              },
              { label: "Github", href: "https://github.com/nurvel" },
              { label: "Email", href: "mailto:nurmi.vp@gmail.com" },
            ]}
          />
        </ContactLinksContainer>
      </Content>
    </PageContainer>
  );
}

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(233, 30, 140, 0.2),
    rgba(139, 92, 246, 0.2)
  );
`;
