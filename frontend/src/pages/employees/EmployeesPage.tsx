import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { FormField } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconPlus, IconBriefcase } from "../../components/Icons";

const API = "/api";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  cuil: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  position: string | null;
  category: string | null;
  hireDate: string;
  terminationDate: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  contractType: "FULL_TIME" | "PART_TIME" | "TEMPORARY" | "TRIAL";
  grossSalary: string;
  bankAccount: string | null;
  cbu: string | null;
  notes: string | null;
  branch: { id: number; name: string } | null;
  _count: { payrolls: number };
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  cuil: "",
  email: "",
  phone: "",
  address: "",
  position: "",
  category: "",
  hireDate: "",
  contractType: "FULL_TIME",
  grossSalary: "",
  bankAccount: "",
  cbu: "",
  notes: "",
  branchId: "",
  status: "ACTIVE",
};

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning"> = {
  ACTIVE: "success",
  INACTIVE: "danger",
  ON_LEAVE: "warning",
};

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all" | "inactive">("active");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const includeInactive = filter === "all" || filter === "inactive";
      const res = await fetch(`${API}/employees?includeInactive=${includeInactive}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setEmployees(await res.json());
    } catch {
      showToast(t("employees.loading"), "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter((e) => {
    if (filter === "active" && e.status !== "ACTIVE") return false;
    if (filter === "inactive" && e.status === "ACTIVE") return false;
    const q = search.toLowerCase();
    return (
      !q ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.position ?? "").toLowerCase().includes(q) ||
      (e.cuil ?? "").includes(q)
    );
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      cuil: emp.cuil ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      address: emp.address ?? "",
      position: emp.position ?? "",
      category: emp.category ?? "",
      hireDate: emp.hireDate.slice(0, 10),
      contractType: emp.contractType,
      grossSalary: emp.grossSalary,
      bankAccount: emp.bankAccount ?? "",
      cbu: emp.cbu ?? "",
      notes: emp.notes ?? "",
      branchId: emp.branch?.id.toString() ?? "",
      status: emp.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.hireDate || !form.grossSalary) {
      showToast("Completá los campos obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        grossSalary: Number(form.grossSalary),
        branchId: form.branchId ? Number(form.branchId) : undefined,
      };
      const url = editing ? `${API}/employees/${editing.id}` : `${API}/employees`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error");
      }
      showToast(t("employees.saveSuccess"), "success");
      setModalOpen(false);
      load();
    } catch (err: any) {
      showToast(err.message ?? "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    try {
      const res = await fetch(`${API}/employees/${emp.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast(t("employees.deactivateSuccess"), "success");
      setConfirmDeactivate(null);
      load();
    } catch {
      showToast("Error al dar de baja", "error");
    }
  };

  const f = (key: string) => form[key as keyof typeof form] as string;
  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employees.title")}
        subtitle={t("employees.subtitle")}
        actions={
          <Button onClick={openNew} size="sm">
            <IconPlus />
            {t("employees.new")}
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          {(["active", "all", "inactive"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={[
                "px-3 py-1.5 transition-colors",
                filter === v
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              {v === "active" ? t("employees.filterActive") : v === "all" ? t("employees.filterAll") : t("employees.filterInactive")}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, cargo o CUIL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("employees.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconBriefcase />} title={t("employees.empty")} />
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Empleado", "Cargo / Sucursal", "Contrato", "Sueldo bruto", "Ingreso", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {emp.lastName}, {emp.firstName}
                    </div>
                    {emp.cuil && <div className="text-xs text-gray-400">CUIL: {emp.cuil}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    <div>{emp.position ?? "—"}</div>
                    {emp.branch && <div className="text-xs text-gray-400">{emp.branch.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t(`employees.contract${emp.contractType}`)}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                    ${Number(emp.grossSalary).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(emp.hireDate).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[emp.status]}>
                      {t(`employees.status${emp.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(emp)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Editar
                      </button>
                      {emp.status === "ACTIVE" && (
                        <button
                          onClick={() => setConfirmDeactivate(emp)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          {t("employees.deactivate")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("employees.edit") : t("employees.new")}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={`${t("employees.firstName")} *`}>
            <input type="text" value={f("firstName")} onChange={(e) => set("firstName", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={`${t("employees.lastName")} *`}>
            <input type="text" value={f("lastName")} onChange={(e) => set("lastName", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={t("employees.cuil")}>
            <input type="text" value={f("cuil")} onChange={(e) => set("cuil", e.target.value)}
              placeholder="20-12345678-9" className="input-minimal" />
          </FormField>
          <FormField label={t("employees.position")}>
            <input type="text" value={f("position")} onChange={(e) => set("position", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={t("employees.category")}>
            <input type="text" value={f("category")} onChange={(e) => set("category", e.target.value)}
              placeholder="Ej: Operario cat. B" className="input-minimal" />
          </FormField>
          <FormField label={`${t("employees.grossSalary")} *`}>
            <input type="number" min="0" value={f("grossSalary")} onChange={(e) => set("grossSalary", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={`${t("employees.hireDate")} *`}>
            <input type="date" value={f("hireDate")} onChange={(e) => set("hireDate", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={t("employees.contractType")}>
            <select value={f("contractType")} onChange={(e) => set("contractType", e.target.value)}
              className="input-minimal">
              {["FULL_TIME", "PART_TIME", "TEMPORARY", "TRIAL"].map((c) => (
                <option key={c} value={c}>{t(`employees.contract${c}`)}</option>
              ))}
            </select>
          </FormField>
          {editing && (
            <FormField label={t("employees.status")}>
              <select value={f("status")} onChange={(e) => set("status", e.target.value)}
                className="input-minimal">
                {["ACTIVE", "INACTIVE", "ON_LEAVE"].map((s) => (
                  <option key={s} value={s}>{t(`employees.status${s}`)}</option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label={t("employees.email")}>
            <input type="email" value={f("email")} onChange={(e) => set("email", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={t("employees.phone")}>
            <input type="text" value={f("phone")} onChange={(e) => set("phone", e.target.value)}
              className="input-minimal" />
          </FormField>
          <FormField label={t("employees.cbu")}>
            <input type="text" value={f("cbu")} onChange={(e) => set("cbu", e.target.value)}
              placeholder="22 dígitos" className="input-minimal" />
          </FormField>
          <FormField label={t("employees.bankAccount")}>
            <input type="text" value={f("bankAccount")} onChange={(e) => set("bankAccount", e.target.value)}
              className="input-minimal" />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label={t("employees.address")}>
              <input type="text" value={f("address")} onChange={(e) => set("address", e.target.value)}
                className="input-minimal" />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t("employees.notes")}>
              <textarea value={f("notes")} onChange={(e) => set("notes", e.target.value)}
                rows={2} className="input-minimal resize-none" />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </Modal>

      {/* Confirm deactivate */}
      <Modal
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={t("employees.deactivate")}
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {t("employees.deactivateConfirm")}{" "}
          <strong>{confirmDeactivate?.lastName}, {confirmDeactivate?.firstName}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDeactivate(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}>
            {t("employees.deactivate")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
