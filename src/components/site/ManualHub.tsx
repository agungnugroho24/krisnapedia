import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText, Play } from "lucide-react";
import { manualsQueryOptions } from "@/lib/content-queries";
import { viewsQueryOptions } from "@/lib/views-queries";
import { imageUrl } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { ViewCount } from "@/components/site/ViewCount";
import { DisplayStatusBadge } from "@/components/site/DisplayStatusBadge";
import manualFallback from "@/assets/manual-onboarding.jpg";
import { useT } from "@/i18n/LanguageProvider";

export function ManualHub() {
  const { t } = useT();
  const { data: all = [] } = useQuery(manualsQueryOptions());
  const { data: viewsMap = {} } = useQuery(viewsQueryOptions("manual"));
  const manuals = [...all]
    .sort((a, b) => {
      const va = viewsMap[a.slug] ?? 0;
      const vb = viewsMap[b.slug] ?? 0;
      if (vb !== va) return vb - va;
      return +new Date(b.date) - +new Date(a.date);
    })
    .slice(0, 3);

  return (
    <section
      id="manuals"
      className="relative overflow-hidden border-t border-border bg-surface-warm py-24 text-foreground"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary-deep) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("manual.eyebrow")}</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              {t("manual.heading1")}
              <br />
              {t("manual.heading2")}
            </h2>
            <p className="mt-3 max-w-lg text-foreground/70">
              {t("manual.lead")}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {manuals.map((m) => {
            const cover = imageUrl(m.coverImage, 800) || manualFallback;
            const hasVideo = Boolean(m.youtubeUrl);
            return (
              <Link
                key={m._id}
                to="/manual-hub/$slug"
                params={{ slug: m.slug }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img src={cover} alt={m.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition group-hover:bg-foreground/30">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-primary shadow-2xl backdrop-blur">
                        <Play className="ml-1 h-7 w-7 fill-current" />
                      </span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                    {m.category}
                  </span>
                  {m.videoDuration ? (
                    <span className="absolute bottom-3 right-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold text-background shadow-lg backdrop-blur">
                      {m.videoDuration}
                    </span>
                  ) : null}
                  <DisplayStatusBadge status={m.displayStatus ?? m.status} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-snug">{m.title}</h3>
                  <p className="mb-5 mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {m.fileType ?? m.viewer.toUpperCase()}
                      </span>
                      <ViewCount count={viewsMap[m.slug]} />
                    </div>
                    <time>{formatDate(m.date)}</time>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            to="/manual-hub"
            className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/50 bg-primary/[0.06] p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary/[0.12] hover:shadow-[var(--shadow-soft)]"
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-110">
              <ArrowUpRight className="h-6 w-6" />
            </span>
            <h3 className="relative mt-5 font-display text-lg font-semibold">{t("manual.exploreTitle")}</h3>
            <p className="relative mt-2 text-sm text-muted-foreground">{t("manual.exploreDesc")}</p>
            <span className="relative mt-5 inline-flex items-center text-sm font-semibold text-primary">{t("manual.viewAll")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
