import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Intercept 401 responses on write requests (POST/PUT/PATCH/DELETE) and
// broadcast a session-expired event so the app can redirect to login.
// GET requests are excluded because many are hit while browsing publicly.
const _origFetch = window.fetch.bind(window);
window.fetch = async function (...args: Parameters<typeof fetch>) {
  const response = await _origFetch(...args);
  if (response.status === 401) {
    const req = args[0];
    const init = args[1];
    const method = (init?.method ?? (req instanceof Request ? req.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      window.dispatchEvent(new CustomEvent("kiln:session-expired"));
    }
  }
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
