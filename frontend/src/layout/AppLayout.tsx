import { type ReactElement, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
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
  IconBriefcase,
  IconCash,
  IconBook,
  IconShield,
} from "../components/Icons";
import { useTheme } from "../contexts/ThemeContext";

const navItems: {
  path: string;
  labelKey: string;
  Icon: () => ReactElement;
  permission?: string;
}[] = [
  { path: "/app/dashboard",  labelKey: "home",      Icon: IconHome },
  { path: "/app/inventory",  labelKey: "inventory", Icon: IconPackage },
  { path: "/app/sales",      labelKey: "sales",     Icon: IconShoppingCart },
  { path: "/app/transfers",  labelKey: "transfers", Icon: IconTransfer,    permission: "TRANSFERS_APPROVE" },
  { path: "/app/documents",  labelKey: "documents", Icon: IconDocument,    permission: "DOCUMENTS_WRITE" },
  { path: "/app/customers",  labelKey: "customers", Icon: IconUserCircle,  permission: "CUSTOMERS_WRITE" },
  { path: "/app/suppliers",  labelKey: "suppliers", Icon: IconTruck,       permission: "SUPPLIERS_WRITE" },
  { path: "/app/purchases",  labelKey: "purchases", Icon: IconClipboardList, permission: "PURCHASES_MANAGE" },
  { path: "/app/accounts",   labelKey: "accounts",  Icon: IconCurrency,    permission: "SALES_HISTORY" },
  { path: "/app/employees",  labelKey: "employees",  Icon: IconBriefcase,  permission: "EMPLOYEES_VIEW" },
  { path: "/app/payroll",    labelKey: "payroll",    Icon: IconCash,       permission: "EMPLOYEES_VIEW" },
  { path: "/app/accounting", labelKey: "accounting", Icon: IconBook,       permission: "ACCOUNTING_VIEW" },
  { path: "/app/reports",    labelKey: "reports",   Icon: IconChart,       permission: "REPORTS_VIEW" },
  { path: "/app/branches",   labelKey: "branches",  Icon: IconBuilding,    permission: "SETTINGS_MANAGE" },
  { path: "/app/users",      labelKey: "users",     Icon: IconUsers,       permission: "USERS_MANAGE" },
  { path: "/app/plan",       labelKey: "plan",      Icon: IconCurrency,    permission: "SETTINGS_MANAGE" },
  { path: "/app/audit",     labelKey: "audit",     Icon: IconShield,      permission: "AUDIT_VIEW" },
];

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

// ─── Notification Bell ────────────────────────────────────────────────────────

interface AlertItem {
  type: string;
  count: number;
  label: string;
  link: string;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch_ = async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/analytics/alerts", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setTotal(d.total); setAlerts(d.alerts); }
    };
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ALERT_ICONS: Record<string, string> = {
    low_stock: "📦",
    payroll: "💰",
    expiry: "⚠️",
    receivable: "💳",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</p>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin alertas pendientes</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {alerts.map((a) => (
                <button key={a.type} onClick={() => { navigate(a.link); setOpen(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                  <span className="text-lg shrink-0 mt-0.5">{ALERT_ICONS[a.type] ?? "•"}</span>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{a.label}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────────────────
type SearchResult = {
  products: { id: number; name: string; category: string | null; brand: string | null }[];
  customers: { id: number; name: string; email: string | null; phone: string | null }[];
  sales: { id: number; totalAmount: string; createdAt: string; customer: { name: string } | null }[];
};

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`/analytics/search?q=${encodeURIComponent(q.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { setResults(await res.json()); setOpen(true); }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setQ("");
    setOpen(false);
    setResults(null);
  };

  const total = results ? results.products.length + results.customers.length + results.sales.length : 0;

  return (
    <div ref={ref} className="relative hidden sm:block">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 w-48 focus-within:w-64 transition-all">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none w-full"
        />
        {loading && <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin shrink-0" />}
      </div>
      {open && results && total > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden">
          {results.products.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">Productos</p>
              {results.products.map((p) => (
                <button key={p.id} onClick={() => go("/app/inventory")}
                  className="w-full flex flex-col px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                  {(p.category || p.brand) && <span className="text-xs text-gray-400">{[p.brand, p.category].filter(Boolean).join(" - ")}</span>}
                </button>
              ))}
            </div>
          )}
          {results.customers.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">Clientes</p>
              {results.customers.map((c) => (
                <button key={c.id} onClick={() => go("/app/customers")}
                  className="w-full flex flex-col px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  {(c.email || c.phone) && <span className="text-xs text-gray-400">{c.email ?? c.phone}</span>}
                </button>
              ))}
            </div>
          )}
          {results.sales.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">Ventas</p>
              {results.sales.map((s) => (
                <button key={s.id} onClick={() => go("/app/sales")}
                  className="w-full flex flex-col px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Venta #{s.id} — ${Number(s.totalAmount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.customer?.name ?? "Sin cliente"} - {new Date(s.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </button>
              ))}
            </div>
          )}
          {total === 0 && (
            <p className="px-3 py-3 text-sm text-gray-400">Sin resultados para "{q}"</p>
          )}
        </div>
      )}
      {open && results && total === 0 && !loading && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl z-50 px-3 py-3">
          <p className="text-sm text-gray-400">Sin resultados para "{q}"</p>
        </div>
      )}
    </div>
  );
}

function NavItem({
  to,
  label,
  Icon,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  Icon: () => ReactElement;
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
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { company, user, hasPermission } = useAuth();
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

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
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
          "bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/80",
          "transition-all duration-200 ease-out",
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
          <div className="flex items-center gap-3 min-w-0">
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
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 hidden lg:block truncate max-w-[140px]">
                {company.name}
              </span>
            )}
            <GlobalSearch />
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

            {/* Campana de alertas */}
            <NotificationBell />

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
