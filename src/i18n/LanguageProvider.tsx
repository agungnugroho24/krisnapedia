import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, type LangCode, type TranslationKey } from "./translations";

type LanguageContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
};

const STORAGE_KEY = "krisnapedia.lang";
const DEFAULT_LANG: LangCode = "id";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start with default to avoid SSR/hydration mismatch
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  // Hydrate from localStorage on the client after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "id" || stored === "en") {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[lang][key] ?? dictionaries[DEFAULT_LANG][key] ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback so components don't crash if used outside the provider
    return {
      lang: DEFAULT_LANG as LangCode,
      setLang: () => {},
      t: (key: TranslationKey) => dictionaries[DEFAULT_LANG][key] ?? key,
    } satisfies LanguageContextValue;
  }
  return ctx;
}
