// Detecta montos que casi seguro están en otra moneda: p. ej. 1.320.000 cargado como USD cuando
// eran pesos colombianos (pasó con Parmessano e infló el pipeline en USD 4,3 millones).
// Un trato de Bit en dólares rara vez pasa de USD 50.000.
export const USD_SUSPICIOUS_ABOVE = 50000;

export function suspiciousUsdValue(value, currency) {
  const v = Number(value) || 0;
  return String(currency || 'USD').toUpperCase() === 'USD' && v > USD_SUSPICIOUS_ABOVE;
}

export function suspiciousMessage(value) {
  return `¿Seguro que son USD ${Number(value).toLocaleString('es')}? Es un monto muy alto para un trato en dólares. Si es en pesos (COP, MXN, DOP…), cambia la moneda antes de guardar.`;
}
