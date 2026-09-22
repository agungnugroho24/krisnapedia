import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
};

const STORAGE_KEY = "krisnapedia-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function applyClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from storage synchronously to match the inline anti-FOUC script.
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  // Listen to OS-level theme changes — only meaningful when mode is "system".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  // Sync class to <html> whenever the resolved theme changes.
  useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inline script string injected into <head> BEFORE hydration to prevent
 * theme flash. Reads localStorage (or falls back to system preference) and
 * sets the `dark` class on <html> immediately.
 */
export const themeInitScript = `(function(){try{var k="${STORAGE_KEY}";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark"||s==="system")?s:"system";var r=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var c=document.documentElement.classList;if(r==="dark")c.add("dark");else c.remove("dark");}catch(e){}})();`;
