import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginPage } from "./LoginPage";
import { ToastProvider } from "../contexts/ToastContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import "../i18n";

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    consumeSessionExpiredFlag: vi.fn().mockReturnValue(false),
    setAccessToken: vi.fn(),
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  // ── Renderizado ───────────────────────────────────────────────────────────────

  it("muestra el campo de usuario", () => {
    renderLogin();
    expect(screen.getByLabelText(/usuario|username/i)).toBeInTheDocument();
  });

  it("muestra el campo de contraseña", () => {
    renderLogin();
    expect(screen.getByLabelText(/contraseña|password/i)).toBeInTheDocument();
  });

  it("muestra el botón de envío", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /entrar|sign in|iniciar/i })).toBeInTheDocument();
  });

  it("muestra el link a registro", () => {
    renderLogin();
    const link = screen.getByRole("link", { name: /crear|create account|register|registrar/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/register");
  });

  it("muestra el link de olvidé contraseña", () => {
    renderLogin();
    const link = screen.getByRole("link", { name: /olvidé|forgot|contraseña/i });
    expect(link).toBeInTheDocument();
  });

  // ── Flujo de login exitoso ────────────────────────────────────────────────────

  it("navega al dashboard tras login exitoso", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "fake-jwt-token" }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/usuario|username/i), {
      target: { value: "owner" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña|password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar|sign in|iniciar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard", { replace: true });
    });
  });

  // ── Manejo de errores ─────────────────────────────────────────────────────────

  it("muestra error cuando el servidor responde con 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Credenciales inválidas" }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/usuario|username/i), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña|password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar|sign in|iniciar/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it("muestra error cuando la respuesta no tiene token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: "no token here" }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/usuario|username/i), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña|password/i), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar|sign in|iniciar/i }));

    await waitFor(() => {
      expect(screen.getByText(/token válido/i)).toBeInTheDocument();
    });
  });

  // ── Estado de carga ───────────────────────────────────────────────────────────

  it("deshabilita el botón mientras carga", async () => {
    // fetch nunca resuelve durante el test
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    renderLogin();

    fireEvent.change(screen.getByLabelText(/usuario|username/i), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña|password/i), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar|sign in|iniciar/i }));

    await waitFor(() => {
      // While loading, the button text changes to "Signing in…" and becomes disabled
      const btn = screen.getByRole("button", { name: /signing in|cargando|entrar|sign in|iniciar/i });
      expect(btn).toBeDisabled();
    });
  });
});
