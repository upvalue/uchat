import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fontsource/iosevka/400.css";
import "@fontsource/iosevka/400-italic.css";
import "@fontsource/iosevka/500.css";
import "@fontsource/iosevka/600.css";
import "@fontsource/iosevka/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
