import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/site/PaginationBar";
import {
  fetchCategoryPage,
  fetchSubCategoryPage,
  type AdminCategory,
  type AdminSubCategory,
  type ContentType,
  type LaravelPaginator,
} from "@/lib/admin-api";

const fieldClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const CATEGORY_PAGE_SIZE = 5;
const SUB_CATEGORY_PAGE_SIZE = 5;

type TaxonomyModalProps = {
  type: ContentType;
  categories: AdminCategory[];
  savingCategory: boolean;
  savingSubCategory: boolean;
  onClose: () => void;
  onSaveCategory: (payload: { id?: number; name: string; content_type: ContentType }) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onSaveSubCategory: (payload: { id?: number; category_id: number; name: string; content_type: ContentType }) => Promise<void>;
  onDeleteSubCategory: (id: number) => Promise<void>;
};

function typeLabel(type: ContentType) {
  return type === "insight" ? "Insight" : type === "manual" ? "Manual" : "Regulasi";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function SectionNotice({ tone = "info", text }: { tone?: "info" | "error"; text: string }) {
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

function SectionSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function TaxonomyModal({
  type,
  categories,
  savingCategory,
  savingSubCategory,
  onClose,
  onSaveCategory,
  onDeleteCategory,
  onSaveSubCategory,
  onDeleteSubCategory,
}: TaxonomyModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<number | null>(null);

  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPaginator, setCategoryPaginator] = useState<LaravelPaginator<AdminCategory> | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);

  const [subCategoryPage, setSubCategoryPage] = useState(1);
  const [subCategoryPaginator, setSubCategoryPaginator] = useState<LaravelPaginator<AdminSubCategory> | null>(null);
  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [subCategoryError, setSubCategoryError] = useState("");
  const [subCategoryRefreshKey, setSubCategoryRefreshKey] = useState(0);

  const categoryOptions = useMemo(() => categories.filter((category) => category.content_type === type), [categories, type]);
  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => String(category.id) === selectedCategoryId) ?? null,
    [categoryOptions, selectedCategoryId],
  );
  const categoryItems = categoryPaginator?.data ?? [];
  const subCategoryItems = subCategoryPaginator?.data ?? [];
  const categoryTotalPages = Math.max(1, categoryPaginator?.last_page ?? 1);
  const subCategoryTotalPages = Math.max(1, subCategoryPaginator?.last_page ?? 1);

  useEffect(() => {
    if (!categoryOptions.length) {
      setSelectedCategoryId("");
      return;
    }

    setSelectedCategoryId((current) => {
      if (current && categoryOptions.some((category) => String(category.id) === current)) return current;
            return "";
    });
  }, [categoryOptions]);

  useEffect(() => {
    setSubCategoryPage(1);
  }, [selectedCategoryId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoryLoading(true);
      setCategoryError("");

      try {
        const response = await fetchCategoryPage(type, categoryPage, CATEGORY_PAGE_SIZE);
        if (cancelled) return;
        setCategoryPaginator(response);
      } catch (error) {
        if (!cancelled) setCategoryError(formatError(error));
      } finally {
        if (!cancelled) setCategoryLoading(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [type, categoryPage, categoryRefreshKey]);

  useEffect(() => {
    if (!selectedCategoryId || !selectedCategory) {
      setSubCategoryPaginator(null);
      setSubCategoryError("");
      return;
    }

    let cancelled = false;

    async function loadSubCategories() {
      setSubCategoryLoading(true);
      setSubCategoryError("");

      try {
        const response = await fetchSubCategoryPage(type, Number(selectedCategoryId), subCategoryPage, SUB_CATEGORY_PAGE_SIZE);
        if (cancelled) return;
        setSubCategoryPaginator(response);
      } catch (error) {
        if (!cancelled) setSubCategoryError(formatError(error));
      } finally {
        if (!cancelled) setSubCategoryLoading(false);
      }
    }

    loadSubCategories();
    return () => {
      cancelled = true;
    };
  }, [type, selectedCategoryId, subCategoryPage, subCategoryRefreshKey]);

  useEffect(() => {
    if (categoryPaginator && categoryPage > categoryTotalPages) {
      setCategoryPage(categoryTotalPages);
    }
  }, [categoryPaginator, categoryPage, categoryTotalPages]);

  useEffect(() => {
    if (subCategoryPaginator && subCategoryPage > subCategoryTotalPages) {
      setSubCategoryPage(subCategoryTotalPages);
    }
  }, [subCategoryPaginator, subCategoryPage, subCategoryTotalPages]);

  useEffect(() => {
    if (!editingCategoryId) return;
    const category = categoryOptions.find((item) => item.id === editingCategoryId);
    if (category) setCategoryName(category.name);
  }, [categoryOptions, editingCategoryId]);

  useEffect(() => {
    if (!editingSubCategoryId) return;
    const subCategory = subCategoryItems.find((item) => item.id === editingSubCategoryId);
    if (subCategory) {
      setSubCategoryName(subCategory.name);
      setSelectedCategoryId(String(subCategory.category_id));
    }
  }, [editingSubCategoryId, subCategoryItems]);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName("");
  };

  const resetSubCategoryForm = () => {
    setEditingSubCategoryId(null);
    setSelectedCategoryId("");
    setSubCategoryName("");
  };

  const handleCategorySave = async () => {
    const isEdit = Boolean(editingCategoryId);
    await onSaveCategory({ id: editingCategoryId ?? undefined, name: categoryName.trim(), content_type: type });
    setCategoryRefreshKey((value) => value + 1);
    if (!isEdit) setCategoryPage(1);
    resetCategoryForm();
  };

  const handleSubCategorySave = async () => {
    const categoryValue = Number(selectedCategoryId);
    if (!categoryValue) return;

    const isEdit = Boolean(editingSubCategoryId);
    await onSaveSubCategory({
      id: editingSubCategoryId ?? undefined,
      category_id: categoryValue,
      name: subCategoryName.trim(),
      content_type: type,
    });
    setCategoryRefreshKey((value) => value + 1);
    setSubCategoryRefreshKey((value) => value + 1);
    if (!isEdit) setSubCategoryPage(1);
    resetSubCategoryForm();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-6xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Kelola Category dan Sub-Category {typeLabel(type)}</h2>
            <p className="text-sm text-muted-foreground">Category dan sub-category untuk konten {typeLabel(type).toLowerCase()}.</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <section className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Category</h3>
                <p className="text-xs text-muted-foreground">Kategori dipakai langsung di form konten.</p>
              </div>
              {editingCategoryId ? (
                <Button type="button" variant="ghost" onClick={resetCategoryForm} className="h-9 px-3 text-xs">
                  Batal edit
                </Button>
              ) : null}
            </div>

            <form
              className="space-y-3 rounded-2xl border border-border/70 bg-background p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await handleCategorySave();
                } catch {
                  /* handled by parent */
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="category-name">Nama category</label>
                <input
                  id="category-name"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  className={fieldClass}
                  placeholder="Contoh: Manual Teknis Pusat"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={savingCategory || categoryName.trim() === ""} className="gap-2">
                  {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingCategoryId ? "Simpan perubahan" : "Tambah category"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {categoryError ? <SectionNotice tone="error" text={categoryError} /> : null}
              {categoryLoading ? (
                <SectionSpinner label="Memuat daftar category..." />
              ) : categoryItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  Belum ada category untuk tipe ini.
                </div>
              ) : (
                categoryItems.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.sub_categories?.length ?? 0} sub-category</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setCategoryName(category.name);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                        >
                          <PencilLine className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onDeleteCategory(category.id);
                              setCategoryRefreshKey((value) => value + 1);
                              setSubCategoryRefreshKey((value) => value + 1);
                            } catch {
                              /* handled by parent */
                            }
                          }}
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

            <PaginationBar
              currentPage={categoryPaginator?.current_page ?? categoryPage}
              totalPages={categoryTotalPages}
              onPageChange={setCategoryPage}
              className="mt-2"
            />
          </section>

          <section className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Sub-category</h3>
                <p className="text-xs text-muted-foreground">Sub-category mengikuti category yang dipilih.</p>
              </div>
              {editingSubCategoryId ? (
                <Button type="button" variant="ghost" onClick={resetSubCategoryForm} className="h-9 px-3 text-xs">
                  Batal edit
                </Button>
              ) : null}
            </div>

            <form
              className="space-y-3 rounded-2xl border border-border/70 bg-background p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await handleSubCategorySave();
                } catch {
                  /* handled by parent */
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sub-category-category">Category</label>
                <select
                  id="sub-category-category"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Pilih Category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sub-category-name">Nama sub-category</label>
                <input
                  id="sub-category-name"
                  value={subCategoryName}
                  onChange={(event) => setSubCategoryName(event.target.value)}
                  className={fieldClass}
                  placeholder="Contoh: RKP"
                />
              </div>
              <div className="flex items-center justify-end">
                <Button type="submit" disabled={savingSubCategory || subCategoryName.trim() === "" || !selectedCategoryId} className="gap-2">
                  {savingSubCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingSubCategoryId ? "Simpan perubahan" : "Tambah sub-category"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {subCategoryError ? <SectionNotice tone="error" text={subCategoryError} /> : null}
              {subCategoryLoading ? (
                <SectionSpinner label="Memuat daftar sub-category..." />
              ) : !selectedCategory ? (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  Pilih category untuk melihat sub-category.
                </div>
              ) : subCategoryItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  Category ini belum punya sub-category.
                </div>
              ) : (
                subCategoryItems.map((subCategory) => (
                  <div key={subCategory.id} className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{subCategory.name}</p>
                        <p className="text-xs text-muted-foreground">Category: {selectedCategory?.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubCategoryId(subCategory.id);
                            setSubCategoryName(subCategory.name);
                            setSelectedCategoryId(String(subCategory.category_id));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                        >
                          <PencilLine className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onDeleteSubCategory(subCategory.id);
                              setCategoryRefreshKey((value) => value + 1);
                              setSubCategoryRefreshKey((value) => value + 1);
                            } catch {
                              /* handled by parent */
                            }
                          }}
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

            <PaginationBar
              currentPage={subCategoryPaginator?.current_page ?? subCategoryPage}
              totalPages={subCategoryTotalPages}
              onPageChange={setSubCategoryPage}
              className="mt-2"
            />
          </section>
        </div>
      </div>
    </div>
  );
}



