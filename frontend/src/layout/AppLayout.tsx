import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  IconSettings,
  IconUserCircle,
  IconTruck,
  IconDocument,
  IconClipboardList,
} from "../components/Icons";
import { useTheme } from "../contexts/ThemeContext";

const navItems: {
  path: string;
  labelKey: string;
  Icon: () => JSX.Element;
  permission?: "reports" | "transfers" | "branches" | "users";
}[] = [
  { path: "/app/dashboard",  labelKey: "home",      Icon: IconHome },
  { path: "/app/inventory",  labelKey: "inventory", Icon: IconPackage },
  { path: "/app/sales",      labelKey: "sales",     Icon: IconShoppingCart },
  { path: "/app/transfers",  labelKey: "transfers", Icon: IconTransfer,    permission: "transfers" },
  { path: "/app/documents",  labelKey: "documents", Icon: IconDocument,    permission: "reports" },
  { path: "/app/customers",  labelKey: "customers", Icon: IconUserCircle,  permission: "reports" },
  { path: "/app/suppliers",  labelKey: "suppliers", Icon: IconTruck,       permission: "reports" },
  { path: "/app/purchases",  labelKey: "purchases", Icon: IconClipboardList, permission: "reports" },
  { path: "/app/accounts",   labelKey: "accounts",  Icon: IconCurrency,      permission: "reports" },
  { path: "/app/reports",    labelKey: "reports",   Icon: IconChart,       permission: "reports" },
  { path: "/app/branches",   labelKey: "branches",  Icon: IconBuilding,    permission: "branches" },
  { path: "/app/users",      labelKey: "users",     Icon: IconUsers,       permission: "users" },
  { path: "/app/plan",       labelKey: "plan",      Icon: IconCurrency },
];

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

function NavItem({
  to,
  label,
  Icon,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  Icon: () => JSX.Element;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const item = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : "",
          isActive
            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
        ].join(" ")
      }
    >
      <span className="shrink-0"><Icon /></span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return <Tooltip content={label} side="right">{item}</Tooltip>;
  }
  return item;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { canManageBranches, canManageUsers, canViewReports, canManageTransfers, company, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const trialEndsAt   = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const isTrialing    = company?.subscriptionStatus === "trialing" && trialEndsAt && trialEndsAt > new Date();
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;

  useEffect(() => {
    document.title = "GIRO";
  }, []);

  const handleLogout = () => {
    setAccessToken(null);
    window.location.href = "/login";
  };

  const closeSidebar = () => setSidebarOpen(false);

  const permissionMap = {
    reports:   canViewReports,
    transfers: canManageTransfers,
    branches:  canManageBranches,
    users:     canManageUsers,
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || permissionMap[item.permission]
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Backdrop móvil */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside
        className={[
          "fixed top-0 left-0 z-50 h-screen flex flex-col",
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
          "shadow-lg transition-all duration-200 ease-out",
          "lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-[64px]" : "w-[240px]",
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className={[
            "flex h-14 shrink-0 items-center border-b border-gray-200 dark:border-gray-700",
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4",
          ].join(" ")}
        >
          {!sidebarCollapsed && (
            <Link
              to="/app/dashboard"
              onClick={closeSidebar}
              className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"
            >
              <span className="text-primary-600 dark:text-primary-400">
                <IconGiroLogo className="w-6 h-6" />
              </span>
              <span className="text-base tracking-tight">GIRO</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/app/dashboard" className="text-primary-600 dark:text-primary-400">
              <IconGiroLogo className="w-6 h-6" />
            </Link>
          )}
          {/* Botón colapsar — solo desktop */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <IconMenu />
          </button>
          {/* Botón cerrar — solo móvil */}
          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Cerrar menú"
          >
            <IconX />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleNavItems.map(({ path, labelKey, Icon }) => (
            <NavItem
              key={path}
              to={path}
              label={t(`nav.${labelKey}`)}
              Icon={Icon}
              collapsed={sidebarCollapsed}
              onNavigate={closeSidebar}
            />
          ))}

          {/* Separador */}
          <div className="my-2 border-t border-gray-100 dark:border-gray-700" />

          {/* Settings */}
          <NavItem
            to="/app/settings"
            label={t("nav.settings", "Configuración")}
            Icon={IconSettings}
            collapsed={sidebarCollapsed}
            onNavigate={closeSidebar}
          />
        </nav>

        {/* Footer: usuario + plan */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-2 py-3 space-y-1">
          {!sidebarCollapsed && company && (
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {user?.user.fullName}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                  {PLAN_LABELS[company.plan] ?? company.plan}
                </span>
                {isTrialing && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {trialDaysLeft}d restantes
                  </span>
                )}
              </div>
            </div>
          )}

          <Tooltip content={t("nav.logout", "Cerrar sesión")} side="right">
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                "dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100 transition-colors",
                sidebarCollapsed ? "justify-center px-2" : "",
              ].join(" ")}
            >
              <span className="shrink-0"><IconLogOut /></span>
              {!sidebarCollapsed && <span>{t("nav.logout", "Cerrar sesión")}</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — solo móvil */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            {/* Nombre empresa */}
            {company && (
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">
                {company.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Botón Nueva Venta */}
            <button
              type="button"
              onClick={() => { navigate("/app/sales"); closeSidebar(); }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors mr-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("pos.newSale", "Nueva venta")}
            </button>

            {/* Idioma */}
            {(["es", "en"] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => i18n.changeLanguage(lng)}
                className={[
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  i18n.language?.startsWith(lng)
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400",
                ].join(" ")}
              >
                {lng.toUpperCase()}
              </button>
            ))}

            {/* Tema */}
            <Tooltip content={theme === "dark" ? "Tema claro" : "Tema oscuro"} side="bottom">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === "dark" ? <IconSun /> : <IconMoon />}
              </button>
            </Tooltip>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
