import { useEffect, useState } from "react";
import { FileText, Globe, Pause, Play, Presentation, Youtube } from "lucide-react";
import type { ContentBase } from "@/lib/content-types";
import { fileExtension, fileUrl, imageUrl, youtubeEmbedUrl } from "@/lib/content";
import { PortableText } from "@/components/site/PortableText";
import { blocksToPlainText } from "@/lib/content";
import { formatDate } from "@/lib/format";

const PRESENTATION_EXTENSIONS = new Set(["ppt", "pptx", "key", "odp"]);

function isPresentationAsset(ext: string, fileType?: string | null) {
  if (PRESENTATION_EXTENSIONS.has(ext)) return true;
  return /(pptx?|odp|key|slides?|presentation)/i.test(fileType ?? "");
}

/**
 * Content viewer that switches between PDF, slides, image, video, and web article previews.
 */
export function ContentViewer({
  item,
  fallbackCover,
  fullscreen = false,
}: {
  item: ContentBase;
  fallbackCover: string;
  fullscreen?: boolean;
}) {
  const cover = imageUrl(item.coverImage, 1200) || fallbackCover;
  const previewUrl = item.filePreviewUrl ?? fileUrl(item.file);
  const pptxSourceUrl = fileUrl(item.file);
  const pptxPreviewUrl = pptxSourceUrl ? `/pptx-preview?source=${encodeURIComponent(pptxSourceUrl)}` : previewUrl;
  const ext = fileExtension(item.file);
  const presentationAsset = isPresentationAsset(ext, item.fileType);
  const [activePanel, setActivePanel] = useState<"document" | "video">("document");

  const renderDocumentPreview = () => {
    if (item.viewer === "pdf" && previewUrl && !presentationAsset) {
      return <PreviewFrame url={previewUrl} title={item.title} label="PDF" loadingText="Membuka PDF..." fullscreen={fullscreen} />;
    }

    if ((item.viewer === "slides" || presentationAsset) && previewUrl) {
      const isPptx = ext === "pptx";

      return (
        <div className={fullscreen ? "flex h-full min-h-0 flex-col space-y-4" : "space-y-4"}>
          <PresentationNotice
            ext={ext.toUpperCase() || "SLIDES"}
            message={
              isPptx
                ? "Slide dirender menjadi PDF agar tampilan slide tetap identik."
                : `Format ${ext.toUpperCase() || "SLIDES"} ditampilkan melalui PDF preview.`
            }
          />
          <PreviewFrame
            url={isPptx ? pptxPreviewUrl : previewUrl}
            title={item.title}
            label="SLIDES"
            loadingText="Membuka pratinjau slide..."
            fullscreen={fullscreen}
          />
        </div>
      );
    }

    return <DocumentPreview item={item} cover={cover} presentationAsset={presentationAsset} fullscreen={fullscreen} />;
  };

  if (item.youtubeUrl) {
    const embed = youtubeEmbedUrl(item.youtubeUrl);
    if (embed) {
      const videoPreview = (
        <div className={fullscreen ? "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]" : "overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]"}>
          <div className="flex items-center gap-2 border-b border-background/10 bg-foreground px-4 py-3 text-xs text-background/80">
            <Youtube className="h-4 w-4 text-primary" />
            YouTube
          </div>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={embed}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      );

      if (previewUrl) {
        return (
          <div className={fullscreen ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4"}>
            <div className="inline-flex w-fit rounded-full border border-border bg-card p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActivePanel("document")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activePanel === "document" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dokumen
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("video")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activePanel === "video" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Video
              </button>
            </div>
            {activePanel === "document" ? renderDocumentPreview() : videoPreview}
          </div>
        );
      }

      return videoPreview;
    }

    return <VideoPlaceholder poster={cover} />;
  }

  if (item.viewer === "web") {
    return (
      <article className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:p-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-deep)]">
          <Globe className="h-3.5 w-3.5" /> Web Article
        </div>
        <div className="prose prose-neutral max-w-none">
          <h3 className="font-display text-2xl font-bold text-foreground">Ringkasan</h3>
          {item.longDescription?.length ? (
            <PortableText value={item.longDescription} />
          ) : (
            <p className="mt-3 leading-relaxed text-muted-foreground">{item.description}</p>
          )}
        </div>
      </article>
    );
  }

  if (item.viewer === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <img src={cover} alt={item.title} className="w-full" />
      </div>
    );
  }

  return renderDocumentPreview();

}

