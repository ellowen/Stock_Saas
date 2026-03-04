import { Link } from "react-router-dom";
import { IconGiroLogo } from "../components/Icons";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-400">
              <IconGiroLogo className="w-8 h-8" />
            </span>
            GIRO
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
              Entrar
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4 dark:bg-indigo-500 dark:hover:bg-indigo-600">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Gestión de stock y ventas para tu negocio
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Inventario, punto de venta, sucursales y reportes en un solo lugar.
            Creá tu cuenta y empezá a vender.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary py-3 px-8 text-base font-semibold inline-block dark:bg-indigo-500 dark:hover:bg-indigo-600">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="btn-secondary py-3 px-8 text-base font-medium inline-block dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            14 días de prueba. Sin tarjeta para empezar.
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          GIRO — Gestión simple para tu negocio
        </div>
      </footer>
    </div>
  );
}
