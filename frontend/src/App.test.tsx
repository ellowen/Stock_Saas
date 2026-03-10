import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import "./i18n";

function renderApp(initialRoute = "/") {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe("App", () => {
  it("renders landing at / and shows GIRO and a link to login", () => {
    renderApp("/");
    expect(screen.getByText("GIRO")).toBeInTheDocument();
    const loginLinks = screen.getAllByRole("link", { name: /entrar|enter|sign in|iniciar|already have account/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute("href", "/login");
  });

  it("renders login page at /login with heading and submit button", () => {
    renderApp("/login");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar|submit|sign in/i })).toBeInTheDocument();
  });

  it("redirects unknown routes to home", () => {
    renderApp("/unknown-route");
    expect(screen.getByText("GIRO")).toBeInTheDocument();
  });
});
