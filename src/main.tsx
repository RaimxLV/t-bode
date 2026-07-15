import { createRoot } from "react-dom/client";
import { installAuthRefreshGuard } from "./lib/authRefreshGuard";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

installAuthRefreshGuard();

createRoot(document.getElementById("root")!).render(<App />);
