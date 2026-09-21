import { createRoot } from "react-dom/client";
import { installAuthRefreshGuard } from "./lib/authRefreshGuard";
import { preloadHeroLayers } from "./lib/preloadHero";
import "./i18n";
import "./index.css";
import App from "./App.tsx";

installAuthRefreshGuard();

const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;
  createRoot(rootElement).render(<App />);
};

if (window.location.pathname === "/") preloadHeroLayers();
renderApp();
