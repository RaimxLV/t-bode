import { createRoot } from "react-dom/client";
import { installAuthRefreshGuard } from "./lib/authRefreshGuard";
import "./i18n";
import "./index.css";

installAuthRefreshGuard();

const root = createRoot(document.getElementById("root")!);

void import("./App.tsx").then(({ default: App }) => {
  root.render(<App />);
});
