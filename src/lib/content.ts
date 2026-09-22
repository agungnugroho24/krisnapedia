import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { ContentBase, Faq } from "./content-types";

export const SANITY_PROJECT_ID = "l6d1o9wo";
export const SANITY_DATASET = "production";

export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: "2024-01-01",
  useCdn: true,
});

const builder = createImageUrlBuilder(sanityClient);

/** Convert CMS values into text that is safe to render as a React child. */
export function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.current === "string") return record.current;
  return "";
}

/** Normalize text fields at the API boundary before they reach JSX. */
export function normalizeContent<T extends ContentBase>(item: T): T {
  return {
    ...item,
    title: textValue(item.title),
    slug: textValue(item.slug),
    category: textValue(item.category),
    categoryId: item.categoryId,
    subCategory: item.subCategory == null ? item.subCategory : textValue(item.subCategory),
    subCategoryId: item.subCategoryId,
    description: textValue(item.description),
    author: item.author == null ? item.author : textValue(item.author),
    fileType: item.fileType == null ? item.fileType : (textValue(item.fileType) as T["fileType"]),
    displayStatus: item.displayStatus == null ? item.displayStatus : textValue(item.displayStatus),
    status: item.status == null ? item.status : textValue(item.status),
    tags: Array.isArray(item.tags) ? item.tags.map(textValue).filter(Boolean) : item.tags,
  };
}

export function normalizeFaq(item: Faq): Faq {
  return {
    ...item,
    question: textValue(item.question),
    category: item.category == null ? item.category : textValue(item.category),
  };
}

type SanityImageSource = Parameters<typeof builder.image>[0] | { asset?: { url?: string } } | string | null | undefined;

export function urlFor(source: SanityImageSource) {
  if (!source) return null;
  if (typeof source === "string") return source;
  if (typeof source === "object" && source.asset?.url) return source.asset.url;
  return builder.image(source as Parameters<typeof builder.image>[0]);
}

export function imageUrl(source: SanityImageSource, width = 1200): string {
  const resolved = urlFor(source);
  if (!resolved) return "";
  if (typeof resolved === "string") return resolved;
  return resolved.width(width).auto("format").url();
}

/**
 * Build a downloadable file URL from a Sanity file asset reference.
 * Local data already stores an absolute `asset.url`, so that is preferred.
 */
export function fileUrl(file: { asset?: { _ref?: string; url?: string } } | string | undefined | null): string {
  if (!file) return "";
  if (typeof file === "string") return file;
  if (file.asset?.url) return file.asset.url;
  const ref = file.asset?._ref;
  if (!ref) return "";
  const [, id, ext] = ref.split("-");
  if (!id || !ext) return "";
  return `https://cdn.sanity.io/files/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}.${ext}`;
}

/**
 * Extract the lowercase file extension (without dot) from a Sanity file
 * reference or local URL. Returns empty string when nothing can be inferred.
 */
export function fileExtension(
  file: { asset?: { _ref?: string; url?: string } } | string | undefined | null,
): string {
  if (!file) return "";
  if (typeof file === "string") {
    const match = file.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match ? match[1].toLowerCase() : "";
  }
  const ref = file.asset?._ref;
  if (ref) {
    const parts = ref.split("-");
    const ext = parts[parts.length - 1];
    if (ext) return ext.toLowerCase();
  }
  const url = file.asset?.url;
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1].toLowerCase();
  }
  return "";
}

/** Convert a YouTube URL to an embeddable iframe URL. */
export function youtubeEmbedUrl(url: string | undefined | null): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.replace("/", "");
    } else if (u.searchParams.get("v")) {
      id = u.searchParams.get("v") ?? "";
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.replace("/embed/", "");
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.replace("/shorts/", "");
    }
    return id ? `https://www.youtube.com/embed/${id}` : url;
  } catch {
    return url;
  }
}

/** Render Sanity portable text blocks as plain text (for descriptions / og). */
export function blocksToPlainText(
  blocks: Array<{ _type?: string; children?: Array<{ text?: string }> }> | undefined | null,
): string {
  if (!blocks?.length) return "";
  return blocks
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => textValue(c.text)).join(""))
    .join("\n\n");
}
