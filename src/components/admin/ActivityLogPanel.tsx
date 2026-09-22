import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search, Shield, X } from "lucide-react";
import { fetchActivityLogs, type AdminActivityLog, type LaravelPaginator } from "@/lib/admin-api";
import { PaginationBar } from "@/components/site/PaginationBar";

const PAGE_SIZE = 10;
const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type Query = {
  page: number;
  search: string;
  action: string;
  entityType: string;
};

function createEmptyPaginator<T>(): LaravelPaginator<T> {
  return { data: [], current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actionTone(action: string) {
  if (action === "create") return "bg-emerald-500/10 text-emerald-700";
  if (action === "update") return "bg-amber-500/10 text-amber-700";
  return "bg-rose-500/10 text-rose-700";
}

function actionLabel(action: string) {
  if (action === "create") return "Create";
  if (action === "update") return "Update";
  if (action === "delete") return "Delete";
  return action;
}

function entityTypeLabel(entityType?: string | null) {
  if (entityType === "content_item") return "Content";
  if (entityType === "admin_user") return "User";
  return entityType ?? "-";
}

function humanizeFieldName(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value, null, 2) : "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function longDescriptionToText(value: unknown) {
  if (!Array.isArray(value)) return formatValue(value);

  const parts = value
    .flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const children = Array.isArray((block as { children?: unknown[] }).children) ? (block as { children?: unknown[] }).children : [];
      return children
        .map((child) => {
          if (!child || typeof child !== "object") return "";
          const text = (child as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        })
        .filter(Boolean);
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : "-";
}

function tagsToText(value: unknown) {
  if (Array.isArray(value)) {
    const tags = value
      .map((tag) => (typeof tag === "string" ? tag.trim() : String(tag ?? "").trim()))
      .filter(Boolean);

    return tags.length > 0 ? tags.join(", ") : "-";
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return tagsToText(parsed);
      }
    } catch {
      // Keep string fallback below.
    }
  }

  return formatValue(value);
}

function isLongValue(value: string) {
  return value.length > 120 || value.includes("\n");
}

function previewLongValue(value: string) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > 180 ? `${singleLine.slice(0, 180)}...` : singleLine;
}

function isExpandableField(key: string) {
  return key === "description" || key === "long_description";
}

