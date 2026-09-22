import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PaginationBar } from "@/components/site/PaginationBar";
import { Search, FileText, Play, SlidersHorizontal, Loader2 } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { manualsQueryOptions } from "@/lib/content-queries";
import { viewsQueryOptions } from "@/lib/views-queries";
import { imageUrl } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { CategoryTabs } from "@/components/site/CategoryTabs";
import { ViewCount } from "@/components/site/ViewCount";
import { DisplayStatusBadge } from "@/components/site/DisplayStatusBadge";
import manualFallback from "@/assets/manual-onboarding.jpg";
import { useT } from "@/i18n/LanguageProvider";

const PER_PAGE = 9;
const SORT_VALUES = ["newest", "oldest", "title-asc", "title-desc"] as const;
type SortValue = (typeof SORT_VALUES)[number];
const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  cat: fallback(z.string(), "All").default("All"),
  sub: fallback(z.string(), "All").default("All"),
  sort: fallback(z.enum(SORT_VALUES), "newest").default("newest"),
});

type SearchParams = z.infer<typeof searchSchema>;
type FilterOption = { value: string; label: string };

export const Route = createFileRoute("/manual-hub")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(manualsQueryOptions());
  },
  pendingComponent: () => (
    <main className="flex min-h-[40vh] items-center justify-center bg-background px-4 py-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading...
      </div>
    </main>
  ),
  component: ManualHubPage,
  head: () => ({
    meta: [
      { title: "Manual Hub - KRISNApedia" },
      {
        name: "description",
        content:
          "Browse standard operating procedures, technical guides, and reference manuals from the KRISNApedia Manual Hub.",
      },
      { property: "og:title", content: "Manual Hub - KRISNApedia" },
      {
        property: "og:description",
        content:
          "Standard operating procedures, technical guides, and reference manuals all in one place.",
      },
    ],
  }),
});

function keyForCategory(item: { categoryId?: number; category?: string }) {
  return item.categoryId != null ? String(item.categoryId) : item.category || "";
}

function keyForSubCategory(item: { subCategoryId?: number; subCategory?: string }) {
  return item.subCategoryId != null ? String(item.subCategoryId) : item.subCategory || "";
}

