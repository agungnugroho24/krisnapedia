import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { whatsNewCategoryBadgeClass, whatsNewItems, whatsNewPaginator, whatsNewQueryOptions } from "@/lib/whats-new";
import { formatDate } from "@/lib/format";
import { PaginationBar } from "@/components/site/PaginationBar";
import { useT } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/apa-yang-baru")({
  component: ApaYangBaruPage,
  head: () => ({
    meta: [
      { title: "Apa yang Baru dari KRISNA? - KRISNApedia" },
      {
        name: "description",
        content: "Daftar pembaruan terbaru KRISNA yang diambil dari issue GitHub dan dikurasi otomatis.",
      },
    ],
  }),
});

function ApaYangBaruPage() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("All");
  const [subSystem, setSubSystem] = useState("All");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery(whatsNewQueryOptions({ year, subSystem, category, search: query, page, perPage: 9 }));

  const updates = whatsNewItems(data);
  const paginator = whatsNewPaginator(data);

  const reset = () => {
    setQuery("");
    setYear("All");
    setSubSystem("All");
    setCategory("All");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("whatsNew.eyebrow")}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("whatsNew.heading")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("whatsNew.page.lead")}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {t("whatsNew.page.filterTitle")}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("whatsNew.page.searchPlaceholder")}
                  className="h-11 pl-9"
                />
              </div>

              <Select value={year} onValueChange={(value) => { setYear(value); setPage(1); }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("whatsNew.page.yearPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t("whatsNew.page.allYears")}</SelectItem>
                  {(data?.filters.years ?? []).map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subSystem} onValueChange={(value) => { setSubSystem(value); setPage(1); }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("whatsNew.page.subSystemPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t("whatsNew.page.allSubSystems")}</SelectItem>
                  {(data?.filters.sub_systems ?? []).map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={(value) => { setCategory(value); setPage(1); }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("whatsNew.page.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t("whatsNew.page.allCategories")}</SelectItem>
                  {(data?.filters.categories ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={reset} className="h-11 border-border">
                {t("whatsNew.page.reset")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-7xl px-6">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              {t("whatsNew.page.loading")}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
              {t("whatsNew.page.error")}
            </div>
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <p className="font-display text-xl font-semibold text-foreground">{t("whatsNew.page.empty")}</p>
              <Button onClick={reset} className="mt-5">{t("whatsNew.page.resetFilter")}</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {updates.map((item) => (
                  <article key={item.id} className="flex min-h-56 flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${whatsNewCategoryBadgeClass(item.category)}`}>
                        {item.category}
                      </span>
                      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.sub_system}
                      </span>
                      {item.is_new ? (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                          {t("whatsNew.badgeNew")}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold leading-snug text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">{item.urgency}</p>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {item.closed_at ? formatDate(item.closed_at) : "-"}
                      </span>
                      <span>#{item.number}</span>
                    </div>
                  </article>
                ))}
              </div>
              {paginator && paginator.last_page > 1 ? (
                <PaginationBar
                  currentPage={paginator.current_page}
                  totalPages={paginator.last_page}
                  onPageChange={(next) => setPage(next)}
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
