import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/orbitron";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/share-tech-mono/latin-400.css";
import "../../web/app/globals.css";
import "./showcase.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
