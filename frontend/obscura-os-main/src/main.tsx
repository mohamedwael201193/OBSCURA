import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logEnvHealthOnce } from "./lib/envHealth";

logEnvHealthOnce();

createRoot(document.getElementById("root")!).render(<App />);
