import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAutoRefresh } from './useAutoRefresh';

// Métricas financieras del CEO (/api/finance), siempre en USD, con actualización automática cada minuto.
// `forbidden` = el usuario no tiene permiso a Facturación: las pantallas ocultan el bloque en vez de mostrar un error.
export function useFinance({ intervalMs = 60000, refreshSignal = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => api.get('/api/finance')
    .then((d) => {
      // Una respuesta que no tiene la forma esperada (despliegue a medias, error del proxy) no debe romper la pantalla.
      if (!d || !d.sales || !d.collections || !d.rates) throw new Error('El servidor devolvió una respuesta inesperada de finanzas.');
      setData(d); setError(''); setForbidden(false); setLastUpdated(Date.now()); })
    .catch((e) => {
      if (/permis|acceso|no tienes|bloquead/i.test(e.message || '')) setForbidden(true);
      else setError(e.message || 'No se pudieron cargar las finanzas.');
    }), []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshSignal) load(); }, [refreshSignal, load]); // la pantalla pide actualizar todo (botón «En vivo»)
  const refresh = useAutoRefresh(load, { intervalMs });
  const refreshNow = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  return { data, error, forbidden, lastUpdated, refreshing, refreshNow };
}
