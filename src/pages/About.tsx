import styled from "styled-components";
import { aboutSiteContent as content } from "../data/siteContent";
import { PageContainer } from "../components/Page";
import ThemeToggle from "../components/ThemeToggle";
import CareerTimeline from "./CareerTimeline";

const Container = styled.div`
  width: min(100% - 2 * clamp(20px, 4vw, 40px), 1080px);
  margin: 0 auto;
  padding-bottom: 72px;
`;
const Topbar = styled.header`
  display:flex; justify-content:space-between; align-items:center; padding:24px 0 48px;
  font:500 .8125rem var(--font-display); letter-spacing:.12em; text-transform:uppercase;
  color:var(--color-text-primary);
`;
const Hero = styled.section`
  display:grid; grid-template-columns:1.05fr 1fr; gap:48px; align-items:stretch; padding:48px 0 64px;
  @media(max-width:820px){grid-template-columns:1fr;gap:20px;padding:12px 0 24px;}
`;
const HeroText = styled.div`display:flex;flex-direction:column;justify-content:center;max-width:540px;`;
const Kicker = styled.p`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0 0 24px;&:before{content:"";display:inline-block;width:24px;height:1px;background:var(--color-accent);vertical-align:middle;margin-right:12px;}`;
const Name = styled.h1`font:500 clamp(2.5rem,5.55vw,5rem)/.98 var(--font-body);letter-spacing:-.03em;color:var(--color-text-primary);margin:0 0 24px;& > span{display:block;}`;
const Lede = styled.p`font:400 clamp(1.05rem,1.6vw,1.3rem)/1.35 var(--font-body);color:var(--color-text-secondary);margin:0;max-width:480px;`;
const PortraitWrap = styled.div`display:flex;justify-content:center;align-items:center;min-width:0;@media(max-width:820px){order:-1;}`;
const PortraitBall = styled.div`position:relative;aspect-ratio:1;width:min(100%, 22vw, 360px);height:auto;max-height:100%;border-radius:50%;overflow:hidden;background:var(--color-portrait-background);box-shadow:0 0 0 1px var(--color-border),inset 0 1px 24px #0000000a;@media(max-width:820px){width:min(68vw,300px);}`;
// The approved cutout intentionally exceeds the circle; override the global image reset.
const Portrait = styled.img`position:absolute;width:137%;max-width:none;height:auto;left:-44%;top:2%;filter:grayscale(1) contrast(1.02);user-select:none;-webkit-user-drag:none;`;
const Section = styled.section`padding-top:64px;`;
const SectionHead = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:32px;`;
const SectionTitle = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const AboutGrid = styled.div`display:grid;grid-template-columns:2fr 1fr;gap:48px;align-items:start;@media(max-width:820px){grid-template-columns:1fr;gap:24px;}`;
const AboutCopy = styled.div`p{font:400 1.125rem/1.7 var(--font-body);color:var(--color-text-secondary);margin:0 0 20px;max-width:560px;text-wrap:pretty;}p:last-child{margin-bottom:0;}a{color:var(--color-text-primary);text-decoration:underline;text-decoration-color:var(--color-accent);text-underline-offset:3px;}`;
const Roles = styled.div`display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:8px;align-self:center;`;
const Role = styled.span`border:1px solid var(--color-border);border-radius:999px;padding:8px 14px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);`;
const WorkRoles = styled.div`display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;`;
const WorkRole = styled(Role)`max-width:100%;box-sizing:border-box;line-height:1.45;`;
const WorkGrid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;@media(max-width:900px){grid-template-columns:repeat(2,minmax(0,1fr));}@media(max-width:560px){grid-template-columns:1fr;}`;
const Work = styled.article`position:relative;overflow:hidden;padding:24px 24px 32px 32px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);display:flex;flex-direction:column;gap:12px;min-height:220px;&:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--color-accent-decorative);}`;
const Client = styled.p`font:500 .75rem var(--font-display);letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-muted);margin:0;`;
const WorkTitle = styled.h3`font:600 1.125rem/1.3 var(--font-body);color:var(--color-text-primary);letter-spacing:-.01em;margin:0;`;
const WorkDescription = styled.p`font:400 .9375rem/1.6 var(--font-body);color:var(--color-text-secondary);margin:0;text-wrap:pretty;`;
const Contact = styled.section`padding-top:72px;margin-top:72px;border-top:1px solid var(--color-border);display:grid;grid-template-columns:1fr auto;gap:32px;align-items:end;@media(max-width:820px){grid-template-columns:1fr;align-items:start;}`;
const Prompt = styled.h2`font:500 clamp(1.75rem,4vw,2.5rem)/1.1 var(--font-body);letter-spacing:-.025em;color:var(--color-text-primary);margin:0;max-width:640px;`;
const ContactRight = styled.div`display:flex;flex-direction:column;gap:16px;align-items:flex-start;`;
const SayHello = styled.div`display:flex;align-items:flex-start;gap:2px;color:var(--color-accent);font:600 1.9rem/.85 var(--font-handwritten);`;
const Arrow = styled.svg`width:62px;height:46px;flex-shrink:0;`;
const Links = styled.nav`display:flex;flex-direction:column;gap:4px;align-items:flex-start;a{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:4px 8px;color:var(--color-text-secondary);font:400 .8125rem var(--font-display);text-decoration:none;&:before{content:"→";color:var(--color-accent);} &:hover{color:var(--color-text-primary);text-decoration:underline;text-decoration-color:var(--color-accent);text-underline-offset:4px;}}`;

