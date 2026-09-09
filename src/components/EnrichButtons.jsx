import { useState } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

// entityType: 'contacts' | 'companies'
// FIX 2026-09 — a pedido ("mejoralo"): antes Lusha y Apollo eran dos
// botones idénticos (mismo ícono ✨, mismo color gris) — solo se
// distinguían por el texto. Ahora cada uno tiene su propio color de
// marca (Lusha en violeta/magenta, Apollo en celeste — los colores
// reales de cada producto), un spinner de verdad mientras enriquece
// (antes solo cambiaba el texto), y una confirmación visual (✓ verde,
// 2 segundos) cuando termina bien — antes un enriquecimiento exitoso no
// mostraba ninguna señal, solo los errores se veían.
const PROVIDERS = {
  lusha:  { label: 'Lusha',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  apollo: { label: 'Apollo', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' },
};

export default function EnrichButtons({ entityType, entityId, onEnriched }) {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [doneProvider, setDoneProvider] = useState(null);
  const [error, setError] = useState('');

  const enrich = async (provider) => {
    setError('');
    setDoneProvider(null);
    setLoadingProvider(provider);
    try {
      const result = await api.post(`/api/enrichment/${entityType}/${entityId}/${provider}`, {});
      onEnriched(result[entityType === 'contacts' ? 'contact' : 'company']);
      setDoneProvider(provider);
      setTimeout(() => setDoneProvider((p) => (p === provider ? null : p)), 2000);
    } catch (err) {
      setError(err.message || `No se pudo enriquecer con ${PROVIDERS[provider].label}.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        {Object.entries(PROVIDERS).map(([key, p]) => {
          const isLoading = loadingProvider === key;
          const isDone = doneProvider === key;
          return (
            <button
              key={key}
              onClick={() => enrich(key)}
              disabled={!!loadingProvider}
              style={{
                color: isDone ? '#4ade80' : p.color,
                background: isDone ? 'rgba(74,222,128,0.1)' : p.bg,
                borderColor: isDone ? 'rgba(74,222,128,0.3)' : p.border,
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 hover:brightness-125 hover:-translate-y-px hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : isDone ? <Check size={12} /> : <Sparkles size={12} />}
              {isLoading ? 'Enriqueciendo...' : isDone ? '¡Listo!' : p.label}
            </button>
          );
        })}
      </div>
      {error && <div className="text-xs text-red-300 mt-1.5">{error}</div>}
    </div>
  );
}
