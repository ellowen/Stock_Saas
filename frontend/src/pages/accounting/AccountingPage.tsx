import { useEffect, useState, useCallback } from "react";
import { authHeaders } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { Badge } from "../../components/ui/Badge";
import { IconPlus, IconTrash } from "../../components/Icons";

// ─── Shared Types ────────────────────────────────────────────────────────────

interface Account {
  id: number;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  subtype: string | null;
  isParent: boolean;
  isSystem: boolean;
  active: boolean;
  parentId: number | null;
  children?: Account[];
}

interface JournalLine {
  id?: number;
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
  account?: { code: string; name: string; type?: string };
}

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference: string | null;
  sourceType: string | null;
  isAutomatic: boolean;
  status: "DRAFT" | "POSTED";
  createdAt: string;
  user: { fullName: string };
  lines: JournalLine[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio Neto",
  REVENUE: "Ingresos",
  EXPENSE: "Egresos",
};

const TYPE_VARIANT: Record<string, "primary" | "success" | "info" | "warning" | "danger" | "neutral"> = {
  ASSET: "primary",
  LIABILITY: "danger",
  EQUITY: "success",
  REVENUE: "info",
  EXPENSE: "warning",
};

const SOURCE_LABELS: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Compra",
  PAYROLL: "Sueldo",
  MANUAL: "Manual",
  EXPENSE: "Gasto",
};

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Plan de Cuentas ─────────────────────────────────────────────────────────

