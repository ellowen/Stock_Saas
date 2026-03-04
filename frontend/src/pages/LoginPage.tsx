import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { API_BASE_URL, consumeSessionExpiredFlag, setAccessToken } from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { IconGiroLogo } from "../components/Icons";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const { showToast } = useToast();

  useEffect(() => {
    if (consumeSessionExpiredFlag()) {
      showToast("Sesión expirada. Volvé a iniciar sesión.", "info");
    }
  }, [showToast]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Error al iniciar sesión");
      }
      const data = await response.json();
      const token = data.accessToken ?? data.access_token;
      if (!token || typeof token !== "string") {
        throw new Error("El servidor no devolvió un token válido.");
      }
      setAccessToken(token, rememberMe);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <span className="text-indigo-600 dark:text-indigo-400">
                <IconGiroLogo className="w-10 h-10" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              GIRO
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Iniciar sesión en tu panel
            </p>
            {justRegistered && (
              <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                Cuenta creada. Ya podés iniciar sesión.
              </p>
            )}
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-user" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Usuario
              </label>
              <input
                id="login-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="input-minimal py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                autoComplete="current-password"
                required
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
              />
              Recordarme en este equipo
            </label>
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
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            ¿Nueva empresa?{" "}
            <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Crear cuenta
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
