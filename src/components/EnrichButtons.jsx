import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';

// entityType: 'contacts' | 'companies'
export default function EnrichButtons({ entityType, entityId, onEnriched }) {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');

  const enrich = async (provider) => {
    setError('');
    setLoadingProvider(provider);
    try {
      const result = await api.post(`/api/enrichment/${entityType}/${entityId}/${provider}`, {});
      onEnriched(result[entityType === 'contacts' ? 'contact' : 'company']);
    } catch (err) {
      setError(err.message || `No se pudo enriquecer con ${provider === 'lusha' ? 'Lusha' : 'Apollo'}.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => enrich('lusha')}
          disabled={!!loadingProvider}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-border text-xs text-brand-muted hover:text-brand-ice hover:border-brand-violet transition disabled:opacity-50"
        >
          <Sparkles size={12} /> {loadingProvider === 'lusha' ? 'Enriqueciendo...' : 'Lusha'}
        </button>
        <button
          onClick={() => enrich('apollo')}
          disabled={!!loadingProvider}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-border text-xs text-brand-muted hover:text-brand-ice hover:border-brand-violet transition disabled:opacity-50"
        >
          <Sparkles size={12} /> {loadingProvider === 'apollo' ? 'Enriqueciendo...' : 'Apollo'}
        </button>
      </div>
      {error && <div className="text-xs text-red-300 mt-1.5">{error}</div>}
    </div>
  );
}
