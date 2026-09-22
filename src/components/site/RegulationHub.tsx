import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText, Play } from "lucide-react";
import { regulationsQueryOptions } from "@/lib/content-queries";
import { viewsQueryOptions } from "@/lib/views-queries";
import { imageUrl } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { ViewCount } from "@/components/site/ViewCount";
import { DisplayStatusBadge } from "@/components/site/DisplayStatusBadge";
import regulasiFallback from "@/assets/regulasi-uu.jpg";
import { useT } from "@/i18n/LanguageProvider";

export function RegulationHub() {
  const { t } = useT();
  const { data: all = [] } = useQuery(regulationsQueryOptions());
  const { data: viewsMap = {} } = useQuery(viewsQueryOptions("regulation"));
  const regulations = [...all]
    .sort((a, b) => {
      const va = viewsMap[a.slug] ?? 0;
      const vb = viewsMap[b.slug] ?? 0;
      if (vb !== va) return vb - va;
      return +new Date(b.date) - +new Date(a.date);
    })
    .slice(0, 3);

  return (
    <section id="regulations" className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("page.regulasi.eyebrow")}
            </span>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t("page.regulasi.title")}
            </h2>
            <p className="mt-3 max-w-lg text-muted-foreground">
              {t("page.regulasi.lead")}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {regulations.map((item) => {
            const cover = imageUrl(item.coverImage, 800) || regulasiFallback;
            const hasVideo = Boolean(item.youtubeUrl);
            return (
              <Link
                key={item._id}
                to="/pustaka-regulasi/$slug"
                params={{ slug: item.slug }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img src={cover} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                  <p className="mb-5 mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {item.fileType ?? item.viewer.toUpperCase()}
                      </span>
                      <ViewCount count={viewsMap[item.slug]} />
                    </div>
                    <time>{formatDate(item.date)}</time>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            to="/pustaka-regulasi"
            className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-[var(--primary-soft)]/40 p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-[var(--primary-soft)] hover:shadow-[var(--shadow-soft)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform group-hover:scale-110">
              <ArrowUpRight className="h-6 w-6" />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{t("regulasi.exploreTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("regulasi.exploreDesc")}</p>
            <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">{t("regulasi.viewAll")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
