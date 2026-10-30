// The game's only faces, all OFL (Kevin, 2026-09-15: unbranded, no IBM Plex):
// Michroma for menus and headings, Share Tech Mono for the HUD, the watch LCD and
// the files' typed lines, Oxanium for dialogue and body copy (600 for leads).
import "@fontsource/michroma/latin-400.css";
import "@fontsource/share-tech-mono/latin-400.css";
import "@fontsource/oxanium/latin-400.css";
import "@fontsource/oxanium/latin-600.css";
import { createRoot } from "react-dom/client";
import CounterIntelligence from "./counter/CounterIntelligence.jsx";
import { counterTheme } from "./counter/theme.js";
import "./counter/styles.css";
import "./counter/files.css";

const root = document.documentElement;
for (const [k, v] of Object.entries(counterTheme)) root.style.setProperty(k, v);

createRoot(document.getElementById("root")).render(<CounterIntelligence />);
