import { useEffect, useState, useCallback } from "react";
import { authHeaders } from "../../lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  before: object | null;
  after: object | null;
  ip: string | null;
  createdAt: string;
  user: { id: number; username: string; fullName: string } | null;
}

interface AuditListResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  LOGIN:  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  EXPORT: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const ENTITIES = ["User", "Product", "Sale", "Transfer", "Employee", "Payroll", "Document"];
const ACTIONS  = ["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filterEntity) params.set("entity", filterEntity);
      if (filterAction) params.set("action", filterAction);
      if (filterFrom)   params.set("from", filterFrom);
      if (filterTo)     params.set("to", filterTo);

      const res = await fetch(`/audit-logs?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar auditoría");
      const data: AuditListResult = await res.json();
      setLogs(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction, filterFrom, filterTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Auditoría</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Registro de acciones realizadas por los usuarios de la empresa.
          </p>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total} registros
        </span>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap gap-3 items-end bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
      >
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Entidad</label>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Acción</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Desde</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Hasta</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={() => { setFilterEntity(""); setFilterAction(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
          className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Limpiar
        </button>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">
            Cargando…
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-sm">Sin registros de auditoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white leading-tight">{log.user.fullName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">@{log.user.username}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{log.entity}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{log.entityId ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">{log.ip ?? "—"}</td>
                      <td className="px-4 py-3">
                        {(log.before || log.after) && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 select-none">
                            {expandedId === log.id ? "▲ ocultar" : "▼ ver cambios"}
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (log.before || log.after) && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50 dark:bg-gray-700/20">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {log.before && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">ANTES</p>
                                <pre className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-300 rounded-lg p-2 overflow-auto max-h-32">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">DESPUÉS</p>
                                <pre className="text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-lg p-2 overflow-auto max-h-32">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
