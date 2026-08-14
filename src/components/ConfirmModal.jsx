import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, danger }
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    const message = typeof opts === 'string' ? opts : opts.message;
    const {
      title = '¿Estás seguro?',
      confirmLabel = 'Confirmar',
      cancelLabel = 'Cancelar',
      danger = true,
    } = typeof opts === 'string' ? {} : opts;

    setState({ title, message, confirmLabel, cancelLabel, danger });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    setState(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overlay-in" onClick={() => close(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in"
          >
            <div className="p-5">
              <div className="flex items-start gap-3 mb-2">
                {state.danger && (
                  <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-red-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-headline text-base font-semibold text-brand-white">{state.title}</div>
                  <p className="text-brand-muted text-sm mt-1">{state.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-t border-brand-border">
              <button
                onClick={() => close(false)}
                className="flex-1 py-3 text-sm font-medium text-brand-muted hover:bg-brand-bg hover:text-brand-white transition"
              >
                {state.cancelLabel}
              </button>
              <div className="w-px bg-brand-border" />
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 py-3 text-sm font-medium transition ${
                  state.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-brand-ice hover:bg-brand-bg'
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Uso: const confirm = useConfirm(); const ok = await confirm({ title, message, danger, confirmLabel });
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
