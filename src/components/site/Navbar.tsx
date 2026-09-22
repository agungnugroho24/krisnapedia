import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Menu, Globe, Check } from "lucide-react";
import logoLight from "@/assets/logo-light.svg";
import logoDark from "@/assets/logo-dark.svg";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSearchPalette } from "./SearchProvider";
import { ThemeToggle } from "./ThemeToggle";
import { useT } from "@/i18n/LanguageProvider";
import type { LangCode } from "@/i18n/translations";

const languages: { code: LangCode; labelKey: "nav.lang.id" | "nav.lang.en" }[] = [
  { code: "id", labelKey: "nav.lang.id" },
  { code: "en", labelKey: "nav.lang.en" },
];

export function Navbar() {
  const { openWith: openSearch } = useSearchPalette();
  const { t, lang, setLang } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: t("nav.regulasi"), to: "/pustaka-regulasi" },
    { label: t("nav.insight"), to: "/insight-hub" },
    { label: t("nav.manual"), to: "/manual-hub" },
    { label: t("nav.klinik"), to: "/faq" },
    { label: t("nav.whatsNew"), to: "/apa-yang-baru" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center" aria-label="KRISNApedia">
          <img src={logoLight} alt="KRISNApedia" className="block h-9 w-auto dark:hidden" />
          <img src={logoDark} alt="KRISNApedia" className="hidden h-9 w-auto dark:block" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openSearch()}
            aria-label={t("nav.search")}
          >
            <Search className="h-4 w-4" />
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden items-center gap-1.5 md:inline-flex"
                aria-label={t("nav.switchLang")}
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {languages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className="flex items-center justify-between"
                >
                  <span>{t(l.labelKey)}</span>
                  {lang === l.code && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeProps={{ className: "bg-[var(--primary-soft)] text-primary font-semibold" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 border-t border-border pt-4">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nav.switchLang")}
                </p>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t(l.labelKey)}
                    </span>
                    {lang === l.code && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
