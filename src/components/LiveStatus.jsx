import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ago } from '../lib/money';

// Indicador «● En vivo · actualizado hace 12 s» con botón para actualizar ahora. Se pone en ámbar si hace más de 2 minutos
// que no se actualiza (pestaña en segundo plano, sin conexión…).
export default function LiveStatus({ lastUpdated, onRefresh, refreshing = false, className = '' }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  const secs = lastUpdated ? Math.max(0, (now - lastUpdated) / 1000) : null;
  const old = secs != null && secs > 120;
  return (
    <button
      type="button"
      onClick={onRefresh}
      title="Actualizar ahora"
      aria-label="Actualizar ahora"
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] transition hover:border-brand-violet ${old ? 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10' : 'border-brand-border text-brand-muted bg-brand-panel'} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${secs == null ? 'bg-brand-muted' : old ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
      <span>{secs == null ? 'Cargando…' : `${old ? 'Sin actualizar' : 'En vivo'} · ${ago(secs)}`}</span>
      <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
    </button>
  );
}
