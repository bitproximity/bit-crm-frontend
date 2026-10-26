// Un monto en su moneda original CON su equivalente en USD a la tasa del día: «COP 1.071.000 ≈ USD 337».
// Todas las pantallas que muestran montos sueltos usan esto, para ver el panorama en una sola moneda sin perder el dato original.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

let ratesPromise = null; let ratesAt = 0;
export function resetRatesCache() { ratesPromise = null; ratesAt = 0; }
function loadRates() {
  if (!ratesPromise || Date.now() - ratesAt > 5 * 60 * 1000) {
    ratesAt = Date.now();
    ratesPromise = api.get('/api/exchange-rates')
      .then((rows) => Object.fromEntries((Array.isArray(rows) ? rows : []).map((r) => [String(r.currency).toUpperCase(), Number(r.rate_to_usd)])))
      .catch(() => { ratesPromise = null; return {}; });
  }
  return ratesPromise;
}
export function useRates() {
  const [rates, setRates] = useState(null);
  useEffect(() => { let on = true; loadRates().then((r) => { if (on) setRates(r); }); return () => { on = false; }; }, []);
  return rates;
}

export default function Money({ value, currency = 'USD', locale = 'es-CO', stack = false, className = '' }) {
  const rates = useRates();
  const cur = String(currency || 'USD').toUpperCase();
  const n = Number(value || 0);
  const native = `${cur} ${n.toLocaleString(locale)}`;
  const rate = cur === 'USD' ? null : rates?.[cur];
  return (
    <span className={className}>
      {native}
      {rate > 0 && n > 0 && <span className={stack ? 'block text-[10px] text-brand-muted font-tech' : 'ml-1.5 text-[10px] text-brand-muted font-tech'}>≈ USD {Math.round(n * rate).toLocaleString('en-US')}</span>}
      {cur !== 'USD' && rates && !(rate > 0) && <span className={stack ? 'block text-[10px] text-yellow-300' : 'ml-1.5 text-[10px] text-yellow-300'}>sin tasa</span>}
    </span>
  );
}
