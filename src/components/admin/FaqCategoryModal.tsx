import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Plus, Trash2, X } from "lucide-react";
import { PaginationBar } from "@/components/site/PaginationBar";
import { Button } from "@/components/ui/button";
import { fetchCategoryPage, type AdminCategory, type LaravelPaginator } from "@/lib/admin-api";

const fieldClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const PAGE_SIZE = 5;

type FaqCategoryModalProps = {
  saving: boolean;
  onClose: () => void;
  onSaveCategory: (payload: { id?: number; name: string }) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function Notice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40 text-foreground",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

export function FaqCategoryModal({ saving, onClose, onSaveCategory, onDeleteCategory }: FaqCategoryModalProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localError, setLocalError] = useState("");
  const [paginator, setPaginator] = useState<LaravelPaginator<AdminCategory> | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const normalized = search.trim();
  const categoryItems = paginator?.data ?? [];
  const totalPages = Math.max(1, paginator?.last_page ?? 1);
  const currentPage = Math.min(page, totalPages);
  const totalItems = paginator?.total ?? 0;
  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalItems);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      setLocalError("");

      try {
        const response = await fetchCategoryPage("faq", page, PAGE_SIZE, normalized);
        if (cancelled) return;
        setPaginator(response);
      } catch (error) {
        if (!cancelled) setLocalError(formatError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [page, normalized, refreshKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [normalized]);

  useEffect(() => {
    if (!editingId) return;
    const category = categoryItems.find((item) => item.id === editingId);
    if (category) setName(category.name);
  }, [categoryItems, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await onSaveCategory({ id: editingId ?? undefined, name: trimmed });
      setRefreshKey((value) => value + 1);
      if (!editingId) setPage(1);
      resetForm();
    } catch (error) {
      setLocalError(formatError(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDeleteCategory(id);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setLocalError(formatError(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-4xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Kelola category FAQ</h2>
            <p className="text-sm text-muted-foreground">
              Category FAQ memakai tabel categories dan tidak punya sub-category.
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.25fr]">
          <section className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Form category</h3>
                <p className="text-xs text-muted-foreground">Tambah atau edit nama category FAQ.</p>
              </div>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm} className="h-9 px-3 text-xs">
                  Batal edit
                </Button>
              ) : null}
            </div>

            <form
              className="space-y-3 rounded-2xl border border-border/70 bg-background p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setLocalError("");
                await handleSave();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="faq-category-name">
                  Nama category
                </label>
                <input
                  id="faq-category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={fieldClass}
                  placeholder="Contoh: Umum"
                />
              </div>
              {localError ? <Notice text={localError} tone="error" /> : null}
              <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={saving || loading || name.trim() === ""} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Simpan perubahan" : "Tambah category"}
                </Button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Daftar category</h3>
                <p className="text-xs text-muted-foreground">Semua category FAQ yang tersedia saat ini.</p>
              </div>
            </div>

            <div className="space-y-2">
              {localError ? <Notice text={localError} tone="error" /> : null}
              {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Memuat daftar category...
                </div>
              ) : categoryItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {normalized ? "Tidak ada category yang cocok." : "Belum ada category FAQ."}
                </div>
              ) : (
                categoryItems.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{category.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(category.id);
                            setName(category.name);
                            setLocalError("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                        >
                          <PencilLine className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/70 pt-4">
              <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} className="mt-0" />
              <p className="mt-3 text-sm text-muted-foreground">
                Menampilkan {showingFrom} sampai {showingTo} dari {totalItems} data
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
