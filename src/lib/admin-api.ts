import type { PortableTextBlock } from "./content-types";

export type AdminUser = {
  id: number;
  uuid?: string | null;
  email: string;
  name: string;
  role: string;
  role_id?: number | null;
  role_record?: AdminRole | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminRole = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type ContentType = "insight" | "manual" | "regulation";
export type CategoryContentType = ContentType | "faq";

export type AdminCategory = {
  id: number;
  uuid?: string | null;
  name: string;
  content_type?: CategoryContentType | null;
  sub_categories?: AdminSubCategory[] | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminSubCategory = {
  id: number;
  uuid?: string | null;
  category_id: number;
  content_type?: ContentType | null;
  name: string;
  category?: AdminCategory | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminSubSystem = {
  id: number;
  uuid?: string | null;
  name: string;
  slug: string;
  sort_order?: number | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminContentItem = {
  id: number;
  uuid?: string | null;
  content_type: ContentType;
  title: string;
  slug: string;
  category_id?: number | null;
  category_text?: string | null;
  sub_category_id?: number | null;
  sub_category?: string | null;
  sub_system_id?: number | null;
  sub_system?: AdminSubSystem | null;
  year?: number | null;
  description: string;
  long_description?: PortableTextBlock[] | null;
  cover_image_url?: string | null;
  cover_preview_url?: string | null;
  cover_thumbnail_url?: string | null;
  file_url?: string | null;
  file_preview_url?: string | null;
  file_name?: string | null;
  youtube_url?: string | null;
  video_duration?: string | null;
  viewer?: string | null;
  file_type?: string | null;
  author?: string | null;
  published_date?: string | null;
  effective_date?: string | null;
  version?: string | null;
  pages?: number | null;
  file_size?: string | null;
  language?: string | null;
  read_time?: string | null;
  tags?: string[] | null;
  display_status?: string | null;
  regulation_status?: string | null;
  jurisdiction?: string | null;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
  category?: AdminCategory | null;
  sub_category_item?: AdminSubCategory | null;
};

export type AdminFaq = {
  id: number;
  uuid?: string | null;
  question: string;
  answer: PortableTextBlock[];
  category_id?: number | null;
  category?: string | null;
  faq_category?: AdminCategory | null;
  order_index?: number | null;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminWhatsNewItem = {
  id: number;
  uuid?: string | null;
  github_issue_id: number;
  github_issue_number: number;
  github_url?: string | null;
  sub_system_id: number;
  sub_system?: AdminSubSystem | null;
  raw_title: string;
  public_title: string;
  summary?: string | null;
  category: string;
  urgency: string;
  closed_at?: string | null;
  year?: number | null;
  published?: boolean;
  synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AdminLoginResponse = {
  token: string;
  user: AdminUser;
};

export type AdminPasswordResetRequestResponse = {
  message: string;
  reset_url?: string;
};

export type AdminPasswordResetResponse = {
  message: string;
};

// const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/v1";
// const DEFAULT_API_BASE = "/api/v1";
const SERVER_API_BASE = "http://127.0.0.1:8000/api/v1";
const CLIENT_API_BASE = "/api/v1";
const TOKEN_KEY = "krisnapedia.admin.token";
const USER_KEY = "krisnapedia.admin.user";

export function getApiBaseUrl() {
  // return (import.meta.env.VITE_LARAVEL_API_URL as string | undefined)?.replace(/\/$/, "") ?? DEFAULT_API_BASE;
  const override = import.meta.env.VITE_LARAVEL_API_URL as string | undefined;
  const normalized = override?.replace(/\/$/, "");

  if (normalized) {
    return normalized;
  }

  return typeof window === "undefined" ? SERVER_API_BASE : CLIENT_API_BASE;
}
export function getStoredAdminUser() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setStoredAdminUser(user: AdminUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAdminUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
}
export function getStoredAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredAdminToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAdminToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function loginAdmin(email: string, password: string) {
  return request<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, "");
}

export async function fetchAdminProfile() {
  return request<{ user: AdminUser }>("/auth/me");
}

export async function logoutAdmin() {
  return request<void>("/auth/logout", { method: "POST" });
}

export async function requestAdminPasswordReset(email: string) {
  return request<AdminPasswordResetRequestResponse>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    "",
  );
}

export async function resetAdminPassword(payload: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}) {
  return request<AdminPasswordResetResponse>(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "",
  );
}

export function isContentType(value: string): value is ContentType {
  return value === "insight" || value === "manual" || value === "regulation";
}

function contentPath(type: ContentType) {
  return type === "insight" ? "insights" : type === "manual" ? "manuals" : "regulations";
}

function normalizePublished(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  return undefined;
}

function withNormalizedPublished<T extends Record<string, unknown>>(data: T): T {
  if (!Object.prototype.hasOwnProperty.call(data, "published")) {
    return data;
  }

  const normalized = normalizePublished(data.published);
  if (normalized === undefined) {
    const { published, ...rest } = data;
    return rest as T;
  }

  return { ...data, published: normalized };
}

function normalizeLocalAssetUrls<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/^https?:\/\/127\.0\.0\.1:8000(?=\/)/, "")
      .replace(/^https?:\/\/localhost:8000(?=\/)/, "") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLocalAssetUrls(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      normalizeLocalAssetUrls(item),
    ]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}
function setContentType<T extends Record<string, unknown>>(type: ContentType, data: T): T {
  return { ...data, content_type: type };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token = getStoredAdminToken(),
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }



  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && typeof payload === "object") {
        const typedPayload = payload as { message?: string; errors?: Record<string, string[]> };
        if (typedPayload.message) {
          message = typedPayload.message;
        }
        if (typedPayload.errors) {
          const firstError = Object.values(typedPayload.errors).flat()[0];
          if (firstError) message = firstError;
        }
      }
    } catch {
      // Ignore JSON parse failures and keep the HTTP status message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return normalizeLocalAssetUrls((await parseJsonResponse<T>(response)) as T);
}

