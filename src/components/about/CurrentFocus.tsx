import styled from "styled-components";
import { FocusData } from "../../data/siteContent";
import { BodyText } from "../typography";

type CurrentFocusProps = {
  focus: FocusData;
};

export function CurrentFocus({ focus }: CurrentFocusProps) {
  return (
    <FocusSection>
      <FocusTitle>{focus.title}</FocusTitle>
      <FocusContent>
        Exploring{" "}
        <Highlight>{focus.highlights[0]}</Highlight> and{" "}
        <Highlight>{focus.highlights[1]}</Highlight>
        {focus.afterHighlights}
        {focus.middle}{" "}
        <a href={focus.linkHref} target="_blank">
          {focus.linkLabel}
        </a>
        {focus.outro}
      </FocusContent>
    </FocusSection>
  );
}

const FocusSection = styled.div`
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
