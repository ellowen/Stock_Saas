import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconBriefcase, IconPlus } from "../../components/Icons";

const API = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Advance {
  id: number;
  amount: string;
  date: string;
  deductedIn: string | null;
  notes: string | null;
  employee: { id: number; firstName: string; lastName: string };
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  cuil: string | null;
  position: string | null;
  grossSalary: string;
  cbu: string | null;
}

interface Payroll {
  id: number;
  period: string;
  periodType: "MONTHLY" | "SAC" | "FINAL";
  basicSalary: string;
  extraHours: string;
  bonus: string;
  otherEarnings: string;
  grossTotal: string;
  deductJubilacion: string;
  deductObraSocial: string;
  deductInssjp: string;
  deductSindicato: string;
  deductOther: string;
  totalDeductions: string;
  netSalary: string;
  patronalJubilacion: string;
  patronalInssjp: string;
  patronalObraSocial: string;
  patronalArt: string;
  patronalTotal: string;
  status: "DRAFT" | "CONFIRMED" | "PAID";
  paidAt: string | null;
  notes: string | null;
  employee: Employee & { category?: string; contractType?: string; hireDate?: string; bankAccount?: string; branch?: { name: string } | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function $ (n: string | number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

const STATUS_VARIANT: Record<string, "neutral" | "warning" | "success"> = {
  DRAFT: "neutral",
  CONFIRMED: "warning",
  PAID: "success",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  PAID: "Pagado",
};

// ─── Current period helper ────────────────────────────────────────────────────
function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { showToast } = useToast();

  const [period, setPeriod] = useState(currentPeriod());
  const [periods, setPeriods] = useState<string[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"payrolls" | "advances">("payrolls");

  // Anticipos
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advForm, setAdvForm] = useState({ employeeId: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [advSaving, setAdvSaving] = useState(false);

  // Liquidación final
  const [finalOpen, setFinalOpen] = useState(false);
  const [finalForm, setFinalForm] = useState({ employeeId: "", period: currentPeriod(), terminationDate: new Date().toISOString().slice(0, 10), isDismissal: false, sindicatoRate: "", artRate: "" });
  const [finalPreview, setFinalPreview] = useState<(Payroll & { breakdown?: Record<string, number> }) | null>(null);
  const [finalPreviewing, setFinalPreviewing] = useState(false);
  const [finalSaving, setFinalSaving] = useState(false);

  // New payroll modal
  const [newOpen, setNewOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newForm, setNewForm] = useState({
    employeeId: "",
    period: currentPeriod(),
    periodType: "MONTHLY",
    extraHours: "",
    bonus: "",
    otherEarnings: "",
    sindicatoRate: "",
    artRate: "",
    notes: "",
  });
  const [preview, setPreview] = useState<Payroll | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPeriod, setBulkPeriod] = useState(currentPeriod());
  const [bulkArtRate, setBulkArtRate] = useState("");
  const [bulkSindicatoRate, setBulkSindicatoRate] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Receipt modal
  const [receipt, setReceipt] = useState<Payroll | null>(null);

  const loadPayrolls = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payrolls?period=${p}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setPayrolls(await res.json());
    } catch {
      showToast("Error al cargar liquidaciones", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadPeriods = useCallback(async () => {
    try {
      const res = await fetch(`${API}/payrolls/periods`, { headers: authHeaders() });
      if (res.ok) setPeriods(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API}/employees`, { headers: authHeaders() });
      if (res.ok) setEmployees(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadAdvances = useCallback(async () => {
    try {
      const res = await fetch(`${API}/payrolls/advances`, { headers: authHeaders() });
      if (res.ok) setAdvances(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPayrolls(period); }, [period, loadPayrolls]);
  useEffect(() => { loadPeriods(); loadEmployees(); loadAdvances(); }, [loadPeriods, loadEmployees, loadAdvances]);

  const handleSaveAdvance = async () => {
    if (!advForm.employeeId || !advForm.amount) { showToast("Completá empleado y monto", "error"); return; }
    setAdvSaving(true);
    try {
      const res = await fetch(`${API}/payrolls/advances`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ employeeId: Number(advForm.employeeId), amount: Number(advForm.amount), date: advForm.date, notes: advForm.notes || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast("Anticipo registrado", "success");
      setAdvanceOpen(false);
      setAdvForm({ employeeId: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      loadAdvances();
    } catch (err: any) { showToast(err.message ?? "Error", "error"); }
    finally { setAdvSaving(false); }
  };

  const handleDeleteAdvance = async (id: number) => {
    try {
      const res = await fetch(`${API}/payrolls/advances/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast("Anticipo eliminado", "success");
      loadAdvances();
    } catch (err: any) { showToast(err.message ?? "Error", "error"); }
  };

  const handleFinalPreview = async () => {
    if (!finalForm.employeeId || !finalForm.period) { showToast("Completá los campos requeridos", "error"); return; }
    setFinalPreviewing(true);
    try {
      const res = await fetch(`${API}/payrolls/final-preview`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          employeeId: Number(finalForm.employeeId), period: finalForm.period,
          terminationDate: finalForm.terminationDate, isDismissal: finalForm.isDismissal,
          sindicatoRate: finalForm.sindicatoRate ? Number(finalForm.sindicatoRate) : undefined,
          artRate: finalForm.artRate ? Number(finalForm.artRate) : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const data = await res.json();
      const emp = employees.find((e) => e.id === Number(finalForm.employeeId));
      setFinalPreview({ ...data, employee: emp ?? { id: Number(finalForm.employeeId), firstName: "", lastName: "", cuil: null, position: null, grossSalary: "0", cbu: null } });
    } catch (err: any) { showToast(err.message ?? "Error", "error"); }
    finally { setFinalPreviewing(false); }
  };

  const handleSaveFinal = async () => {
    if (!finalPreview) return;
    setFinalSaving(true);
    try {
      const res = await fetch(`${API}/payrolls`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          employeeId: Number(finalForm.employeeId), period: finalForm.period, periodType: "FINAL",
          otherEarnings: Number(finalPreview.otherEarnings),
          sindicatoRate: finalForm.sindicatoRate ? Number(finalForm.sindicatoRate) / 100 : undefined,
          artRate: finalForm.artRate ? Number(finalForm.artRate) / 100 : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast("Liquidación final guardada", "success");
      setFinalOpen(false); setFinalPreview(null);
      loadPayrolls(period); loadPeriods();
    } catch (err: any) { showToast(err.message ?? "Error", "error"); }
    finally { setFinalSaving(false); }
  };

  const handlePreview = async () => {
    if (!newForm.employeeId || !newForm.period) {
      showToast("Seleccioná empleado y período", "error");
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`${API}/payrolls/preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          employeeId: Number(newForm.employeeId),
          period: newForm.period,
          periodType: newForm.periodType,
          extraHours: newForm.extraHours ? Number(newForm.extraHours) : undefined,
          bonus: newForm.bonus ? Number(newForm.bonus) : undefined,
          otherEarnings: newForm.otherEarnings ? Number(newForm.otherEarnings) : undefined,
          sindicatoRate: newForm.sindicatoRate ? Number(newForm.sindicatoRate) / 100 : undefined,
          artRate: newForm.artRate ? Number(newForm.artRate) / 100 : undefined,
          notes: newForm.notes || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const data = await res.json();
      // Enrich with employee info for display
      const emp = employees.find((e) => e.id === Number(newForm.employeeId));
      setPreview({ ...data, employee: emp ?? { id: Number(newForm.employeeId), firstName: "", lastName: "", cuil: null, position: null, grossSalary: "0", cbu: null } });
    } catch (err: any) {
      showToast(err.message ?? "Error al calcular", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/payrolls`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          employeeId: Number(newForm.employeeId),
          period: newForm.period,
          periodType: newForm.periodType,
          extraHours: newForm.extraHours ? Number(newForm.extraHours) : undefined,
          bonus: newForm.bonus ? Number(newForm.bonus) : undefined,
          otherEarnings: newForm.otherEarnings ? Number(newForm.otherEarnings) : undefined,
          sindicatoRate: newForm.sindicatoRate ? Number(newForm.sindicatoRate) / 100 : undefined,
          artRate: newForm.artRate ? Number(newForm.artRate) / 100 : undefined,
          notes: newForm.notes || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast("Liquidación creada", "success");
      setNewOpen(false);
      setPreview(null);
      setNewForm({ employeeId: "", period: currentPeriod(), periodType: "MONTHLY", extraHours: "", bonus: "", otherEarnings: "", sindicatoRate: "", artRate: "", notes: "" });
      loadPayrolls(period);
      loadPeriods();
    } catch (err: any) {
      showToast(err.message ?? "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    setBulkSaving(true);
    try {
      const res = await fetch(`${API}/payrolls/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          period: bulkPeriod,
          artRate: bulkArtRate ? Number(bulkArtRate) / 100 : 0,
          sindicatoRate: bulkSindicatoRate ? Number(bulkSindicatoRate) / 100 : 0,
        }),
      });
      if (!res.ok) throw new Error();
      const results: { name: string; status: string; reason?: string }[] = await res.json();
      const created = results.filter((r) => r.status === "created").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      showToast(`${created} creadas, ${skipped} ya existían`, "success");
      setBulkOpen(false);
      loadPayrolls(period);
      loadPeriods();
    } catch {
      showToast("Error al calcular en masa", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleAction = async (id: number, action: "confirm" | "pay" | "delete") => {
    try {
      const method = action === "delete" ? "DELETE" : "POST";
      const url = action === "delete" ? `${API}/payrolls/${id}` : `${API}/payrolls/${id}/${action}`;
      const res = await fetch(url, { method, headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const msgs = { confirm: "Liquidación confirmada", pay: "Marcada como pagada", delete: "Liquidación eliminada" };
      showToast(msgs[action], "success");
      loadPayrolls(period);
    } catch (err: any) {
      showToast(err.message ?? "Error", "error");
    }
  };

  const openReceipt = async (id: number) => {
    try {
      const res = await fetch(`${API}/payrolls/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setReceipt(await res.json());
    } catch {
      showToast("Error al cargar recibo", "error");
    }
  };

  const f = (k: string) => newForm[k as keyof typeof newForm] as string;
  const set = (k: string, v: string) => setNewForm((p) => ({ ...p, [k]: v }));

  // Totals for the period
  const totalNet = payrolls.reduce((a, p) => a + Number(p.netSalary), 0);
  const totalGross = payrolls.reduce((a, p) => a + Number(p.grossTotal), 0);
  const totalPatronal = payrolls.reduce((a, p) => a + Number(p.patronalTotal), 0);
  const paidCount = payrolls.filter((p) => p.status === "PAID").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidaciones de sueldos"
        subtitle="Calculá y registrá los sueldos mensuales de tus empleados."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => { setAdvanceOpen(true); }}>
              Anticipo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setFinalPreview(null); setFinalOpen(true); }}>
              Liq. final
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
              Calcular todos
            </Button>
            <Button size="sm" onClick={() => { setPreview(null); setNewOpen(true); }}>
              <IconPlus />
              Nueva liquidación
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["payrolls", "advances"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={["px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"].join(" ")}>
            {t === "payrolls" ? "Liquidaciones" : "Anticipos"}
          </button>
        ))}
      </div>

      {/* Selector de período */}
      {tab === "payrolls" && <>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input-minimal w-40"
        />
        {periods.length > 0 && (
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-minimal w-48">
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {/* Resumen del período */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Empleados", value: payrolls.length.toString() },
            { label: "Bruto total", value: $(totalGross) },
            { label: "Neto total", value: $(totalNet) },
            { label: "Costo empresa", value: $(totalGross + totalPatronal) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p className="text-sm text-gray-500">Cargando liquidaciones…</p>
      ) : payrolls.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase />}
          title="No hay liquidaciones para este período"
          description='Usá "Calcular todos" para generar los borradores del mes.'
        />
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Empleado", "Cargo", "Sueldo bruto", "Deducciones", "Neto", "Costo empresa", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {p.employee.lastName}, {p.employee.firstName}
                    </div>
                    {p.employee.cuil && <div className="text-xs text-gray-400">CUIL: {p.employee.cuil}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.employee.position ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{$(p.grossTotal)}</td>
                  <td className="px-4 py-3 font-mono text-red-600 dark:text-red-400">-{$(p.totalDeductions)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-green-700 dark:text-green-400">{$(p.netSalary)}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">
                    {$(Number(p.grossTotal) + Number(p.patronalTotal))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button onClick={() => openReceipt(p.id)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Ver recibo</button>
                      {p.status === "DRAFT" && (
                        <>
                          <button onClick={() => handleAction(p.id, "confirm")} className="text-xs text-blue-600 hover:underline">Confirmar</button>
                          <button onClick={() => handleAction(p.id, "delete")} className="text-xs text-red-500 hover:underline">Eliminar</button>
                        </>
                      )}
                      {p.status === "CONFIRMED" && (
                        <button onClick={() => handleAction(p.id, "pay")} className="text-xs text-green-600 hover:underline">Marcar pagado</button>
                      )}
                      {p.paidAt && (
                        <span className="text-xs text-gray-400">{new Date(p.paidAt).toLocaleDateString("es-AR")}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paidCount > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
              {paidCount} de {payrolls.length} pagados
            </div>
          )}
        </div>
      )}
      </> /* end tab payrolls */}

      {/* ── Tab Anticipos ─────────────────────────────────────────────────── */}
      {tab === "advances" && (
        <div className="space-y-4">
          {advances.length === 0 ? (
            <EmptyState icon={<IconBriefcase />} title="No hay anticipos registrados." />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {["Empleado", "Fecha", "Monto", "Estado", "Notas", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {adv.employee.lastName}, {adv.employee.firstName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(adv.date).toLocaleDateString("es-AR")}</td>
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">${Number(adv.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        {adv.deductedIn
                          ? <Badge variant="success">Descontado en {adv.deductedIn}</Badge>
                          : <Badge variant="warning">Pendiente</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{adv.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {!adv.deductedIn && (
                          <button onClick={() => handleDeleteAdvance(adv.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nueva Liquidación ────────────────────────────────────────── */}
      <Modal open={newOpen} onClose={() => { setNewOpen(false); setPreview(null); }} title="Nueva liquidación" size="lg">
        {!preview ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Empleado *">
                <select value={f("employeeId")} onChange={(e) => set("employeeId", e.target.value)} className="input-minimal">
                  <option value="">Seleccioná un empleado</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Período *">
                <input type="month" value={f("period")} onChange={(e) => set("period", e.target.value)} className="input-minimal" />
              </FormField>
              <FormField label="Tipo">
                <select value={f("periodType")} onChange={(e) => set("periodType", e.target.value)} className="input-minimal">
                  <option value="MONTHLY">Mensual</option>
                  <option value="SAC">SAC / Aguinaldo</option>
                  <option value="FINAL">Liquidación final</option>
                </select>
              </FormField>
              <FormField label="Horas extras ($)">
                <input type="number" min="0" value={f("extraHours")} onChange={(e) => set("extraHours", e.target.value)} className="input-minimal" placeholder="0" />
              </FormField>
              <FormField label="Bonificación / adicional ($)">
                <input type="number" min="0" value={f("bonus")} onChange={(e) => set("bonus", e.target.value)} className="input-minimal" placeholder="0" />
              </FormField>
              <FormField label="Otros haberes ($)">
                <input type="number" min="0" value={f("otherEarnings")} onChange={(e) => set("otherEarnings", e.target.value)} className="input-minimal" placeholder="0" />
              </FormField>
              <FormField label="Sindicato (% a deducir)">
                <input type="number" min="0" max="10" step="0.1" value={f("sindicatoRate")} onChange={(e) => set("sindicatoRate", e.target.value)} className="input-minimal" placeholder="Ej: 2" />
              </FormField>
              <FormField label="ART patronal (%)">
                <input type="number" min="0" max="10" step="0.1" value={f("artRate")} onChange={(e) => set("artRate", e.target.value)} className="input-minimal" placeholder="Ej: 2.5" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Notas">
                  <input type="text" value={f("notes")} onChange={(e) => set("notes", e.target.value)} className="input-minimal" />
                </FormField>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button onClick={handlePreview} disabled={previewing}>
                {previewing ? "Calculando…" : "Calcular"}
              </Button>
            </div>
          </>
        ) : (
          <PayrollReceipt payroll={preview} onBack={() => setPreview(null)} onSave={handleSave} saving={saving} />
        )}
      </Modal>

      {/* ── Modal Calcular Todos ───────────────────────────────────────────── */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Calcular todos los empleados" size="sm">
        <div className="space-y-4">
          <FormField label="Período *">
            <input type="month" value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)} className="input-minimal" />
          </FormField>
          <FormField label="Sindicato (% a deducir)">
            <input type="number" min="0" max="10" step="0.1" value={bulkSindicatoRate} onChange={(e) => setBulkSindicatoRate(e.target.value)} className="input-minimal" placeholder="Ej: 2" />
          </FormField>
          <FormField label="ART patronal (%)">
            <input type="number" min="0" max="10" step="0.1" value={bulkArtRate} onChange={(e) => setBulkArtRate(e.target.value)} className="input-minimal" placeholder="Ej: 2.5" />
          </FormField>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Se crearán borradores para todos los empleados activos que no tengan liquidación en este período.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancelar</Button>
          <Button onClick={handleBulk} disabled={bulkSaving}>
            {bulkSaving ? "Calculando…" : "Calcular todos"}
          </Button>
        </div>
      </Modal>

      {/* ── Modal Recibo ──────────────────────────────────────────────────── */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Recibo de sueldo" size="lg">
        {receipt && <PayrollReceipt payroll={receipt} readOnly onClose={() => setReceipt(null)} />}
      </Modal>

      {/* ── Modal Anticipo ────────────────────────────────────────────────── */}
      <Modal open={advanceOpen} onClose={() => setAdvanceOpen(false)} title="Registrar anticipo de sueldo" size="sm">
        <div className="space-y-4">
          <FormField label="Empleado *">
            <select value={advForm.employeeId} onChange={(e) => setAdvForm((p) => ({ ...p, employeeId: e.target.value }))} className="input-minimal">
              <option value="">Seleccioná un empleado</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>)}
            </select>
          </FormField>
          <FormField label="Monto ($) *">
            <input type="number" min="0" value={advForm.amount} onChange={(e) => setAdvForm((p) => ({ ...p, amount: e.target.value }))} className="input-minimal" />
          </FormField>
          <FormField label="Fecha">
            <input type="date" value={advForm.date} onChange={(e) => setAdvForm((p) => ({ ...p, date: e.target.value }))} className="input-minimal" />
          </FormField>
          <FormField label="Notas">
            <input type="text" value={advForm.notes} onChange={(e) => setAdvForm((p) => ({ ...p, notes: e.target.value }))} className="input-minimal" placeholder="Ej: anticipo quincena" />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAdvanceOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveAdvance} disabled={advSaving}>{advSaving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </Modal>

      {/* ── Modal Liquidación Final ───────────────────────────────────────── */}
      <Modal open={finalOpen} onClose={() => { setFinalOpen(false); setFinalPreview(null); }} title="Liquidación final" size="lg">
        {!finalPreview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Empleado *">
                <select value={finalForm.employeeId} onChange={(e) => setFinalForm((p) => ({ ...p, employeeId: e.target.value }))} className="input-minimal">
                  <option value="">Seleccioná un empleado</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>)}
                </select>
              </FormField>
              <FormField label="Período de egreso *">
                <input type="month" value={finalForm.period} onChange={(e) => setFinalForm((p) => ({ ...p, period: e.target.value }))} className="input-minimal" />
              </FormField>
              <FormField label="Fecha de egreso">
                <input type="date" value={finalForm.terminationDate} onChange={(e) => setFinalForm((p) => ({ ...p, terminationDate: e.target.value }))} className="input-minimal" />
              </FormField>
              <FormField label="ART patronal (%)">
                <input type="number" min="0" max="10" step="0.1" value={finalForm.artRate} onChange={(e) => setFinalForm((p) => ({ ...p, artRate: e.target.value }))} className="input-minimal" placeholder="Ej: 2.5" />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={finalForm.isDismissal} onChange={(e) => setFinalForm((p) => ({ ...p, isDismissal: e.target.checked }))} className="rounded" />
              Despido sin causa (incluir indemnización)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Calcula: sueldo proporcional + SAC proporcional + vacaciones no gozadas{finalForm.isDismissal ? " + indemnización" : ""}.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setFinalOpen(false)}>Cancelar</Button>
              <Button onClick={handleFinalPreview} disabled={finalPreviewing}>{finalPreviewing ? "Calculando…" : "Calcular"}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {finalPreview.breakdown && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Detalle del cálculo</p>
                <Row label="Sueldo proporcional" value={`$${Number(finalPreview.breakdown.proportionalSalary).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`} />
                <Row label="SAC proporcional" value={`$${Number(finalPreview.breakdown.sacProportional).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`} />
                <Row label="Vacaciones no gozadas" value={`$${Number(finalPreview.breakdown.vacNotTaken).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`} />
                {Number(finalPreview.breakdown.indemnizacion) > 0 && (
                  <Row label={`Indemnización (${finalPreview.breakdown.yearsWorked} años)`} value={`$${Number(finalPreview.breakdown.indemnizacion).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`} />
                )}
              </div>
            )}
            <PayrollReceipt payroll={finalPreview} onBack={() => setFinalPreview(null)} onSave={handleSaveFinal} saving={finalSaving} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Subcomponent: Recibo de sueldo ───────────────────────────────────────────

function PayrollReceipt({
  payroll,
  readOnly = false,
  onBack,
  onSave,
  saving,
  onClose,
}: {
  payroll: Payroll;
  readOnly?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  saving?: boolean;
  onClose?: () => void;
}) {
  const emp = payroll.employee;
  const $ = (n: string | number) =>
    `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  const handlePrint = () => window.print();

  return (
    <div className="print-receipt-zone space-y-4 text-sm">
      {/* Encabezado */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Empleado</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{emp.lastName}, {emp.firstName}</p>
          {emp.cuil && <p className="text-xs text-gray-500">CUIL: {emp.cuil}</p>}
          {emp.position && <p className="text-xs text-gray-500">{emp.position}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Período</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{payroll.period}</p>
          <Badge variant={STATUS_VARIANT[payroll.status]}>{STATUS_LABEL[payroll.status]}</Badge>
        </div>
      </div>

      {/* Haberes */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Haberes (remuneración bruta)
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Row label="Sueldo básico" value={$(payroll.basicSalary)} />
          {Number(payroll.extraHours) > 0 && <Row label="Horas extras" value={$(payroll.extraHours)} />}
          {Number(payroll.bonus) > 0 && <Row label="SAC / Bonificación" value={$(payroll.bonus)} />}
          {Number(payroll.otherEarnings) > 0 && <Row label="Otros haberes" value={$(payroll.otherEarnings)} />}
          <Row label="Total bruto" value={$(payroll.grossTotal)} bold />
        </div>
      </div>

      {/* Deducciones empleado */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Deducciones del empleado
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Row label="Jubilación (11%)" value={`-${$(payroll.deductJubilacion)}`} red />
          <Row label="Obra social (3%)" value={`-${$(payroll.deductObraSocial)}`} red />
          <Row label="INSSJP / PAMI (3%)" value={`-${$(payroll.deductInssjp)}`} red />
          {Number(payroll.deductSindicato) > 0 && <Row label="Sindicato" value={`-${$(payroll.deductSindicato)}`} red />}
          {Number(payroll.deductOther) > 0 && <Row label="Otras deducciones" value={`-${$(payroll.deductOther)}`} red />}
          <Row label="Total deducciones" value={`-${$(payroll.totalDeductions)}`} bold red />
        </div>
      </div>

      {/* Neto */}
      <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 flex justify-between items-center">
        <span className="font-semibold text-green-800 dark:text-green-300 text-base">NETO A COBRAR</span>
        <span className="font-bold text-green-800 dark:text-green-300 text-xl">{$(payroll.netSalary)}</span>
      </div>

      {/* Aportes patronales */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Aportes patronales (costo empresa — informativo)
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Row label="Jubilación patronal (16%)" value={$(payroll.patronalJubilacion)} />
          <Row label="INSSJP patronal (2%)" value={$(payroll.patronalInssjp)} />
          <Row label="Obra social patronal (6%)" value={$(payroll.patronalObraSocial)} />
          {Number(payroll.patronalArt) > 0 && <Row label="ART" value={$(payroll.patronalArt)} />}
          <Row label="Total aportes patronales" value={$(payroll.patronalTotal)} bold />
          <Row
            label="Costo total empresa"
            value={$(Number(payroll.grossTotal) + Number(payroll.patronalTotal))}
            bold
          />
        </div>
      </div>

      {emp.cbu && (
        <p className="text-xs text-gray-500 dark:text-gray-400">CBU: {emp.cbu}</p>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2 no-print">
        <Button variant="secondary" size="sm" onClick={handlePrint}>Imprimir</Button>
        {readOnly && onClose && <Button variant="secondary" onClick={onClose}>Cerrar</Button>}
        {!readOnly && onBack && <Button variant="secondary" onClick={onBack}>Volver</Button>}
        {!readOnly && onSave && (
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <div className={`px-4 py-2 flex justify-between ${bold ? "bg-gray-50 dark:bg-gray-700/30" : ""}`}>
      <span className={`${bold ? "font-semibold" : ""} text-gray-700 dark:text-gray-300`}>{label}</span>
      <span className={`font-mono ${bold ? "font-semibold" : ""} ${red ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </span>
    </div>
  );
}
