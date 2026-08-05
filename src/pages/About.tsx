import styled, { useTheme } from "styled-components";
import ProfilePic from "../assets/img/veli-pekka-nurmi-profile.png";
import { PageContainer, PageContent } from "../components/Page";
import { BodyText } from "../components/typography";
import { ProfileCard } from "../components/about/ProfileCard";
import { RolesList } from "../components/about/RolesList";
import { ContactLinks } from "../components/about/ContactLinks";
import { CurrentFocus } from "../components/about/CurrentFocus";
import { RecentWork } from "../components/about/RecentWork";
import { aboutSiteContent } from "../data/siteContent";

const Content = styled(PageContent)`
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  padding-top: min(30vh, 200px);
  color: ${(props) => props.theme.colors.aboutTextPrimary};

  @media (max-width: 768px) {
    padding: 0 1.5rem;
  }
`;

const Description = styled(BodyText)`
  margin: 0 0 2.5rem;
`;

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 12px;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.violet},
    ${(props) => props.theme.colors.darkPink}
  );
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

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.aboutAccentGlow},
    rgba(139, 92, 246, 0.2)
  );
`;

export default function About() {
  useTheme();

  return (
    <PageContainer className="about" id="about" background="#ffffff">
      <TopBar />
      <Content>
        <ProfileCard
          name={aboutSiteContent.profile.name}
          subtitle={aboutSiteContent.profile.subtitle}
          avatarSrc={ProfilePic}
          avatarAlt={aboutSiteContent.profile.avatarAlt}
        />

        <Description>{aboutSiteContent.description}</Description>

        <RolesList roles={aboutSiteContent.roles} />

        <Divider />
        <CurrentFocus focus={aboutSiteContent.focus} />
        <RecentWork
          title={aboutSiteContent.recentWorkTitle}
          items={aboutSiteContent.recentWork}
        />
        <ContactLinksContainer>
          <ContactLinks links={aboutSiteContent.contacts} />
        </ContactLinksContainer>
      </Content>
    </PageContainer>
  );
}
