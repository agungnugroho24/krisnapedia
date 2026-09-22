import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Plus, Search, Shield, Trash2, X } from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchRoles,
  updateAdminUser,
  type AdminRole,
  type AdminUser,
  type LaravelPaginator,
} from "@/lib/admin-api";
import { PaginationBar } from "@/components/site/PaginationBar";
import { confirmAdminDelete, showAdminError, showAdminSuccess } from "@/lib/admin-notification";

const PAGE_SIZE = 10;
const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type Query = {
  page: number;
  search: string;
};

type UserModalState =
  | { mode: "create"; item?: undefined }
  | { mode: "edit"; item: AdminUser };

function createEmptyPaginator<T>(): LaravelPaginator<T> {
  return { data: [], current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function RoleBadge({ role }: { role: string }) {
  const tone = role === "admin" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{role}</span>;
}

function UserModal({
  item,
  roles,
  saving,
  onClose,
  onSubmit,
}: {
  item?: AdminUser;
  roles: AdminRole[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [email, setEmail] = useState(item?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roleId, setRoleId] = useState(String(item?.role_id ?? item?.role_record?.id ?? roles[0]?.id ?? ""));

  useEffect(() => {
    setName(item?.name ?? "");
    setEmail(item?.email ?? "");
    setPassword("");
    setPasswordConfirmation("");
    setRoleId(String(item?.role_id ?? item?.role_record?.id ?? roles[0]?.id ?? ""));
  }, [item, roles]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-2xl rounded-3xl border border-border/70 bg-background shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-lg font-semibold">{item ? "Edit User" : "Tambah User"}</h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await onSubmit(data);
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="user-name">Nama</label>
            <input id="user-name" name="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="user-email">Email</label>
            <input id="user-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="user-role">Role</label>
            <select id="user-role" name="role_id" value={roleId} onChange={(event) => setRoleId(event.target.value)} className={fieldClass}>
              {roles.map((role) => (
                <option key={role.id} value={String(role.id)}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="user-password">Password {item ? "(opsional)" : ""}</label>
            <input id="user-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="user-password-confirmation">Konfirmasi password</label>
            <input id="user-password-confirmation" name="password_confirmation" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className={fieldClass} autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-2 pt-2 md:col-span-2">
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

export function UserManagementPanel() {
  const [users, setUsers] = useState<LaravelPaginator<AdminUser>>(createEmptyPaginator<AdminUser>());
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [query, setQuery] = useState<Query>({ page: 1, search: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<UserModalState | null>(null);

  const roleOptions = useMemo(() => roles.length > 0 ? roles : [], [roles]);

  async function loadData(nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const [pageData, roleList] = await Promise.all([
        fetchAdminUsers(nextQuery.page, PAGE_SIZE, nextQuery.search),
        fetchRoles(),
      ]);
      setUsers(pageData);
      setRoles(roleList);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.search]);

  async function saveUser(formData: FormData) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        role_id: Number(String(formData.get("role_id") ?? "0")),
        password: String(formData.get("password") ?? ""),
        password_confirmation: String(formData.get("password_confirmation") ?? ""),
      };

      if (modal?.mode === "create") {
        await createAdminUser(payload);
        showAdminSuccess("User berhasil ditambahkan");
      } else if (modal?.item) {
        const updatePayload: Record<string, unknown> = {
          name: payload.name,
          email: payload.email,
          role_id: payload.role_id,
        };
        if (payload.password) {
          updatePayload.password = payload.password;
          updatePayload.password_confirmation = payload.password_confirmation;
        }
        await updateAdminUser(modal.item.id, updatePayload);
        showAdminSuccess("User berhasil diperbarui");
      }
      setModal(null);
      await loadData(query);
    } catch (err) {
      setError(normalizeError(err));
      showAdminError("Gagal menyimpan user", normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(item: AdminUser) {
    if (!(await confirmAdminDelete("Hapus user ini?", "Token login user akan ikut dihapus."))) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await deleteAdminUser(item.id);
      showAdminSuccess("User berhasil dihapus");
      await loadData(query);
    } catch (err) {
      setError(normalizeError(err));
      showAdminError("Gagal menghapus user", normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, users.last_page);
  const displayPage = users.current_page || query.page;
  const showingFrom = users.total === 0 ? 0 : (displayPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(displayPage * PAGE_SIZE, users.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">User</h2>
          <p className="text-sm text-muted-foreground">Kelola admin dan operator.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query.search}
              onChange={(event) => setQuery({ page: 1, search: event.target.value })}
              placeholder="Cari user..."
              className={`${fieldClass} h-11 pl-9`}
            />
            {query.search ? (
              <button type="button" onClick={() => setQuery({ page: 1, search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Hapus pencarian">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button type="button" onClick={() => setModal({ mode: "create" })} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Tambah
          </button>
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
          <table className="min-w-full divide-y divide-border/70 text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {users.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">{query.search ? "Tidak ada hasil pencarian." : "Belum ada user."}</td>
                </tr>
              ) : users.data.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-4 text-muted-foreground">{(displayPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{item.name}</p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.email}</td>
                  <td className="px-4 py-4 text-muted-foreground"><RoleBadge role={item.role_record?.name ?? item.role} /></td>
                  <td className="px-4 py-4 text-muted-foreground">{item.updated_at ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.updated_at)) : "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setModal({ mode: "edit", item })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
                        <PencilLine className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button type="button" onClick={() => removeUser(item)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5">
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={loading ? "hidden" : "flex flex-col gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between"}>
          <p>Menampilkan {showingFrom} sampai {showingTo} dari {users.total} data</p>
          <PaginationBar currentPage={query.page} totalPages={totalPages} onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))} className="mt-0" />
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {modal ? (
        <UserModal
          item={modal.mode === "edit" ? modal.item : undefined}
          roles={roleOptions}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={saveUser}
        />
      ) : null}
    </div>
  );
}