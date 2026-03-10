import type { FormEvent } from "react";
import { useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { IconGiroLogo, IconSun, IconMoon } from "../components/Icons";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Error al restablecer");
      }
      setSuccess(true);
      showToast("Contraseña actualizada. Ya podés iniciar sesión.");
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
              Nueva contraseña
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Elegí una contraseña nueva para tu cuenta.
            </p>
          </div>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-3">
                Tu contraseña fue actualizada correctamente.
              </p>
              <Link
                to="/login"
                className="block text-center btn-primary w-full py-3 text-base font-medium rounded-xl dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!tokenFromUrl && (
                <div>
                  <label htmlFor="reset-token" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Código del correo
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Pegá el código del enlace que recibiste"
                    className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400 font-mono text-sm"
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Repetir contraseña
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
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
                {loading ? "Guardando…" : "Restablecer contraseña"}
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
