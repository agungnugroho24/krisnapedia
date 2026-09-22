import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type SearchContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialQuery: string;
  openWith: (q?: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const openWith = useCallback((q?: string) => {
    setInitialQuery(q ?? "");
    setOpen(true);
  }, []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        if (!open) setInitialQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <SearchContext.Provider value={{ open, setOpen, initialQuery, openWith }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchPalette() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchPalette must be used within SearchProvider");
  return ctx;
}