export async function fetchAllPaginated<T>(path: string) {
  const collectPage = async (page: number) => {
    const query = path.includes("?") ? `${path}&per_page=100&page=${page}` : `${path}?per_page=100&page=${page}`;
    return request<{ data: LaravelPaginator<T> }>(query);
  };

  const firstPage = await collectPage(1);
  const paginator = firstPage.data;
  const items = [...paginator.data];

  for (let page = 2; page <= paginator.last_page; page += 1) {
    const nextPage = await collectPage(page);
    items.push(...nextPage.data.data);
  }

  return items;
}

async function fetchPaginated<T>(path: string) {
  const response = await request<{ data: LaravelPaginator<T> }>(path);
  return response.data;
}

export async function fetchCategories(type?: CategoryContentType) {
  const query = type ? `?content_type=${encodeURIComponent(type)}` : "";
  return fetchAllPaginated<AdminCategory>(`/categories${query}`);
}

export async function fetchSubCategories(type?: ContentType) {
  const query = type ? `?content_type=${encodeURIComponent(type)}` : "";
  return fetchAllPaginated<AdminSubCategory>(`/sub-categories${query}`);
}

export async function fetchSubSystems(includeInactive = false) {
  const query = includeInactive ? "?include_inactive=1" : "";
  return fetchAllPaginated<AdminSubSystem>(`/sub-systems${query}`);
}

export async function fetchContentPage(type: ContentType, page = 1, perPage = 10, search = "") {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    include_unpublished: "1",
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  return fetchPaginated<AdminContentItem>(`/${contentPath(type)}?${params.toString()}`);
}

export async function fetchContentItems(type: ContentType) {
  return fetchAllPaginated<AdminContentItem>(`/${contentPath(type)}?include_unpublished=1`);
}

