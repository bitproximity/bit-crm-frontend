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
