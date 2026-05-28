import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Allow production deployments to point the client at a remote API via
// the Vite env var `VITE_API_BASE` (set this in Vercel/Netlify/etc.).
// If not provided the client will use relative `/api` paths as before.
const apiBase = (import.meta as any).env?.VITE_API_BASE ?? null;
setBaseUrl(apiBase);

createRoot(document.getElementById("root")!).render(<App />);
