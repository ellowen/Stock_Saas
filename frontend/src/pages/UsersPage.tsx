import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { Tooltip } from "../components/Tooltip";
import { IconPlus } from "../components/Icons";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";
import { ConfirmModal } from "../components/ConfirmModal";

const ROLES: { value: string; label: string }[] = [
  { value: "OWNER", label: "Dueño" },
  { value: "MANAGER", label: "Encargado" },
  { value: "SELLER", label: "Vendedor" },
];

type User = {
  id: number;
  username: string;
  email?: string | null;
  fullName: string;
  role: string;
  branchId: number | null;
  isActive: boolean;
  branch?: { id: number; name: string; code: string } | null;
};

type Branch = { id: number; name: string; code: string };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("SELLER");
  const [branchId, setBranchId] = useState<string>("");

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("SELLER");
  const [editBranchId, setEditBranchId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
  };
  const sortedUsers = sortByColumn(users, sortKey, sortDir, (u, k) => {
    if (k === "fullName") return u.fullName;
    if (k === "username") return u.username;
    if (k === "email") return u.email ?? "";
    if (k === "role") return u.role;
    if (k === "branch") return u.branch ? `${u.branch.name} ${u.branch.code}` : "";
    if (k === "isActive") return u.isActive ? "Activo" : "Inactivo";
    return "";
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, bRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/users`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() }),
      ]);
      if (!uRes.ok) throw new Error("Error al cargar usuarios");
      if (!bRes.ok) throw new Error("Error al cargar sucursales");
      const uData = await uRes.json();
      const bData = await bRes.json();
      setUsers(uData);
      setBranches(bData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setCreateError("Usuario, contraseña y nombre son obligatorios.");
      return;
    }
    if (password.length < 6) {
      setCreateError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          fullName: fullName.trim(),
          role,
          branchId: branchId ? parseInt(branchId, 10) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al crear usuario");
      setShowCreate(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("SELLER");
      setBranchId("");
      load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditFullName(u.fullName);
    setEditEmail(u.email ?? "");
    setEditRole(u.role);
    setEditBranchId(u.branchId != null ? String(u.branchId) : "");
    setEditIsActive(u.isActive);
    setEditPassword("");
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = {
        fullName: editFullName.trim(),
        email: editEmail.trim() || null,
        role: editRole,
        branchId: editBranchId ? parseInt(editBranchId, 10) : null,
        isActive: editIsActive,
      };
      if (editPassword.trim().length >= 6) body.password = editPassword;
      const res = await authFetch(`${API_BASE_URL}/users/${editUser.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al actualizar usuario");
      setEditUser(null);
      load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar usuario");
      }
      setUserToDelete(null);
      load();
      showToast("Usuario eliminado (desactivado) correctamente.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (error) return <p className="text-sm text-red-400/90">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Quién puede usar el sistema y con qué permisos.</p>
        <Tooltip content="Dueño y Encargado pueden gestionar sucursales y usuarios; Vendedor solo ventas e inventario">
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <IconPlus />
            Nuevo usuario
          </button>
        </Tooltip>
      </div>
      <div className="table-modern">
        <table className="min-w-[320px]">
          <thead>
            <tr>
              <TableSortHeader label="Nombre" sortKey="fullName" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Usuario" sortKey="username" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Email" sortKey="email" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Rol" sortKey="role" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Sucursal" sortKey="branch" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Estado" sortKey="isActive" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <th className="w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{u.email ?? "—"}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{u.branch ? `${u.branch.name} (${u.branch.code})` : "—"}</td>
                <td>{u.isActive ? "Activo" : "Inactivo"}</td>
                <td>
                  <span className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                    >
                      Editar
                    </button>
                    {u.isActive && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Eliminar
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Nuevo usuario</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nombre completo *</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Usuario (para iniciar sesión) *</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-minimal" required placeholder="ej. jperez" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Email (opcional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-minimal" placeholder="opcional" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Contraseña (mín. 6) *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-minimal" required minLength={6} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-minimal">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Sucursal (opcional)</label>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-minimal">
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-md btn-secondary px-3 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60">
                  {submitting ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Editar usuario</h3>
              <button type="button" onClick={() => setEditUser(null)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Usuario: {editUser.username}</p>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nombre completo *</label>
                <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Email (opcional)</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-minimal" placeholder="opcional" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Rol</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input-minimal">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Sucursal (opcional)</label>
                <select value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)} className="input-minimal">
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="edit-isActive" className="text-sm text-slate-600">Usuario activo</label>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nueva contraseña (dejar en blanco para no cambiar)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="input-minimal"
                  placeholder="Mín. 6 caracteres"
                  minLength={6}
                />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={editSubmitting} className="btn-primary flex-1 disabled:opacity-50">
                  {editSubmitting ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!userToDelete}
        title="Eliminar usuario"
        message={
          userToDelete ? (
            <>
              ¿Estás seguro de eliminar a <strong>{userToDelete.fullName}</strong> ({userToDelete.username})?
              El usuario quedará desactivado y no podrá iniciar sesión.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
