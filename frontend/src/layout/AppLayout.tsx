import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { setAccessToken } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Tooltip } from "../components/Tooltip";
import {
  IconHome,
  IconPackage,
  IconShoppingCart,
  IconTransfer,
  IconChart,
  IconBuilding,
  IconUsers,
  IconCurrency,
  IconLogOut,
  IconMenu,
  IconX,
  IconSun,
  IconMoon,
  IconGiroLogo,
} from "../components/Icons";
import { useTheme } from "../contexts/ThemeContext";

const navItems: { path: string; label: string; tooltip: string; Icon: () => JSX.Element }[] = [
  { path: "/app/dashboard", label: "Inicio", tooltip: "Resumen general", Icon: IconHome },
  { path: "/app/inventory", label: "Inventario", tooltip: "Productos y stock", Icon: IconPackage },
  { path: "/app/sales", label: "Ventas", tooltip: "Punto de venta", Icon: IconShoppingCart },
  { path: "/app/transfers", label: "Traspasos", tooltip: "Mover entre sucursales", Icon: IconTransfer },
  { path: "/app/reports", label: "Reportes", tooltip: "Reportes por fecha", Icon: IconChart },
];

const titles: Record<string, string> = {
  "/app/dashboard": "Inicio",
  "/app/inventory": "Inventario",
  "/app/sales": "Ventas",
  "/app/transfers": "Traspasos",
  "/app/branches": "Sucursales",
  "/app/users": "Usuarios",
  "/app/reports": "Reportes",
  "/app/plan": "Plan",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

function NavLinkItem({
  to,
  label,
  tooltip,
  Icon,
  onNavigate,
}: {
  to: string;
  label: string;
  tooltip: string;
  Icon: () => JSX.Element;
  onNavigate?: () => void;
}) {
  return (
    <Tooltip content={tooltip} side="right">
      <NavLink
        to={to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          }`
        }
      >
        <Icon />
        <span>{label}</span>
      </NavLink>
    </Tooltip>
  );
}

export function AppLayout() {
  const location = useLocation();
  const { canManageBranches, canManageUsers, company } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const isTrialing = company?.subscriptionStatus === "trialing" && trialEndsAt && trialEndsAt > new Date();
  const title = titles[location.pathname] ?? "Panel";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = title ? `${title} - GIRO` : "GIRO";
  }, [title]);

  const handleLogout = () => {
    setAccessToken(null);
    window.location.href = "/login";
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Backdrop móvil */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        style={{ opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? "auto" : "none" }}
        onClick={closeSidebar}
      />

      {/* Sidebar: siempre altura completa en desktop */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[260px] flex flex-col bg-white dark:bg-slate-800/95 dark:border-r dark:border-slate-700/80
          border-r border-slate-200/80 shadow-lg shadow-slate-200/50 dark:shadow-black/20
          transition-transform duration-200 ease-out
          lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0 lg:h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5">
          <Link
            to="/app/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100"
          >
            <span className="text-indigo-600 dark:text-indigo-400">
              <IconGiroLogo className="w-7 h-7" />
            </span>
            GIRO
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 lg:hidden"
            aria-label="Cerrar menú"
          >
            <IconX />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map(({ path, label, tooltip, Icon }) => (
              <li key={path}>
                <NavLinkItem to={path} label={label} tooltip={tooltip} Icon={Icon} onNavigate={closeSidebar} />
              </li>
            ))}
            {canManageBranches && (
              <li>
                <NavLinkItem to="/app/branches" label="Sucursales" tooltip="Crear y editar sucursales" Icon={IconBuilding} onNavigate={closeSidebar} />
              </li>
            )}
            {canManageUsers && (
              <li>
                <NavLinkItem to="/app/users" label="Usuarios" tooltip="Usuarios y permisos" Icon={IconUsers} onNavigate={closeSidebar} />
              </li>
            )}
            <li>
              <NavLinkItem to="/app/plan" label="Plan" tooltip="Tu plan y membresía" Icon={IconCurrency} onNavigate={closeSidebar} />
            </li>
          </ul>
        </nav>

        {/* Plan actual + Cerrar sesión */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/60 px-4 py-4 space-y-2">
          {company && (
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Plan actual</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {PLAN_LABELS[company.plan] ?? company.plan}
              </p>
              {isTrialing && trialEndsAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Prueba hasta {trialEndsAt.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </p>
              )}
              <Link
                to="/app/plan"
                onClick={closeSidebar}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1 inline-block"
              >
                Ver plan
              </Link>
            </div>
          )}
          <Tooltip content="Salir de la sesión" side="right">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
            >
              <IconLogOut />
              <span>Cerrar sesión</span>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/95 px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 lg:hidden"
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
          </div>
          <Tooltip content={theme === "dark" ? "Usar tema claro" : "Usar tema oscuro"} side="bottom">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={theme === "dark" ? "Tema claro" : "Tema oscuro"}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
          </Tooltip>
        </header>
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
