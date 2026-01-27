import { ThemeProvider } from "styled-components";
import theme from "./common/theme";
import Layout from "./components/Layout";

import About from "./pages/About";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout>
        <About />
      </Layout>
    </ThemeProvider>
  );
}