function DiffValueBox({
  value,
  emphasized = false,
  expanded = false,
  expandable = false,
  previewLines = 0,
  onToggle,
}: {
  value: string;
  emphasized?: boolean;
  expanded?: boolean;
  expandable?: boolean;
  previewLines?: number;
  onToggle?: () => void;
}) {
  if (!isLongValue(value)) {
    return <span className={`block whitespace-pre-wrap break-words ${emphasized ? "font-medium" : ""}`}>{value}</span>;
  }

  if (!expandable) {
    return (
      <div className={`max-h-40 overflow-auto rounded-lg border border-border/60 bg-background/80 px-2 py-1 ${emphasized ? "font-medium" : ""}`}>
        <span className="block whitespace-pre-wrap break-words text-foreground">{value}</span>
      </div>
    );
  }

  const previewStyle = previewLines > 0
    ? {
        display: "-webkit-box" as const,
        WebkitBoxOrient: "vertical" as const,
        WebkitLineClamp: previewLines,
        overflow: "hidden",
      }
    : undefined;

  return (
    <div className={`space-y-2 rounded-lg border border-border/60 bg-background/80 px-2 py-2 ${emphasized ? "font-medium" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {expanded ? "Full text" : "Preview"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      </div>
      <div className="max-h-40 overflow-auto rounded-md bg-muted/20 px-2 py-1">
        <span
          className="block whitespace-pre-wrap break-words text-foreground"
          style={expanded || !previewStyle ? undefined : previewStyle}
        >
          {expanded ? value : value}
        </span>
      </div>
    </div>
  );
}

function getChangeEntries(log: AdminActivityLog) {
  const before = (log.changes?.before ?? {}) as Record<string, unknown>;
  const after = (log.changes?.after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys
    .map((key) => {
      const rawBefore = before[key];
      const rawAfter = after[key];
      const beforeValue = key === "long_description"
        ? longDescriptionToText(rawBefore)
        : key === "tags"
          ? tagsToText(rawBefore)
          : formatValue(rawBefore);
      const afterValue = key === "long_description"
        ? longDescriptionToText(rawAfter)
        : key === "tags"
          ? tagsToText(rawAfter)
          : formatValue(rawAfter);

      return {
        key,
        label: humanizeFieldName(key),
        before: beforeValue,
        after: afterValue,
      };
    })
    .filter((entry) => entry.before !== entry.after);
}

function hasMeaningfulChange(log: AdminActivityLog) {
  return getChangeEntries(log).length > 0;
}

export function ActivityLogPanel() {
  const [logs, setLogs] = useState<LaravelPaginator<AdminActivityLog>>(createEmptyPaginator<AdminActivityLog>());
  const [query, setQuery] = useState<Query>({ page: 1, search: "", action: "", entityType: "" });
  const [loading, setLoading] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  async function loadData(nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const pageData = await fetchActivityLogs(
        nextQuery.page,
        PAGE_SIZE,
        nextQuery.search,
        nextQuery.action,
        nextQuery.entityType,
      );
      setLogs(pageData);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.search, query.action, query.entityType]);

  const totalPages = Math.max(1, logs.last_page);
  const displayPage = logs.current_page || query.page;
  const showingFrom = logs.total === 0 ? 0 : (displayPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(displayPage * PAGE_SIZE, logs.total);

  const hasFilters = useMemo(
    () => Boolean(query.search || query.action || query.entityType),
    [query.action, query.entityType, query.search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <p className="text-sm text-muted-foreground">Audit trail untuk aksi create, update dan delete.</p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query.search}
              onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
              placeholder="Cari admin / entitas / IP..."
              className={`${fieldClass} h-11 pl-9`}
            />
            {query.search ? (
              <button
                type="button"
                onClick={() => setQuery((prev) => ({ ...prev, page: 1, search: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <select value={query.action} onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, action: event.target.value }))} className={fieldClass}>
            <option value="">Semua aksi</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <select value={query.entityType} onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, entityType: event.target.value }))} className={fieldClass}>
            <option value="">Semua entitas</option>
            <option value="content_item">Content</option>
            <option value="admin_user">User</option>
          </select>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center px-4 py-12">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Memuat data...
            </div>
          </div>
        ) : null}
        <div className={loading ? "hidden" : "overflow-x-auto"}>
          <table className="min-w-full table-fixed divide-y divide-border/70 text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">Perubahan</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {logs.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {hasFilters ? "Tidak ada log yang cocok dengan filter." : "Belum ada activity log."}
                  </td>
                </tr>
              ) : logs.data.map((item) => {
                const entries = getChangeEntries(item);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{item.admin_user?.name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{item.admin_user?.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${actionTone(item.action)}`}>{actionLabel(item.action)}</span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <p className="text-xs text-muted-foreground">{entityTypeLabel(item.entity_type)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <details className="group rounded-2xl border border-border/70 bg-muted/20 p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-foreground">
                          <span>{hasMeaningfulChange(item) ? "Lihat field yang berubah" : "Tidak ada perubahan field"}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-3">
                          {entries.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Tidak ada detail perubahan.</p>
                          ) : (
                            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                              <table className="min-w-full table-fixed text-left text-xs">
                                <colgroup>
                                  <col className="w-[22%]" />
                                  <col className="w-[39%]" />
                                  <col className="w-[39%]" />
                                </colgroup>
                                <thead className="bg-muted/40 uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2">Field</th>
                                    <th className="px-3 py-2">Before</th>
                                    <th className="px-3 py-2">After</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                  {entries.map((entry) => {
                                    const beforeValue = formatValue(entry.before);
                                    const afterValue = formatValue(entry.after);
                                    const changed = beforeValue !== afterValue;
                                    const cellClass = changed ? "bg-amber-500/10 text-foreground" : "text-muted-foreground";

                                    const beforeKey = `${item.id}:${entry.key}:before`;
                                    const afterKey = `${item.id}:${entry.key}:after`;
                                    const canExpand = isExpandableField(entry.key);
                                    const beforeExpanded = Boolean(expandedFields[beforeKey]);
                                    const afterExpanded = Boolean(expandedFields[afterKey]);

                                    return (
                                      <tr key={entry.key}>
                                        <td className={`px-3 py-2 align-top break-words font-medium ${changed ? "bg-amber-500/10 text-foreground" : "text-foreground"}`}>
                                          {entry.label}
                                        </td>
                                        <td className={`px-3 py-2 align-top break-words ${cellClass}`}>
                                          <DiffValueBox
                                            value={beforeValue}
                                            emphasized={changed}
                                            expandable={canExpand}
                                            previewLines={(entry.key === "description" || entry.key === "long_description") ? 3 : 0}
                                            expanded={beforeExpanded}
                                            onToggle={canExpand ? () => setExpandedFields((prev) => ({ ...prev, [beforeKey]: !prev[beforeKey] })) : undefined}
                                          />
                                        </td>
                                        <td className={`px-3 py-2 align-top break-words ${cellClass}`}>
                                          <DiffValueBox
                                            value={afterValue}
                                            emphasized={changed}
                                            expandable={canExpand}
                                            previewLines={(entry.key === "description" || entry.key === "long_description") ? 3 : 0}
                                            expanded={afterExpanded}
                                            onToggle={canExpand ? () => setExpandedFields((prev) => ({ ...prev, [afterKey]: !prev[afterKey] })) : undefined}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </details>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{item.ip_address ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={loading ? "hidden" : "flex flex-col gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between"}>
          <p>Menampilkan {showingFrom} sampai {showingTo} dari {logs.total} data</p>
          <PaginationBar currentPage={displayPage} totalPages={totalPages} onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))} className="mt-0" />
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

