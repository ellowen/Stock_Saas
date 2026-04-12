import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE_URL, getAccessToken, setAccessToken } from "../lib/api";

type UserMe = {
  auth: { userId: number; companyId: number; branchId?: number | null; role: string };
  user: { id: number; username: string; email?: string | null; fullName: string; role: string; companyId: number; branchId?: number | null };
  company?: {
    id: number;
    name: string;
    plan: string;
    trialEndsAt: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    legalName?: string | null;
    taxId?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    currency?: string | null;
  };
};

type AuthContextValue = {
  user: UserMe | null;
  loading: boolean;
  refetch: () => void;
  canManageUsers: boolean;
  canManageBranches: boolean;
  canViewReports: boolean;
  canManageTransfers: boolean;
  company: UserMe["company"];
  /** Check a specific permission key for the current user */
  hasPermission: (key: string) => boolean;
  /** Set of effective permission keys (loaded after login) */
  permissions: Set<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function goToLogin() {
  setAccessToken(null);
  window.location.href = "/login";
}

// Default permissions per role (mirrors backend ROLE_DEFAULTS — used before API responds)
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    "PRODUCTS_WRITE", "PRODUCTS_DELETE", "INVENTORY_WRITE",
    "SALES_VOID", "SALES_HISTORY", "TRANSFERS_APPROVE",
    "EMPLOYEES_VIEW", "EMPLOYEES_WRITE",
    "ACCOUNTING_VIEW", "ACCOUNTING_WRITE",
    "REPORTS_VIEW", "USERS_MANAGE", "SETTINGS_MANAGE", "AUDIT_VIEW",
    "CUSTOMERS_WRITE", "SUPPLIERS_WRITE", "DOCUMENTS_WRITE", "PURCHASES_MANAGE",
  ],
  MANAGER: [
    "PRODUCTS_WRITE", "PRODUCTS_DELETE", "INVENTORY_WRITE",
    "SALES_VOID", "SALES_HISTORY", "TRANSFERS_APPROVE",
    "EMPLOYEES_VIEW", "ACCOUNTING_VIEW", "REPORTS_VIEW",
    "CUSTOMERS_WRITE", "SUPPLIERS_WRITE", "DOCUMENTS_WRITE", "PURCHASES_MANAGE",
  ],
  SELLER: ["SALES_HISTORY", "CUSTOMERS_WRITE", "DOCUMENTS_WRITE"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  const loadPermissions = useCallback(async (userId: number, role: string, token: string) => {
    // OWNER has all permissions — no need to fetch
    if (role === "OWNER") {
      setPermissions(new Set(ROLE_DEFAULT_PERMISSIONS["OWNER"]));
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const granted = (data.permissions as { permission: string; effective: boolean }[])
          .filter((p) => p.effective)
          .map((p) => p.permission);
        setPermissions(new Set(granted));
      } else {
        // Fallback to role defaults if fetch fails
        setPermissions(new Set(ROLE_DEFAULT_PERMISSIONS[role] ?? []));
      }
    } catch {
      setPermissions(new Set(ROLE_DEFAULT_PERMISSIONS[role] ?? []));
    }
  }, []);

  const refetch = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE_URL}/protected/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data?.auth && data?.user) {
          setUser({ auth: data.auth, user: data.user, company: data.company });
          await loadPermissions(data.auth.userId, data.auth.role, token);
        } else {
          setUser(null);
          goToLogin();
          return;
        }
      } else {
        setUser(null);
        goToLogin();
        return;
      }
    } catch {
      setUser(null);
      goToLogin();
      return;
    } finally {
      setLoading(false);
    }
  }, [loadPermissions]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const role = user?.auth?.role ?? "";
  const canManageUsers = role === "OWNER" || role === "MANAGER";
  const canManageBranches = role === "OWNER" || role === "MANAGER";
  const canViewReports = permissions.has("REPORTS_VIEW");
  const canManageTransfers = permissions.has("TRANSFERS_APPROVE");

  const hasPermission = useCallback((key: string) => permissions.has(key), [permissions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
          Cargando…
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, refetch, canManageUsers, canManageBranches, canViewReports, canManageTransfers, company: user?.company, hasPermission, permissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
