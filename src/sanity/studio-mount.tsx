import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Studio as SanityStudioType } from "sanity";

/**
 * Client-only Sanity Studio mount.
 *
 * We import `sanity` and the studio config dynamically inside an effect so:
 *  1. They never enter the SSR module graph (would OOM the Worker SSR build).
 *  2. The ~5 MB Studio bundle only loads when a user actually opens /studio.
 */
type StudioComponent = typeof SanityStudioType;

export function StudioMount() {
  const [Studio, setStudio] = useState<{
    Component: StudioComponent;
    config: Parameters<StudioComponent>[0]["config"];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("sanity"),
      import("./config"),
    ])
      .then(([sanityMod, configMod]) => {
        if (cancelled) return;
        setStudio({ Component: sanityMod.Studio, config: configMod.studioConfig });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground">Gagal memuat Studio</h1>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!Studio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Memuat Studio…
        </div>
      </div>
    );
  }

  const { Component, config } = Studio;
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Component config={config} />
    </div>
  );
}
