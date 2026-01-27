import React, { ReactNode } from "react";
import styled from "styled-components";
import GlobalStyle from "../common/globalStyles";
import Header from "./Header";
import { useScrollSnap } from "../hooks/useScrollSnap";
import { SectionScrollProvider } from "../context/SectionScrollContext";

const AppContainer = styled.div`
  min-height: 100vh;
`;

const SectionStack = styled.main`
  display: flex;
  flex-direction: column;
`;

const SNAP_RATIO = 0.1;
const SCROLL_IDLE_DELAY_MS = 120;
type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const activeSection = useScrollSnap({
    thresholdRatio: SNAP_RATIO,
    idleDelay: SCROLL_IDLE_DELAY_MS,
  });

  return (
    <SectionScrollProvider value={{ activeSection }}>
      <AppContainer>
        <GlobalStyle />
        <SectionStack>{children}</SectionStack>
      </AppContainer>
    </SectionScrollProvider>
  );
}
