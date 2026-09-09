import { Pencil, Copy, Trash2, Check } from 'lucide-react';
import { useState } from 'react';

// Mismos 3 botones cuadrados con color propio en todas las tablas de registros
// (Contactos, Empresas, Proyectos) — antes cada pantalla resolvía "editar/borrar" distinto
// (unas con ícono en la fila, otras solo entrando al detalle), así que no había un lenguaje
// visual único como el que ya tiene Bit WiFi para esto.
export default function RowActionButtons({ onEdit, onCopy, onDelete, copyLabel = 'Copiar' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!onCopy) return;
    const text = onCopy();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-violet/15 text-brand-ice hover:bg-brand-violet/25 transition"
        >
          <Pencil size={13} />
        </button>
      )}
      {onCopy && (
        <button
          onClick={handleCopy}
          title={copyLabel}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-white transition"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
