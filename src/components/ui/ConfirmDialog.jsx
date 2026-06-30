import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const config =
      typeof options === 'string' ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: config.title || 'Confirmar acción',
        message: config.message || '¿Estás seguro?',
        confirmLabel: config.confirmLabel || 'Confirmar',
        cancelLabel: config.cancelLabel || 'Cancelar',
        danger: Boolean(config.danger),
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setState(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm rounded-2xl border border-edge-light bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    state.danger
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-sky-100 dark:bg-indigo-900/30'
                  }`}
                >
                  <AlertTriangle
                    size={20}
                    className={state.danger ? 'text-red-600 dark:text-red-400' : 'text-sky-600 dark:text-indigo-400'}
                  />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-pastel-ink dark:text-slate-100">{state.title}</h2>
                  <p className="mt-1 text-sm text-pastel-muted dark:text-slate-400">{state.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => close(false)} className="btn-secondary">
                  {state.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition ${
                    state.danger
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-sky-600 hover:bg-sky-500 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                  }`}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  }
  return ctx.confirm;
}
