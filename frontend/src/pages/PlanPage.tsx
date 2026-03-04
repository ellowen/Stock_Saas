import { useAuth } from "../contexts/AuthContext";

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export function PlanPage() {
  const { company } = useAuth();
  const plan = company?.plan ?? "FREE";
  const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const isTrialing = company?.subscriptionStatus === "trialing" && trialEndsAt && trialEndsAt > new Date();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tu plan y membresía</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acá vas a poder gestionar tu plan y facturación cuando esté disponible.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Plan actual</span>
          <span className="font-semibold text-slate-900">{PLAN_LABELS[plan] ?? plan}</span>
        </div>
        {isTrialing && trialEndsAt && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-500">Prueba gratuita hasta</span>
            <span className="text-sm font-medium text-slate-700">
              {trialEndsAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-sm font-medium text-slate-700 mb-2">Próximamente</h2>
        <p className="text-sm text-slate-600">
          Vas a poder mejorar tu plan, ver el detalle de la membresía y gestionar la facturación desde acá.
        </p>
      </div>
    </div>
  );
}
