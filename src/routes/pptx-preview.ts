import { createFileRoute } from "@tanstack/react-router";
import { convert } from "pptx-to-pdf";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";

const CACHE_DIR = join(tmpdir(), "krisnapedia-pptx-previews");

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

function cachePathForSource(sourceUrl: string) {
  const hash = createHash("sha1").update(sourceUrl).digest("hex");
  return join(CACHE_DIR, `${hash}.pdf`);
}

function isPptxUrl(sourceUrl: string) {
  try {
    return extname(new URL(sourceUrl).pathname).toLowerCase() === ".pptx";
  } catch {
    return false;
  }
}

function fallbackHtml(message: string, sourceUrl?: string) {
  const safeMessage = message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const safeSource = sourceUrl
    ? sourceUrl.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    : "";

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview presentasi</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #111827; color: #e5e7eb; }
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
    .card { max-width: 720px; width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 16px; padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    p { margin: 0 0 16px; line-height: 1.6; color: #cbd5e1; }
    a { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: 700; }
    code { word-break: break-all; color: #93c5fd; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Preview presentasi belum tersedia</h1>
      <p>${safeMessage}</p>
      ${safeSource ? `<p><code>${safeSource}</code></p>` : ""}
      ${safeSource ? `<a href="${safeSource}" target="_blank" rel="noreferrer">Download file</a>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export const Route = createFileRoute("/pptx-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = url.searchParams.get("source")?.trim() ?? "";

        if (!source) {
          return new Response(fallbackHtml("Parameter source wajib diisi."), {
            status: 400,
            headers: { "Content-Type": "text/html; charset=UTF-8" },
          });
        }

        if (!isPptxUrl(source)) {
          return new Response(fallbackHtml("Hanya file .pptx yang didukung oleh preview ini.", source), {
            status: 415,
            headers: { "Content-Type": "text/html; charset=UTF-8" },
          });
        }

        await ensureCacheDir();
        const cachePath = cachePathForSource(source);

        try {
          const cached = await stat(cachePath).then(() => true).catch(() => false);
          if (cached) {
            const pdf = await readFile(cachePath);
            return new Response(pdf, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="preview.pdf"',
                "Cache-Control": "private, max-age=3600",
              },
            });
          }

          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`Failed to fetch source file (${response.status})`);
          }

          const pptx = new Uint8Array(await response.arrayBuffer());
          const pdf = await convert(pptx);
          await writeFile(cachePath, pdf);

          return new Response(pdf, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'inline; filename="preview.pdf"',
              "Cache-Control": "private, max-age=3600",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gagal mengonversi PPTX ke PDF.";
          return new Response(fallbackHtml(message, source), {
            status: 422,
            headers: { "Content-Type": "text/html; charset=UTF-8" },
          });
        }
      },
    },
  },
});
