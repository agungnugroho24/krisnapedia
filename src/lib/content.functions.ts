import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAllPaginated, getApiBaseUrl, type AdminContentItem, type AdminFaq } from "./admin-api";
import type { Faq, Insight, Manual, Regulation, PortableTextBlock, ContentBase } from "./content-types";

const slugSchema = z.string().min(1).max(200);
const faqInquirySchema = z.object({
  nama: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  subjek: z.string().trim().min(3).max(150),
  pertanyaan: z.string().trim().min(10).max(1000),
  captcha_id: z.string().uuid(),
  captcha_x: z.number().min(0).max(300),
});

type LocalContentResponse = {
  data: AdminContentItem[];
};

type LocalFaqResponse = {
  data: AdminFaq[];
};

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && typeof payload === "object" && typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // keep HTTP status fallback
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function normalizeLocalUrl(url?: string | null) {
  if (!url) return undefined;
  return url
    .replace(/^https?:\/\/127\.0\.0\.1:8000(?=\/)/, "")
    .replace(/^https?:\/\/localhost:8000(?=\/)/, "");
}
function toAsset(url?: string | null, originalFilename?: string | null) {
  if (!url) return undefined;
  return {
    asset: {
      url,
      originalFilename: originalFilename ?? undefined,
    },
  };
}

