import styled from "styled-components";
import { RELEASES_URL } from "../releaseIdentity";
import type { BuildIdentity } from "../releaseIdentity";

const FooterRegion = styled.footer`
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.95rem;
  line-height: 1.4;
  text-align: center;
`;

const ReleaseLink = styled.a`
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2em;
`;

type FooterProps = {
  identity: BuildIdentity;
};

export default function Footer({ identity }: FooterProps) {
  return (
    <FooterRegion aria-label="Build information">
      <ReleaseLink
        href={RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {identity.label}
      </ReleaseLink>
    </FooterRegion>
  );
}
