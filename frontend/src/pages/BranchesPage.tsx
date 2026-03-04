import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { Tooltip } from "../components/Tooltip";
import { IconPlus } from "../components/Icons";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";
import { ConfirmModal } from "../components/ConfirmModal";

type Branch = {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
};

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
  };
  const sortedBranches = sortByColumn(branches, sortKey, sortDir, (b, k) => {
    if (k === "code") return b.code;
    if (k === "name") return b.name;
    if (k === "city") return b.city ?? "";
    if (k === "phone") return b.phone ?? "";
    return "";
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar sucursales");
      const data = await res.json();
      setBranches(data);
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
    if (!name.trim() || !code.trim()) {
      setCreateError("Nombre y código son obligatorios.");
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/branches`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al crear sucursal");
      setShowCreate(false);
      setName("");
      setCode("");
      setAddress("");
      setCity("");
      setPhone("");
      load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setDeleting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/branches/${branchToDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar sucursal");
      }
      setBranchToDelete(null);
      load();
      showToast("Sucursal eliminada correctamente.");
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
        <p className="text-slate-500 text-sm">Locales donde vendés y tenés stock.</p>
        <Tooltip content="Cada sucursal tiene su propio inventario; podés traspasar entre ellas">
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <IconPlus />
            Nueva sucursal
          </button>
        </Tooltip>
      </div>
      <div className="table-modern">
        <table className="min-w-[320px]">
          <thead>
            <tr>
              <TableSortHeader label="Código" sortKey="code" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Nombre" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Ciudad" sortKey="city" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label="Teléfono" sortKey="phone" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <th className="w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedBranches.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No hay sucursales. Creá una para empezar.
                </td>
              </tr>
            ) : (
              sortedBranches.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.code}</td>
                  <td>{b.name}</td>
                  <td>{b.city ?? "—"}</td>
                  <td>{b.phone ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setBranchToDelete(b)}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">Nueva sucursal</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nombre *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Código (ej. SUC2) *</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} className="input-minimal" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dirección</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-minimal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Ciudad</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="input-minimal" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-minimal" />
                </div>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!branchToDelete}
        title="Eliminar sucursal"
        message={
          branchToDelete ? (
            <>
              ¿Estás seguro de eliminar la sucursal <strong>{branchToDelete.name}</strong> ({branchToDelete.code})?
              Dejará de aparecer en listados y no podrás asignar ventas o stock a esta sucursal.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteBranch}
        onCancel={() => setBranchToDelete(null)}
      />
    </div>
  );
}
