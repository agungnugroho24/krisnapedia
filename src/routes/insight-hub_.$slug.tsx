import { useEffect, useRef } from "react";
import { useT } from "@/i18n/LanguageProvider";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { incrementView } from "@/lib/views.functions";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Languages,
  Loader2,
  Maximize2,
  Share2,
  Tag,
  User,
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ContentViewer } from "@/components/site/ContentViewer";
import { useFullscreen } from "@/components/site/useFullscreen";
import {
  insightBySlugQueryOptions,
  insightsQueryOptions,
} from "@/lib/content-queries";
import { fileUrl, imageUrl } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { shareCurrentPage } from "@/lib/share";
import insightFallback from "@/assets/insight-strategy.jpg";

export const Route = createFileRoute("/insight-hub_/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const insight = await queryClient.ensureQueryData(
      insightBySlugQueryOptions(params.slug),
    );
    if (!insight) throw notFound();
    queryClient.ensureQueryData(insightsQueryOptions());
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Insight not found - KRISNApedia" }] };
    }
    return {
      meta: [
        { title: `Insight Hub - KRISNApedia` },
      ],
    };
  },
  pendingComponent: InsightLoading,
  notFoundComponent: InsightNotFound,
  errorComponent: InsightError,
  component: InsightDetailPage,
});

function InsightLoading() {
  const { t } = useT();
  return (
    <main className="flex min-h-[40vh] items-center justify-center bg-background px-4 py-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {t("common.loading")}
      </div>
    </main>
  );
}

function InsightNotFound() {
  const { t } = useT();
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-32 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">404</span>
        <h1 className="mt-4 font-display text-4xl font-bold text-foreground">{t("common.notFoundTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("common.notFoundDesc")}</p>
        <Link
          to="/insight-hub"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-deep)]"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.backToList")}
        </Link>
      </section>
      <Footer />
    </main>
  );
}

function InsightError({ error }: { error: Error }) {
  const { t } = useT();
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">{t("common.errorTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{error.message}</p>
      </section>
      <Footer />
    </main>
  );
}


function InsightDetailPage() {
  const { t } = useT();
  const { slug } = Route.useLoaderData();
  const { data: insight } = useSuspenseQuery(insightBySlugQueryOptions(slug));
  const { data: all } = useSuspenseQuery(insightsQueryOptions());
  const { ref: viewerRef, isFullscreen, toggleFullscreen } = useFullscreen<HTMLDivElement>();

  const incrementedRef = useRef(false);
  useEffect(() => {
    if (!insight) return;

    const storageKey = `krisnapedia:viewed:insight:${insight._id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey) === "1") {
      incrementedRef.current = true;
      return;
    }

    if (incrementedRef.current) return;
    incrementedRef.current = true;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    incrementView({
      data: { type: "insight", slug: insight.slug, contentId: insight._id },
    }).catch((error) => {
      incrementedRef.current = false;
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(storageKey);
      }
      console.error("incrementView failed", error);
    });
  }, [insight]);

  if (!insight) return null;

  const related = all
    .filter((i) => i.slug !== insight.slug && i.category === insight.category)
    .slice(0, 3);

  const downloadUrl = fileUrl(insight.file);
  const typeLabel = insight.fileType
    ? `${insight.viewer === "web" ? t("common.articleLabel") : t("common.documentLabel")} - ${insight.fileType}`
    : insight.viewer.toUpperCase();
  const documentInfo = [
    "PDF",
    insight.pages ? `${insight.pages} ${t("common.pagesLabel")}` : "",
    insight.fileSize ?? "",
  ].filter(Boolean).join(" - ");
  const mediaInfo = [
    downloadUrl ? { label: "Dokumen", value: documentInfo } : null,
    insight.youtubeUrl
      ? { label: "Video", value: insight.videoDuration ?? "-" }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const hasDocument = Boolean(downloadUrl);
  const hasVideo = Boolean(insight.youtubeUrl);
  const viewerTitle = hasDocument && hasVideo
    ? "Penampil dokumen dan video"
    : hasVideo
      ? "Penampil video"
      : t("common.viewerTitle");

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b border-border bg-[var(--primary-soft)]/30">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t("common.home")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/insight-hub" className="hover:text-foreground">
            {t("common.backToList")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{insight.category}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-medium text-foreground">
            {insight.title}
          </span>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            to="/insight-hub"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:text-[var(--primary-deep)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("insight.eyebrow")}
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-deep)]">
              {insight.category}
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </span>
          </div>

          <h1 className="mt-4 max-w-4xl font-display text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            {insight.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {insight.description}
          </p>

          <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2 md:grid-cols-4">
            <MetaItem icon={<User className="h-4 w-4" />} label={t("common.authorLabel") } value={insight.author ?? "-"} />
            <MetaItem icon={<Calendar className="h-4 w-4" />} label={t("common.publishedLabel") } value={formatDate(insight.date)} />
            <MetaItem icon={<Clock className="h-4 w-4" />} label={t("common.estimateLabel") } value={insight.readTime ?? "-"} />
            <MetaItem icon={<Languages className="h-4 w-4" />} label={t("common.languageLabel") } value={insight.language ?? "-"} />
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-foreground p-5 text-background sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <div className="space-y-2 text-sm">
                {mediaInfo.length > 0 ? mediaInfo.map((info) => (
                  <p key={info.label} className="font-semibold">
                    {info.label} <span className="font-normal text-background/60">({info.value || "-"})</span>
                  </p>
                )) : (
                  <p className="font-semibold">
                    Dokumen <span className="font-normal text-background/60">({documentInfo || "-"})</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() =>
                  shareCurrentPage({
                    title: insight.title,
                    text: insight.description,
                  })
                }
                className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Share2 className="h-4 w-4" /> {t("common.share")}
              </Button>
              <Button
                size="sm"
                asChild
                disabled={!downloadUrl}
                className="bg-primary text-primary-foreground hover:bg-[var(--primary-deep)] disabled:opacity-50"
              >
                {downloadUrl ? (
                  <a href={downloadUrl} download target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Unduh PDF
                  </a>
                ) : (
                  <span>
                    <Download className="h-4 w-4" /> {t("common.fileUnavailable")}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--primary-soft)]/20 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t("common.previewLabel")}
              </span>
              <h2 className="mt-2 font-display text-2xl font-semibold text-foreground md:text-3xl">
                {viewerTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden items-center gap-1.5 text-xs font-semibold text-primary hover:text-[var(--primary-deep)] sm:inline-flex"
            >
              <Maximize2 className="h-3.5 w-3.5" /> {isFullscreen ? t("common.fullscreenExit") : t("common.fullscreenEnter")}
            </button>
          </div>

          <div ref={viewerRef}>
            <ContentViewer item={insight} fallbackCover={insightFallback} fullscreen={isFullscreen} />
          </div>

          {insight.tags && insight.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> {t("common.tagLabel")}
              </span>
              {insight.tags.map((t: string) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-border bg-background py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                {t("common.relatedTitle")}
              </h2>
              <Link
                to="/insight-hub"
                className="text-sm font-semibold text-primary hover:text-[var(--primary-deep)]"
              >
                {t("common.viewAll")}
              </Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((item) => {
                const cover = imageUrl(item.coverImage, 800) || insightFallback;
                return (
                  <Link
                    key={item._id}
                    to="/insight-hub/$slug"
                    params={{ slug: item.slug }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={cover}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-base font-semibold leading-snug text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />{" "}
                          {item.fileType ?? item.viewer.toUpperCase()}
                        </span>
                        <time>{formatDate(item.date)}</time>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}