export default function About() {
  return <PageContainer className="about" id="about"><Container>
    <Topbar><span>— nurmi.dev</span><ThemeToggle /></Topbar>
    <div>
      <Hero><HeroText><Kicker>{content.profile.role}</Kicker><Name aria-label={content.profile.name}>{content.profile.nameLines.map(line=><span key={line}>{line}</span>)}</Name><Lede>{content.profile.subtitle}</Lede></HeroText><PortraitWrap><PortraitBall><Portrait src="/portrait-cutout.png" alt={content.profile.avatarAlt}/></PortraitBall></PortraitWrap></Hero>
      <Section aria-labelledby="about-heading"><SectionHead><SectionTitle as="h2" id="about-heading">About</SectionTitle></SectionHead><AboutGrid><AboutCopy>{content.about.map((paragraph,index)=><p key={index}>{paragraph.map((part,partIndex)=>{const text=part.emphasis?<strong>{part.text}</strong>:part.text;return part.href?<a key={partIndex} href={part.href} target="_blank" rel="noopener noreferrer">{text}</a>:<span key={partIndex}>{text}</span>;})}</p>)}</AboutCopy><Roles>{content.roles.map(role=><Role key={role}>{role}</Role>)}</Roles></AboutGrid></Section>
      <Section aria-labelledby="work-heading"><SectionHead><SectionTitle as="h2" id="work-heading">{content.recentWorkTitle}</SectionTitle></SectionHead><WorkGrid>{content.recentWork.map(item=><Work key={item.title}><Client>{item.client}</Client><WorkTitle>{item.title}</WorkTitle><WorkDescription>{item.href?<a href={item.href} target="_blank" rel="noopener noreferrer">{item.description}</a>:item.description}</WorkDescription><WorkRoles>{item.roles.map(role=><WorkRole key={role}>{role}</WorkRole>)}</WorkRoles></Work>)}</WorkGrid></Section>
      <CareerTimeline />
      <Contact aria-label="Contact"><Prompt>{content.contactPrompt}</Prompt><ContactRight><SayHello aria-hidden="true"><span>say hello</span><Arrow viewBox="0 0 88 66" fill="none"><path d="M10 8 C 42 12, 78 20, 62 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M50 44 L 63 56 L 72 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></Arrow></SayHello><Links aria-label="Contact links">{content.contacts.map(link=><a key={link.label} href={link.href} target={link.href.startsWith("http")?"_blank":undefined} rel={link.href.startsWith("http")?"noopener noreferrer":undefined}>{link.label}</a>)}</Links></ContactRight></Contact>
    </div>
  </Container></PageContainer>;
}