function AccountModal({
  open,
  onClose,
  editing,
  accounts,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Account | null;
  accounts: Account[];
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "ASSET" as typeof ACCOUNT_TYPES[number],
    subtype: "",
    parentId: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        type: editing.type,
        subtype: editing.subtype ?? "",
        parentId: editing.parentId ? String(editing.parentId) : "",
        active: editing.active,
      });
    } else {
      setForm({ code: "", name: "", type: "ASSET", subtype: "", parentId: "", active: true });
    }
  }, [editing, open]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = editing
        ? { name: form.name, subtype: form.subtype || undefined, active: form.active }
        : {
            code: form.code,
            name: form.name,
            type: form.type,
            subtype: form.subtype || undefined,
            parentId: form.parentId ? Number(form.parentId) : undefined,
          };

      const res = await fetch(
        editing ? `/api/accounts-chart/${editing.id}` : "/api/accounts-chart",
        {
          method: editing ? "PUT" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error((await res.json()).message);
      showToast(editing ? "Cuenta actualizada" : "Cuenta creada", "success");
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = accounts.filter((a) => a.isParent);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar cuenta" : "Nueva cuenta"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <>
            <FormField label="Código">
              <input
                className="input-minimal"
                placeholder="Ej: 1.1.08"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Tipo">
              <select className="input-minimal" value={form.type} onChange={(e) => set("type", e.target.value)}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cuenta padre (opcional)">
              <select className="input-minimal" value={form.parentId} onChange={(e) => set("parentId", e.target.value)}>
                <option value="">— Sin padre —</option>
                {parentOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <FormField label="Nombre">
          <input
            className="input-minimal"
            placeholder="Nombre de la cuenta"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </FormField>

        <FormField label="Subtipo / Rubro (opcional)">
          <input
            className="input-minimal"
            placeholder="Ej: Disponibilidades"
            value={form.subtype}
            onChange={(e) => set("subtype", e.target.value)}
          />
        </FormField>

        {editing && !editing.isSystem && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active-check"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="active-check" className="text-sm">Activa</label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{editing ? "Guardar" : "Crear cuenta"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AccountRow({
  account,
  depth,
  onEdit,
}: {
  account: Account;
  depth: number;
  onEdit: (a: Account) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <>
      <tr className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${!account.active ? "opacity-40" : ""}`}>
        <td className="py-2 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => setExpanded((e) => !e)} className="w-4 h-4 text-muted-foreground flex-shrink-0 hover:text-foreground">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d={expanded ? "M4 6l4 4 4-4" : "M6 4l4 4-4 4"} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <span className={`font-mono text-xs text-muted-foreground ${depth === 0 ? "font-bold" : ""}`}>{account.code}</span>
            <span className={`text-sm ${account.isParent ? "font-semibold" : ""} ${depth === 0 ? "text-base font-bold" : ""}`}>{account.name}</span>
            {account.isSystem && <span className="text-xs text-muted-foreground">(sistema)</span>}
          </div>
        </td>
        <td className="py-2 px-4 text-sm text-muted-foreground">{account.subtype ?? "—"}</td>
        <td className="py-2 px-4">
          <Badge variant={TYPE_VARIANT[account.type]}>{TYPE_LABELS[account.type]}</Badge>
        </td>
        <td className="py-2 px-4 text-right">
          {!account.isParent && (
            <button onClick={() => onEdit(account)} className="text-xs text-primary hover:underline">Editar</button>
          )}
        </td>
      </tr>
      {expanded && hasChildren && account.children!.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} onEdit={onEdit} />
      ))}
    </>
  );
}

function PlanDeContasTab({
  tree,
  allAccounts,
  loading,
  onRefresh,
}: {
  tree: Account[];
  allAccounts: Account[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/accounts-chart/seed", { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast("Plan de cuentas base generado", "success");
      onRefresh();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSeeding(false);
    }
  };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (a: Account) => { setEditing(a); setModalOpen(true); };

  if (loading) return <div className="text-center py-16 text-muted-foreground text-sm">Cargando plan de cuentas…</div>;

  if (tree.length === 0) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-muted-foreground">No hay cuentas contables configuradas.</p>
      <Button variant="secondary" onClick={handleSeed} loading={seeding}>Generar plan de cuentas FACPCE base</Button>
    </div>
  );

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={openCreate}><IconPlus />Nueva cuenta</Button>
      </div>
      <div className="rounded-card border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="py-3 px-4 font-medium text-muted-foreground">Código / Nombre</th>
              <th className="py-3 px-4 font-medium text-muted-foreground">Rubro</th>
              <th className="py-3 px-4 font-medium text-muted-foreground">Tipo</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {tree.map((root) => (
              <AccountRow key={root.id} account={root} depth={0} onEdit={openEdit} />
            ))}
          </tbody>
        </table>
      </div>
      <AccountModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} accounts={allAccounts} onSaved={onRefresh} />
    </>
  );
}

// ─── Libro Diario ─────────────────────────────────────────────────────────────

// Line editor row inside "Nuevo asiento" modal
function JournalLineRow({
  line,
  index,
  accounts,
  onChange,
  onRemove,
  canRemove,
}: {
  line: { accountId: string; debit: string; credit: string; description: string };
  index: number;
  accounts: Account[];
  onChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const leafAccounts = accounts.filter((a) => !a.isParent && a.active);

  return (
    <tr className="border-b border-border/30">
      <td className="py-1.5 pr-2">
        <select
          className="input-minimal text-xs py-1"
          value={line.accountId}
          onChange={(e) => onChange(index, "accountId", e.target.value)}
          required
        >
          <option value="">— Seleccionar cuenta —</option>
          {leafAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 px-1">
        <input
          type="number"
          min="0"
          step="0.01"
          className="input-minimal text-xs py-1 text-right w-28"
          placeholder="0.00"
          value={line.debit}
          onChange={(e) => onChange(index, "debit", e.target.value)}
        />
      </td>
      <td className="py-1.5 px-1">
        <input
          type="number"
          min="0"
          step="0.01"
          className="input-minimal text-xs py-1 text-right w-28"
          placeholder="0.00"
          value={line.credit}
          onChange={(e) => onChange(index, "credit", e.target.value)}
        />
      </td>
      <td className="py-1.5 pl-1">
        <input
          type="text"
          className="input-minimal text-xs py-1"
          placeholder="Glosa (opcional)"
          value={line.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
        />
      </td>
      <td className="py-1.5 pl-2">
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="text-destructive hover:opacity-70 p-1">
            <IconTrash />
          </button>
        )}
      </td>
    </tr>
  );
}

function JournalModal({
  open,
  onClose,
  accounts,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const emptyLine = () => ({ accountId: "", debit: "", credit: "", description: "" });
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", reference: "" });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ date: new Date().toISOString().slice(0, 10), description: "", reference: "" });
      setLines([emptyLine(), emptyLine()]);
    }
  }, [open]);

  const setFormField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const changeLine = (i: number, field: string, value: string) => {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const sumDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const sumCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(sumDebit - sumCredit) < 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanced) {
      showToast(`El asiento no balancea: Debe ${fmt(sumDebit)} / Haber ${fmt(sumCredit)}`, "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        description: form.description,
        reference: form.reference || undefined,
        sourceType: "MANUAL",
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: Number(l.accountId),
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            description: l.description || undefined,
          })),
      };
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast("Asiento creado", "success");
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo asiento contable" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Fecha">
            <input type="date" className="input-minimal" value={form.date} onChange={(e) => setFormField("date", e.target.value)} required />
          </FormField>
          <FormField label="Comprobante / referencia">
            <input className="input-minimal" placeholder="Ej: FC-0001-00000123" value={form.reference} onChange={(e) => setFormField("reference", e.target.value)} />
          </FormField>
          <div /> {/* spacer */}
        </div>

        <FormField label="Descripción / concepto">
          <input className="input-minimal" placeholder="Descripción del asiento" value={form.description} onChange={(e) => setFormField("description", e.target.value)} required />
        </FormField>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Líneas del asiento (partida doble)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1 pr-2">Cuenta</th>
                  <th className="pb-1 px-1 text-right w-28">Debe</th>
                  <th className="pb-1 px-1 text-right w-28">Haber</th>
                  <th className="pb-1 pl-1">Glosa</th>
                  <th className="pb-1 pl-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <JournalLineRow
                    key={i}
                    line={line}
                    index={i}
                    accounts={accounts}
                    onChange={changeLine}
                    onRemove={removeLine}
                    canRemove={lines.length > 2}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold">
                  <td className="pt-2 pr-2 text-muted-foreground">Totales</td>
                  <td className={`pt-2 px-1 text-right ${!balanced && sumDebit > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(sumDebit)}</td>
                  <td className={`pt-2 px-1 text-right ${!balanced && sumCredit > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(sumCredit)}</td>
                  <td colSpan={2} className="pt-2 pl-1">
                    {balanced && sumDebit > 0
                      ? <span className="text-success text-xs">✓ Balanceado</span>
                      : sumDebit > 0 || sumCredit > 0
                        ? <span className="text-destructive text-xs">Diferencia: {fmt(Math.abs(sumDebit - sumCredit))}</span>
                        : null
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" onClick={addLine} className="mt-2 text-xs text-primary hover:underline">+ Agregar línea</button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={!balanced || sumDebit === 0}>Guardar borrador</Button>
        </div>
      </form>
    </Modal>
  );
}

function JournalDetailModal({
  entry,
  onClose,
  onPost,
  onVoid,
  onDelete,
}: {
  entry: JournalEntry | null;
  onClose: () => void;
  onPost: (id: number) => Promise<void>;
  onVoid: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  if (!entry) return null;
  const sumDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
  const sumCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <Modal open={!!entry} onClose={onClose} title={`Asiento #${entry.id}`} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="text-muted-foreground">Fecha: </span>{new Date(entry.date).toLocaleDateString("es-AR")}</div>
          <div><span className="text-muted-foreground">Estado: </span>
            <Badge variant={entry.status === "POSTED" ? "success" : "neutral"}>{entry.status === "POSTED" ? "Confirmado" : "Borrador"}</Badge>
          </div>
          <div className="col-span-2"><span className="text-muted-foreground">Descripción: </span>{entry.description}</div>
          {entry.reference && <div><span className="text-muted-foreground">Referencia: </span>{entry.reference}</div>}
          {entry.sourceType && <div><span className="text-muted-foreground">Origen: </span>{SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}</div>}
          <div><span className="text-muted-foreground">Creado por: </span>{entry.user.fullName}</div>
        </div>

        <table className="w-full text-sm border border-border rounded-card overflow-hidden">
          <thead>
            <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="py-2 px-3">Cuenta</th>
              <th className="py-2 px-3 text-right">Debe</th>
              <th className="py-2 px-3 text-right">Haber</th>
              <th className="py-2 px-3">Glosa</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((l, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="py-1.5 px-3 font-mono text-xs">{l.account?.code} – {l.account?.name}</td>
                <td className="py-1.5 px-3 text-right">{Number(l.debit) > 0 ? fmt(Number(l.debit)) : "—"}</td>
                <td className="py-1.5 px-3 text-right">{Number(l.credit) > 0 ? fmt(Number(l.credit)) : "—"}</td>
                <td className="py-1.5 px-3 text-muted-foreground text-xs">{l.description ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20 font-semibold text-xs">
              <td className="py-2 px-3">TOTALES</td>
              <td className="py-2 px-3 text-right">{fmt(sumDebit)}</td>
              <td className="py-2 px-3 text-right">{fmt(sumCredit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-between gap-2 pt-1">
          <div className="flex gap-2">
            {entry.status === "DRAFT" && (
              <>
                <Button variant="secondary" onClick={() => onPost(entry.id)}>Confirmar</Button>
                <Button variant="ghost" onClick={() => onDelete(entry.id)} className="text-destructive">Eliminar</Button>
              </>
            )}
            {entry.status === "POSTED" && !entry.isAutomatic && (
              <Button variant="ghost" onClick={() => onVoid(entry.id)} className="text-destructive">Anular (contra-asiento)</Button>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

function LibroDiarioTab({ accounts }: { accounts: Account[] }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", status: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<JournalEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);
      const res = await fetch(`/api/journal?${params}`, { headers: authHeaders() });
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async (id: number) => {
    try {
      const res = await fetch(`/api/journal/${id}/post`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast("Asiento confirmado", "success");
      setDetail(null);
      load();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleVoid = async (id: number) => {
    if (!confirm("¿Crear contra-asiento de anulación? El asiento original quedará vigente.")) return;
    try {
      const res = await fetch(`/api/journal/${id}/void`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast("Contra-asiento creado", "success");
      setDetail(null);
      load();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este borrador?")) return;
    try {
      const res = await fetch(`/api/journal/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast("Asiento eliminado", "success");
      setDetail(null);
      load();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end justify-between">
        <div className="flex gap-2 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Desde</p>
            <input type="date" className="input-minimal text-sm py-1.5" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Hasta</p>
            <input type="date" className="input-minimal text-sm py-1.5" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estado</p>
            <select className="input-minimal text-sm py-1.5" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="POSTED">Confirmado</option>
            </select>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}><IconPlus />Nuevo asiento</Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Cargando asientos…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay asientos para el período seleccionado.
        </div>
      ) : (
        <div className="rounded-card border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground w-10">#</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Descripción</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Referencia</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Origen</th>
                <th className="py-3 px-4 font-medium text-muted-foreground text-right">Total Debe</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const totalDebit = e.lines.reduce((s, l) => s + Number(l.debit), 0);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setDetail(e)}
                  >
                    <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs">{e.id}</td>
                    <td className="py-2.5 px-4">{new Date(e.date).toLocaleDateString("es-AR")}</td>
                    <td className="py-2.5 px-4 max-w-xs truncate">{e.description}</td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">{e.reference ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      {e.sourceType ? (
                        <Badge variant={e.isAutomatic ? "info" : "neutral"}>{SOURCE_LABELS[e.sourceType] ?? e.sourceType}</Badge>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(totalDebit)}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant={e.status === "POSTED" ? "success" : "warning"}>
                        {e.status === "POSTED" ? "Confirmado" : "Borrador"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <JournalModal open={modalOpen} onClose={() => setModalOpen(false)} accounts={accounts} onSaved={load} />
      <JournalDetailModal entry={detail} onClose={() => setDetail(null)} onPost={handlePost} onVoid={handleVoid} onDelete={handleDelete} />
    </>
  );
}

// ─── Libro IVA ────────────────────────────────────────────────────────────────

interface IVAVentasRow {
  id: number;
  date: string;
  type: string;
  number: number;
  customerName: string;
  customerCuit: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  ivaByRate: Record<string, number>;
}

interface IVAVentasTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  byRate: Record<string, number>;
}

interface IVAComprasRow {
  id: number;
  date: string;
  number: number;
  supplierName: string;
  supplierCuit: string | null;
  total: number;
}

function LibroIVATab() {
  const [subTab, setSubTab] = useState<"ventas" | "compras">("ventas");
  const [filters, setFilters] = useState({ from: "", to: "" });

  // Ventas state
  const [ventasRows, setVentasRows] = useState<IVAVentasRow[]>([]);
  const [ventasTotals, setVentasTotals] = useState<IVAVentasTotals | null>(null);
  const [loadingV, setLoadingV] = useState(false);

  // Compras state
  const [comprasRows, setComprasRows] = useState<IVAComprasRow[]>([]);
  const [loadingC, setLoadingC] = useState(false);

  // IVA Balance state
  const [ivaBalance, setIvaBalance] = useState<{ ivaDF: number; ivaCF: number; saldo: number; hasAccountingData: boolean } | null>(null);

  const buildParams = () => {
    const p = new URLSearchParams();
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    return p;
  };

  const loadVentas = useCallback(async () => {
    setLoadingV(true);
    try {
      const res = await fetch(`/api/iva-book/ventas?${buildParams()}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVentasRows(data.rows);
        setVentasTotals(data.totals);
      }
    } finally {
      setLoadingV(false);
    }
  }, [filters]);

  const loadCompras = useCallback(async () => {
    setLoadingC(true);
    try {
      const res = await fetch(`/api/iva-book/compras?${buildParams()}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setComprasRows(data.rows);
      }
    } finally {
      setLoadingC(false);
    }
  }, [filters]);

  const loadBalance = useCallback(async () => {
    const p = buildParams();
    try {
      const res = await fetch(`/api/iva-book/balance?${p}`, { headers: authHeaders() });
      if (res.ok) setIvaBalance(await res.json());
    } catch { /* silent */ }
  }, [filters]);

  useEffect(() => { loadVentas(); }, [loadVentas]);
  useEffect(() => { loadCompras(); }, [loadCompras]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const exportCSV = (type: "ventas" | "compras") => {
    const params = buildParams();
    params.set("export", "csv");
    const url = `/api/iva-book/${type}?${params}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  };

  // All IVA rates present across ventas rows
  const allRates = Array.from(
    new Set(ventasRows.flatMap((r) => Object.keys(r.ivaByRate)))
  ).sort();

  const totalCompras = comprasRows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      {/* Date filter */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Desde</p>
          <input type="date" className="input-minimal text-sm py-1.5" value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Hasta</p>
          <input type="date" className="input-minimal text-sm py-1.5" value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
      </div>

      {/* IVA Balance summary */}
      {ivaBalance && ivaBalance.hasAccountingData && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">IVA Debito Fiscal</p>
            <p className="text-lg font-semibold mt-1 text-danger">{fmt(ivaBalance.ivaDF)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Generado por ventas</p>
          </div>
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">IVA Credito Fiscal</p>
            <p className="text-lg font-semibold mt-1 text-success">{fmt(ivaBalance.ivaCF)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Generado por compras</p>
          </div>
          <div className={`rounded-card border p-4 ${ivaBalance.saldo >= 0 ? "border-danger/40 bg-danger/5" : "border-success/40 bg-success/5"}`}>
            <p className="text-xs text-muted-foreground">Saldo IVA del Periodo</p>
            <p className={`text-lg font-bold mt-1 ${ivaBalance.saldo >= 0 ? "text-danger" : "text-success"}`}>
              {ivaBalance.saldo >= 0 ? "A pagar" : "A favor"}: {fmt(Math.abs(ivaBalance.saldo))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">DF - CF</p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-border mb-4">
        {(["ventas", "compras"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={[
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              subTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t === "ventas" ? "IVA Ventas" : "IVA Compras"}
          </button>
        ))}
      </div>

      {/* ── IVA Ventas ── */}
      {subTab === "ventas" && (
        <>
          {ventasTotals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-card border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Neto Gravado</p>
                <p className="text-lg font-semibold mt-1">{fmt(ventasTotals.subtotal)}</p>
              </div>
              {Object.entries(ventasTotals.byRate).sort().map(([rate, amount]) => (
                <div key={rate} className="rounded-card border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">IVA {rate}%</p>
                  <p className="text-lg font-semibold mt-1">{fmt(amount)}</p>
                </div>
              ))}
              <div className="rounded-card border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">Total IVA</p>
                <p className="text-lg font-semibold mt-1 text-primary">{fmt(ventasTotals.taxTotal)}</p>
              </div>
              <div className="rounded-card border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Facturado</p>
                <p className="text-lg font-semibold mt-1">{fmt(ventasTotals.total)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end mb-2">
            <Button variant="secondary" onClick={() => exportCSV("ventas")}>Exportar CSV</Button>
          </div>

          {loadingV ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Cargando…</div>
          ) : ventasRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay facturas/NC emitidas en el período.
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="py-3 px-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="py-3 px-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="py-3 px-3 font-medium text-muted-foreground">N°</th>
                    <th className="py-3 px-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="py-3 px-3 font-medium text-muted-foreground">CUIT</th>
                    <th className="py-3 px-3 font-medium text-muted-foreground text-right">Neto</th>
                    {allRates.map((r) => (
                      <th key={r} className="py-3 px-3 font-medium text-muted-foreground text-right">IVA {r}%</th>
                    ))}
                    <th className="py-3 px-3 font-medium text-muted-foreground text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRows.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2 px-3">{new Date(r.date).toLocaleDateString("es-AR")}</td>
                      <td className="py-2 px-3">
                        <Badge variant={r.type === "CREDIT_NOTE" ? "warning" : "info"}>
                          {r.type === "CREDIT_NOTE" ? "NC" : "FC"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{String(r.number).padStart(8, "0")}</td>
                      <td className="py-2 px-3">{r.customerName}</td>
                      <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{r.customerCuit ?? "—"}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(r.subtotal)}</td>
                      {allRates.map((rate) => (
                        <td key={rate} className="py-2 px-3 text-right font-mono">
                          {r.ivaByRate[rate] ? fmt(r.ivaByRate[rate]) : "—"}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-mono font-medium">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {ventasTotals && (
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                      <td colSpan={5} className="py-2 px-3 text-right">TOTALES</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(ventasTotals.subtotal)}</td>
                      {allRates.map((rate) => (
                        <td key={rate} className="py-2 px-3 text-right font-mono">
                          {ventasTotals.byRate[rate] ? fmt(ventasTotals.byRate[rate]) : "—"}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-mono">{fmt(ventasTotals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}

      {/* ── IVA Compras ── */}
      {subTab === "compras" && (
        <>
          {comprasRows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-card border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Compras</p>
                <p className="text-lg font-semibold mt-1">{fmt(totalCompras)}</p>
              </div>
              <div className="rounded-card border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">IVA estimado 21%</p>
                <p className="text-lg font-semibold mt-1">{fmt(totalCompras / 1.21 * 0.21)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-muted-foreground">Órdenes de compra recibidas</p>
            <Button variant="secondary" onClick={() => exportCSV("compras")}>Exportar CSV</Button>
          </div>

          {loadingC ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Cargando…</div>
          ) : comprasRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay compras recibidas en el período.
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">N° OC</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Proveedor</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">CUIT</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasRows.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2.5 px-4">{new Date(r.date).toLocaleDateString("es-AR")}</td>
                      <td className="py-2.5 px-4 font-mono text-xs">{String(r.number).padStart(6, "0")}</td>
                      <td className="py-2.5 px-4">{r.supplierName}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{r.supplierCuit ?? "—"}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                    <td colSpan={4} className="py-2 px-4 text-right">TOTAL</td>
                    <td className="py-2 px-4 text-right font-mono">{fmt(totalCompras)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Reportes Tab ────────────────────────────────────────────────────────────

function ReportesTab({ accounts }: { accounts: Account[] }) {
  const { showToast } = useToast();
  const firstOfMonth = new Date().toISOString().slice(0, 8) + "01";
  const lastOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [report, setReport] = useState<"trial" | "ledger" | "income">("trial");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(lastOfMonth);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  // ── Trial Balance state ──
  type TrialRow = { id: number; code: string; name: string; type: string; sumDebit: number; sumCredit: number; saldoDeudor: number; saldoAcreedor: number };
  const [trialRows, setTrialRows] = useState<TrialRow[]>([]);
  const [trialTotals, setTrialTotals] = useState<{ sumDebit: number; sumCredit: number; saldoDeudor: number; saldoAcreedor: number } | null>(null);

  // ── Ledger state ──
  type LedgerRow = { journalEntryId: number; date: string; description: string; reference: string | null; debit: number; credit: number; balance: number };
  const [ledgerData, setLedgerData] = useState<{ account: { code: string; name: string }; rows: LedgerRow[]; totalDebit: number; totalCredit: number; finalBalance: number } | null>(null);

  // ── Income state ──
  type IncomeItem = { id: number; code: string; name: string; amount: number };
  const [incomeData, setIncomeData] = useState<{ revenue: IncomeItem[]; expense: IncomeItem[]; totalRevenue: number; totalExpense: number; result: number } | null>(null);

  const leafAccounts = accounts.filter((a) => !a.isParent);

  async function fetchTrialBalance() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/accounting-reports/trial-balance?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar balance");
      const data = await res.json();
      setTrialRows(data.rows);
      setTrialTotals(data.totals);
    } catch {
      showToast("Error al cargar balance de sumas y saldos", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLedger() {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/accounting-reports/ledger/${selectedAccountId}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar libro mayor");
      setLedgerData(await res.json());
    } catch {
      showToast("Error al cargar libro mayor", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncomeStatement() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/accounting-reports/income-statement?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar estado de resultados");
      setIncomeData(await res.json());
    } catch {
      showToast("Error al cargar estado de resultados", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    if (report === "trial") fetchTrialBalance();
    else if (report === "ledger") fetchLedger();
    else fetchIncomeStatement();
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("export", "csv");

    let url = "";
    if (report === "trial") url = `/api/accounting-reports/trial-balance?${params}`;
    else if (report === "ledger" && selectedAccountId) url = `/api/accounting-reports/ledger/${selectedAccountId}?${params}`;
    else if (report === "income") url = `/api/accounting-reports/income-statement?${params}`;
    else return;

    window.open(url, "_blank");
  }

  const reportOptions = [
    { value: "trial", label: "Balance de Sumas y Saldos" },
    { value: "ledger", label: "Libro Mayor" },
    { value: "income", label: "Estado de Resultados" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">Reporte</label>
          <select
            className="input text-sm"
            value={report}
            onChange={(e) => setReport(e.target.value as any)}
          >
            {reportOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <FormField label="Desde" className="w-40">
          <input type="date" className="input text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
        <FormField label="Hasta" className="w-40">
          <input type="date" className="input text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </FormField>

        {report === "ledger" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">Cuenta</label>
            <select
              className="input text-sm min-w-56"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Seleccionar cuenta...</option>
              {leafAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading || (report === "ledger" && !selectedAccountId)}>
            {loading ? "Cargando..." : "Generar"}
          </Button>
          <Button variant="secondary" onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Balance de Sumas y Saldos */}
      {report === "trial" && trialRows.length > 0 && trialTotals && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium">Codigo</th>
                <th className="text-left p-3 font-medium">Cuenta</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-right p-3 font-medium">Sum. Debe</th>
                <th className="text-right p-3 font-medium">Sum. Haber</th>
                <th className="text-right p-3 font-medium">Saldo Deudor</th>
                <th className="text-right p-3 font-medium">Saldo Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {trialRows.filter((r) => r.sumDebit > 0 || r.sumCredit > 0).map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-mono text-muted-foreground">{r.code}</td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3"><Badge variant={TYPE_VARIANT[r.type] ?? "neutral"}>{TYPE_LABELS[r.type] ?? r.type}</Badge></td>
                  <td className="p-3 text-right font-mono">{fmt(r.sumDebit)}</td>
                  <td className="p-3 text-right font-mono">{fmt(r.sumCredit)}</td>
                  <td className="p-3 text-right font-mono">{r.saldoDeudor > 0 ? fmt(r.saldoDeudor) : "-"}</td>
                  <td className="p-3 text-right font-mono">{r.saldoAcreedor > 0 ? fmt(r.saldoAcreedor) : "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={3} className="p-3">TOTALES</td>
                <td className="p-3 text-right font-mono">{fmt(trialTotals.sumDebit)}</td>
                <td className="p-3 text-right font-mono">{fmt(trialTotals.sumCredit)}</td>
                <td className="p-3 text-right font-mono">{fmt(trialTotals.saldoDeudor)}</td>
                <td className="p-3 text-right font-mono">{fmt(trialTotals.saldoAcreedor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Libro Mayor */}
      {report === "ledger" && ledgerData && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{ledgerData.account.code} — {ledgerData.account.name}</h3>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-left p-3 font-medium">Descripcion</th>
                  <th className="text-left p-3 font-medium">Ref.</th>
                  <th className="text-right p-3 font-medium">Debe</th>
                  <th className="text-right p-3 font-medium">Haber</th>
                  <th className="text-right p-3 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.rows.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin movimientos en el período</td></tr>
                ) : ledgerData.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap">{new Date(r.date).toLocaleDateString("es-AR")}</td>
                    <td className="p-3 max-w-xs truncate">{r.description}</td>
                    <td className="p-3 text-muted-foreground">{r.reference ?? "-"}</td>
                    <td className="p-3 text-right font-mono">{r.debit > 0 ? fmt(r.debit) : "-"}</td>
                    <td className="p-3 text-right font-mono">{r.credit > 0 ? fmt(r.credit) : "-"}</td>
                    <td className={`p-3 text-right font-mono font-medium ${r.balance < 0 ? "text-danger" : ""}`}>{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                  <td colSpan={3} className="p-3">TOTALES</td>
                  <td className="p-3 text-right font-mono">{fmt(ledgerData.totalDebit)}</td>
                  <td className="p-3 text-right font-mono">{fmt(ledgerData.totalCredit)}</td>
                  <td className={`p-3 text-right font-mono ${ledgerData.finalBalance < 0 ? "text-danger" : "text-success"}`}>
                    {fmt(ledgerData.finalBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Estado de Resultados */}
      {report === "income" && incomeData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingresos */}
          <div className="card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-success">Ingresos</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium">Cuenta</th>
                  <th className="text-right p-3 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.revenue.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3">{r.code} — {r.name}</td>
                    <td className="p-3 text-right font-mono">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-success/10 font-semibold border-t-2 border-border">
                  <td className="p-3">Total Ingresos</td>
                  <td className="p-3 text-right font-mono text-success">{fmt(incomeData.totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Egresos */}
          <div className="card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-danger">Egresos</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium">Cuenta</th>
                  <th className="text-right p-3 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.expense.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3">{r.code} — {r.name}</td>
                    <td className="p-3 text-right font-mono">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-danger/10 font-semibold border-t-2 border-border">
                  <td className="p-3">Total Egresos</td>
                  <td className="p-3 text-right font-mono text-danger">{fmt(incomeData.totalExpense)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-2 card p-6 flex items-center justify-between">
            <span className="text-lg font-semibold">Resultado del Periodo</span>
            <span className={`text-2xl font-bold ${incomeData.result >= 0 ? "text-success" : "text-danger"}`}>
              {incomeData.result >= 0 ? "Ganancia" : "Perdida"}: $ {fmt(Math.abs(incomeData.result))}
            </span>
          </div>
        </div>
      )}

      {/* Empty states */}
      {report === "trial" && trialRows.length === 0 && !loading && (
        <div className="card p-12 text-center text-muted-foreground">Generá el reporte para ver el balance de sumas y saldos.</div>
      )}
      {report === "ledger" && !ledgerData && !loading && (
        <div className="card p-12 text-center text-muted-foreground">Seleccioná una cuenta y generá el reporte para ver el libro mayor.</div>
      )}
      {report === "income" && !incomeData && !loading && (
        <div className="card p-12 text-center text-muted-foreground">Generá el reporte para ver el estado de resultados.</div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "plan" | "diario" | "iva" | "reportes";

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("plan");
  const [tree, setTree] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const [treeRes, listRes] = await Promise.all([
        fetch("/api/accounts-chart/tree", { headers: authHeaders() }),
        fetch("/api/accounts-chart", { headers: authHeaders() }),
      ]);
      if (treeRes.ok) setTree(await treeRes.json());
      if (listRes.ok) setAllAccounts(await listRes.json());
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "plan", label: "Plan de Cuentas" },
    { key: "diario", label: "Libro Diario" },
    { key: "iva", label: "Libro IVA" },
    { key: "reportes", label: "Reportes" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Contabilidad" subtitle="Plan de cuentas FACPCE · Libro diario · Libro IVA · Reportes" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <PlanDeContasTab
          tree={tree}
          allAccounts={allAccounts}
          loading={loadingAccounts}
          onRefresh={loadAccounts}
        />
      )}

      {tab === "diario" && <LibroDiarioTab accounts={allAccounts} />}
      {tab === "iva" && <LibroIVATab />}
      {tab === "reportes" && <ReportesTab accounts={allAccounts} />}
    </div>
  );
}
