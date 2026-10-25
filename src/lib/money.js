// Formato de dinero para las pantallas de finanzas. Todo lo agregado va en USD; la moneda original de cada factura
// o trato se muestra como dato secundario.
export const fmtUsd = (n) => `USD ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
export const fmtNative = (n, currency) => `${currency || 'USD'} ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
export const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// «hace 12 s», «hace 5 min», «hace 3 h», «hace 2 d» (a partir de segundos transcurridos)
export function ago(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 5) return 'ahora';
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}
export const agoFrom = (iso, now = Date.now()) => (iso ? ago((now - new Date(iso).getTime()) / 1000) : null);
