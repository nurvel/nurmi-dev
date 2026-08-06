import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body {
    max-width: 100%;
    width: 100%;
    overflow-x: hidden;
    font-synthesis: none;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.family};
    font-weight: ${({ theme }) => theme.typography.weights.regular};
  }

  #root {
    min-height: 100vh;
  }

  .section {
    min-height: ${({ theme }) => theme.layout.sectionMinHeight};
    padding: ${({ theme }) => theme.layout.sectionPadding};
    display: flex;
    justify-content: center;
  }

  h1, h2 {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.family};
    font-weight: ${({ theme }) => theme.typography.weights.bold};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.scale.h1};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.scale.h2};
  }

  p {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: ${({ theme }) => theme.typography.scale.body};
    font-family: ${({ theme }) => theme.typography.family};
    font-weight: ${({ theme }) => theme.typography.weights.regular};
  }

  a:link,
  a:visited,
  a:active {
    color: ${({ theme }) => theme.colors.darkPink};
    text-decoration: none;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.brightPink};
    text-decoration: none;
  }

  @media only screen and (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    h1 {
      font-size: ${({ theme }) => theme.typography.scale.h1Mobile};
    }

    h2 {
      font-size: ${({ theme }) => theme.typography.scale.h2Mobile};
    }

    p {
      font-size: ${({ theme }) => theme.typography.scale.bodyMobile};
      font-weight: ${({ theme }) => theme.typography.weights.regular};
    }
  }
`;

export default GlobalStyle;
