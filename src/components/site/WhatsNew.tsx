import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import { whatsNewCategoryBadgeClass, whatsNewItems, whatsNewQueryOptions } from "@/lib/whats-new";
import { formatDate } from "@/lib/format";
import { useT } from "@/i18n/LanguageProvider";

export function WhatsNew() {
  const { t } = useT();
  const { data, isLoading } = useQuery(whatsNewQueryOptions({ limit: 3 }));
  const updates = whatsNewItems(data);

  return (
    <section className="border-t border-border bg-surface-warm py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("whatsNew.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t("whatsNew.heading")}
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              {t("whatsNew.lead")}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-52 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))
          ) : updates.length > 0 ? (
            <>
              {updates.map((item) => (
                <article key={item.id} className="flex min-h-52 flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${whatsNewCategoryBadgeClass(item.category)}`}>
                      {item.category}
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.sub_system}
                    </span>
                  </div>
                  <h3 className="mt-4 line-clamp-3 font-display text-lg font-semibold leading-snug text-foreground">
                    {item.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                    {item.closed_at ? formatDate(item.closed_at) : "-"}
                    </span>
                    <span>{item.urgency}</span>
                  </div>
                </article>
              ))}

              <Link
                to="/apa-yang-baru"
                className="group relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/50 bg-primary/[0.06] p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary/[0.12] hover:shadow-[var(--shadow-soft)]"
              >
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-110">
                  <ArrowUpRight className="h-6 w-6" />
                </span>
                <h3 className="relative mt-5 font-display text-lg font-semibold">{t("whatsNew.exploreTitle")}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground">
                  {t("whatsNew.exploreDesc")}
                </p>
                <span className="relative mt-5 inline-flex items-center text-sm font-semibold text-primary">
                  {t("whatsNew.viewAll")}
                </span>
              </Link>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
                {t("whatsNew.emptyHome")}
              </div>
              <Link
                to="/apa-yang-baru"
                className="group relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/50 bg-primary/[0.06] p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary/[0.12] hover:shadow-[var(--shadow-soft)]"
              >
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-110">
                  <ArrowUpRight className="h-6 w-6" />
                </span>
                <h3 className="relative mt-5 font-display text-lg font-semibold">{t("whatsNew.exploreTitle")}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground">
                  {t("whatsNew.emptyHomeDesc")}
                </p>
                <span className="relative mt-5 inline-flex items-center text-sm font-semibold text-primary">
                  {t("whatsNew.viewAll")}
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
