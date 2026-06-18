import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useAuth } from "./AuthContext";
import { updateSettings } from "../services/security.service";

const ThemeContext = createContext();

const STORAGE_KEY = "cc-theme";
const VALID = ["light", "dark", "system"];

// Status-bar / browser-chrome colour per resolved theme.
const THEME_COLOR = { light: "#ff5c8a", dark: "#0d0d14" };

const systemPrefersDark = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : null;
  } catch {
    return null;
  }
};

const writeStored = (pref) => {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* storage unavailable — in-memory only */
  }
};

const applyToDocument = (resolved) => {
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved] || THEME_COLOR.light);
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();

  // The user's PREFERENCE (light | dark | system).
  const [theme, setThemeState] = useState(() => readStored() || "system");
  // Tracks the OS colour scheme; only relevant while theme === "system".
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  // Guard so we adopt the server-saved preference only once.
  const [serverSynced, setServerSynced] = useState(false);

  // Adopt the server-saved preference the first time the user profile arrives,
  // unless this device already has an explicit local choice. Setting state
  // during render is React's recommended way to derive state from props and
  // avoids an effect-driven cascade.
  if (!serverSynced && readStored() === null) {
    const serverTheme = user?.settings?.theme;
    if (serverTheme && VALID.includes(serverTheme)) {
      setServerSynced(true);
      if (serverTheme !== theme) setThemeState(serverTheme);
    }
  }

  // Derived during render — no extra state, no cascading effects.
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Side-effect only: keep <html data-theme> + theme-color meta in sync.
  useEffect(() => {
    applyToDocument(resolved);
  }, [resolved]);

  // Follow the OS theme live.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((pref) => {
    if (!VALID.includes(pref)) return;
    setServerSynced(true); // an explicit choice supersedes any server value
    setThemeState(pref);
    writeStored(pref);
    // Best-effort server sync so the choice follows the user to other devices.
    updateSettings({ theme: pref }).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
