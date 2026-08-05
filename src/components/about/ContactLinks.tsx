import styled from "styled-components";

const ContactNav = styled.nav`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;

const StyledLink = styled.a`
  position: relative;
  color: ${props => props.theme.colors.aboutTextPrimary};
  text-decoration: none;
  font-size: 1.05rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      ${props => props.theme.colors.aboutAccent},
      ${props => props.theme.colors.aboutUnderlineEnd}
    );
    transition: width 0.3s ease;
  }

  &:hover {
    color: ${props => props.theme.colors.aboutAccent};
  }

  &:hover::after {
    width: 100%;
  }
`;

type ContactLink = {
  label: string;
  href: string;
};

type ContactLinksProps = {
  links: ContactLink[];
};

export function ContactLinks({ links }: ContactLinksProps) {
  return (
    <ContactNav aria-label="contact">
      {links.map(({ label, href }) => (
        <StyledLink
          key={label}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={
            href.startsWith("http") ? "noopener noreferrer" : undefined
          }
        >
          {label}
        </StyledLink>
      ))}
    </ContactNav>
  );
}
