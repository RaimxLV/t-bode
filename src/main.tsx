import { createRoot } from "react-dom/client";
import { installAuthRefreshGuard } from "./lib/authRefreshGuard";
import { preloadHeroLayers } from "./lib/preloadHero";
import "./i18n";
import "./index.css";

installAuthRefreshGuard();
if (window.location.pathname === "/") preloadHeroLayers();

const root = createRoot(document.getElementById("root")!);

void import("./App.tsx").then(({ default: App }) => {
  root.render(<App />);
});
