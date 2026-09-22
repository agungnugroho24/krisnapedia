import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearStoredAdminToken,
  createCategory,
  createContentItem,
  createFaqItem,
  createSubCategory,
  createSubSystem,
  deleteCategory,
  deleteContentItem,
  deleteFaqItem,
  deleteSubCategory,
  deleteSubSystem,
  deleteWhatsNewItem,
  fetchAdminProfile,
  fetchAdminUsers,
  fetchRoles,
  fetchCategories,
  fetchContentPage,
  fetchFaqPage,
  fetchFaqItems,
  fetchSubSystems,
  fetchWhatsNewPage,
  getStoredAdminToken,
  getStoredAdminUser,
  loginAdmin,
  logoutAdmin,
  requestAdminPasswordReset,
  resetAdminPassword,
  setStoredAdminToken,
  setStoredAdminUser,
  clearStoredAdminUser,
  syncWhatsNewItems,
  updateCategory,
  updateContentItem,
  updateFaqItem,
  updateSubCategory,
  updateSubSystem,
  updateWhatsNewItem,
  type AdminCategory,
  type AdminContentItem,
  type AdminFaq,
  type AdminSubSystem,
  type AdminUser,
  type AdminWhatsNewItem,
  type ContentType,
  type LaravelPaginator,
} from "@/lib/admin-api";
import { PaginationBar } from "@/components/site/PaginationBar";
import { AdminAuthPanel } from "@/components/admin/AdminAuthPanel";
import { TaxonomyModal } from "@/components/admin/TaxonomyModal";
import { FaqCategoryModal } from "@/components/admin/FaqCategoryModal";
import { RoleManagementPanel } from "@/components/admin/RoleManagementPanel";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { ActivityLogPanel } from "@/components/admin/ActivityLogPanel";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Bold,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  LogOut,
  PencilLine,
  Plus,
  Redo2,
  Save,
  Search,
  Shield,
  Move,
  ShieldCheck,
  Underline,
  Undo2,
  Users,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CoverCropField, type CoverCropSelection } from "@/components/admin/CoverCropField";
import { exportCroppedCover } from "@/lib/image-crop";
import { AdminConfirmHost, AdminNotificationHost, confirmAdminDelete, showAdminError, showAdminSuccess } from "@/lib/admin-notification";
import { slugify } from "@/lib/utils";

const PAGE_SIZE = 10;
const SUB_SYSTEM_PAGE_SIZE = 10;
const WHATS_NEW_CATEGORIES = [
  "Fitur baru",
  "Perbaikan bug",
  "Perubahan kebijakan-regulasi",
  "Perubahan tampilan (UI)",
  "Pembaruan teknis",
];
type Tab = "dashboard" | "user" | "role" | "activity-log" | "insight" | "manual" | "regulation" | "faq" | "whats-new";
type ListQuery = {
  page: number;
  search: string;
  published?: string;
  subSystemId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
};
type ContentPage = LaravelPaginator<AdminContentItem>;
type FaqPage = LaravelPaginator<AdminFaq>;
type WhatsNewSummary = {
  total: number;
  draft: number;
  published: number;
  last_synced_at?: string | null;
};
type WhatsNewPage = LaravelPaginator<AdminWhatsNewItem> & { filters?: { categories?: string[]; summary?: WhatsNewSummary } };
type ApiState = {
  insight: ContentPage;
  manual: ContentPage;
  regulation: ContentPage;
  faq: FaqPage;
  whatsNew: WhatsNewPage;
  faqCategories: AdminCategory[];
  categoriesByType: Record<ContentType, AdminCategory[]>;
  subSystems: AdminSubSystem[];
};
type ModalState =
  | { kind: "content"; mode: "create" | "edit"; type: ContentType; item?: AdminContentItem }
  | { kind: "faq"; mode: "create" | "edit"; item?: AdminFaq }
  | { kind: "whats-new"; item: AdminWhatsNewItem }
  | { kind: "faq-move"; item: AdminFaq }
  | { kind: "faq-category" }
  | { kind: "sub-system" };
function createEmptyPaginator<T>(): LaravelPaginator<T> {
  return { data: [], current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 };
}
function createDefaultQuery(): ListQuery {
  return { page: 1, search: "" };
}
const emptyState: ApiState = {
  insight: createEmptyPaginator<AdminContentItem>(),
  manual: createEmptyPaginator<AdminContentItem>(),
  regulation: createEmptyPaginator<AdminContentItem>(),
  faq: createEmptyPaginator<AdminFaq>(),
  whatsNew: createEmptyPaginator<AdminWhatsNewItem>(),
  faqCategories: [],
  categoriesByType: { insight: [], manual: [], regulation: [] },
  subSystems: [],
};
const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type AuthView = "login" | "forgot" | "reset";

function getInitialAuthView(): AuthView {
  if (typeof window === "undefined") return "login";
  return new URLSearchParams(window.location.search).get("reset_token") ? "reset" : "login";
}

function getInitialAuthEmail() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function getInitialResetToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("reset_token") ?? "";
}

const TAB_PATHS: Record<Tab, string> = {
  dashboard: "/studio",
  user: "/studio/management-user/user",
  role: "/studio/management-user/role",
  "activity-log": "/studio/management-user/activity-log",
  insight: "/studio/management-content/insight",
  manual: "/studio/management-content/manual",
  regulation: "/studio/management-content/regulation",
  faq: "/studio/management-content/faq",
  "whats-new": "/studio/management-content/apa-yang-baru",
};

function normalizeStudioPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/studio";
}

function getInitialTabFromPath(): Tab {
  if (typeof window === "undefined") return "dashboard";

  const pathname = normalizeStudioPath(window.location.pathname);
  const entry = Object.entries(TAB_PATHS).find(([, tabPath]) => normalizeStudioPath(tabPath) === pathname);
  return (entry?.[0] as Tab | undefined) ?? "dashboard";
}

function getTabPath(tab: Tab) {
  return TAB_PATHS[tab];
}

function isTabAllowed(tab: Tab, isAdmin: boolean) {
  if (tab === "dashboard") {
    return true;
  }

  if (tab === "user" || tab === "role" || tab === "activity-log") {
    return isAdmin;
  }

  return !isAdmin;
}
function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof DOMException && error.name === "AbortError") {
    return "Permintaan dibatalkan. Silakan coba lagi.";
  }

  if (/\bcanceled\b/i.test(message) || /\bcancelled\b/i.test(message)) {
    return "Permintaan dibatalkan. Silakan coba lagi.";
  }

  return message;
}
type CrudAction = "create" | "update" | "delete";

function contentTypeLabel(type: ContentType) {
  return type === "insight" ? "Insight" : type === "manual" ? "Manual" : "Regulasi";
}

function tabLabel(tab: Tab) {
  if (tab === "dashboard") return "Dashboard";
  if (tab === "user") return "User";
  if (tab === "role") return "Role";
  if (tab === "activity-log") return "Activity Log";
  if (tab === "insight") return "Insight";
  if (tab === "manual") return "Manual";
  if (tab === "regulation") return "Regulasi";
  if (tab === "whats-new") return "What's new";
  return "FAQ";
}

function actionLabel(action: CrudAction) {
  if (action === "create") return { success: "ditambahkan", failure: "menambahkan" };
  if (action === "update") return { success: "diperbarui", failure: "memperbarui" };
  return { success: "dihapus", failure: "menghapus" };
}

function notifyCrudSuccess(entity: string, action: CrudAction) {
  showAdminSuccess(entity + " berhasil " + actionLabel(action).success);
}

function notifyCrudError(entity: string, action: CrudAction, error: unknown) {
  showAdminError("Gagal " + actionLabel(action).failure + " " + entity, normalizeError(error));
}

function stripText(blocks?: Array<{ children?: Array<{ text?: string }> }> | null) {
  return blocks?.length
    ? blocks
        .map((block) => (block.children ?? []).map((child) => child.text ?? "").join(""))
        .filter(Boolean)
        .join("\n\n")
    : "";
}

function toBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      _type: "block",
      _key: `block-${index}`,
      style: "normal",
      children: [{ _type: "span", _key: `span-${index}`, text: part, marks: [] }],
    }));
}

type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

