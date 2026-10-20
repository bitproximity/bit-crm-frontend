// CSV de facturas → filas para la importación. Acepta encabezados en español o inglés (con o sin tildes),
// fechas dd/mm/aaaa o AAAA-MM-DD o «2 de enero de 2026», y montos con coma decimal («216,00») o punto.
import { parseCsv } from './csv';

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const ALIASES = {
  numero: ['numero', 'nfactura', 'nofactura', 'numerodefactura', 'nrofactura', 'factura', 'invoice', 'invoicenumber', 'n'],
  cliente: ['cliente', 'client', 'razonsocial', 'nombre', 'empresa'],
  rnc: ['rnc', 'rut', 'nit', 'ruc', 'taxid'],
  ncf: ['ncf', 'comprobante', 'comprobantefiscal'],
  fecha: ['fecha', 'fechaemision', 'fechadeemision', 'date', 'issuedate'],
  monto: ['total', 'monto', 'importe', 'totalusd', 'amount', 'valor'],
  moneda: ['moneda', 'currency', 'divisa'],
  servicio: ['servicio', 'periodo', 'correspondea', 'mes'],
  descripcion: ['descripcion', 'concepto', 'detalle', 'description'],
  cantidad: ['cantidad', 'unidades', 'units', 'qty'],
  precio_unitario: ['preciounitario', 'precio', 'unitprice', 'costo'],
  cobrada: ['cobrada', 'pagada', 'pagado', 'cobrado', 'estado'],
};
const REQUERIDAS = ['numero', 'cliente', 'fecha', 'monto'];
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

export function parseMonto(s) {
  const t = String(s ?? '').replace(/[^\d.,-]/g, '');
  if (!t) return null;
  let n;
  if (t.includes(',') && t.includes('.')) n = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (t.includes(',')) n = /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  else n = t;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
};

// Devuelve AAAA-MM-DD o '' si no se entiende. Con barras se asume día/mes/año (convención latina);
// solo se invierte si el «mes» es mayor a 12 y el «día» no.
export function parseFecha(s) {
  const t = String(s ?? '').trim().toLowerCase();
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t))) return iso(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/.exec(t))) {
    let d = +m[1]; let mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return iso(+m[3], mo, d);
  }
  if ((m = /^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/.exec(t)) && MESES[m[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '')]) return iso(+m[3], MESES[m[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '')], +m[1]);
  return '';
}

const SI = new Set(['si', 'sí', 's', 'yes', 'y', '1', 'true', 'x', 'pagada', 'pagado', 'cobrada', 'cobrado', 'paid']);

// → { rows, faltantes } ; faltantes = encabezados requeridos que no aparecen
export function csvToInvoices(text, archivo = 'facturas.csv') {
  const table = parseCsv(String(text || '').replace(/^\uFEFF/, ''));
  if (table.length < 2) return { rows: [], faltantes: REQUERIDAS };
  const header = table[0].map(norm);
  const col = {};
  for (const [campo, alias] of Object.entries(ALIASES)) {
    const i = header.findIndex((h) => alias.includes(h));
    if (i >= 0) col[campo] = i;
  }
  const faltantes = REQUERIDAS.filter((c) => col[c] == null);
  if (faltantes.length) return { rows: [], faltantes };
  const get = (r, c) => (col[c] != null ? String(r[col[c]] ?? '').trim() : '');
  const rows = table.slice(1).filter((r) => r.some((x) => String(x).trim() !== '')).map((r, i) => ({
    archivo,
    linea: i + 2,
    numero: get(r, 'numero'),
    cliente: get(r, 'cliente'),
    rnc: get(r, 'rnc') || null,
    ncf: get(r, 'ncf') || null,
    fecha: parseFecha(get(r, 'fecha')) || get(r, 'fecha'),
    monto: parseMonto(get(r, 'monto')),
    moneda: (get(r, 'moneda') || 'USD').toUpperCase(),
    servicio: get(r, 'servicio') || null,
    descripcion: get(r, 'descripcion') || null,
    cantidad: parseMonto(get(r, 'cantidad')) || 1,
    precio_unitario: parseMonto(get(r, 'precio_unitario')),
    cobrada: SI.has(get(r, 'cobrada').toLowerCase()),
  }));
  return { rows, faltantes: [] };
}

export const INVOICE_CSV_TEMPLATE = [
  'numero,cliente,fecha,total,moneda,ncf,rnc,servicio,descripcion,cobrada',
  '100044,Dominspec,16/11/2026,81,USD,B0100000044,130414661,octubre 2026,Arrendamiento de Software Musical Bit Music,no',
  '100045,Tuco SAS,16/11/2026,"216,00",USD,B0100000045,132651405,octubre 2026,Arrendamiento de Software Musical Bit Music,no',
].join('\n');
