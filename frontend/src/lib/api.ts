export const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4000");

const TOKEN_KEY = "access_token";

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null, persistent = true) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (token) {
    if (persistent) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const SESSION_EXPIRED_KEY = "session_expired";

/**
 * fetch que ante 401 limpia el token y redirige a login.
 * Guarda un flag para que LoginPage muestre "Sesión expirada".
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    setAccessToken(null);
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
    window.location.href = "/login";
  }
  return res;
}

/** Para que LoginPage sepa si mostrar el toast de sesión expirada. */
export function consumeSessionExpiredFlag(): boolean {
  if (typeof window === "undefined") return false;
  const had = sessionStorage.getItem(SESSION_EXPIRED_KEY);
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return had === "1";
}

