import { getApiBaseUrl } from "./admin-api";

export type ContentType = "insight" | "manual" | "regulation";

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
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && typeof payload === "object" && typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // Keep HTTP status fallback.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function rpcIncrementView(input: {
  type: ContentType;
  slug: string;
  contentId: string;
}): Promise<number> {
  const payload = await requestJson<{ data?: { views?: number } }>("/views/increment", {
    method: "POST",
    body: JSON.stringify({
      type: input.type,
      slug: input.slug,
      content_id: Number(input.contentId),
    }),
  });

  return typeof payload.data?.views === "number" ? payload.data.views : 0;
}

export async function fetchViewsMap(
  type: ContentType,
): Promise<Record<string, number>> {
  const payload = await requestJson<{ data?: Record<string, number> }>(`/views?type=${encodeURIComponent(type)}`);
  const map: Record<string, number> = {};

  for (const [slug, views] of Object.entries(payload.data ?? {})) {
    map[slug] = Number(views) || 0;
  }

  return map;
}

/** Simple in-memory rate limit. Best-effort, per Worker instance. */
const recentHits = new Map<string, number>();
const WINDOW_MS = 30_000;

export function shouldThrottle(key: string): boolean {
  const now = Date.now();
  // opportunistic cleanup
  if (recentHits.size > 1000) {
    for (const [k, t] of recentHits) {
      if (now - t > WINDOW_MS) recentHits.delete(k);
    }
  }
  const last = recentHits.get(key);
  if (last && now - last < WINDOW_MS) return true;
  recentHits.set(key, now);
  return false;
}