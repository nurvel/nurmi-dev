import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import TagManager from "react-gtm-module";
import "./styles.css";

const envAuth = import.meta.env.PROD ? "Uy1ZU2eirHiMidAl_yfBpQ" : "CxNs4kxI_b1L4PUGBmhLXw";
const envPreview = import.meta.env.PROD ? "env-3" : "env-6";

const tagManagerArgs = {
  gtmId: "GTM-K4F7VVV",
  auth: envAuth,
  preview: envPreview,
};
TagManager.initialize(tagManagerArgs);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
