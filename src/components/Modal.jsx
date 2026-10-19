// Ventanas compartidas del CRM: Modal (centrado) y Drawer (panel lateral derecho). Mismo lenguaje
// visual para crear actividades, editar empresas, crear formularios… Se cierran con Esc o al hacer
// clic fuera. Los contenidos y botones los pone cada pantalla.
import { useEffect } from 'react';
import { X } from 'lucide-react';

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function Header({ icon: Icon, title, subtitle, onClose }) {
  return (
    <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-brand-border">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-white" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-headline text-lg font-semibold leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="icon-btn p-1.5 -mr-1.5 rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg">
        <X size={18} />
      </button>
    </div>
  );
}

export function Modal({ title, subtitle, icon, onClose, children, footer, width = 'max-w-xl' }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] overlay-in" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden modal-in`}>
        <Header icon={icon} title={title} subtitle={subtitle} onClose={onClose} />
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-brand-border bg-brand-bg/40 flex items-center gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, icon, onClose, children, footer, width = 'max-w-md' }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] overlay-in" onClick={onClose} />
      <div
        className={`relative w-full ${width} h-full bg-brand-panel border-l border-brand-border shadow-2xl flex flex-col`}
        style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <Header icon={icon} title={title} subtitle={subtitle} onClose={onClose} />
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-brand-border bg-brand-bg/40 flex items-center gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

// Campo con etiqueta y ayuda opcional.
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-1.5">{label}</label>}
      {children}
      {hint && <p className="text-[11px] text-brand-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition';
export const selectCls = `${inputCls} cursor-pointer`;
export const primaryBtn = 'whitespace-nowrap px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition';
export const ghostBtn = 'whitespace-nowrap px-4 py-2.5 rounded-xl text-sm text-brand-muted hover:text-brand-white hover:bg-brand-bg transition';
