import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const SAVE_STORAGE_KEY = 'aldea_ia_saved_state_v2';

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error recuperable en Aldea IA:', error, info);
  }

  private handleSafeReset = async () => {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    try {
      await fetch('/api/state', { method: 'DELETE' });
    } catch {
      // Ignore network error
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0f1c] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111827] border border-rose-700/70 rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <h1 className="text-lg font-bold text-rose-300">
              Recuperación segura de Aldea IA
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Se detectó un estado guardado inconsistente durante la sesión. El código base está intacto; podés restaurar un inicio limpio sin perder el acceso al simulador.
            </p>
            <button
              type="button"
              onClick={() => void this.handleSafeReset()}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              Reiniciar aldea de forma segura
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
