import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Intercept all 401 responses and broadcast a session-expired event.
// App.tsx listens and redirects to login if the user was authenticated.
const _origFetch = window.fetch.bind(window);
window.fetch = async function (...args: Parameters<typeof fetch>) {
  const response = await _origFetch(...args);
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("kiln:session-expired"));
  }
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