type PortableTextLikeBlock = {
  _type?: string;
  _key?: string;
  style?: string;
  list?: "bullet" | "number" | string;
  markDefs?: Array<{ _key: string; _type: string; href?: string }>;
  children?: PortableTextSpan[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeEditorUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function normalizePortableTextBlocks(blocks: PortableTextLikeBlock[]) {
  return blocks
    .map((block, blockIndex) => {
      const children = (block.children ?? [])
        .map((child, childIndex) => ({
          _type: "span" as const,
          _key: child._key || `span-${blockIndex}-${childIndex}`,
          text: (child.text ?? "").replace(/\s+/g, " ").trim(),
          marks: Array.isArray(child.marks)
            ? child.marks.filter((mark) => mark === "strong" || mark === "em" || mark === "underline" || /^link-/.test(mark))
            : [],
        }))
        .filter((child) => child.text.length > 0);

      if (!children.length) {
        return null;
      }

      const markDefs = (block.markDefs ?? [])
        .map((markDef) => ({
          _key: markDef._key,
          _type: markDef._type,
          href: sanitizeEditorUrl(markDef.href),
        }))
        .filter((markDef) => markDef._type === "link" && Boolean(markDef.href));

      const allowedMarkKeys = new Set(markDefs.map((markDef) => markDef._key));
      const normalizedChildren = children.map((child) => ({
        ...child,
        marks: child.marks.filter((mark) => mark !== undefined && (mark === "strong" || mark === "em" || mark === "underline" || allowedMarkKeys.has(mark))),
      }));

      return {
        _type: "block" as const,
        _key: block._key || `block-${blockIndex}`,
        style: block.style === "normal" || block.style === "h1" || block.style === "h2" || block.style === "h3" || block.style === "blockquote" ? block.style : "normal",
        list: block.list === "bullet" || block.list === "number" ? block.list : undefined,
        markDefs,
        children: normalizedChildren,
      };
    })
    .filter(Boolean) as PortableTextLikeBlock[];
}

function portableTextToHtml(blocks?: PortableTextLikeBlock[] | null) {
  if (!blocks?.length) {
    return "<p><br></p>";
  }

  const renderSpan = (span: PortableTextSpan, markDefs: PortableTextLikeBlock["markDefs"]) => {
    const marks = span.marks ?? [];
    let html = escapeHtml(span.text ?? "").replace(/\n/g, "<br />");
    const linkKey = marks.find((mark) => markDefs?.some((def) => def._key === mark));
    const linkDef = linkKey ? markDefs?.find((def) => def._key === linkKey) : null;

    if (marks.includes("underline")) {
      html = '<u>' + html + '</u>';
    }
    if (marks.includes("em")) {
      html = '<em>' + html + '</em>';
    }
    if (marks.includes("strong")) {
      html = '<strong>' + html + '</strong>';
    }
    if (linkDef?.href) {
      html = '<a href="' + escapeHtml(linkDef.href) + '" target="_blank" rel="noreferrer">' + html + '</a>';
    }

    return html;
  };

  let html = "";
  let openList: "bullet" | "number" | null = null;

  const closeList = () => {
    if (!openList) return;
    html += openList === "bullet" ? "</ul>" : "</ol>";
    openList = null;
  };

  for (const block of blocks) {
    const children = block.children ?? [];
    const content = children.length
      ? children.map((span) => renderSpan(span, block.markDefs)).join("")
      : "<br />";

    if (block.list === "bullet" || block.list === "number") {
      const listType = block.list;
      if (openList !== listType) {
        closeList();
        html += listType === "bullet" ? "<ul>" : "<ol>";
        openList = listType;
      }
      html += '<li>' + content + '</li>';
      continue;
    }

    closeList();
    html += '<p>' + content + '</p>';
  }

  closeList();
  return html || "<p><br></p>";
}

function htmlToPortableText(html: string) {
  if (typeof DOMParser === "undefined") {
    return toBlocks(html.replace(/<[^>]*>/g, "").trim());
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  let blockIndex = 0;
  let spanIndex = 0;
  let markDefIndex = 0;

  const mergeSpans = (spans: PortableTextSpan[]) => {
    const merged: PortableTextSpan[] = [];
    for (const span of spans) {
      const last = merged[merged.length - 1];
      if (last && JSON.stringify(last.marks) === JSON.stringify(span.marks)) {
        last.text += span.text;
      } else {
        merged.push({ ...span });
      }
    }
    return merged;
  };

  const collectInlineSpans = (node: Node, inheritedMarks: string[], markDefs: NonNullable<PortableTextLikeBlock["markDefs"]>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      return text ? [{ _type: "span", _key: `span-${spanIndex++}`, text, marks: [...inheritedMarks] }] : [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node as Element;
    const tagName = element.tagName.toUpperCase();

    if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "IFRAME" || tagName === "OBJECT" || tagName === "EMBED") {
      return [];
    }

    let nextMarks = inheritedMarks;

    if (tagName === "STRONG" || tagName === "B") {
      nextMarks = [...inheritedMarks, "strong"];
    } else if (tagName === "EM" || tagName === "I") {
      nextMarks = [...inheritedMarks, "em"];
    } else if (tagName === "U") {
      nextMarks = [...inheritedMarks, "underline"];
    } else if (tagName === "A") {
      const href = sanitizeEditorUrl(element.getAttribute("href"));
      if (href) {
        const key = `link-${markDefIndex++}`;
        markDefs.push({ _key: key, _type: "link", href });
        nextMarks = [...inheritedMarks, key];
      }
    }

    const spans = Array.from(element.childNodes).flatMap((child) =>
      collectInlineSpans(child, nextMarks, markDefs),
    );
    return mergeSpans(spans);
  };

  const buildBlock = (element: Element, list?: "bullet" | "number") => {
    const markDefs: NonNullable<PortableTextLikeBlock["markDefs"]> = [];
    const children = mergeSpans(
      Array.from(element.childNodes).flatMap((child) => collectInlineSpans(child, [], markDefs)),
    );
    const textContent = children.map((child) => child.text).join("").trim();
    if (!textContent) {
      return null;
    }

    const block: PortableTextLikeBlock = {
      _type: "block",
      _key: `block-${blockIndex++}`,
      style: "normal",
      children,
    };

    if (list) {
      block.list = list;
    }

    if (markDefs.length) {
      block.markDefs = markDefs;
    }

    return block;
  };

  const blocks: PortableTextLikeBlock[] = [];

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (!text) continue;
      blocks.push({
        _type: "block",
        _key: `block-${blockIndex++}`,
        style: "normal",
        children: [{ _type: "span", _key: `span-${spanIndex++}`, text, marks: [] }],
      });
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = child as Element;
    const tagName = element.tagName.toUpperCase();

    if (tagName === "UL" || tagName === "OL") {
      const listType = tagName === "UL" ? "bullet" : "number";
      for (const li of Array.from(element.children)) {
        if (li.tagName.toUpperCase() !== "LI") continue;
        const block = buildBlock(li, listType);
        if (block) blocks.push(block);
      }
      continue;
    }

    const block = buildBlock(element);
    if (block) blocks.push(block);
  }

  return normalizePortableTextBlocks(blocks);
}
function applyEditorCommand(command: string, value?: string) {
  if (typeof document === "undefined") return;
  document.execCommand(command, false, value);
}

function RichTextField({
  name,
  label,
  defaultValue,
  placeholder,
  helperText,
}: {
  name: string;
  label: string;
  defaultValue?: PortableTextLikeBlock[] | null;
  placeholder?: string;
  helperText?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [serializedValue, setSerializedValue] = useState(() => JSON.stringify(normalizePortableTextBlocks(defaultValue ?? [])));
  const [errorText, setErrorText] = useState("");

  const defaultHtml = useMemo(() => portableTextToHtml(defaultValue ?? []), [defaultValue]);

  useEffect(() => {
    const initialValue = JSON.stringify(normalizePortableTextBlocks(defaultValue ?? []));
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultHtml;
    }
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = initialValue;
    }
    setSerializedValue(initialValue);
    setErrorText("");
  }, [defaultHtml, defaultValue]);

  const syncValue = () => {
    const currentHtml = editorRef.current?.innerHTML ?? "";
    const normalized = normalizePortableTextBlocks(htmlToPortableText(currentHtml));
    const nextValue = JSON.stringify(normalized);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = nextValue;
    }
    setSerializedValue(nextValue);
    setErrorText(normalized.length ? "" : "Isi long description tidak boleh kosong.");
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    if (!pastedText) return;
    document.execCommand("insertText", false, pastedText);
    syncValue();
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    applyEditorCommand(command, value);
    syncValue();
  };

  const toolbarButton = (labelText: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
      aria-label={labelText}
      title={labelText}
    >
      {icon}
      <span className="hidden sm:inline">{labelText}</span>
    </button>
  );

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input ref={hiddenInputRef} type="hidden" name={name} value={serializedValue} readOnly />
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap gap-2 border-b border-border/70 bg-muted/30 p-2">
          {toolbarButton("Bold", <Bold className="h-4 w-4" />, () => runCommand("bold"))}
          {toolbarButton("Italic", <Italic className="h-4 w-4" />, () => runCommand("italic"))}
          {toolbarButton("Underline", <Underline className="h-4 w-4" />, () => runCommand("underline"))}
          {toolbarButton("Bullet List", <List className="h-4 w-4" />, () => runCommand("insertUnorderedList"))}
          {toolbarButton("Numbered List", <ListOrdered className="h-4 w-4" />, () => runCommand("insertOrderedList"))}
          {toolbarButton("Undo", <Undo2 className="h-4 w-4" />, () => runCommand("undo"))}
          {toolbarButton("Redo", <Redo2 className="h-4 w-4" />, () => runCommand("redo"))}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder ?? "Tulis isi long description di sini..."}
          onInput={syncValue}
          onBlur={syncValue}
          onPaste={handlePaste}
          className="min-h-[240px] px-4 py-3 text-sm outline-none [&:empty:before]:pointer-events-none [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)] [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
        />
      </div>
      {errorText ? <p className="text-xs text-destructive">{errorText}</p> : null}
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
function searchText(parts: Array<string | number | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function sortByIdDesc<T extends { id: number }>(items: T[]) {
  return [...items].sort((a, b) => b.id - a.id);
}

function slugPreview(value: string) {
  return slugify(value);
}

function textField(
  name: string,
  label: string,
  defaultValue = "",
  type = "text",
  inputProps: React.InputHTMLAttributes<HTMLInputElement> = {},
) {
  const { className, ...restInputProps } = inputProps;
  const isControlled = inputProps.value !== undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={isControlled ? undefined : defaultValue}
        className={[fieldClass, className].filter(Boolean).join(" ")}
        {...restInputProps}
      />
    </div>
  );
}

function normalizeTagList(value: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    const normalized = String(item ?? "").trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(normalized);
  }

  return tags;
}

