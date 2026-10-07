import React, { ReactNode } from "react";
import styled from "styled-components";
import GlobalStyle from "../common/globalStyles";
import Footer from "./Footer";
import { buildIdentity } from "../releaseIdentity";

const AppContainer = styled.div`min-height:100vh;`;
const Content = styled.main``;
type LayoutProps = { children: ReactNode };
export default function Layout({ children }: LayoutProps) {
  return <AppContainer><GlobalStyle/><Content>{children}</Content><Footer identity={buildIdentity}/></AppContainer>;
}
