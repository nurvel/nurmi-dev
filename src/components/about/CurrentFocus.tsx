import styled from "styled-components";
import { FocusData } from "../../data/siteContent";
import { BodyText } from "../typography";

type CurrentFocusProps = {
  focus: FocusData;
};

export function CurrentFocus({ focus }: CurrentFocusProps) {
  return (
    <FocusSection aria-labelledby="about-current-focus-heading">
      <FocusTitle id="about-current-focus-heading">{focus.title}</FocusTitle>
      <FocusContent>
        Exploring{" "}
        <Highlight>{focus.highlights[0]}</Highlight> and{" "}
        <Highlight>{focus.highlights[1]}</Highlight>
        {focus.afterHighlights}
        {focus.middle}{" "}
        <a href={focus.linkHref} target="_blank" rel="noopener noreferrer">
          {focus.linkLabel}
        </a>
        {focus.outro}
      </FocusContent>
    </FocusSection>
  );
}

const FocusSection = styled.section`
  padding-top: 3rem;

  @media (max-width: 768px) {
    padding-top: 2rem;
  }
`;

const FocusTitle = styled.h2`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${props => props.theme.colors.aboutAccent};
  margin-bottom: 1rem;
  font-weight: 600;
`;

const FocusContent = styled(BodyText)`
  font-size: 1rem;
  line-height: 1.6;
`;

const Highlight = styled.span`
  color: ${props => props.theme.colors.aboutTextPrimary};
  font-weight: 600;
  background: linear-gradient(
    180deg,
    transparent 60%,
    ${props => props.theme.colors.aboutAccentGlow} 60%
  );
`;
