import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Tooltip } from "../components/Tooltip";
import { IconPlus } from "../components/Icons";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";
import { ConfirmModal } from "../components/ConfirmModal";

// ── Permission types ──────────────────────────────────────────────────────────

interface PermissionMeta {
  permission: string;
  label: string;
  defaultGranted: boolean;
  effective: boolean;
  isOverridden: boolean;
}

interface PermissionGroup {
  label: string;
  keys: string[];
}

const ROLES: { value: string; labelKey: string }[] = [
  { value: "OWNER", labelKey: "users.owner" },
  { value: "MANAGER", labelKey: "users.manager" },
  { value: "SELLER", labelKey: "users.seller" },
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
  const { t } = useTranslation();
  const { canManageUsers } = useAuth();
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

  // Permissions modal
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permMeta, setPermMeta] = useState<{ permissions: PermissionMeta[]; groups: PermissionGroup[] } | null>(null);
  const [permGrants, setPermGrants] = useState<Set<string>>(new Set());
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

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
    if (k === "isActive") return u.isActive ? t("users.active") : t("users.inactive");
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
      if (!uRes.ok) throw new Error(t("users.errorLoad"));
      if (!bRes.ok) throw new Error(t("branches.errorLoad"));
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

  if (!canManageUsers) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setCreateError(t("users.requiredFields"));
      return;
    }
    if (password.length < 6) {
      setCreateError(t("users.passwordMin"));
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
      if (!res.ok) throw new Error(data.message || t("users.createError"));
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
      if (!res.ok) throw new Error(data.message || t("users.updateError"));
      setEditUser(null);
      load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const roleLabel = (r: string) => t(ROLES.find((x) => x.value === r)?.labelKey ?? "users.role");

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
        throw new Error(data.message || t("users.deleteUserTitle"));
      }
      setUserToDelete(null);
      load();
      showToast(t("users.deletedDisabled"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openPermissions = async (u: User) => {
    if (u.role === "OWNER") return; // OWNER has all permissions, nothing to configure
    setPermUser(u);
    setPermLoading(true);
    try {
      const [permRes, metaRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/permissions/users/${u.id}`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/permissions/meta`, { headers: authHeaders() }),
      ]);
      if (!permRes.ok || !metaRes.ok) throw new Error("Error al cargar permisos");
      const permData = await permRes.json();
      const metaData = await metaRes.json();
      setPermMeta({ permissions: permData.permissions, groups: metaData.groups });
      setPermGrants(new Set(permData.permissions.filter((p: PermissionMeta) => p.effective).map((p: PermissionMeta) => p.permission)));
    } catch {
      showToast("Error al cargar permisos", "error");
      setPermUser(null);
    } finally {
      setPermLoading(false);
    }
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/permissions/users/${permUser.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ grants: Array.from(permGrants) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || "Error");
      }
      showToast("Permisos actualizados correctamente.");
      setPermUser(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPermSaving(false);
    }
  };

  const resetPermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/permissions/users/${permUser.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al resetear");
      showToast("Permisos reseteados al rol base.");
      setPermUser(null);
    } catch {
      showToast("Error al resetear permisos", "error");
    } finally {
      setPermSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">{t("users.loading")}</p>;
  if (error) return <p className="text-sm text-red-400/90">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{t("users.subtitleLong")}</p>
        <Tooltip content={t("users.tooltipCreate")}>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <IconPlus />
            {t("users.newUser")}
          </button>
        </Tooltip>
      </div>
      <div className="table-modern">
        <table className="min-w-[320px]">
          <thead>
            <tr>
              <TableSortHeader label={t("users.fullName")} sortKey="fullName" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("users.username")} sortKey="username" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("users.email")} sortKey="email" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("users.role")} sortKey="role" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("users.branch")} sortKey="branch" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("users.status")} sortKey="isActive" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <th className="w-20">{t("branches.actions")}</th>
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
                <td>{u.isActive ? t("users.active") : t("users.inactive")}</td>
                <td>
                  <span className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                    >
                      {t("branches.edit")}
                    </button>
                    {u.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => openPermissions(u)}
                        className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
                      >
                        Permisos
                      </button>
                    )}
                    {u.isActive && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        {t("branches.delete")}
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
              <h3 className="font-semibold">{t("users.createTitle")}</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.fullName")} *</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.username")} *</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-minimal" required placeholder="ej. jperez" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.email")}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-minimal" placeholder="opcional" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.passwordMinLabel")}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-minimal" required minLength={6} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.role")}</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-minimal">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.branchOptional")}</label>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-minimal">
                  <option value="">{t("users.allBranches")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-md btn-secondary px-3 py-2 text-sm">{t("branches.cancel")}</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60">
                  {submitting ? t("users.creatingUser") : t("users.createUser")}
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
              <h3 className="font-semibold">{t("users.editUser")}</h3>
              <button type="button" onClick={() => setEditUser(null)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Usuario: {editUser.username}</p>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.fullName")} *</label>
                <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.email")}</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-minimal" placeholder="opcional" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.role")}</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input-minimal">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.branchOptional")}</label>
                <select value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)} className="input-minimal">
                  <option value="">{t("users.allBranches")}</option>
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
                <label htmlFor="edit-isActive" className="text-sm text-slate-600">{t("users.userActive")}</label>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">{t("users.newPasswordLabel")}</label>
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
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">{t("branches.cancel")}</button>
                <button type="submit" disabled={editSubmitting} className="btn-primary flex-1 disabled:opacity-50">
                  {editSubmitting ? t("users.saving") : t("branches.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!userToDelete}
        title={t("users.deleteUserTitle")}
        message={
          userToDelete ? (
            t("users.deleteUserMessage", { name: userToDelete.fullName, username: userToDelete.username })
          ) : (
            ""
          )
        }
        confirmLabel={t("branches.delete")}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Permissions modal */}
      {permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white dark:bg-card dark:border-border shadow-xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">Permisos — {permUser.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  Rol base: <strong>{permUser.role}</strong>. Los permisos marcados difieren del rol se guardan como overrides.
                </p>
              </div>
              <button type="button" onClick={() => setPermUser(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>

            {permLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando permisos...</p>
            ) : permMeta ? (
              <>
                <div className="space-y-4">
                  {permMeta.groups.map((group) => {
                    const groupPerms = permMeta.permissions.filter((p) => group.keys.includes(p.permission));
                    if (groupPerms.length === 0) return null;
                    return (
                      <div key={group.label} className="border border-border rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-muted/40 text-sm font-medium">{group.label}</div>
                        <div className="divide-y divide-border">
                          {groupPerms.map((perm) => (
                            <label key={perm.permission} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/20">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-primary"
                                checked={permGrants.has(perm.permission)}
                                onChange={(e) => {
                                  const next = new Set(permGrants);
                                  if (e.target.checked) next.add(perm.permission);
                                  else next.delete(perm.permission);
                                  setPermGrants(next);
                                }}
                              />
                              <span className="text-sm flex-1">{perm.label}</span>
                              {perm.isOverridden && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                  override
                                </span>
                              )}
                              {!perm.isOverridden && perm.defaultGranted && (
                                <span className="text-xs text-muted-foreground">rol</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={resetPermissions}
                    disabled={permSaving}
                    className="btn-secondary text-sm"
                  >
                    Resetear al rol
                  </button>
                  <div className="flex-1" />
                  <button type="button" onClick={() => setPermUser(null)} className="btn-secondary text-sm">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={savePermissions}
                    disabled={permSaving}
                    className="btn-primary text-sm"
                  >
                    {permSaving ? "Guardando..." : "Guardar permisos"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
