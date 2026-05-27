import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logEnvHealthOnce } from "./lib/envHealth";

logEnvHealthOnce();

// Register service worker for Web Push notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch((err) => console.warn("[SW] update check failed:", err));

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
