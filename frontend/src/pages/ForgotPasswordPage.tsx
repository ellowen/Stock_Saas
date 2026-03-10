import type { FormEvent } from "react";
import { useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { Link } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { IconGiroLogo, IconSun, IconMoon } from "../components/Icons";

export function ForgotPasswordPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Error al enviar");
      }
      setSent(true);
      showToast("Si la empresa y el correo están registrados, recibirás un enlace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
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
      <div className="w-full max-w-[380px]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <span className="text-indigo-600 dark:text-indigo-400">
                <IconGiroLogo className="w-10 h-10" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Recuperar contraseña
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Indicá el nombre de tu empresa y el email de la cuenta a la que querés restablecer la contraseña.
            </p>
          </div>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-3">
                Si la empresa y el correo están registrados, recibirás un enlace (válido por 1 hora).
              </p>
              <Link
                to="/login"
                className="block text-center btn-primary w-full py-3 text-base font-medium rounded-xl dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de tu empresa
                </label>
                <input
                  id="forgot-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Mi Tienda SRL"
                  className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  autoComplete="organization"
                  required
                />
              </div>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email de la cuenta
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  autoComplete="email"
                  required
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  El correo asociado al usuario que debe recibir el enlace.
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base font-medium rounded-xl disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Volver al inicio de sesión
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