function splitTagInput(value: string) {
  return value
    .split(/[\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function TagInputField({
  name,
  label,
  value,
  inputValue,
  onChange,
  onInputValueChange,
  helperText,
  placeholder = "Tambah tag lalu tekan Enter atau koma",
}: {
  name: string;
  label: string;
  value: string[];
  inputValue: string;
  onChange: (next: string[]) => void;
  onInputValueChange: (next: string) => void;
  helperText?: string;
  placeholder?: string;
}) {
  const commitDraft = () => {
    const nextTags = splitTagInput(inputValue);
    if (!nextTags.length) return;
    onChange(normalizeTagList([...value, ...nextTags]));
    onInputValueChange("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(value)} readOnly />
      <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
        <div className="flex flex-wrap gap-2">
          {value.length ? (
            value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={`Hapus tag ${tag}`}
                  title={`Hapus tag ${tag}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Belum ada tag.</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={name}
            type="text"
            value={inputValue}
            onChange={(event) => onInputValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commitDraft();
              }
              if (event.key === "Backspace" && !inputValue && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={commitDraft}
            onPaste={(event) => {
              const pastedText = event.clipboardData.getData("text/plain");
              if (!pastedText) return;
              event.preventDefault();
              const nextTags = splitTagInput(pastedText);
              if (!nextTags.length) return;
              onChange(normalizeTagList([...value, ...nextTags]));
              onInputValueChange("");
            }}
            placeholder={placeholder}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={commitDraft}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
function normalizeDateValue(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed.slice(0, 10);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDatePickerLabel(value: string) {
  if (!value) return "Pilih tanggal";

  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 || size >= 10 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function inferFileTypeLabel(file: File) {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";

  if (file.type === "application/pdf" || ext === "pdf") return "PDF";
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return "Presentation";
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return "Image";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["xls", "xlsx"].includes(ext)) return "Excel";
  if (file.type.startsWith("video/") || ["mp4", "mov", "webm", "mkv"].includes(ext)) return "Video";

  return ext ? ext.toUpperCase() : "File";
}

async function readPdfPageCount(file: File) {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buffer);

  const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (countMatches.length > 0) {
    return Math.max(...countMatches);
  }

  const pageMatches = text.match(/\/Type\s*\/Page\b/g);
  if (pageMatches?.length) {
    return pageMatches.length;
  }

  throw new Error("Gagal membaca jumlah halaman PDF.");
}

async function buildAutoFileMetadata(file: File) {
  const fileType = inferFileTypeLabel(file);
  const pages = fileType === "PDF" ? await readPdfPageCount(file).catch(() => null) : null;

  return {
    fileType,
    fileSize: formatFileSize(file.size),
    pages: pages ? String(pages) : "",
    pagesReadFailed: fileType === "PDF" && !pages,
  };
}

function DatePickerField({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="date"
        defaultValue={normalizeDateValue(defaultValue)}
        className={fieldClass}
      />
    </div>
  );
}

function YearPickerField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number | string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => String(defaultValue ?? ""));
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const items: number[] = [];
    for (let year = currentYear; year >= 1990; year -= 1) {
      items.push(year);
    }
    return items;
  }, []);

  useEffect(() => {
    setValue(String(defaultValue ?? ""));
  }, [defaultValue]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={`${name}-trigger`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={`${name}-trigger`}
            type="button"
            className={`${fieldClass} flex h-10 items-center justify-between text-left`}
          >
            <span className={value ? "text-foreground" : "text-muted-foreground"}>
              {value || "Pilih tahun"}
            </span>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
          <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto pr-1">
            {years.map((year) => {
              const yearValue = String(year);
              const active = value === yearValue;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setValue(yearValue);
                    setOpen(false);
                  }}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {year}
                </button>
              );
            })}
          </div>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
            >
              Kosongkan tahun
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function UploadField({
  id,
  label,
  kind,
  accept,
  helperText,
  existingUrl,
  existingName,
  removed,
  onRemove,
  onFileSelected,
  onMetaChange,
  maxSizeBytes,
}: {
  id: string;
  label: string;
  kind: "image" | "file";
  accept: string;
  helperText: string;
  existingUrl?: string | null;
  existingName?: string | null;
  removed: boolean;
  onRemove: () => void;
  onFileSelected?: (file: File | null) => void;
  onMetaChange?: (meta: { fileType: string; fileSize: string; pages: string; pagesReadFailed?: boolean }) => void;
  maxSizeBytes?: number;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const onMetaChangeRef = useRef(onMetaChange);

  const hasExisting = Boolean(existingUrl || existingName);

  useEffect(() => {
    onMetaChangeRef.current = onMetaChange;
  }, [onMetaChange]);

  useEffect(() => {
    if (!selectedFile || kind !== "image") {
      setSelectedPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [kind, selectedFile]);

  useEffect(() => {
    if (!selectedFile || kind !== "file") return;

    let cancelled = false;
    buildAutoFileMetadata(selectedFile)
      .then((meta) => {
        if (cancelled) return;
        onMetaChangeRef.current?.(meta);
      })
      .catch(() => {
        if (cancelled) return;
        onMetaChangeRef.current?.({
          fileType: inferFileTypeLabel(selectedFile),
          fileSize: formatFileSize(selectedFile.size),
          pages: "",
          pagesReadFailed: inferFileTypeLabel(selectedFile) === "PDF",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [kind, selectedFile]);

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor={id}>
          {label}
        </label>
        {hasExisting ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {removed ? `Batalkan hapus ${kind === "image" ? "gambar" : "file"}` : `Hapus ${kind === "image" ? "gambar" : "file"} lama`}
          </button>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
        {selectedFile ? (
          kind === "image" ? (
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-sm">
              <img
                src={selectedPreview}
                alt={`${label} baru dipilih`}
                className="h-56 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Pratinjau pilihan baru</p>
                  <p className="truncate text-xs text-muted-foreground">{selectedFileName}</p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {selectedFileSize}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-background p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">File baru dipilih</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{selectedFileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedFileSize}</p>
                </div>
              </div>
            </div>
          )
        ) : hasExisting ? (
          kind === "image" ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
              <img
                src={existingUrl ?? undefined}
                alt={label}
                className="h-56 w-full object-cover"
              />
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
            <div className="rounded-2xl border border-border/70 bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">File saat ini</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {existingName || "File lama masih tersimpan"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Akan tetap dipakai sampai Anda memilih file baru.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border/70 bg-background p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              {kind === "image" ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Belum ada {kind === "image" ? "cover" : "file"} yang dipilih
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                File yang dipilih akan langsung muncul di section ini.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Unggah baru</p>
              <p className="text-xs text-muted-foreground">{helperText}</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {kind === "image" ? "Gambar" : "Dokumen"}
            </span>
          </div>
          <input
            id={id}
            name={id}
            type="file"
            accept={accept}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;

              if (file && maxSizeBytes && file.size > maxSizeBytes) {
                event.currentTarget.value = "";
                setSelectedFile(null);
                setSelectedFileName("");
                setSelectedFileSize("");
                setSelectionError(`Ukuran file maksimal ${formatFileSize(maxSizeBytes)}.`);
                onFileSelected?.(null);
                return;
              }

              setSelectionError("");
              setSelectedFile(file);
              setSelectedFileName(file?.name ?? "");
              setSelectedFileSize(file ? formatFileSize(file.size) : "");
              onFileSelected?.(file);
            }}
            className="block w-full cursor-pointer rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground shadow-inner file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {selectionError ? <p className="text-xs text-destructive">{selectionError}</p> : null}
        </div>
      </div>

      <input type="hidden" name={`${id}_url`} defaultValue={existingUrl ?? ""} />
      {kind === "file" ? (
        <input
          type="hidden"
          name="file_name"
          value={selectedFileName || existingName || ""}
          readOnly
        />
      ) : null}
      {kind === "image" ? (
        <input type="hidden" name="remove_cover_image" value={removed ? "1" : "0"} />
      ) : (
        <input type="hidden" name="remove_file" value={removed ? "1" : "0"} />
      )}
    </div>
  );
}

function selectField(
  name: string,
  label: string,
  defaultValue = "",
  options: Array<{ value: string; label: string }>,
  placeholder = "Pilih opsi",
) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue} className={fieldClass}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Banner({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${tone === "error" ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-border bg-muted/40 text-foreground"}`}
    >
      {text}
    </div>
  );
}

function StudioBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-[-160px] h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
    </>
  );
}

function LoginPanel({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <StudioBackdrop />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/70 bg-background/95 p-8 shadow-2xl shadow-slate-900/5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">KRISNApedia Studio</p>
            <p className="text-sm text-muted-foreground">Masuk ke Admin Panel</p>
          </div>
        </div>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className={fieldClass}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={fieldClass}
              placeholder="********"
              autoComplete="current-password"
            />
          </div>
          {error ? <Banner text={error} /> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}

function NavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}

function Thumb({ item }: { item: AdminContentItem }) {
  const url = item.cover_image_url ?? item.cover_thumbnail_url ?? item.cover_preview_url ?? null;
  return url ? (
    <img
      src={url}
      alt={`${item.title} cover`}
      className="h-14 w-14 rounded-xl border border-border object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
      No cover
    </div>
  );
}
function ContentTable({
  type,
  pageData,
  query,
  subSystems,
  isLoading,
  onSearchChange,
  onFilterChange,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
  onManageTaxonomy,
  onManageSubSystems,
}: {
  type: ContentType;
  pageData: ContentPage;
  query: ListQuery;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (item: AdminContentItem) => void;
  onDelete: (id: number) => void;
  onManageTaxonomy: () => void;
  onManageSubSystems: () => void;
}) {
  const title = type === "insight" ? "Insight" : type === "manual" ? "Manual" : "Regulasi";
  const items = [...pageData.data].sort((a, b) => b.id - a.id);
  const currentPage = query.page;
  const totalPages = Math.max(1, pageData.last_page);
  const displayPage = pageData.current_page || currentPage;
  const showingFrom = pageData.total === 0 ? 0 : (displayPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(displayPage * PAGE_SIZE, pageData.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">Kelola data {title.toLowerCase()}.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Cari ${title.toLowerCase()}...`}
              className={`${fieldClass} h-11 pl-9`}
            />
            {query.search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onManageTaxonomy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Kelola kategori
          </button>
          <button
            type="button"
            onClick={onManageSubSystems}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Kelola sub-sistem
          </button>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm">
        {isLoading ? (
          <div className="relative flex min-h-[360px] flex-col justify-center gap-6 px-4 py-10">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 opacity-70">
              <div>
                <div className="h-4 w-32 rounded-full bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-56 rounded-full bg-muted/80 animate-pulse" />
              </div>
              <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/70 opacity-70">
              <div className="h-12 bg-muted/40" />
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3">
                    <div className="col-span-1 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-3 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Memuat data...
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70 text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th className="px-4 py-3">Cover</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date</th>
                    {type === "regulation" ? <th className="px-4 py-3">Publish</th> : null}
                    <th className="px-4 py-3">Status</th>
                    <th className="w-[300px] px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={type === "regulation" ? 9 : 8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {query.search ? "Tidak ada hasil pencarian." : "Belum ada data."}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4 text-muted-foreground">
                          {(displayPage - 1) * PAGE_SIZE + index + 1}
                        </td><td className="px-4 py-4">
                          <Thumb item={item} />
                        </td><td className="px-4 py-4">
                          <p className="font-medium">{item.title}</p>
                          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </td><td className="px-4 py-4 text-muted-foreground">{item.slug}</td><td className="px-4 py-4 text-muted-foreground">
                          {item.category_text ?? item.category?.name ?? "-"}
                        </td><td className="px-4 py-4 text-muted-foreground">
                          {formatDate(item.published_date)}
                        </td>
                        {type === "regulation" ? (
                          <td className="px-4 py-4 text-muted-foreground">
                            {item.published ? "Published" : "Draft"}
                          </td>
                        ) : null}
                        <td className="px-4 py-4 text-muted-foreground">
                          {type === "regulation"
                            ? (item.regulation_status ?? "-")
                            : item.published
                              ? "Published"
                              : "Draft"}
                        </td><td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => onEdit(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                            >
                              <PencilLine className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => onDelete(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
              <p>
                Menampilkan {showingFrom} sampai {showingTo} dari {pageData.total} data
              </p>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                className="mt-0"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WhatsNewTable({
  pageData,
  query,
  subSystems,
  isLoading,
  onSearchChange,
  onFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onTogglePublished,
}: {
  pageData: WhatsNewPage;
  query: ListQuery;
  subSystems: AdminSubSystem[];
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (patch: Partial<ListQuery>) => void;
  onPageChange: (page: number) => void;
  onEdit: (item: AdminWhatsNewItem) => void;
  onDelete: (id: number) => void;
  onTogglePublished: (item: AdminWhatsNewItem) => void;
}) {
  const items = pageData.data;
  const currentPage = query.page;
  const totalPages = Math.max(1, pageData.last_page);
  const displayPage = pageData.current_page || currentPage;
  const showingFrom = pageData.total === 0 ? 0 : (displayPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(displayPage * PAGE_SIZE, pageData.total);
  const categories = pageData.filters?.categories ?? [];
  const hasCompleteDateRange = Boolean(query.dateFrom && query.dateTo);
  const hasFilter = Boolean(query.search || query.published || query.subSystemId || query.category || query.dateFrom || query.dateTo);
  const hasIncompleteDateRange = Boolean((query.dateFrom || query.dateTo) && !hasCompleteDateRange);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">What's new</h2>
          <p className="text-sm text-muted-foreground">
            Kurasi pembaruan KRISNA hasil sinkronisasi GitHub sebelum ditampilkan ke publik.
          </p>
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari semua field di list..."
            className={`${fieldClass} h-11 pl-9`}
          />
          {query.search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select
            value={query.subSystemId ?? ""}
            onChange={(event) => onFilterChange({ subSystemId: event.target.value })}
            className={`${fieldClass} h-11`}
          >
            <option value="">Semua sub-sistem</option>
            {subSystems.map((subSystem) => (
              <option key={subSystem.id} value={String(subSystem.id)}>
                {subSystem.name}
              </option>
            ))}
          </select>
          <select
            value={query.category ?? ""}
            onChange={(event) => onFilterChange({ category: event.target.value })}
            className={`${fieldClass} h-11`}
          >
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={query.published ?? ""}
            onChange={(event) => onFilterChange({ published: event.target.value })}
            className={`${fieldClass} h-11`}
          >
            <option value="">Semua status</option>
            <option value="1">Published</option>
            <option value="0">Draft</option>
          </select>
          <input
            type={query.dateFrom ? "date" : "text"}
            value={query.dateFrom ?? ""}
            onChange={(event) => onFilterChange({ dateFrom: event.target.value })}
            className={`${fieldClass} h-11`}
            placeholder="Tanggal mulai"
            aria-label="Tanggal mulai"
            title="Tanggal mulai"
            onFocus={(event) => {
              event.currentTarget.type = "date";
            }}
            onBlur={(event) => {
              if (!event.currentTarget.value) event.currentTarget.type = "text";
            }}
          />
          <input
            type={query.dateTo ? "date" : "text"}
            value={query.dateTo ?? ""}
            onChange={(event) => onFilterChange({ dateTo: event.target.value })}
            className={`${fieldClass} h-11`}
            placeholder="Tanggal akhir"
            aria-label="Tanggal akhir"
            title="Tanggal akhir"
            onFocus={(event) => {
              event.currentTarget.type = "date";
            }}
            onBlur={(event) => {
              if (!event.currentTarget.value) event.currentTarget.type = "text";
            }}
          />
          <button
            type="button"
            onClick={() => onFilterChange({ search: "", published: "", subSystemId: "", category: "", dateFrom: "", dateTo: "" })}
            disabled={!hasFilter}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset filter
          </button>
        </div>
      </div>
      {hasIncompleteDateRange ? (
        <p className="-mt-2 px-1 text-xs text-muted-foreground text-center">
          Lengkapi tanggal mulai dan tanggal akhir untuk menerapkan filter tanggal.
        </p>
      ) : null}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm">
        {isLoading ? (
          <div className="relative flex min-h-[280px] flex-col justify-center gap-6 px-4 py-10">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Memuat data...
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70 text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th className="px-4 py-3">Judul Publik</th>
                    <th className="px-4 py-3">Sub-sistem</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {query.search ? "Tidak ada hasil pencarian." : "Belum ada data. Jalankan sinkronisasi GitHub terlebih dahulu."}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4 text-muted-foreground">
                          {(displayPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{item.public_title}</p>
                          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                            GitHub #{item.github_issue_number}: {item.raw_title}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{item.sub_system?.name ?? "-"}</td>
                        <td className="px-4 py-4 text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-4 text-muted-foreground">{formatDate(item.closed_at)}</td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {item.published ? "Published" : "Draft"}
                        </td>
                        <td className="w-[300px] px-4 py-4">
                          <div className="grid grid-cols-3 justify-end gap-2">
                            <button
                              onClick={() => onEdit(item)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                            >
                              <PencilLine className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => onTogglePublished(item)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                            >
                              {item.published ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => onDelete(item.id)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
              <p>
                Menampilkan {showingFrom} sampai {showingTo} dari {pageData.total} data
              </p>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                className="mt-0"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FaqTable({
  pageData,
  query,
  isLoading,
  onSearchChange,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
  onManageCategories,
  onReorder,
  onMoveToPosition,
}: {
  pageData: FaqPage;
  query: ListQuery;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (item: AdminFaq) => void;
  onDelete: (id: number) => void;
  onManageCategories: () => void;
  onReorder: (items: AdminFaq[], sourceId: number, targetId: number) => Promise<void>;
  onMoveToPosition: (item: AdminFaq) => void;
}) {
  const items = [...pageData.data].sort((a, b) => {
    const orderDiff = Number(a.order_index ?? 0) - Number(b.order_index ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.id - b.id;
  });
  const currentPage = query.page;
  const totalPages = Math.max(1, pageData.last_page);
  const displayPage = pageData.current_page || currentPage;
  const showingFrom = pageData.total === 0 ? 0 : (displayPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(displayPage * PAGE_SIZE, pageData.total);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const dragEnabled = !query.search;
  const clearDragState = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Kelola pertanyaan, jawaban, dan urutan tampil.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Cari FAQ...`}
              className={`${fieldClass} h-11 pl-9`}
            />
            {query.search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onManageCategories}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Kelola kategori
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm">
        {isLoading ? (
          <div className="relative flex min-h-[280px] flex-col justify-center gap-6 px-4 py-10">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 opacity-70">
              <div>
                <div className="h-4 w-28 rounded-full bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-48 rounded-full bg-muted/80 animate-pulse" />
              </div>
              <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/70 opacity-70">
              <div className="h-12 bg-muted/40" />
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3">
                    <div className="col-span-1 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-4 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-1 h-10 rounded-lg bg-muted/70 animate-pulse" />
                    <div className="col-span-2 h-10 rounded-lg bg-muted/70 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Memuat data...
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70 text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <span className="sr-only">Geser</span>
                    </th>
                    <th className="px-4 py-3">Pertanyaan</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {query.search ? "Tidak ada hasil pencarian." : "Belum ada FAQ."}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const isDragging = draggedId === item.id;
                      const isDropTarget = dropTargetId === item.id && draggedId !== null && draggedId !== item.id;
                      return (
                        <tr
                          key={item.id}
                          className={[
                            "align-top transition",
                            isDragging ? "bg-primary/5 opacity-60" : "",
                            isDropTarget ? "border-t-2 border-primary bg-primary/5" : "",
                          ].join(" ")}
                          onDragOver={(event) => {
                            if (!dragEnabled || draggedId === null) return;
                            event.preventDefault();
                            setDropTargetId(item.id);
                          }}
                          onDragLeave={() => {
                            if (dropTargetId === item.id) setDropTargetId(null);
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            if (!dragEnabled || draggedId === null || draggedId === item.id) return;
                            await onReorder(items, draggedId, item.id);
                            clearDragState();
                          }}
                        ><td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              draggable={dragEnabled}
                              onDragStart={(event) => {
                                if (!dragEnabled) return;
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(item.id));
                                setDraggedId(item.id);
                              }}
                              onDragEnd={clearDragState}
                              className={[
                                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition shadow-sm",
                                dragEnabled ? "cursor-grab hover:bg-muted active:cursor-grabbing hover:border-primary/30 hover:text-foreground" : "cursor-not-allowed opacity-50",
                              ].join(" ")}
                              aria-label="Seret untuk mengubah urutan"
                              title={dragEnabled ? "Seret untuk mengubah urutan" : "Nonaktif saat pencarian aktif"}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </td><td className="px-4 py-4">
                            <p className="font-medium">
                              <span className="mr-2 text-muted-foreground">{item.order_index ?? 0}.</span>
                              {item.question}
                            </p>
                            <p className="mt-1 line-clamp-2 max-w-2xl text-xs text-muted-foreground">
                              {stripText(item.answer)}
                            </p>
                          </td><td className="px-4 py-4 text-muted-foreground">
                            {item.faq_category?.name ?? item.category ?? "-"}
                          </td><td className="px-4 py-4 text-muted-foreground">
                            {item.published ? "Published" : "Draft"}
                          </td><td className="px-4 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              >
                                <PencilLine className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                disabled={!dragEnabled}
                                onClick={() => onMoveToPosition(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                title="Pindahkan ke posisi tertentu"
                              >
                                <Move className="h-3.5 w-3.5" /> Swap
                              </button>
                              <button
                                type="button"
                                disabled={!dragEnabled || index === 0}
                                onClick={() => {
                                  if (!dragEnabled || index === 0) return;
                                  void onReorder(items, item.id, items[index - 1].id);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Pindahkan ke atas"
                                title="Pindahkan ke atas"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={!dragEnabled || index === items.length - 1}
                                onClick={() => {
                                  if (!dragEnabled || index === items.length - 1) return;
                                  void onReorder(items, item.id, items[index + 1].id);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Pindahkan ke bawah"
                                title="Pindahkan ke bawah"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
              <p>
                Menampilkan {showingFrom} sampai {showingTo} dari {pageData.total} data
              </p>
              <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} className="mt-0" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubSystemModal({
  subSystems,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  subSystems: AdminSubSystem[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { id?: number; name: string; slug?: string; sort_order?: number; active?: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState<AdminSubSystem | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const startEdit = (item: AdminSubSystem) => {
    setEditing(item);
    setName(item.name ?? "");
    setActive(Boolean(item.active ?? true));
  };

  const resetForm = () => {
    setEditing(null);
    setName("");
    setActive(true);
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? subSystems.filter((item) => searchText([item.name, item.slug]).includes(normalizedSearch))
    : subSystems;
  const totalPages = Math.max(1, Math.ceil(filtered.length / SUB_SYSTEM_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * SUB_SYSTEM_PAGE_SIZE, currentPage * SUB_SYSTEM_PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * SUB_SYSTEM_PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * SUB_SYSTEM_PAGE_SIZE, filtered.length);
  const previewSlug = slugPreview(name);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 grid w-full max-w-5xl gap-4 rounded-3xl border border-border/70 bg-background p-5 shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="flex items-center justify-between border-b border-border/70 pb-4 lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold">Kelola sub-sistem KRISNA</h2>
            <p className="text-sm text-muted-foreground">Sub-sistem dipakai lintas Insight, Manual, dan Regulasi.</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSave({
              id: editing?.id,
              name,
              slug: previewSlug || undefined,
              active,
            });
            resetForm();
          }}
        >
          <div>
            <h3 className="font-semibold">{editing ? "Edit sub-sistem" : "Tambah sub-sistem"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Slug dibuat otomatis dari nama dan dipakai untuk filter/URL.</p>
          </div>
          {textField("sub_system_name", "Nama", "", "text", {
            value: name,
            onChange: (event) => setName(event.target.value),
            placeholder: "Contoh: DAK Fisik",
            required: true,
          })}
          {textField("sub_system_slug", "Slug otomatis", "", "text", {
            value: previewSlug,
            readOnly: true,
            placeholder: "Otomatis terisi dari nama",
            className: "bg-muted/40 text-muted-foreground",
          })}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Aktif
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah"}
            </Button>
            {editing ? (
              <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                Batal
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari sub-sistem..." className={`${fieldClass} pl-9`} />
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Slug</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      {search ? "Tidak ada sub-sistem yang cocok." : "Belum ada sub-sistem."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium">{item.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.slug}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.active ? "Aktif" : "Nonaktif"}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
                            Edit
                          </button>
                          <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <p>
              Menampilkan {showingFrom} sampai {showingTo} dari {filtered.length} sub-sistem
            </p>
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} className="mt-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentModal({
  item,
  mode,
  type,
  categories,
  subSystems,
  saving,
  onClose,
  onSubmit,
}: {
  item?: AdminContentItem;
  mode: "create" | "edit";
  type: ContentType;
  categories?: AdminCategory[];
  subSystems?: AdminSubSystem[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const [removeCover, setRemoveCover] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const [coverCrop, setCoverCrop] = useState<CoverCropSelection | null>(null);
  const [coverCropError, setCoverCropError] = useState("");
  const [titleValue, setTitleValue] = useState(() => item?.title ?? "");
  const [slugValue, setSlugValue] = useState(() => item?.slug ?? slugify(item?.title ?? ""));
  const [slugTouched, setSlugTouched] = useState(false);
  const [fileTypeValue, setFileTypeValue] = useState(() => item?.file_type ?? "");
  const [fileSizeValue, setFileSizeValue] = useState(() => item?.file_size ?? "");
  const [pagesValue, setPagesValue] = useState(() => item?.pages?.toString() ?? "");
  const [pagesManualFallback, setPagesManualFallback] = useState(false);
  const [pagesReadFailed, setPagesReadFailed] = useState(false);
  const [tagsValue, setTagsValue] = useState<string[]>(() => normalizeTagList((item?.tags ?? []) as Array<string | null | undefined>));
  const [tagInputValue, setTagInputValue] = useState("");
  const [categoryId, setCategoryId] = useState(() =>
    String(item?.category_id ?? item?.category?.id ?? ""),
  );
  const [subCategoryId, setSubCategoryId] = useState(() =>
    String(item?.sub_category_id ?? item?.sub_category_item?.id ?? ""),
  );
  const [subSystemId, setSubSystemId] = useState(() =>
    String(item?.sub_system_id ?? item?.sub_system?.id ?? ""),
  );

  useEffect(() => {
    setRemoveCover(false);
    setRemoveFile(false);
    setCoverCrop(null);
    setCoverCropError("");
    const nextTitle = item?.title ?? "";
    setTitleValue(nextTitle);
    setSlugValue(item?.slug ?? slugify(nextTitle));
    setSlugTouched(false);
    setFileTypeValue(item?.file_type ?? "");
    setFileSizeValue(item?.file_size ?? "");
    setPagesValue(item?.pages?.toString() ?? "");
    setPagesManualFallback(!item?.pages);
    setPagesReadFailed(false);
    setTagsValue(normalizeTagList((item?.tags ?? []) as Array<string | null | undefined>));
    setTagInputValue("");
    setCategoryId(String(item?.category_id ?? item?.category?.id ?? ""));
    setSubCategoryId(String(item?.sub_category_id ?? item?.sub_category_item?.id ?? ""));
    setSubSystemId(String(item?.sub_system_id ?? item?.sub_system?.id ?? ""));
  }, [
    item?.id,
    item?.title,
    item?.slug,
    item?.category_id,
    item?.sub_category_id,
    item?.sub_system_id,
    item?.category?.id,
    item?.sub_category_item?.id,
    item?.sub_system?.id,
    mode,
    type,
  ]);

  useEffect(() => {
    if (!removeFile) return;

    setFileTypeValue("");
    setFileSizeValue("");
    setPagesValue("");
    setPagesManualFallback(false);
    setPagesReadFailed(false);
  }, [removeFile]);

  const title =
    mode === "create"
      ? `Tambah ${type === "insight" ? "Insight" : type === "manual" ? "Manual" : "Regulasi"}`
      : `Edit ${type === "insight" ? "Insight" : type === "manual" ? "Manual" : "Regulasi"}`;
  const safeCategories = categories ?? [];
  const safeSubSystems = subSystems ?? [];
  const relevantCategories = useMemo(
    () => safeCategories.filter((category) => category.content_type === type),
    [safeCategories, type],
  );
  const selectedCategory = useMemo(
    () => relevantCategories.find((category) => String(category.id) === categoryId) ?? null,
    [relevantCategories, categoryId],
  );
  const availableSubCategories = selectedCategory?.sub_categories ?? [];
  const longDescriptionDefaultValue = useMemo(
    () => item?.long_description ?? [],
    [item?.id, item?.long_description],
  );
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (coverCrop) {
              try {
                setCoverCropError("");
                const finalCover = await exportCroppedCover(
                  coverCrop.sourceFile,
                  coverCrop.transform,
                  500 * 1024,
                );
                data.set("cover_image", finalCover);
                data.set("remove_cover_image", "0");
              } catch (error) {
                const message = normalizeError(error);
                setCoverCropError(message);
                return;
              }
            } else if (removeCover) {
              data.set("remove_cover_image", "1");
            }
            await onSubmit(data);
          }}
        >
          {textField("title", "Title", "", "text", {
            value: titleValue,
            onChange: (event) => {
              const nextTitle = event.target.value;
              setTitleValue(nextTitle);
              if (!slugTouched) {
                setSlugValue(slugify(nextTitle));
              }
            },
          })}
          {textField("slug", "Slug", "", "text", {
            value: slugValue,
            onChange: (event) => {
              setSlugTouched(true);
              setSlugValue(event.target.value);
            },
          })}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="category_id">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setSubCategoryId("");
              }}
              className={fieldClass}
            >
              <option value="">Pilih Category</option>
              {relevantCategories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="sub_category_id">
              Sub Category
            </label>
            <select
              id="sub_category_id"
              name="sub_category_id"
              value={subCategoryId}
              onChange={(event) => setSubCategoryId(event.target.value)}
              className={fieldClass}
              disabled={!selectedCategory || availableSubCategories.length === 0}
            >
              <option value="">
                {availableSubCategories.length > 0
                  ? "Pilih sub-category"
                  : "Tidak ada sub-category"}
              </option>
              {availableSubCategories.map((subCategory) => (
                <option key={subCategory.id} value={String(subCategory.id)}>
                  {subCategory.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="sub_system_id">
              Sub-sistem KRISNA
            </label>
            <select
              id="sub_system_id"
              name="sub_system_id"
              value={subSystemId}
              onChange={(event) => setSubSystemId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Pilih sub-sistem</option>
              {safeSubSystems.map((subSystem) => (
                <option key={subSystem.id} value={String(subSystem.id)}>
                  {subSystem.name}
                </option>
              ))}
            </select>
          </div>
          <YearPickerField name="year" label="Tahun" defaultValue={item?.year ?? ""} />
          {textField("youtube_url", "YouTube URL (opsional)", item?.youtube_url ?? "", "url", { placeholder: "Kosongkan jika tidak ada" })}
          {textField("video_duration", "Video Duration", item?.video_duration ?? "", "text", { placeholder: "Contoh: 08:24 atau 1:02:15" })}
          {textField(
            "author",
            type === "regulation" ? "Issuing Body" : "Author",
            item?.author ?? "",
          )}
          {textField("language", "Language", item?.language ?? "Bahasa Indonesia")}
          {textField("read_time", "Read Time", item?.read_time ?? "")}
          <DatePickerField name="published_date" label="Published Date" defaultValue={item?.published_date ?? ""} />
          <DatePickerField name="effective_date" label="Effective Date" defaultValue={item?.effective_date ?? ""} />
          {selectField(
            "viewer",
            "Viewer",
            item?.viewer ?? (type === "insight" ? "web" : "pdf"),
            [
              { value: "pdf", label: "PDF" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
              { value: "web", label: "Web" },
            ],
            "Pilih viewer",
          )}
          {textField("version", "Version", item?.version ?? "")}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={item?.description ?? ""}
              className={fieldClass}
            />
          </div>
          <RichTextField
            name="long_description"
            label="Long Description"
            defaultValue={longDescriptionDefaultValue}
            placeholder="Tulis isi long description di sini..."
            helperText="Teks ini akan disimpan sebagai Portable Text JSON, bukan raw JSON manual."
          />
          <TagInputField
            name="tags"
            label="Tags"
            value={tagsValue}
            inputValue={tagInputValue}
            onChange={setTagsValue}
            onInputValueChange={setTagInputValue}
            helperText="Gunakan Enter atau koma untuk menambah tag."
          />
          <CoverCropField
            id="cover_image"
            label="Cover Image"
            helperText="Gunakan gambar JPG, PNG, atau WebP. Idealnya 4:3 dan hasil akhir akan dijaga di bawah 500 KB."
            existingUrl={
              item?.cover_image_url ?? item?.cover_thumbnail_url ?? item?.cover_preview_url ?? null
            }
            removed={removeCover}
            onRemove={() => setRemoveCover(true)}
            onRestore={() => setRemoveCover(false)}
            onChange={setCoverCrop}
            onErrorChange={setCoverCropError}
          />
          {coverCropError ? (
            <p className="md:col-span-2 text-xs text-destructive">{coverCropError}</p>
          ) : null}
          <UploadField
            id="file"
            label="File"
            kind="file"
            accept=".pdf,application/pdf"
            helperText="Gunakan file PDF. Ukuran maksimal 30 MB."
            existingUrl={item?.file_url ?? null}
            existingName={item?.file_name ?? null}
            removed={removeFile}
            onRemove={() => setRemoveFile(true)}
            onFileSelected={(file) => {
              if (file) setRemoveFile(false);
            }}
            maxSizeBytes={30 * 1024 * 1024}
            onMetaChange={({ fileType, fileSize, pages, pagesReadFailed }) => {
              setFileTypeValue(fileType);
              setFileSizeValue(fileSize);
              setPagesValue(pages);
              setPagesManualFallback(Boolean(pagesReadFailed));
              setPagesReadFailed(Boolean(pagesReadFailed));
            }}
          />
          {textField("file_type", "File Type", "", "text", { value: fileTypeValue, onChange: (event) => setFileTypeValue(event.target.value) })}
          {textField("file_size", "File Size", "", "text", { value: fileSizeValue, onChange: (event) => setFileSizeValue(event.target.value) })}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor="pages">
                Pages
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={pagesManualFallback}
                  onChange={(event) => setPagesManualFallback(event.target.checked)}
                />
                Input manual
              </label>
            </div>
            <input
              id="pages"
              name="pages"
              type="number"
              min={0}
              value={pagesValue}
              onChange={(event) => setPagesValue(event.target.value)}
              readOnly={!pagesManualFallback}
              className={`${fieldClass} ${!pagesManualFallback ? "bg-muted/50 text-muted-foreground" : ""}`}
            />
            <p className="text-xs text-muted-foreground">
              {pagesReadFailed
                ? "Jumlah halaman PDF gagal dibaca otomatis. Aktifkan input manual lalu isi jumlah halaman."
                : pagesValue
                  ? "Jumlah halaman terdeteksi otomatis dari PDF. Aktifkan input manual jika ingin mengoreksi."
                  : "Jumlah halaman akan diisi otomatis saat PDF berhasil dibaca."}
            </p>
          </div>
          {selectField(
            "display_status",
            "Display Status",
            item?.display_status ?? "aktif",
            [
              { value: "terbaru", label: "Terbaru" },
              { value: "aktif", label: "Aktif" },
              { value: "arsip", label: "Arsip" },
            ],
            "Pilih status",
          )}
          {textField("jurisdiction", "Jurisdiction", item?.jurisdiction ?? "")}
          {selectField(
            "regulation_status",
            "Regulation Status",
            item?.regulation_status ?? "berlaku",
            [
              { value: "berlaku", label: "Berlaku" },
              { value: "dicabut", label: "Dicabut" },
              { value: "direvisi", label: "Direvisi" },
            ],
            "Pilih status",
          )}
          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm md:col-span-2">
            <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />{" "}
            Published
          </label>
          <div className="flex justify-end gap-2 pt-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WhatsNewModal({
  item,
  subSystems,
  saving,
  onClose,
  onSubmit,
}: {
  item: AdminWhatsNewItem;
  subSystems: AdminSubSystem[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-4xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Edit Apa yang Baru</h2>
            <p className="mt-1 text-xs text-muted-foreground">GitHub issue #{item.github_issue_number}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="raw_title">
              Judul dari GitHub
            </label>
            <input id="raw_title" value={item.raw_title} readOnly className={`${fieldClass} bg-muted/50 text-muted-foreground`} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="public_title">
              Judul publik
            </label>
            <input
              id="public_title"
              name="public_title"
              defaultValue={item.public_title}
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="summary">
              Ringkasan
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              defaultValue={item.summary ?? ""}
              className={fieldClass}
              placeholder="Tambahkan ringkasan singkat yang mudah dipahami pengguna publik."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="sub_system_id">
              Sub-sistem
            </label>
            <select
              id="sub_system_id"
              name="sub_system_id"
              defaultValue={String(item.sub_system_id)}
              required
              className={fieldClass}
            >
              {subSystems.map((subSystem) => (
                <option key={subSystem.id} value={String(subSystem.id)}>
                  {subSystem.name}
                </option>
              ))}
            </select>
          </div>
          {selectField(
            "category",
            "Kategori",
            item.category,
            [
              { value: "Fitur baru", label: "Fitur baru" },
              { value: "Perbaikan bug", label: "Perbaikan bug" },
              { value: "Perubahan kebijakan-regulasi", label: "Perubahan kebijakan-regulasi" },
              { value: "Perubahan tampilan (UI)", label: "Perubahan tampilan (UI)" },
              { value: "Pembaruan teknis", label: "Pembaruan teknis" },
            ],
            "Pilih kategori",
          )}
          {selectField(
            "urgency",
            "Urgensi",
            item.urgency,
            [
              { value: "Wajib diketahui sebelum pakai sistem", label: "Wajib diketahui sebelum pakai sistem" },
              { value: "Informasi tambahan", label: "Informasi tambahan" },
            ],
            "Pilih urgensi",
          )}
          {textField("closed_at", "Tanggal pembaruan", item.closed_at ? item.closed_at.slice(0, 10) : "", "date")}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="github_url">
              Link GitHub
            </label>
            <input id="github_url" value={item.github_url ?? "-"} readOnly className={`${fieldClass} bg-muted/50 text-muted-foreground`} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm md:col-span-2">
            <input type="checkbox" name="published" defaultChecked={Boolean(item.published)} />{" "}
            Published
          </label>
          <div className="flex justify-end gap-2 pt-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FaqModal({
  item,
  mode,
  categories,
  saving,
  onClose,
  onSubmit,
}: {
  item?: AdminFaq;
  mode: "create" | "edit";
  categories?: AdminCategory[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const title = mode === "create" ? "Tambah FAQ" : "Edit FAQ";
  const [categoryId, setCategoryId] = useState(() =>
    String(item?.faq_category_id ?? item?.category_id ?? item?.faq_category?.id ?? ""),
  );
  const safeCategories = categories ?? [];

  useEffect(() => {
    setCategoryId(
      String(item?.faq_category_id ?? item?.category_id ?? item?.faq_category?.id ?? ""),
    );
  }, [item?.id, item?.category_id, item?.faq_category?.id, mode]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            data.set("answer", JSON.stringify(toBlocks(String(data.get("answer_text") ?? ""))));
            data.delete("answer_text");
            if (categoryId) {
              data.set("category_id", categoryId);
            } else {
              data.delete("category_id");
            }
            await onSubmit(data);
          }}
        >
          {textField("question", "Pertanyaan", item?.question ?? "")}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="category_id">
              Kategori terdaftar
            </label>
            <select
              id="category_id"
              name="category_id"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Pilih kategori</option>
              {safeCategories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Urutan tampil</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diatur otomatis saat FAQ baru dibuat. Item baru akan masuk ke posisi terakhir.
              </p>
              {item?.order_index != null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Posisi saat ini: <span className="font-medium text-foreground">{item.order_index}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="answer_text">
              Jawaban
            </label>
            <textarea
              id="answer_text"
              name="answer_text"
              rows={8}
              defaultValue={stripText(item?.answer ?? [])}
              className={fieldClass}
              placeholder="Pisahkan paragraf dengan baris kosong."
            />
            <p className="text-xs text-muted-foreground">
              Disimpan sebagai blok Portable Text sederhana.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm md:col-span-2">
            <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />{" "}
            Published
          </label>
          <div className="flex justify-end gap-2 pt-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FaqMoveModal({
  item,
  maxPosition,
  saving,
  onClose,
  onSubmit,
}: {
  item: AdminFaq;
  maxPosition: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (position: number) => Promise<void>;
}) {
  const [position, setPosition] = useState(() => String(item.order_index ?? 1));

  useEffect(() => {
    setPosition(String(item.order_index ?? 1));
  }, [item.id, item.order_index]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-lg rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-lg font-semibold">Pindahkan FAQ ke posisi</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(Number(position));
          }}
        >
          <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{item.question}</p>
            <p className="mt-1">Posisi saat ini: {item.order_index ?? 0}</p>
            <p className="mt-1">Total urutan tersedia: {maxPosition}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="faq_move_position">
              Nomor urutan tujuan
            </label>
            <input
              id="faq_move_position"
              type="number"
              min={1}
              max={maxPosition}
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className={fieldClass}
              placeholder="Masukkan nomor urutan"
            />
            <p className="text-xs text-muted-foreground">
              FAQ akan dipindahkan ke posisi yang dipilih dan item lain akan menyesuaikan otomatis.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Move className="h-4 w-4" />}
              Pindahkan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}function DashboardPanel({
  stats,
  adminCounts,
  whatsNewSummary,
  whatsNewSyncing,
  whatsNewSyncResult,
  canNavigateContent,
  canNavigateAdmin,
  onNavigate,
  onSyncWhatsNew,
  isLoading,
}: {
  stats: Array<{ label: string; value: number; type: Exclude<Tab, "dashboard" | "user" | "role"> }>;
  adminCounts?: { userTotal: number; roleTotal: number } | null;
  whatsNewSummary?: WhatsNewSummary | null;
  whatsNewSyncing?: boolean;
  whatsNewSyncResult?: { created: number; updated: number } | null;
  canNavigateContent: boolean;
  canNavigateAdmin: boolean;
  onNavigate: (tab: Tab) => void;
  onSyncWhatsNew?: () => void;
  isLoading?: boolean;
}) {
  const adminCards = adminCounts
    ? [
        {
          label: "User",
          value: adminCounts.userTotal,
          description: "Akun yang terdaftar",
          icon: Users,
          tone: "from-sky-500/20 via-sky-500/10 to-background",
          accent: "text-sky-700 dark:text-sky-300",
          type: "user" as const,
        },
        {
          label: "Role",
          value: adminCounts.roleTotal,
          description: "Otoritas yang tersedia",
          icon: ShieldCheck,
          tone: "from-emerald-500/20 via-emerald-500/10 to-background",
          accent: "text-emerald-700 dark:text-emerald-300",
          type: "role" as const,
        },
      ]
    : [];
  const whatsNewSummaryReady = Boolean(whatsNewSummary);
  const lastSyncedAt = whatsNewSummary?.last_synced_at ? new Date(whatsNewSummary.last_synced_at) : null;
  const syncIsLate = whatsNewSummaryReady && (!lastSyncedAt || Number.isNaN(lastSyncedAt.getTime()) || Date.now() - lastSyncedAt.getTime() > 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Memuat data dashboard...
          </div>
        </div>
      ) : null}
      <div className="rounded-3xl border border-border/70 bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Panel administrasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ringkasan konten dan admin.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={canNavigateContent ? () => onNavigate(item.type) : undefined}
            disabled={!canNavigateContent}
            aria-disabled={!canNavigateContent}
            className={`group relative overflow-hidden rounded-3xl border border-border/70 bg-background p-5 text-left shadow-sm transition ${
              canNavigateContent ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default opacity-85"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/30 opacity-0 transition group-hover:opacity-100" />
            <p className="relative text-sm text-muted-foreground">Total {item.label}</p>
            <p className="relative mt-2 text-4xl font-semibold tracking-tight">{item.value}</p>
          </button>
        ))}
      </div>
      {canNavigateContent ? (
        <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Apa yang Baru</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">Monitoring kurasi pembaruan KRISNA</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Pantau status data hasil sinkronisasi GitHub sebelum ditampilkan di halaman publik.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("whats-new")}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Kelola Pembaruan
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Draft</p>
              <p className="mt-2 text-2xl font-semibold">{whatsNewSummary?.draft ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Published</p>
              <p className="mt-2 text-2xl font-semibold">{whatsNewSummary?.published ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sync terakhir</p>
              <p className="mt-2 text-sm font-semibold">{formatDate(whatsNewSummary?.last_synced_at)}</p>
            </div>
          </div>
          {whatsNewSummaryReady ? (
            <div className={`mt-4 rounded-2xl border p-4 ${
              syncIsLate
                ? "border-orange-200 bg-orange-50 text-orange-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {syncIsLate ? "Sync terakhir lebih dari 24 jam lalu." : "Semua pembaruan sudah ter-update."}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {syncIsLate
                      ? "Pastikan data GitHub tetap terbaru dengan menjalankan sinkronisasi manual."
                      : whatsNewSyncResult
                        ? `Sync selesai. Dibuat: ${whatsNewSyncResult.created}, diperbarui: ${whatsNewSyncResult.updated}.`
                        : "Sinkronisasi terakhir masih dalam rentang aman."}
                  </p>
                </div>
                {syncIsLate ? (
                  <button
                    type="button"
                    onClick={onSyncWhatsNew}
                    disabled={whatsNewSyncing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {whatsNewSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {whatsNewSyncing ? "Menyinkronkan..." : "Sync sekarang"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {adminCards.length > 0 ? (
        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            {adminCards.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={canNavigateAdmin ? () => onNavigate(item.type) : undefined}
                  disabled={!canNavigateAdmin}
                  aria-disabled={!canNavigateAdmin}
                  className={`group relative overflow-hidden rounded-[1.6rem] border border-border/70 bg-background p-5 text-left shadow-sm transition ${
                    canNavigateAdmin ? "hover:-translate-y-0.5 hover:shadow-xl" : "cursor-default opacity-95"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total {item.label}</p>
                      <p className={`mt-2 text-4xl font-semibold tracking-tight`}>{item.value}</p>
                      <p className="mt-3 max-w-[18rem] text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm ${item.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminShell({
  user,
  activeTab,
  onNavigate,
  onLogout,
  isAdmin,
  children,
}: {
  user: AdminUser;
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  onLogout: () => void;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{ background: "var(--gradient-hero)" }}
    >
      <StudioBackdrop />
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-72 border-r border-border/70 bg-background/85 p-5 backdrop-blur-xl md:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">KRISNApedia</p>
            <p className="text-xs text-muted-foreground">Admin console</p>
          </div>
        </div>
        <nav className="space-y-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
            <NavButton active={activeTab === "dashboard"} label="Overview" onClick={() => onNavigate("dashboard")} />
          </div>          {isAdmin ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Management User</p>
              <NavButton active={activeTab === "user"} label="User" onClick={() => onNavigate("user")} />
              <NavButton active={activeTab === "role"} label="Role" onClick={() => onNavigate("role")} />
              <NavButton active={activeTab === "activity-log"} label="Activity Log" onClick={() => onNavigate("activity-log")} />
            </div>
          ) : null}
          {!isAdmin ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Management Content</p>
              <NavButton active={activeTab === "insight"} label="Insight" onClick={() => onNavigate("insight")} />
              <NavButton active={activeTab === "manual"} label="Manual" onClick={() => onNavigate("manual")} />
              <NavButton active={activeTab === "regulation"} label="Regulasi" onClick={() => onNavigate("regulation")} />
              <NavButton active={activeTab === "faq"} label="FAQ" onClick={() => onNavigate("faq")} />
              <NavButton active={activeTab === "whats-new"} label="What's new" onClick={() => onNavigate("whats-new")} />
            </div>
          ) : null}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-2">
          {user.id > 0 || user.name || user.role || user.email ? (
            <>
              <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Masuk sebagai</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" /> {user.name}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user.role_record?.name ?? user.role}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </>
          ) : (
            <div className="h-[96px]" />
          )}
        </div>
      </aside>
      <main className="relative z-10 md:ml-72">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admin / {tabLabel(activeTab)}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{tabLabel(activeTab)}</h1>
            </div>
          </div>
        </header>
        <section className="space-y-6 p-5 md:p-8">{children}</section>
      </main>
    </div>
  );
}

export function CustomStudio() {
  const [authStatus, setAuthStatus] = useState<"loading" | "anonymous" | "ready">("loading");
  const [user, setUser] = useState<AdminUser | null>(() => getStoredAdminUser());
  const [email, setEmail] = useState(() => getInitialAuthEmail());
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState("");
  const [authView, setAuthView] = useState<AuthView>(() => getInitialAuthView());
  const [resetToken, setResetToken] = useState(() => getInitialResetToken());
  const [authNotice, setAuthNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubCategory, setSavingSubCategory] = useState(false);
  const [savingSubSystem, setSavingSubSystem] = useState(false);
  const [savingFaqCategory, setSavingFaqCategory] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [syncingWhatsNew, setSyncingWhatsNew] = useState(false);
  const [whatsNewSyncResult, setWhatsNewSyncResult] = useState<{ created: number; updated: number } | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialTabFromPath());
  const [data, setData] = useState<ApiState>(emptyState);
  const [dashboardSummary, setDashboardSummary] = useState<{ userTotal: number; roleTotal: number } | null>(null);
  const [contentQueries, setContentQueries] = useState<Record<ContentType, ListQuery>>({
    insight: createDefaultQuery(),
    manual: createDefaultQuery(),
    regulation: createDefaultQuery(),
  });
  const [faqQuery, setFaqQuery] = useState<ListQuery>(createDefaultQuery());
  const [whatsNewQuery, setWhatsNewQuery] = useState<ListQuery>(createDefaultQuery());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [taxonomyType, setTaxonomyType] = useState<ContentType | null>(null);
  const isAdmin = user?.role === "admin";
  const effectiveWhatsNewDateFrom = whatsNewQuery.dateFrom && whatsNewQuery.dateTo ? whatsNewQuery.dateFrom : "";
  const effectiveWhatsNewDateTo = whatsNewQuery.dateFrom && whatsNewQuery.dateTo ? whatsNewQuery.dateTo : "";
  const loadGenerationRef = useRef(0);

  function beginLoadingSession() {
    loadGenerationRef.current += 1;
    setLoadingData(true);
    return loadGenerationRef.current;
  }

  function navigateTab(next: Tab, options?: { replace?: boolean }) {
    if (next === activeTab) return;

    beginLoadingSession();
    setData((prev) => ({
      ...emptyState,
      faqCategories: prev.faqCategories,
      categoriesByType: prev.categoriesByType,
      subSystems: prev.subSystems,
    }));
    setActiveTab(next);

    if (typeof window === "undefined") return;

    const nextPath = getTabPath(next);
    if (normalizeStudioPath(window.location.pathname) === normalizeStudioPath(nextPath)) return;

    const method = options?.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
  }

  async function fetchContentPageForQuery(type: ContentType, query: ListQuery) {
    const response = await fetchContentPage(type, query.page, PAGE_SIZE, query.search);
    if (query.page > 1 && response.total > 0 && response.data.length === 0 && response.last_page < query.page) {
      const safePage = response.last_page;
      const fallback = await fetchContentPage(type, safePage, PAGE_SIZE, query.search);
      setContentQueries((prev) => ({
        ...prev,
        [type]: { ...prev[type], page: safePage },
      }));
      return fallback;
    }

    return response;
  }

  async function fetchFaqPageForQuery(query: ListQuery) {
    const response = await fetchFaqPage(query.page, PAGE_SIZE, query.search);
    if (query.page > 1 && response.total > 0 && response.data.length === 0 && response.last_page < query.page) {
      const safePage = response.last_page;
      const fallback = await fetchFaqPage(safePage, PAGE_SIZE, query.search);
      setFaqQuery((prev) => ({
        ...prev,
        page: safePage,
      }));
      return fallback;
    }

    return response;
  }

  async function fetchWhatsNewPageForQuery(query: ListQuery) {
    const response = await fetchWhatsNewPage(
      query.page,
      PAGE_SIZE,
      query.search,
      query.published ?? "",
      query.subSystemId ?? "",
      query.category ?? "",
      effectiveWhatsNewDateFrom,
      effectiveWhatsNewDateTo,
    );
    if (query.page > 1 && response.total > 0 && response.data.length === 0 && response.last_page < query.page) {
      const safePage = response.last_page;
      const fallback = await fetchWhatsNewPage(
        safePage,
        PAGE_SIZE,
        query.search,
        query.published ?? "",
        query.subSystemId ?? "",
        query.category ?? "",
        effectiveWhatsNewDateFrom,
        effectiveWhatsNewDateTo,
      );
      setWhatsNewQuery((prev) => ({
        ...prev,
        page: safePage,
      }));
      return fallback;
    }

    return response;
  }

  async function loadTaxonomyData() {
    const [faqCategories, insightCategories, manualCategories, regulationCategories, subSystems] = await Promise.all([
      fetchCategories("faq"),
      fetchCategories("insight"),
      fetchCategories("manual"),
      fetchCategories("regulation"),
      fetchSubSystems(true),
    ]);

    setData((prev) => ({
      ...prev,
      faqCategories,
      subSystems,
      categoriesByType: {
        insight: insightCategories,
        manual: manualCategories,
        regulation: regulationCategories,
      },
    }));
  }

  async function loadContentSection(type: ContentType, loadToken = loadGenerationRef.current) {
    if (loadGenerationRef.current === loadToken) {
      setError("");
    }
    try {
      const pageData = await fetchContentPageForQuery(type, contentQueries[type]);
      if (loadGenerationRef.current === loadToken) {
        setData((prev) => ({ ...prev, [type]: pageData }));
      }
      return pageData;
    } catch (err) {
      if (loadGenerationRef.current === loadToken) {
        setError(normalizeError(err));
      }
      throw err;
    } finally {
      if (loadGenerationRef.current === loadToken) {
        setLoadingData(false);
      }
    }
  }

  async function loadFaqSection(loadToken = loadGenerationRef.current) {
    if (loadGenerationRef.current === loadToken) {
      setError("");
    }
    try {
      const pageData = await fetchFaqPageForQuery(faqQuery);
      if (loadGenerationRef.current === loadToken) {
        setData((prev) => ({ ...prev, faq: pageData }));
      }
      return pageData;
    } catch (err) {
      if (loadGenerationRef.current === loadToken) {
        setError(normalizeError(err));
      }
      throw err;
    } finally {
      if (loadGenerationRef.current === loadToken) {
        setLoadingData(false);
      }
    }
  }

  async function loadWhatsNewSection(loadToken = loadGenerationRef.current) {
    if (loadGenerationRef.current === loadToken) {
      setError("");
    }
    try {
      const pageData = await fetchWhatsNewPageForQuery(whatsNewQuery);
      if (loadGenerationRef.current === loadToken) {
        setData((prev) => ({ ...prev, whatsNew: pageData }));
      }
      return pageData;
    } catch (err) {
      if (loadGenerationRef.current === loadToken) {
        setError(normalizeError(err));
      }
      throw err;
    } finally {
      if (loadGenerationRef.current === loadToken) {
        setLoadingData(false);
      }
    }
  }

  async function loadDashboardData(loadToken = loadGenerationRef.current) {
    if (loadGenerationRef.current === loadToken) {
      setError("");
    }
    try {
      const [insight, manual, regulation, faq, adminSummary, whatsNewDashboard] = await Promise.all([
        fetchContentPageForQuery("insight", contentQueries.insight),
        fetchContentPageForQuery("manual", contentQueries.manual),
        fetchContentPageForQuery("regulation", contentQueries.regulation),
        fetchFaqPageForQuery(faqQuery),
        isAdmin ? Promise.all([fetchAdminUsers(1, 1, ""), fetchRoles()]) : Promise.resolve(null),
        !isAdmin ? fetchWhatsNewPage(1, 1, "") : Promise.resolve(null),
      ]);

      if (loadGenerationRef.current === loadToken) {
        setData((prev) => ({
          ...prev,
          insight,
          manual,
          regulation,
          faq,
          whatsNew: whatsNewDashboard ?? prev.whatsNew,
        }));
        setDashboardSummary(adminSummary ? { userTotal: adminSummary[0].total, roleTotal: adminSummary[1].length } : null);
      }
    } catch (err) {
      if (loadGenerationRef.current === loadToken) {
        setError(normalizeError(err));
      }
      throw err;
    } finally {
      if (loadGenerationRef.current === loadToken) {
        setLoadingData(false);
      }
    }
  }

  async function runManualWhatsNewSync() {
    setSyncingWhatsNew(true);
    setError("");
    try {
      const result = await syncWhatsNewItems();
      setWhatsNewSyncResult(result.data);
      showAdminSuccess(`Sync selesai. Dibuat: ${result.data.created}, diperbarui: ${result.data.updated}.`);
      const pageData = await fetchWhatsNewPage(1, 1, "");
      setData((prev) => ({ ...prev, whatsNew: pageData }));
    } catch (err) {
      showAdminError("Gagal sync Apa yang Baru", normalizeError(err));
      setError(normalizeError(err));
    } finally {
      setSyncingWhatsNew(false);
    }
  }

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      setAuthStatus("anonymous");
      return;
    }

    let cancelled = false;
    setAuthStatus("loading");
    fetchAdminProfile()
      .then(({ user: profile }) => {
        if (cancelled) return;
        setUser(profile);
        setStoredAdminUser(profile);
        setAuthStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredAdminToken();
        clearStoredAdminUser();
        setUser(null);
        setAuthStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin) return;

    let cancelled = false;
    loadTaxonomyData().catch((err) => {
      if (cancelled) return;
      setError(normalizeError(err));
    });

    return () => {
      cancelled = true;
    };
  }, [authStatus, isAdmin]);

  useEffect(() => {
    if (authStatus !== "ready" || activeTab !== "dashboard") return;

    const loadToken = beginLoadingSession();
    loadDashboardData(loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });

    return () => {
      loadGenerationRef.current += 1;
    };
  }, [authStatus, activeTab]);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin || activeTab !== "insight") return;

    const loadToken = beginLoadingSession();
    loadContentSection("insight", loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [authStatus, activeTab, contentQueries.insight.page, contentQueries.insight.search]);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin || activeTab !== "manual") return;

    const loadToken = beginLoadingSession();
    loadContentSection("manual", loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [authStatus, activeTab, contentQueries.manual.page, contentQueries.manual.search]);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin || activeTab !== "regulation") return;

    const loadToken = beginLoadingSession();
    loadContentSection("regulation", loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [authStatus, activeTab, contentQueries.regulation.page, contentQueries.regulation.search]);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin || activeTab !== "faq") return;

    const loadToken = beginLoadingSession();
    loadFaqSection(loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [authStatus, activeTab, faqQuery.page, faqQuery.search]);

  useEffect(() => {
    if (authStatus !== "ready" || isAdmin || activeTab !== "whats-new") return;

    const loadToken = beginLoadingSession();
    loadWhatsNewSection(loadToken).catch((err) => {
      if (loadGenerationRef.current !== loadToken) return;
      setError(normalizeError(err));
    });
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [
    authStatus,
    activeTab,
    whatsNewQuery.page,
    whatsNewQuery.search,
    whatsNewQuery.published,
    whatsNewQuery.subSystemId,
    whatsNewQuery.category,
    effectiveWhatsNewDateFrom,
    effectiveWhatsNewDateTo,
  ]);

  const stats = useMemo(
    () => [
      { label: "Insight", value: data.insight.total, type: "insight" as const },
      { label: "Manual", value: data.manual.total, type: "manual" as const },
      { label: "Regulasi", value: data.regulation.total, type: "regulation" as const },
      { label: "FAQ", value: data.faq.total, type: "faq" as const },
    ],
    [data],
  );

  function switchAuthView(next: AuthView) {
    setAuthView(next);
    setError("");
    setAuthNotice("");
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthNotice("");
    setSaving(true);
    try {
      const result = await loginAdmin(email, password);
      setStoredAdminToken(result.token);
      setStoredAdminUser(result.user);
      setUser(result.user);
      setAuthStatus("ready");
      setPassword("");
      setResetPassword("");
      setResetPasswordConfirmation("");
      setResetToken("");
      setAuthView("login");
    } catch (err) {
      setError(normalizeError(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }
  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthNotice("");
    setSaving(true);
    try {
      const result = await requestAdminPasswordReset(email);
      setAuthNotice(result.message);
      setAuthView("forgot");
      setResetPassword("");
      setResetPasswordConfirmation("");
    } catch (err) {
      setError(normalizeError(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }
  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthNotice("");

    if (!resetToken) {
      setError("Token reset tidak ditemukan. Silakan minta tautan baru.");
      setAuthView("forgot");
      return;
    }

    setSaving(true);
    try {
      const result = await resetAdminPassword({
        email,
        token: resetToken,
        password: resetPassword,
        password_confirmation: resetPasswordConfirmation,
      });
      setAuthNotice(result.message);
      setAuthView("login");
      setPassword("");
      setResetPassword("");
      setResetPasswordConfirmation("");
      setResetToken("");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (err) {
      const message = normalizeError(err);
      setError(message);

      if (/tidak valid|kedaluwarsa|expired/i.test(message)) {
        setResetToken("");
        setResetPassword("");
        setResetPasswordConfirmation("");
        setAuthView("forgot");
        setAuthNotice("Kembali ke Login dan klik Lupa Password..");
      }

      throw err;
    } finally {
      setSaving(false);
    }
  }
  async function handleLogout() {
    setSaving(true);
    try {
      await logoutAdmin();
    } catch {
      /* ignore */
    } finally {
      clearStoredAdminToken();
      clearStoredAdminUser();
      setUser(null);
      setData(emptyState);
      setContentQueries({
        insight: createDefaultQuery(),
        manual: createDefaultQuery(),
        regulation: createDefaultQuery(),
      });
      setFaqQuery(createDefaultQuery());
      setWhatsNewQuery(createDefaultQuery());
      setModal(null);
      navigateTab("dashboard", { replace: true });
      setAuthStatus("anonymous");
      setPassword("");
      setResetPassword("");
      setResetPasswordConfirmation("");
      setResetToken(getInitialResetToken());
      setAuthNotice("");
      setAuthView("login");
      setSaving(false);
    }
  }

  async function submitContent(
    type: ContentType,
    mode: "create" | "edit",
    item: AdminContentItem | undefined,
    formData: FormData,
  ) {
    setSaving(true);
    setError("");
    try {
      if (mode === "create") await createContentItem(type, formData);
      else if (item) await updateContentItem(type, item.id, formData);
      notifyCrudSuccess(contentTypeLabel(type), mode === "create" ? "create" : "update");
      setModal(null);
      await loadContentSection(type);
    } catch (err) {
      notifyCrudError(contentTypeLabel(type), mode === "create" ? "create" : "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitFaq(
    mode: "create" | "edit",
    item: AdminFaq | undefined,
    formData: FormData,
  ) {
    setSaving(true);
    setError("");
    try {
      const payload = Object.fromEntries(formData.entries());
      const categoryIdValue = String(payload.category_id ?? "").trim();
      const resolvedCategoryId = categoryIdValue ? Number(categoryIdValue) : undefined;
      const bodyBase = {
        question: String(payload.question ?? "").trim(),
        answer: JSON.parse(String(payload.answer ?? "[]")),
        faq_category_id: Number.isFinite(resolvedCategoryId ?? Number.NaN)
          ? resolvedCategoryId
          : undefined,
        category_id: Number.isFinite(resolvedCategoryId ?? Number.NaN)
          ? resolvedCategoryId
          : undefined,
        category: String(payload.category ?? "").trim() || null,
        published: payload.published === "on",
      };

      if (mode === "create") {
        const faqItems = await fetchFaqItems();
        const nextOrderIndex = faqItems.reduce((max, current) => {
          const value = Number(current.order_index ?? 0);
          return Number.isFinite(value) && value > max ? value : max;
        }, 0) + 1;

        await createFaqItem({
          ...bodyBase,
          order_index: nextOrderIndex,
        });
      } else if (item) {
        await updateFaqItem(item.id, {
          ...bodyBase,
          order_index: Number(item.order_index ?? 0),
        });
      }
      notifyCrudSuccess("FAQ", mode === "create" ? "create" : "update");
      setModal(null);
      await loadFaqSection();
    } catch (err) {
      notifyCrudError("FAQ", mode === "create" ? "create" : "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitWhatsNew(item: AdminWhatsNewItem, formData: FormData) {
    setSaving(true);
    setError("");
    try {
      await updateWhatsNewItem(item.id, {
        public_title: String(formData.get("public_title") ?? "").trim(),
        summary: String(formData.get("summary") ?? "").trim() || null,
        category: String(formData.get("category") ?? "").trim(),
        urgency: String(formData.get("urgency") ?? "").trim(),
        sub_system_id: Number(formData.get("sub_system_id")),
        closed_at: String(formData.get("closed_at") ?? "").trim() || null,
        published: formData.get("published") === "on",
      });
      notifyCrudSuccess("Apa yang Baru", "update");
      setModal(null);
      await loadWhatsNewSection();
    } catch (err) {
      notifyCrudError("Apa yang Baru", "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleWhatsNewPublished(item: AdminWhatsNewItem) {
    setSaving(true);
    setError("");
    try {
      const response = await updateWhatsNewItem(item.id, {
        public_title: item.public_title,
        summary: item.summary ?? null,
        category: item.category,
        urgency: item.urgency,
        sub_system_id: item.sub_system_id,
        closed_at: item.closed_at ?? null,
        published: !item.published,
      });
      notifyCrudSuccess("Apa yang Baru", "update");
      if (whatsNewQuery.published) {
        await loadWhatsNewSection();
      } else {
        setData((prev) => ({
          ...prev,
          whatsNew: {
            ...prev.whatsNew,
            data: prev.whatsNew.data.map((current) =>
              current.id === item.id ? response.data : current,
            ),
          },
        }));
      }
    } catch (err) {
      notifyCrudError("Apa yang Baru", "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function persistFaqOrdering(nextOrdered: AdminFaq[]) {
    const normalized = nextOrdered.map((item, index) => ({
      ...item,
      order_index: index + 1,
    }));

    const updates = normalized.filter((item) => {
      const original = nextOrdered.find((current) => current.id === item.id);
      return Number(original?.order_index ?? 0) !== Number(item.order_index ?? 0);
    });

    const pageStart = (faqQuery.page - 1) * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE;
    const nextPageItems = normalized.slice(pageStart, pageEnd);

    setData((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        data: nextPageItems,
        total: normalized.length,
        last_page: Math.max(1, Math.ceil(normalized.length / PAGE_SIZE)),
      },
    }));

    for (const faqItem of updates) {
      await updateFaqItem(faqItem.id, {
        question: faqItem.question,
        answer: faqItem.answer,
        faq_category_id: faqItem.faq_category?.id ?? faqItem.category_id ?? undefined,
        category_id: faqItem.faq_category?.id ?? faqItem.category_id ?? undefined,
        category: faqItem.category ?? faqItem.faq_category?.name ?? null,
        order_index: Number(faqItem.order_index ?? 0),
        published: Boolean(faqItem.published),
      });
    }

    return normalized;
  }

  async function moveFaqItemToPosition(item: AdminFaq, targetPosition: number) {
    if (!Number.isFinite(targetPosition)) return;

    setSaving(true);
    setError("");

    let previousPageData: FaqPage | null = null;

    try {
      const allFaqItems = await fetchFaqItems();
      const ordered = [...allFaqItems].sort((a, b) => {
        const orderDiff = Number(a.order_index ?? 0) - Number(b.order_index ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.id - b.id;
      });

      const sourceIndex = ordered.findIndex((current) => current.id === item.id);
      if (sourceIndex < 0) return;

      const boundedPosition = Math.min(Math.max(1, Math.floor(targetPosition)), ordered.length);
      const targetIndex = boundedPosition - 1;
      if (targetIndex === sourceIndex) return;

      const nextOrdered = [...ordered];
      [nextOrdered[sourceIndex], nextOrdered[targetIndex]] = [nextOrdered[targetIndex], nextOrdered[sourceIndex]];

      previousPageData = data.faq;
      await persistFaqOrdering(nextOrdered);
      notifyCrudSuccess("FAQ", "update");
      setModal(null);
    } catch (err) {
      if (previousPageData) {
        setData((prev) => ({
          ...prev,
          faq: previousPageData ?? prev.faq,
        }));
      }
      notifyCrudError("FAQ", "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function reorderFaqItems(items: AdminFaq[], sourceId: number, targetId: number) {
    if (sourceId === targetId) return;

    setSaving(true);
    setError("");

    let previousPageData: FaqPage | null = null;

    try {
      const allFaqItems = await fetchFaqItems();
      const ordered = [...allFaqItems].sort((a, b) => {
        const orderDiff = Number(a.order_index ?? 0) - Number(b.order_index ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.id - b.id;
      });

      const sourceIndex = ordered.findIndex((current) => current.id === sourceId);
      const targetIndex = ordered.findIndex((current) => current.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const nextOrdered = [...ordered];
      const [movedItem] = nextOrdered.splice(sourceIndex, 1);
      nextOrdered.splice(targetIndex, 0, movedItem);

      previousPageData = data.faq;
      await persistFaqOrdering(nextOrdered);
      notifyCrudSuccess("FAQ", "update");
    } catch (err) {
      if (previousPageData) {
        setData((prev) => ({
          ...prev,
          faq: previousPageData ?? prev.faq,
        }));
      }
      notifyCrudError("FAQ", "update", err);
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  const taxonomyCategories = taxonomyType ? (data.categoriesByType[taxonomyType] ?? []) : [];
  const faqCategories = data.faqCategories ?? [];

  async function saveCategory(payload: { id?: number; name: string; content_type: ContentType }) {
    setSavingCategory(true);
    setError("");
    try {
      if (payload.id) {
        await updateCategory(payload.id, {
          name: payload.name,
          content_type: payload.content_type,
        });
      } else {
        await createCategory({ name: payload.name, content_type: payload.content_type });
      }
      notifyCrudSuccess("Category", payload.id ? "update" : "create");
      setTaxonomyType(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Category", payload.id ? "update" : "create", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingCategory(false);
    }
  }

  async function removeCategory(id: number) {
    if (!(await confirmAdminDelete("Hapus category ini?", "Semua sub-category di dalamnya juga akan ikut terhapus atau tidak bisa dipilih lagi."))) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await deleteCategory(id);
      notifyCrudSuccess("Category", "delete");
      setTaxonomyType(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Category", "delete", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function removeSubCategory(id: number) {
    if (!(await confirmAdminDelete("Hapus sub-category ini?", "Item yang masih memakai sub-category ini akan kehilangan referensinya."))) {
      return;
    }
    setSavingSubCategory(true);
    setError("");
    try {
      await deleteSubCategory(id);
      notifyCrudSuccess("Sub-category", "delete");
      setTaxonomyType(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Sub-category", "delete", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingSubCategory(false);
    }
  }

  async function saveSubCategory(payload: {
    id?: number;
    category_id: number;
    name: string;
    content_type: ContentType;
  }) {
    setSavingSubCategory(true);
    setError("");
    try {
      if (payload.id) {
        await updateSubCategory(payload.id, {
          category_id: payload.category_id,
          name: payload.name,
          content_type: payload.content_type,
        });
      } else {
        await createSubCategory({
          category_id: payload.category_id,
          name: payload.name,
          content_type: payload.content_type,
        });
      }
      notifyCrudSuccess("Sub-category", payload.id ? "update" : "create");
      setTaxonomyType(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Sub-category", payload.id ? "update" : "create", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingSubCategory(false);
    }
  }

  async function saveSubSystem(payload: { id?: number; name: string; slug?: string; sort_order?: number; active?: boolean }) {
    setSavingSubSystem(true);
    setError("");
    try {
      if (payload.id) {
        await updateSubSystem(payload.id, {
          name: payload.name,
          slug: payload.slug,
          sort_order: payload.sort_order,
          active: payload.active,
        });
      } else {
        await createSubSystem({
          name: payload.name,
          slug: payload.slug,
          sort_order: payload.sort_order,
          active: payload.active,
        });
      }
      notifyCrudSuccess("Sub-sistem", payload.id ? "update" : "create");
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Sub-sistem", payload.id ? "update" : "create", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingSubSystem(false);
    }
  }

  async function removeSubSystem(id: number) {
    if (!(await confirmAdminDelete("Hapus sub-sistem ini?", "Konten yang masih memakai sub-sistem ini akan kehilangan referensinya."))) {
      return;
    }
    setSavingSubSystem(true);
    setError("");
    try {
      await deleteSubSystem(id);
      notifyCrudSuccess("Sub-sistem", "delete");
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("Sub-sistem", "delete", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingSubSystem(false);
    }
  }

  async function saveFaqCategory(payload: { id?: number; name: string }) {
    setSavingFaqCategory(true);
    setError("");
    try {
      if (payload.id) {
        await updateCategory(payload.id, { name: payload.name, content_type: "faq" });
      } else {
        await createCategory({ name: payload.name, content_type: "faq" });
      }
      notifyCrudSuccess("FAQ category", payload.id ? "update" : "create");
      setModal(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("FAQ category", payload.id ? "update" : "create", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingFaqCategory(false);
    }
  }

  async function removeFaqCategory(id: number) {
    if (!(await confirmAdminDelete("Hapus category ini?", "FAQ yang memakai kategori ini akan tetap menyimpan teks kategori lama."))) {
      return;
    }
    setSavingFaqCategory(true);
    setError("");
    try {
      await deleteCategory(id);
      notifyCrudSuccess("FAQ category", "delete");
      setModal(null);
      await loadTaxonomyData();
    } catch (err) {
      notifyCrudError("FAQ category", "delete", err);
      setError(normalizeError(err));
      throw err;
    } finally {
      setSavingFaqCategory(false);
    }
  }



  if (authStatus === "anonymous") {
    return (
      <AdminAuthPanel
        mode={resetToken && authView === "reset" ? "reset" : authView}
        email={email}
        password={password}
        resetPassword={resetPassword}
        resetPasswordConfirmation={resetPasswordConfirmation}
        loading={saving}
        error={error}
        notice={authNotice}
        resetTokenAvailable={Boolean(resetToken)}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onResetPasswordChange={setResetPassword}
        onResetPasswordConfirmationChange={setResetPasswordConfirmation}
        onSubmitLogin={handleLogin}
        onSubmitForgot={handleForgotPassword}
        onSubmitReset={handleResetPassword}
        onSwitchMode={switchAuthView}
      />
    );
  }

  const displayUser = user ?? getStoredAdminUser() ?? { id: 0, email: "", name: "Memuat...", role: "" };


  const activeContentType = !isAdmin && (activeTab === "insight" || activeTab === "manual" || activeTab === "regulation") ? activeTab : null;

  return (
    <>
      <AdminNotificationHost />
      <AdminConfirmHost />
      <AdminShell user={displayUser} activeTab={activeTab} onNavigate={navigateTab} onLogout={handleLogout} isAdmin={Boolean(isAdmin)}>
      {error ? <Banner text={error} /> : null}

      {activeTab === "user" && isAdmin ? (<UserManagementPanel />) : activeTab === "role" && isAdmin ? (<RoleManagementPanel />) : activeTab === "activity-log" && isAdmin ? (<ActivityLogPanel />) : activeTab === "dashboard" ? (
        <DashboardPanel
          stats={stats}
          adminCounts={dashboardSummary}
          whatsNewSummary={data.whatsNew.filters?.summary ?? null}
          whatsNewSyncing={syncingWhatsNew}
          whatsNewSyncResult={whatsNewSyncResult}
          canNavigateContent={!isAdmin}
          canNavigateAdmin={isAdmin}
          onNavigate={(tab) => navigateTab(tab)}
          onSyncWhatsNew={runManualWhatsNewSync}
          isLoading={loadingData || authStatus === "loading"}
        />
      ) : activeTab === "whats-new" ? (
        <WhatsNewTable
          pageData={data.whatsNew}
          query={whatsNewQuery}
          subSystems={data.subSystems}
          isLoading={loadingData || authStatus === "loading"}
          onSearchChange={(value) => setWhatsNewQuery((prev) => ({ ...prev, page: 1, search: value }))}
          onFilterChange={(patch) => setWhatsNewQuery((prev) => ({ ...prev, ...patch, page: 1 }))}
          onPageChange={(page) => setWhatsNewQuery((prev) => ({ ...prev, page }))}
          onEdit={(item) => setModal({ kind: "whats-new", item })}
          onTogglePublished={toggleWhatsNewPublished}
          onDelete={async (id) => {
            if (!(await confirmAdminDelete("Hapus pembaruan ini?", "Data Apa yang Baru ini akan dihapus permanen."))) return;
            setSaving(true);
            setError("");
            try {
              await deleteWhatsNewItem(id);
              notifyCrudSuccess("Apa yang Baru", "delete");
              await loadWhatsNewSection();
            } catch (err) {
              notifyCrudError("Apa yang Baru", "delete", err);
              setError(normalizeError(err));
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : activeTab === "faq" ? (
        <FaqTable
          pageData={data.faq}
          query={faqQuery}
          isLoading={loadingData || authStatus === "loading"}
          onSearchChange={(value) => setFaqQuery({ page: 1, search: value })}
          onPageChange={(page) => setFaqQuery((prev) => ({ ...prev, page }))}
          onCreate={() => setModal({ kind: "faq", mode: "create" })}
          onManageCategories={() => setModal({ kind: "faq-category" })}
          onEdit={(item) => setModal({ kind: "faq", mode: "edit", item })}
          onReorder={reorderFaqItems}
          onMoveToPosition={(item) => setModal({ kind: "faq-move", item })}
          onDelete={async (id) => {
            if (!(await confirmAdminDelete("Hapus FAQ ini?", "Data FAQ ini akan dihapus permanen."))) return;
            setSaving(true);
            setError("");
            try {
              await deleteFaqItem(id);
              notifyCrudSuccess("FAQ", "delete");
              await loadFaqSection();
            } catch (err) {
              notifyCrudError("FAQ", "delete", err);
              setError(normalizeError(err));
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : activeContentType ? (
        <ContentTable
          key={activeTab}
          type={activeContentType}
          pageData={data[activeContentType]}
          query={contentQueries[activeContentType]}
          isLoading={loadingData || authStatus === "loading"}
          onSearchChange={(value) =>
            setContentQueries((prev) => ({
              ...prev,
              [activeContentType]: { page: 1, search: value },
            }))
          }
          onPageChange={(page) =>
            setContentQueries((prev) => ({
              ...prev,
              [activeContentType]: { ...prev[activeContentType], page },
            }))
          }
          onCreate={() => setModal({ kind: "content", mode: "create", type: activeContentType })}
          onEdit={(item) => setModal({ kind: "content", mode: "edit", type: activeContentType, item })}
          onDelete={async (id) => {
            if (!(await confirmAdminDelete("Hapus item ini?", "Data konten ini akan dihapus permanen."))) return;
            setSaving(true);
            setError("");
            try {
              await deleteContentItem(activeContentType, id);
              notifyCrudSuccess(contentTypeLabel(activeContentType), "delete");
              await loadContentSection(activeContentType as ContentType);
            } catch (err) {
              notifyCrudError(contentTypeLabel(activeContentType), "delete", err);
              setError(normalizeError(err));
            } finally {
              setSaving(false);
            }
          }}
          onManageTaxonomy={() => setTaxonomyType(activeContentType)}
          onManageSubSystems={() => setModal({ kind: "sub-system" })}
        />
      ) : null}
      {taxonomyType ? (
        <TaxonomyModal
          type={taxonomyType}
          categories={taxonomyCategories}
          savingCategory={savingCategory}
          savingSubCategory={savingSubCategory}
          onClose={() => setTaxonomyType(null)}
          onSaveCategory={saveCategory}
          onDeleteCategory={removeCategory}
          onSaveSubCategory={saveSubCategory}
          onDeleteSubCategory={removeSubCategory}
        />
      ) : null}
      {modal?.kind === "content" ? (
        <ContentModal
          key={`${modal.type}-${modal.mode}-${modal.item?.id ?? "new"}`}
          type={modal.type}
          mode={modal.mode}
          item={modal.item}
          categories={data.categoriesByType[modal.type] ?? []}
          subSystems={data.subSystems}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={(formData) => submitContent(modal.type, modal.mode, modal.item, formData)}
        />
      ) : modal?.kind === "sub-system" ? (
        <SubSystemModal
          subSystems={data.subSystems}
          saving={savingSubSystem}
          onClose={() => setModal(null)}
          onSave={saveSubSystem}
          onDelete={removeSubSystem}
        />
      ) : modal?.kind === "faq-move" ? (
        <FaqMoveModal
          item={modal.item}
          maxPosition={data.faq.total || 1}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={(position) => moveFaqItemToPosition(modal.item, position)}
        />
      ) : modal?.kind === "faq-category" ? (
        <FaqCategoryModal
          saving={savingFaqCategory}
          onClose={() => setModal(null)}
          onSaveCategory={saveFaqCategory}
          onDeleteCategory={removeFaqCategory}
        />
      ) : modal?.kind === "whats-new" ? (
        <WhatsNewModal
          key={`whats-new-${modal.item.id}`}
          item={modal.item}
          subSystems={data.subSystems}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={(formData) => submitWhatsNew(modal.item, formData)}
        />
      ) : modal?.kind === "faq" ? (
        <FaqModal
          key={`faq-${modal.mode}-${modal.item?.id ?? "new"}`}
          mode={modal.mode}
          item={modal.item}
          categories={faqCategories}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={(formData) => submitFaq(modal.mode, modal.item, formData)}
        />
      ) : null}
    </AdminShell>
    </>
  );
}












