import { queryOptions } from "@tanstack/react-query";
import { getApiBaseUrl } from "./admin-api";

export type WhatsNewItem = {
  id: number;
  number: number;
  title: string;
  raw_title?: string;
  summary?: string | null;
  category: string;
  urgency: string;
  sub_system?: string;
  sub_system_id?: number;
  closed_at?: string | null;
  year?: number | null;
  url: string;
  published?: boolean;
  is_new?: boolean;
};

export type WhatsNewPaginator = {
  data: WhatsNewItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type WhatsNewResponse = {
  data: WhatsNewItem[] | WhatsNewPaginator;
  filters: {
    years: number[];
    sub_systems: Array<{ id: number; name: string; slug: string }>;
    categories: string[];
  };
};

export type WhatsNewFilters = {
  year?: string;
  subSystem?: string;
  category?: string;
  search?: string;
  limit?: number;
  page?: number;
  perPage?: number;
};

async function fetchWhatsNew(filters: WhatsNewFilters = {}) {
  const params = new URLSearchParams();

  if (filters.year && filters.year !== "All") params.set("year", filters.year);
  if (filters.subSystem && filters.subSystem !== "All") params.set("sub_system_id", filters.subSystem);
  if (filters.category && filters.category !== "All") params.set("category", filters.category);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));

  const query = params.toString();
  const response = await fetch(`${getApiBaseUrl()}/whats-new${query ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch what's new (${response.status})`);
  }

  return (await response.json()) as WhatsNewResponse;
}

export function whatsNewItems(response?: WhatsNewResponse): WhatsNewItem[] {
  if (!response) return [];
  return Array.isArray(response.data) ? response.data : response.data.data;
}

export function whatsNewPaginator(response?: WhatsNewResponse): WhatsNewPaginator | null {
  if (!response || Array.isArray(response.data)) return null;
  return response.data;
}

export function whatsNewCategoryBadgeClass(category?: string | null) {
  const normalized = (category ?? "").toLowerCase();

  if (normalized.includes("fitur")) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (normalized.includes("pembaruan")) {
    return "bg-sky-100 text-sky-700";
  }

  if (normalized.includes("perbaikan") || normalized.includes("bug")) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-[var(--primary-soft)] text-[var(--primary-deep)]";
}

export const whatsNewQueryOptions = (filters: WhatsNewFilters = {}) =>
  queryOptions({
    queryKey: ["whats-new", filters],
    queryFn: () => fetchWhatsNew(filters),
    staleTime: 5 * 60_000,
  });