function PresentationNotice({
  ext,
  message,
}: {
  ext: string;
  message: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 border-b border-background/10 bg-foreground px-4 py-3 text-xs text-background/80">
        <Presentation className="h-4 w-4 text-primary" />
        <span className="rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">{ext}</span>
        <span className="truncate">Pratinjau presentasi</span>
      </div>
      <div className="bg-[oklch(0.22_0.012_50)] p-6 md:p-8">
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pratinjau terbatas</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({
  url,
  title,
  label,
  loadingText,
  fullscreen = false,
}: {
  url: string;
  title: string;
  label: string;
  loadingText: string;
  fullscreen?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div className={fullscreen ? "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]" : "overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]"}>
      <div className="flex items-center gap-2 border-b border-background/10 bg-foreground px-4 py-3 text-xs text-background/80">
        <span className="rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">{label}</span>
        <span className="truncate">{title}</span>
      </div>
      <div className={fullscreen ? "relative flex-1 min-h-0 bg-card" : "relative bg-card"}>
        {!loaded && (
          <div className="absolute inset-0 z-10 flex min-h-[720px] items-center justify-center bg-[oklch(0.22_0.012_50)] p-6 text-center text-sm text-background/70">
            <div>
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-background/20 border-t-primary" />
              <p>{loadingText}</p>
            </div>
          </div>
        )}
        <iframe
          src={`${url}#view=FitH`}
          title={title}
          className={fullscreen ? "h-full w-full bg-card" : "h-[720px] w-full bg-card"}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

function DocumentPreview({
  item,
  cover,
  presentationAsset,
  fullscreen = false,
}: {
  item: ContentBase;
  cover: string;
  presentationAsset: boolean;
  fullscreen?: boolean;
}) {
  const totalPages = item.pages ?? 12;
  const [page, setPage] = useState(1);
  const isPdf = item.viewer === "pdf" && !presentationAsset;
  const summary = blocksToPlainText(item.longDescription) || item.description;

  return (
    <div className={fullscreen ? "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]" : "overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]"}>
      <div className="flex items-center justify-between border-b border-background/10 bg-foreground px-4 py-3 text-background">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">{isPdf ? "PDF" : "SLIDES"}</span>
          <span className="text-background/70">{item.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-background/20 px-2.5 py-1 hover:bg-background/10 disabled:opacity-40"
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-background/20 px-2.5 py-1 hover:bg-background/10 disabled:opacity-40"
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className={fullscreen ? "flex flex-1 min-h-0 items-stretch justify-stretch bg-[oklch(0.22_0.012_50)] p-0" : "flex items-center justify-center bg-[oklch(0.22_0.012_50)] p-6 md:p-10"}>
        <div className={fullscreen ? "relative h-full w-full overflow-hidden rounded-md bg-card shadow-2xl" : "relative aspect-[4/5] w-full max-w-2xl overflow-hidden rounded-md bg-card shadow-2xl md:aspect-[4/3]"}>
          <img src={cover} alt={`${item.title} preview`} className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/30 to-background/90" />
          <div className="absolute inset-0 flex flex-col p-8 md:p-12">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              {item.category} · Halaman {page}
            </span>
            <h3 className="mt-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              {page === 1 ? item.title : `Bagian ${page}`}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {summary.slice(0, 220)}...
            </p>
            <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{item.author ?? "-"}</span>
              <span>KRISNApedia · {formatDate(item.date)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlaceholder({ poster }: { poster: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-foreground shadow-[var(--shadow-soft)]">
      <div className="relative aspect-video w-full">
        <img src={poster} alt="Video poster" className="h-full w-full object-cover" />
        <button
          onClick={() => setPlaying((p) => !p)}
          className="absolute inset-0 flex items-center justify-center bg-foreground/40 transition hover:bg-foreground/30"
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform hover:scale-105">
            {playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
          </span>
        </button>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-background/70">
        <FileText className="h-3.5 w-3.5" /> Pratinjau video - sumber YouTube belum diatur.
      </div>
    </div>
  );
}
