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
};

const AuthContext = createContext<AuthContextValue | null>(null);

function goToLogin() {
  setAccessToken(null);
  window.location.href = "/login";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const role = user?.auth?.role ?? "";
  const canManageUsers = role === "OWNER" || role === "MANAGER";
  const canManageBranches = role === "OWNER" || role === "MANAGER";
  const canViewReports = role === "OWNER" || role === "MANAGER";
  const canManageTransfers = role === "OWNER" || role === "MANAGER";

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
    <AuthContext.Provider value={{ user, loading, refetch, canManageUsers, canManageBranches, canViewReports, canManageTransfers, company: user?.company }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
