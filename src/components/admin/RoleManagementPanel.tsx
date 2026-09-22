import { useEffect, useState } from "react";
import { Loader2, PencilLine, Search, Shield, X } from "lucide-react";
import { fetchRoles, updateRole, type AdminRole } from "@/lib/admin-api";
import { showAdminError, showAdminSuccess } from "@/lib/admin-notification";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type RoleModalState = { item: AdminRole } | null;

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function RoleModal({
  item,
  saving,
  onClose,
  onSubmit,
}: {
  item: AdminRole;
  saving: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-lg font-semibold">Edit Role</h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="space-y-4 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="role-name">Nama</label>
            <input id="role-name" name="name" defaultValue={item.name} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="role-slug">Slug</label>
            <input id="role-slug" defaultValue={item.slug} className={fieldClass} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="role-description">Deskripsi</label>
            <textarea id="role-description" name="description" rows={3} defaultValue={item.description ?? ""} className={fieldClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoleManagementPanel() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<RoleModalState>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const roleList = await fetchRoles();
      setRoles(roleList);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveRole(formData: FormData) {
    if (!modal) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
      };
      await updateRole(modal.item.id, payload);
      showAdminSuccess("Role berhasil diperbarui");
      setModal(null);
      await loadData();
    } catch (err) {
      const message = normalizeError(err);
      setError(message);
      showAdminError("Gagal memperbarui role", message);
    } finally {
      setSaving(false);
    }
  }

  const filteredRoles = roles.filter((role) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return [role.name, role.slug, role.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Role</h2>
          <p className="text-sm text-muted-foreground">Role sistem dibatasi pada admin dan operator.</p>
        </div>
        <div className="relative w-full sm:w-80 lg:w-auto lg:min-w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari role..."
            className={`${fieldClass} h-11 pl-9`}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Hapus pencarian">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center px-4 py-12">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Memuat data...
            </div>
          </div>
        ) : null}
        <div className={loading ? "hidden" : "overflow-x-auto"}>
          <table className="min-w-full divide-y divide-border/70 text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Tidak ada data role.</td>
                </tr>
              ) : filteredRoles.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-4 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{item.name}</p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.slug}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.users_count ?? 0}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.description ?? "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setModal({ item })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
                        <PencilLine className="h-3.5 w-3.5" /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {modal ? <RoleModal item={modal.item} saving={saving} onClose={() => setModal(null)} onSubmit={saveRole} /> : null}
    </div>
  );
}