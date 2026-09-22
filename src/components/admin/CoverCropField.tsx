import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  getCoverRenderContext,
  loadImageFromFile,
  type CoverCropTransform,
} from "@/lib/image-crop";

export type CoverCropSelection = {
  sourceFile: File;
  transform: CoverCropTransform;
};

type CoverCropFieldProps = {
  id: string;
  label: string;
  helperText: string;
  existingUrl?: string | null;
  removed: boolean;
  onRemove: () => void;
  onRestore: () => void;
  onChange: (selection: CoverCropSelection | null) => void;
  onErrorChange: (error: string) => void;
};

type Size = { width: number; height: number };

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function CoverCropField({
  id,
  label,
  helperText,
  existingUrl,
  removed,
  onRemove,
  onRestore,
  onChange,
  onErrorChange,
}: CoverCropFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const objectUrlRef = useRef("");

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [frameSize, setFrameSize] = useState<Size>({ width: 0, height: 0 });
  const [previewSize, setPreviewSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const hasExisting = Boolean(existingUrl) && !removed && !sourceFile;
  const selectedName = sourceFile?.name ?? "";
  const previewImage = sourceFile ? sourceUrl : (existingUrl ?? "");
  const showCropper = Boolean(sourceFile && previewImage && !loading);

  useLayoutEffect(() => {
    if (!showCropper) {
      setFrameSize({ width: 0, height: 0 });
      setPreviewSize({ width: 0, height: 0 });
      return;
    }

    const measureBoxes = () => {
      const frame = frameRef.current;
      const preview = previewRef.current;

      if (frame) {
        const rect = frame.getBoundingClientRect();
        setFrameSize({ width: rect.width, height: rect.height });
      }

      if (preview) {
        const rect = preview.getBoundingClientRect();
        setPreviewSize({ width: rect.width, height: rect.height });
      }
    };

    measureBoxes();
    const raf = window.requestAnimationFrame(measureBoxes);
    const observer = new ResizeObserver(measureBoxes);

    if (frameRef.current) observer.observe(frameRef.current);
    if (previewRef.current) observer.observe(previewRef.current);
    window.addEventListener("resize", measureBoxes);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measureBoxes);
      observer.disconnect();
    };
  }, [showCropper]);

  const frameRender = useMemo(() => {
    if (!naturalSize || !frameSize.width || !frameSize.height) return null;

    return getCoverRenderContext(
      naturalSize.width,
      naturalSize.height,
      frameSize.width,
      frameSize.height,
      {
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
      },
    );
  }, [frameSize.height, frameSize.width, naturalSize, offset.x, offset.y, zoom]);

  const previewRender = useMemo(() => {
    if (!naturalSize) return null;

    const viewportWidth = previewSize.width || frameSize.width;
    const viewportHeight = previewSize.height || frameSize.height;
    if (!viewportWidth || !viewportHeight) return null;

    return getCoverRenderContext(
      naturalSize.width,
      naturalSize.height,
      viewportWidth,
      viewportHeight,
      {
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        frameWidth: frameSize.width || viewportWidth,
        frameHeight: frameSize.height || viewportHeight,
      },
    );
  }, [
    frameSize.height,
    frameSize.width,
    naturalSize,
    offset.x,
    offset.y,
    previewSize.height,
    previewSize.width,
    zoom,
  ]);

  const bounds = useMemo(() => {
    if (!frameRender || !frameSize.width || !frameSize.height) {
      return { maxX: 0, maxY: 0 };
    }

    return {
      maxX: frameRender.maxOffsetX,
      maxY: frameRender.maxOffsetY,
    };
  }, [frameRender, frameSize.height, frameSize.width]);

  useEffect(() => {
    if (!sourceFile) {
      onChange(null);
      onErrorChange("");
      return;
    }

    onChange({
      sourceFile,
      transform: {
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
      },
    });
    onErrorChange(localError);
  }, [
    frameSize.height,
    frameSize.width,
    localError,
    onChange,
    onErrorChange,
    offset.x,
    offset.y,
    sourceFile,
    zoom,
  ]);

  useEffect(() => {
    if (!sourceFile) return;
    setOffset((current) => ({
      x: Math.min(bounds.maxX, Math.max(-bounds.maxX, current.x)),
      y: Math.min(bounds.maxY, Math.max(-bounds.maxY, current.y)),
    }));
  }, [bounds.maxX, bounds.maxY, sourceFile, zoom]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      const deltaX = (event.clientX - drag.startX) / Math.max(frameSize.width, 1);
      const deltaY = (event.clientY - drag.startY) / Math.max(frameSize.height, 1);
      setOffset(
        clampOffset({
          x: drag.originX + deltaX,
          y: drag.originY + deltaY,
        }),
      );
    };

    const handleUp = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null;
      }
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      dragRef.current = null;
    };
  }, [bounds.maxX, bounds.maxY]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function clampOffset(next: { x: number; y: number }) {
    return {
      x: Math.min(bounds.maxX, Math.max(-bounds.maxX, next.x)),
      y: Math.min(bounds.maxY, Math.max(-bounds.maxY, next.y)),
    };
  }

  async function selectFile(file?: File | null) {
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }

      setSourceFile(null);
      setSourceUrl("");
      setNaturalSize(null);
      setZoom(DEFAULT_ZOOM);
      setOffset({ x: 0, y: 0 });
      setLocalError("");
      onRestore();
      onErrorChange("");
      inputRef.current && (inputRef.current.value = "");
      return;
    }

    setLoading(true);
    setLocalError("");
    onRestore();

    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setSourceFile(file);
      setSourceUrl(nextUrl);
      setZoom(DEFAULT_ZOOM);
      setOffset({ x: 0, y: 0 });

      const image = await loadImageFromFile(file);
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membaca file gambar.";
      setLocalError(message);
      onErrorChange(message);
      setSourceFile(null);
      setSourceUrl("");
      setNaturalSize(null);
    } finally {
      setLoading(false);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!sourceFile) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor={id}>
          {label}
        </label>
        <div className="flex items-center gap-2">
          {hasExisting ? (
            removed ? (
              <Button type="button" variant="ghost" size="sm" onClick={onRestore} className="gap-2">
                Batalkan hapus
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Hapus cover lama
              </Button>
            )
          ) : null}
          {sourceFile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => selectFile(null)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat gambar...
          </div>
        ) : showCropper ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
              <div className="space-y-3">
                <div
                  ref={frameRef}
                  className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-black/80 bg-slate-950/95 shadow-inner ring-1 ring-white/5 touch-none"
                  onPointerDown={handlePointerDown}
                >
                  {previewImage ? (
                    <div
                      className={cn(
                        "absolute left-0 top-0 select-none pointer-events-none",
                        sourceFile ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                      )}
                      style={
                        frameRender
                          ? {
                              width: `${frameRender.drawWidth}px`,
                              height: `${frameRender.drawHeight}px`,
                              left: `${frameRender.translateX}px`,
                              top: `${frameRender.translateY}px`,
                              transform: "translate(-50%, -50%)",
                              transformOrigin: "center center",
                            }
                          : {
                              inset: 0,
                              width: "100%",
                              height: "100%",
                            }
                      }
                    >
                      <img
                        src={previewImage}
                        alt={`${label} preview`}
                        draggable={false}
                        className="h-full w-full select-none object-cover"
                      />
                    </div>
                  ) : null}{" "}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.22))]" />
                  <div className="pointer-events-none absolute inset-0 border border-black/70" />
                  <div className="pointer-events-none absolute inset-x-1/3 top-0 h-full w-px bg-black/35" />
                  <div className="pointer-events-none absolute inset-x-2/3 top-0 h-full w-px bg-black/35" />
                  <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-black/35" />
                  <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-black/35" />
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl bg-black/45 px-3 py-2 text-xs text-white/90 backdrop-blur">
                    Seret gambar di dalam kotak 4:3, lalu zoom untuk menyesuaikan area yang ingin
                    ditampilkan.
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-border/70 bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Zoom</p>
                      <p className="text-xs text-muted-foreground">
                        Geser untuk memperbesar atau memperkecil.
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[zoom]}
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.01}
                    onValueChange={([next]) => setZoom(next)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Preview final</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hasil final mengikuti kotak crop 4:3 dan akan dikompresi sebelum disimpan.
                  </p>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-slate-950/90">
                    <div ref={previewRef} className="relative aspect-[4/3]">
                      {previewImage ? (
                        <div
                          className="absolute left-0 top-0 select-none pointer-events-none"
                          style={
                            previewRender
                              ? {
                                  width: `${previewRender.drawWidth}px`,
                                  height: `${previewRender.drawHeight}px`,
                                  left: `${previewRender.translateX}px`,
                                  top: `${previewRender.translateY}px`,
                                  transform: "translate(-50%, -50%)",
                                  transformOrigin: "center center",
                                }
                              : {
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                }
                          }
                        >
                          <img
                            src={previewImage}
                            alt={`${label} final preview`}
                            draggable={false}
                            className="h-full w-full select-none object-cover"
                          />
                        </div>
                      ) : null}{" "}
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at-center,rgba(255,255,255,0.04),transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.28))]" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {selectedName || "Cover baru siap diproses."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : hasExisting ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
            <img src={existingUrl ?? undefined} alt={label} className="h-56 w-full object-cover" />
            <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Gambar saat ini</p>
                <p className="text-xs text-muted-foreground">
                  Akan tetap dipakai sampai Anda memilih file baru.
                </p>
              </div>
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border/70 bg-background p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Belum ada cover yang dipilih</p>
              <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Unggah cover baru</p>
              <p className="text-xs text-muted-foreground">
                Idealnya 4:3, hasil akhir dikompresi otomatis di bawah 500 KB.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Gambar
            </span>
          </div>
          <input
            ref={inputRef}
            id={id}
            name={id}
            type="file"
            accept="image/*"
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground shadow-inner file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <input type="hidden" name={`${id}_url`} defaultValue={existingUrl ?? ""} />
      <input type="hidden" name="remove_cover_image" value={removed ? "1" : "0"} />

      {localError ? <p className="text-xs text-destructive">{localError}</p> : null}
      {sourceFile ? (
        <p className="text-xs text-muted-foreground">File dipilih: {selectedName}</p>
      ) : null}
    </div>
  );
}