function ManualHubPage() {
  const { t } = useT();
  const { data: manuals } = useSuspenseQuery(manualsQueryOptions());
  const { data: viewsMap = {} } = useQuery(viewsQueryOptions("manual"));
  const { page, cat, sub, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState("All");
  const [year, setYear] = useState("All");
  const [subSystem, setSubSystem] = useState("All");
  const pageTitle = t("manual.list.metaTitle");
  const pageDescription = t("manual.list.metaDescription");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = pageTitle;
    const meta = document.querySelector("meta[name=\"description\"]") as HTMLMetaElement | null;
    if (meta) meta.content = pageDescription;
  }, [pageTitle, pageDescription]);

  const goToPage = (next: number) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, page: next }) });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const setCat = (next: string) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, cat: next, sub: "All", page: 1 }) });
  };

  const setSub = (next: string) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, sub: next, page: 1 }) });
  };

  const setSort = (next: SortValue) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, sort: next, page: 1 }) });
  };

  const categories = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    for (const item of manuals) {
      const value = keyForCategory(item);
      const label = item.category?.trim() || value;
      if (value) map.set(value, label);
    }
    return [{ value: "All", label: t("tabs.all") }, ...Array.from(map, ([value, label]) => ({ value, label }))];
  }, [manuals, t]);

  const subCategories = useMemo<FilterOption[]>(() => {
    if (cat === "All") return [];
    const map = new Map<string, string>();
    for (const item of manuals.filter((m) => keyForCategory(m) === cat)) {
      const value = keyForSubCategory(item);
      const label = item.subCategory?.trim() || value;
      if (value) map.set(value, label);
    }
    return map.size > 0 ? [{ value: "All", label: t("tabs.all") }, ...Array.from(map, ([value, label]) => ({ value, label }))] : [];
  }, [manuals, cat, t]);

  const fileTypes = useMemo(
    () => [
      "All",
      ...Array.from(new Set(manuals.map((m) => m.fileType).filter(Boolean) as string[])),
    ],
    [manuals],
  );
  const years = useMemo(
    () => [
      "All",
      ...Array.from(new Set(manuals.map((m) => m.year).filter((value): value is number => typeof value === "number")))
        .sort((a, b) => b - a)
        .map(String),
    ],
    [manuals],
  );
  const subSystems = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    for (const item of manuals) {
      const value = item.subSystemId != null ? String(item.subSystemId) : item.subSystem ?? "";
      const label = item.subSystem?.trim() || value;
      if (value) map.set(value, label);
    }
    return [{ value: "All", label: "Semua sub-sistem" }, ...Array.from(map, ([value, label]) => ({ value, label }))];
  }, [manuals]);

  const filtered = useMemo(() => {
    return manuals.filter((it) => {
      const matchQ = query
        ? it.title.toLowerCase().includes(query.toLowerCase())
        : true;
      const matchT = fileType === "All" ? true : it.fileType === fileType;
      const matchC = cat === "All" ? true : keyForCategory(it) === cat;
      const matchS = sub === "All" ? true : keyForSubCategory(it) === sub;
      const matchY = year === "All" ? true : String(it.year ?? "") === year;
      const subSystemValue = it.subSystemId != null ? String(it.subSystemId) : it.subSystem ?? "";
      const matchSubSystem = subSystem === "All" ? true : subSystemValue === subSystem;
      return matchQ && matchT && matchC && matchS && matchY && matchSubSystem;
    });
  }, [manuals, query, fileType, cat, sub, year, subSystem]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "oldest":
        return arr.sort((a, b) => +new Date(a.date) - +new Date(b.date));
      case "title-asc":
        return arr.sort((a, b) => a.title.localeCompare(b.title, "id"));
      case "title-desc":
        return arr.sort((a, b) => b.title.localeCompare(a.title, "id"));
      default:
        return arr.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }
  }, [filtered, sort]);

  const reset = () => {
    setQuery("");
    setFileType("All");
    setYear("All");
    setSubSystem("All");
    navigate({ search: { page: 1, cat: "All", sub: "All", sort: "newest" } });
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const rangeEnd = (safePage - 1) * PER_PAGE + paginated.length;

  useEffect(() => {
    if (page !== 1) navigate({ search: (prev: SearchParams) => ({ ...prev, page: 1 }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, fileType, year, subSystem]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {t("page.manual.eyebrow")}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("manual.list.heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("manual.list.heroLead")}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl space-y-3 px-6 py-6">
          <CategoryTabs
            items={categories}
            active={cat}
            onChange={setCat}
            ariaLabel={t("manual.list.categoryAria")}
          />
          {subCategories.length > 0 && (
            <div className="flex items-start gap-3 border-l-2 border-primary/30 pl-3">
              <CategoryTabs
                items={subCategories}
                active={sub}
                onChange={setSub}
                ariaLabel={t("manual.list.subcategoryAria")}
                variant="secondary"
              />
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {t("filter.manuals")}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("filter.searchManual")}
                  className="h-11 pl-9"
                />
              </div>

              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("filter.fileType")} />
                </SelectTrigger>
                <SelectContent>
                  {fileTypes.map((t2) => (
                    <SelectItem key={t2} value={t2}>
                      {t2 === "All" ? t("filter.allFileTypes") : t2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("filter.category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.value === "All" ? t("filter.allCategories") : c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "All" ? "Semua tahun" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subSystem} onValueChange={setSubSystem}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sub-sistem" />
                </SelectTrigger>
                <SelectContent>
                  {subSystems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={reset}
                className="h-11 border-border"
              >
                {t("filter.reset")}
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("filter.showing")} {" "}
                <strong className="text-foreground">
                  {rangeStart} - {rangeEnd}
                </strong>{" "}
                {t("filter.of")} {filtered.length} {t("unit.manual")}
                {filtered.length !== manuals.length && (
                  <> ({t("filter.filteredFrom")} {manuals.length})</>
                )}
              </span>
              <div className="hidden items-center gap-2 md:flex">
                <span>{t("filter.sortBy")}</span>
                <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("filter.sort.newest")}</SelectItem>
                    <SelectItem value="oldest">{t("filter.sort.oldest")}</SelectItem>
                    <SelectItem value="title-asc">{t("filter.sort.titleAsc")}</SelectItem>
                    <SelectItem value="title-desc">{t("filter.sort.titleDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-7xl px-6">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 text-center">
              <p className="font-display text-xl font-semibold text-foreground">
                {t("filter.empty.manual")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("filter.emptyHint")}
              </p>
              <Button onClick={reset} className="mt-5">
                {t("filter.resetFilter")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginated.map((item) => {
                  const cover = imageUrl(item.coverImage, 800) || manualFallback;
                  const typeLabel = item.fileType
                    ? `${t("manual.list.filePrefix")} ${item.fileType}`
                    : item.viewer.toUpperCase();
                  const hasVideo = Boolean(item.youtubeUrl);
                  return (
                    <Link
                      key={item._id}
                      to="/manual-hub/$slug"
                      params={{ slug: item.slug }}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={cover}
                          alt={item.title}
                          loading="lazy"
                          width={800}
                          height={600}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {hasVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition group-hover:bg-foreground/30">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-primary shadow-2xl backdrop-blur">
                              <Play className="ml-1 h-7 w-7 fill-current" />
                            </span>
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                          {item.category}
                        </span>
                        {item.videoDuration ? (
                          <span className="absolute bottom-3 right-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold text-background shadow-lg backdrop-blur">
                            {item.videoDuration}
                          </span>
                        ) : null}
                        <DisplayStatusBadge status={item.displayStatus ?? item.status} />
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="font-display text-lg font-semibold leading-snug text-foreground">
                          {item.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                          <div className="inline-flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              {typeLabel}
                            </span>
                            <ViewCount count={viewsMap[item.slug]} />
                          </div>
                          <time>{formatDate(item.date)}</time>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <PaginationBar
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}


