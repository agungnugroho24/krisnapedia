import { useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchPalette } from "./SearchProvider";
import { HeroStats } from "./HeroStats";
import { useT } from "@/i18n/LanguageProvider";

export function Hero() {
  const { openWith } = useSearchPalette();
  const { t } = useT();
  const [heroQuery, setHeroQuery] = useState("");

  const submit = () => {
    openWith(heroQuery);
    setHeroQuery("");
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-foreground/60 px-4 py-1.5 text-xs font-medium text-[var(--primary-deep)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {t("hero.badge")}
          </span>

          <h1 className="mt-6 font-display font-bold leading-[1.15] tracking-tight text-foreground text-center text-[clamp(1.5rem,5.2vw,3.75rem)]">
            <span className="block whitespace-nowrap">{t("hero.title1")}</span>
            <span className="mt-2 block text-primary whitespace-nowrap">{t("hero.title2")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("hero.subtitleA")}
            <br className="hidden md:block" />
            {t("hero.subtitleB")}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]"
          >
            <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              onFocus={() => openWith(heroQuery)}
              placeholder={t("hero.searchPlaceholder")}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label={t("hero.searchAria")}
            />
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-[var(--primary-deep)]">
              {t("hero.searchCta")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <HeroStats />
        </div>
      </div>
    </section>
  );
}
