import type { FormEvent } from "react";
import { useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { IconGiroLogo, IconSun, IconMoon } from "../components/Icons";

const STEPS = [
  { id: 1, label: "Empresa" },
  { id: 2, label: "Tu cuenta" },
  { id: 3, label: "Confirmar" },
];

export function RegisterPage() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const inputClass =
    "input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400";

  const canGoStep2 = companyName.trim().length > 0;
  const canGoStep3 =
    fullName.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length >= 6;

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Error al crear la cuenta");
      }
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleStepSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1 && canGoStep2) setStep(2);
    else if (step === 2 && canGoStep3) setStep(3);
    else if (step === 3) handleRegister(e);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={theme === "dark" ? "Tema claro" : "Tema oscuro"}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </div>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <span className="text-indigo-600 dark:text-indigo-400">
                <IconGiroLogo className="w-10 h-10" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              GIRO
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Crear cuenta
            </p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === s.id
                    ? "bg-indigo-600 text-white"
                    : step > s.id
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {s.id}
              </div>
            ))}
          </div>

          <form onSubmit={handleStepSubmit} className="space-y-5">
            {/* Paso 1: Nombre de la empresa */}
            {step === 1 && (
              <div>
                <label htmlFor="reg-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la empresa *
                </label>
                <input
                  id="reg-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. Mi Tienda SRL"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!canGoStep2}
                  className="btn-primary w-full py-3 text-base font-medium rounded-xl mt-4 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Siguiente
                </button>
              </div>
            )}

            {/* Paso 2: Datos del usuario */}
            {step === 2 && (
              <>
                <div>
                  <label htmlFor="reg-fullname" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tu nombre completo *
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Usuario (para iniciar sesión) *
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. jperez"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Contraseña (mín. 6 caracteres) *
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email (opcional)
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="opcional@ejemplo.com"
                    autoComplete="email"
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Este usuario será el administrador de la empresa.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1 py-3 text-base font-medium rounded-xl dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={!canGoStep3}
                    className="btn-primary flex-1 py-3 text-base font-medium rounded-xl disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {/* Paso 3: Resumen y crear */}
            {step === 3 && (
              <>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    Vas a crear la empresa <strong>{companyName}</strong> y tu usuario <strong>{username}</strong> ({fullName}).
                  </p>
                  <p className="mt-2 font-medium text-indigo-600 dark:text-indigo-400">
                    Tendrás 3 meses gratis.
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary flex-1 py-3 text-base font-medium rounded-xl dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-3 text-base font-medium rounded-xl disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {loading ? "Creando cuenta…" : "Crear cuenta"}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            ¿Ya tenés cuenta?{" "}
            <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Iniciar sesión
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center">
          <Link to="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
