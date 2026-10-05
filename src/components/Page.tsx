import React, { ReactNode } from "react";
import styled from "styled-components";

const Section = styled.section<{ $background?: string }>`
  width: 100%;
  position: relative;
  background-color: ${({ $background, theme }) =>
    $background ?? theme.colors.background};
`;

export const PageContent = styled.div`
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  position: relative;
`;

type PageProps = {
  id?: string;
  background?: string;
  className?: string;
  children: ReactNode;
};

export function PageContainer({
  id,
  background,
  className,
  children,
}: PageProps) {
  return (
    <Section
      id={id}
      className={["section", className].filter(Boolean).join(" ")}
      $background={background}
    >
      {children}
    </Section>
  );
}
