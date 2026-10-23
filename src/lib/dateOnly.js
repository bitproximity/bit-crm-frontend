// Fechas de «solo día» (columnas `date`: vencimiento y emisión de facturas, fecha de reunión de Bit Prospect…).
// El servidor las manda como 'AAAA-MM-DD'. `new Date('2026-10-09')` las interpreta como medianoche UTC, y en
// Panamá, Colombia, Ecuador o Perú (UTC-5) eso se muestra como el día ANTERIOR (8/10 en vez de 9/10) — y una
// factura del 1 de enero llegaba a mostrar el año anterior. Aquí se leen como el día calendario que son.
// Si el valor trae hora (una columna de fecha y hora), no se toca: se interpreta como siempre.
export function parseDay(value) {
  if (!value) return null;
  const text = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDay(value, locale, options) {
  const d = parseDay(value);
  return d ? d.toLocaleDateString(locale, options) : '—';
}

// «Hoy» y «este mes» según el reloj de QUIEN USA el CRM (no UTC): `new Date().toISOString().slice(0, 10)` da la
// fecha de mañana a partir de las 7 p. m. en Panamá, y eso se guardaba como fecha de inicio/emisión.
const pad = (n) => String(n).padStart(2, '0');
export function todayLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const monthLocal = (d = new Date()) => todayLocal(d).slice(0, 7);

// ¿Ya pasó esa fecha? Un día completo vence al terminar ese día (un cierre «para el 23» no está vencido el 23);
// un valor con hora se compara con el instante actual, como siempre.
export function isPastDay(value, now = new Date()) {
  if (!value) return false;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text < todayLocal(now);
  const d = new Date(text);
  return !Number.isNaN(d.getTime()) && d < now;
}
