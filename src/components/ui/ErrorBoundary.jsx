import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-base-light p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900/40 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={28} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-pastel-ink dark:text-slate-100">
              Ocurrió un error inesperado
            </h1>
            <p className="mb-6 text-sm text-pastel-muted dark:text-slate-400">
              La aplicación encontró un problema. Podés volver al inicio e intentar de nuevo.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-sky-600 px-5 py-2.5 font-medium text-white transition hover:bg-sky-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