function normalizeViewer(item: AdminContentItem): ContentBase["viewer"] {
  const viewer = (item.viewer ?? "").toLowerCase();
  const ext = (item.file_url ?? "").split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const fileType = (item.file_type ?? "").toLowerCase();

  if (viewer === "video" || (viewer === "" && item.youtube_url)) return "video";
  if (viewer === "web") return "web";
  if (viewer === "image") return "image";
  if (["ppt", "pptx", "key", "odp"].includes(ext) || /(pptx?|odp|key|slides?|presentation)/i.test(fileType)) {
    return "slides";
  }
  if (viewer === "slides") return "slides";
  if (viewer === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  return "pdf";
}

function mapContent(item: AdminContentItem): ContentBase {
  return {
    _id: String(item.id),
    title: item.title,
    slug: item.slug,
    category: item.category?.name ?? item.category_text ?? "",
    categoryId: item.category_id ?? undefined,
    subCategory: item.sub_category_item?.name ?? item.sub_category ?? undefined,
    subCategoryId: item.sub_category_id ?? undefined,
    subSystem: item.sub_system?.name ?? undefined,
    subSystemId: item.sub_system_id ?? item.sub_system?.id ?? undefined,
    year: item.year ?? undefined,
    description: item.description,
    longDescription: (item.long_description ?? []) as PortableTextBlock[],
    coverImage: toAsset(normalizeLocalUrl(item.cover_image_url), null),
    file: toAsset(normalizeLocalUrl(item.file_url), item.file_name),
    filePreviewUrl: normalizeLocalUrl(item.file_preview_url) ?? undefined,
    youtubeUrl: item.youtube_url ?? undefined,
    videoDuration: item.video_duration ?? undefined,
    viewer: normalizeViewer(item),
    fileType: item.youtube_url ? "VIDEO" : item.file_type ? (item.file_type.toUpperCase() as ContentBase["fileType"]) : undefined,
    author: item.author ?? undefined,
    date: item.published_date ?? item.created_at ?? new Date().toISOString(),
    pages: item.pages ?? undefined,
    fileSize: item.file_size ?? undefined,
    language: item.language ?? undefined,
    readTime: item.read_time ?? undefined,
    tags: item.tags ?? [],
    displayStatus: item.display_status ?? undefined,
    status: item.display_status ?? undefined,
    published: item.published,
  };
}

function mapInsight(item: AdminContentItem): Insight {
  return mapContent(item) as Insight;
}

function mapManual(item: AdminContentItem): Manual {
  return {
    ...(mapContent(item) as Manual),
    version: item.version ?? undefined,
  };
}

function mapRegulation(item: AdminContentItem): Regulation {
  return {
    ...(mapContent(item) as Regulation),
    jurisdiction: item.jurisdiction ?? undefined,
    effectiveDate: item.effective_date ?? undefined,
    regulasiStatus: item.regulation_status ?? undefined,
  };
}

function mapFaq(item: AdminFaq): Faq {
  return {
    _id: String(item.id),
    question: item.question,
    answer: (item.answer ?? []) as PortableTextBlock[],
    category: item.faq_category?.name ?? item.category ?? undefined,
    orderIndex: item.order_index ?? undefined,
    published: item.published,
  };
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function normalizeContent<T extends ContentBase>(item: T): T {
  return {
    ...item,
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    category: normalizeText(item.category),
    subCategory: item.subCategory == null ? item.subCategory : normalizeText(item.subCategory),
    description: normalizeText(item.description),
    author: item.author == null ? item.author : normalizeText(item.author),
    fileType: item.fileType == null ? item.fileType : (normalizeText(item.fileType) as T["fileType"]),
    displayStatus: item.displayStatus == null ? item.displayStatus : normalizeText(item.displayStatus),
    status: item.status == null ? item.status : normalizeText(item.status),
    tags: Array.isArray(item.tags) ? item.tags.map(normalizeText).filter(Boolean) : item.tags,
  };
}

function normalizeFaq(item: Faq): Faq {
  return {
    ...item,
    question: normalizeText(item.question),
    category: item.category == null ? item.category : normalizeText(item.category),
  };
}

async function fetchContentList(type: "insights" | "manuals" | "regulations") {
  const payload = await fetchAllPaginated<AdminContentItem>(`/${type}`);
  return payload;
}

async function fetchContentBySlug(type: "insights" | "manuals" | "regulations", slug: string) {
  try {
    const payload = await requestJson<{ data: AdminContentItem }>(`/${type}/${slug}`);
    return payload.data;
  } catch (error) {
    if (error instanceof Error && (error as Error & { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export const fetchInsights = createServerFn({ method: "GET" }).handler(
  async (): Promise<Insight[]> => (await fetchContentList("insights")).map(mapInsight).map(normalizeContent),
);

export const fetchInsightBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data: slug }): Promise<Insight | null> => {
    const insight = await fetchContentBySlug("insights", slug);
    return insight ? normalizeContent(mapInsight(insight)) : null;
  });

export const fetchManuals = createServerFn({ method: "GET" }).handler(
  async (): Promise<Manual[]> => (await fetchContentList("manuals")).map(mapManual).map(normalizeContent),
);

export const fetchManualBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data: slug }): Promise<Manual | null> => {
    const manual = await fetchContentBySlug("manuals", slug);
    return manual ? normalizeContent(mapManual(manual)) : null;
  });

export const fetchRegulations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Regulation[]> => (await fetchContentList("regulations")).map(mapRegulation).map(normalizeContent),
);

export const fetchRegulationBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data: slug }): Promise<Regulation | null> => {
    const regulation = await fetchContentBySlug("regulations", slug);
    return regulation ? normalizeContent(mapRegulation(regulation)) : null;
  });

export const fetchFaqs = createServerFn({ method: "GET" }).handler(
  async (): Promise<Faq[]> => {
    const payload = await fetchAllPaginated<AdminFaq>("/faqs");
    return payload.map(mapFaq).map(normalizeFaq);
  },
);

export type FaqCaptchaChallenge = {
  id: string;
  image_key: string;
  target_x: number;
  width: number;
  expires_in: number;
};

export const fetchFaqCaptcha = createServerFn({ method: "GET" }).handler(
  async (): Promise<FaqCaptchaChallenge> => requestJson<FaqCaptchaChallenge>("/faq-inquiries/captcha"),
);

export const submitFaqInquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => faqInquirySchema.parse(input))
  .handler(async ({ data }): Promise<{ message: string }> =>
    requestJson<{ message: string }>("/faq-inquiries", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
