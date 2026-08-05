import styled from "styled-components";
import { RecentWorkItemData } from "../../data/siteContent";
import { BodyText } from "../typography";

type RecentWorkProps = {
  title: string;
  items: RecentWorkItemData[];
};

export function RecentWork({ title, items }: RecentWorkProps) {
  return (
    <FocusSection aria-labelledby="about-recent-work-heading">
      <FocusTitle id="about-recent-work-heading">{title}</FocusTitle>
      <RecentWorkGrid>
        {items.map((item, idx) => (
          <RecentWorkItemCard key={idx}>
            <Highlight>{item.highlight}</Highlight>
            {item.textA}
            {item.linkLabel && item.linkHref ? (
              <a href={item.linkHref} target="_blank" rel="noopener noreferrer">
                {item.linkLabel}{" "}
              </a>
            ) : null}
            {item.textB}
          </RecentWorkItemCard>
        ))}
      </RecentWorkGrid>
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

const RecentWorkItemCard = styled(BodyText)`
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid rgba(26, 26, 26, 0.08);
  background: #ffffff;
  color: ${props => props.theme.colors.aboutTextPrimary};
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