export async function fetchCategoryPage(type: CategoryContentType, page = 1, perPage = 6, search = "") {
  const params = new URLSearchParams({
    content_type: type,
    per_page: String(perPage),
    page: String(page),
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  return fetchPaginated<AdminCategory>(`/categories?${params.toString()}`);
}

export async function fetchSubCategoryPage(type: ContentType, categoryId: number, page = 1, perPage = 6) {
  const query = `/sub-categories?content_type=${encodeURIComponent(type)}&category_id=${categoryId}&per_page=${perPage}&page=${page}`;
  return fetchPaginated<AdminSubCategory>(query);
}

export async function createContentItem(type: ContentType, data: Record<string, unknown> | FormData) {
  if (data instanceof FormData) {
    data.set("content_type", type);

    const published = normalizePublished(data.get("published"));
    if (published === undefined) {
      data.delete("published");
    } else {
      data.set("published", published ? "true" : "false");
    }

    return request<{ data: AdminContentItem }>(`/${contentPath(type)}`, {
      method: "POST",
      body: data,
    });
  }

  return request<{ data: AdminContentItem }>(`/${contentPath(type)}`, {
    method: "POST",
    body: JSON.stringify(withNormalizedPublished(setContentType(type, data))),
  });
}

export async function updateContentItem(type: ContentType, id: string | number, data: Record<string, unknown> | FormData) {
  if (data instanceof FormData) {
    data.set("_method", "PUT");
    data.set("content_type", type);

    const published = normalizePublished(data.get("published"));
    if (published === undefined) {
      data.delete("published");
    } else {
      data.set("published", published ? "true" : "false");
    }

    return request<{ data: AdminContentItem }>(`/${contentPath(type)}/${id}`, {
      method: "POST",
      body: data,
    });
  }

  return request<{ data: AdminContentItem }>(`/${contentPath(type)}/${id}`, {
    method: "PUT",
    body: JSON.stringify(withNormalizedPublished(setContentType(type, data))),
  });
}

export async function deleteContentItem(type: ContentType, id: string | number) {
  return request<void>(`/${contentPath(type)}/${id}`, { method: "DELETE" });
}

export async function fetchFaqPage(page = 1, perPage = 10, search = "") {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    include_unpublished: "1",
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  return fetchPaginated<AdminFaq>(`/faqs?${params.toString()}`);
}

export async function fetchFaqItems() {
  return fetchAllPaginated<AdminFaq>("/faqs?include_unpublished=1");
}

export async function createFaqItem(data: Record<string, unknown>) {
  return request<{ data: AdminFaq }>("/faqs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFaqItem(id: string | number, data: Record<string, unknown>) {
  return request<{ data: AdminFaq }>(`/faqs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFaqItem(id: string | number) {
  return request<void>(`/faqs/${id}`, { method: "DELETE" });
}

export async function createCategory(data: { name: string; content_type: CategoryContentType }) {
  return request<{ data: AdminCategory }>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string | number, data: { name: string; content_type: CategoryContentType }) {
  return request<{ data: AdminCategory }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string | number) {
  return request<void>(`/categories/${id}`, { method: "DELETE" });
}

export async function createSubCategory(data: { category_id: number; name: string; content_type: ContentType }) {
  return request<{ data: AdminSubCategory }>("/sub-categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubCategory(id: string | number, data: { category_id: number; name: string; content_type: ContentType }) {
  return request<{ data: AdminSubCategory }>(`/sub-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSubCategory(id: string | number) {
  return request<void>(`/sub-categories/${id}`, { method: "DELETE" });
}

export async function createSubSystem(data: { name: string; slug?: string; sort_order?: number; active?: boolean }) {
  return request<{ data: AdminSubSystem }>("/sub-systems", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubSystem(id: string | number, data: { name: string; slug?: string; sort_order?: number; active?: boolean }) {
  return request<{ data: AdminSubSystem }>(`/sub-systems/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSubSystem(id: string | number) {
  return request<void>(`/sub-systems/${id}`, { method: "DELETE" });
}

export async function fetchWhatsNewPage(
  page = 1,
  perPage = 10,
  search = "",
  published = "",
  subSystemId = "",
  category = "",
  dateFrom = "",
  dateTo = "",
) {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  if (published) {
    params.set("published", published);
  }

  if (subSystemId) {
    params.set("sub_system_id", subSystemId);
  }

  if (category) {
    params.set("category", category);
  }

  if (dateFrom) {
    params.set("date_from", dateFrom);
  }

  if (dateTo) {
    params.set("date_to", dateTo);
  }

  const response = await request<{
    data: LaravelPaginator<AdminWhatsNewItem>;
    filters?: {
      categories?: string[];
      summary?: {
        total: number;
        draft: number;
        published: number;
        last_synced_at?: string | null;
      };
    };
  }>(`/whats-new-items?${params.toString()}`);

  return {
    ...response.data,
    filters: response.filters,
  };
}

export async function updateWhatsNewItem(id: string | number, data: Partial<{
  public_title: string;
  summary: string | null;
  category: string;
  urgency: string;
  sub_system_id: number;
  closed_at: string | null;
  published: boolean;
}>) {
  return request<{ data: AdminWhatsNewItem }>(`/whats-new-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWhatsNewItem(id: string | number) {
  return request<void>(`/whats-new-items/${id}`, { method: "DELETE" });
}

export async function syncWhatsNewItems() {
  return request<{
    message: string;
    data: {
      created: number;
      updated: number;
    };
  }>("/whats-new-items/sync", { method: "POST" });
}
export async function fetchAdminUsers(page = 1, perPage = 10, search = "") {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  return fetchPaginated<AdminUser>(`/admin-users?${params.toString()}`);
}

export async function fetchRoles() {
  return fetchAllPaginated<AdminRole>("/roles");
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: number;
}) {
  return request<{ data: AdminUser }>("/admin-users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminUser(
  id: string | number,
  data: Partial<{
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role_id: number;
  }>,
) {
  return request<{ data: AdminUser }>(`/admin-users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(id: string | number) {
  return request<void>(`/admin-users/${id}`, { method: "DELETE" });
}

export async function createRole(data: { name: string; slug: string; description?: string | null }) {
  return request<{ data: AdminRole }>("/roles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(id: string | number, data: { name?: string; description?: string | null }) {
  return request<{ data: AdminRole }>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: string | number) {
  return request<void>(`/roles/${id}`, { method: "DELETE" });
}


export async function fetchActivityLogs(page = 1, perPage = 10, search = "", action = "", entityType = "") {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  if (action) {
    params.set("action", action);
  }

  if (entityType) {
    params.set("entity_type", entityType);
  }

  return fetchPaginated<AdminActivityLog>(`/activity-logs?${params.toString()}`);
}
