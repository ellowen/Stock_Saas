import type { ReactNode } from "react";
import { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h1 className="text-lg font-semibold text-red-600">Algo salió mal</h1>
            <p className="mt-2 text-sm text-slate-600">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.href = "/login"}
              className="mt-4 rounded-lg btn-primary px-4 py-2 text-sm font-medium"
            >
              Volver a entrar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
