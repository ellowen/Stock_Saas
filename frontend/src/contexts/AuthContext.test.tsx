import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../lib/api", () => ({
  API_BASE_URL: "http://localhost:4000",
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

// Mock window.location para evitar errores de navegación en jsdom
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "" },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function TestConsumer() {
  const { user, loading, canManageUsers, canViewReports } = useAuth();
  if (loading) return <div>cargando</div>;
  if (!user) return <div>sin usuario</div>;
  return (
    <div>
      <span data-testid="username">{user.user.username}</span>
      <span data-testid="role">{user.auth.role}</span>
      <span data-testid="can-manage-users">{canManageUsers ? "si" : "no"}</span>
      <span data-testid="can-view-reports">{canViewReports ? "si" : "no"}</span>
    </div>
  );
}

const USER_RESPONSE = {
  auth: { userId: 1, companyId: 10, role: "OWNER" },
  user: { id: 1, username: "admin", fullName: "Admin User", email: null, role: "OWNER", companyId: 10 },
  company: { id: 10, name: "Acme", plan: "FREE", trialEndsAt: null, subscriptionStatus: "trialing" },
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthContext", () => {
  let mockGetAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("../lib/api");
    mockGetAccessToken = api.getAccessToken as ReturnType<typeof vi.fn>;
  });

  // ── Sin token ─────────────────────────────────────────────────────────────────

  it("no renderiza hijos cuando no hay token (redirige a login)", async () => {
    mockGetAccessToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // AuthProvider retorna null cuando user=null (después de cargar)
    await waitFor(() => {
      expect(screen.queryByTestId("username")).not.toBeInTheDocument();
    });
  });

  // ── Con token válido ──────────────────────────────────────────────────────────

  it("carga el usuario cuando el token es válido", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => USER_RESPONSE,
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("username")).toHaveTextContent("admin");
    });
  });

  it("muestra el rol del usuario correctamente", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => USER_RESPONSE,
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("role")).toHaveTextContent("OWNER");
    });
  });

  // ── Permisos según rol ────────────────────────────────────────────────────────

  it("OWNER tiene canManageUsers=true y canViewReports=true", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => USER_RESPONSE, // role: OWNER
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("can-manage-users")).toHaveTextContent("si");
      expect(screen.getByTestId("can-view-reports")).toHaveTextContent("si");
    });
  });

  it("SELLER no tiene canManageUsers ni canViewReports", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    const sellerResponse = {
      ...USER_RESPONSE,
      auth: { ...USER_RESPONSE.auth, role: "SELLER" },
      user: { ...USER_RESPONSE.user, role: "SELLER" },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sellerResponse,
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("can-manage-users")).toHaveTextContent("no");
      expect(screen.getByTestId("can-view-reports")).toHaveTextContent("no");
    });
  });

  // ── Token inválido / error de fetch ──────────────────────────────────────────

  it("limpia el usuario cuando /protected/me responde 401", async () => {
    mockGetAccessToken.mockReturnValue("expired-token");
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("username")).not.toBeInTheDocument();
    });
  });

  it("maneja error de red sin romper la app", async () => {
    mockGetAccessToken.mockReturnValue("some-token");
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("username")).not.toBeInTheDocument();
    });
  });

  // ── useAuth fuera de provider ─────────────────────────────────────────────────

  it("useAuth lanza error cuando se usa fuera del AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
    consoleError.mockRestore();
  });
});
