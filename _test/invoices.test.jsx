import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const store = { posts: [], gets: [], handlers: {} };
const route = (path) => { for (const [re, fn] of Object.entries(store.handlers)) if (new RegExp(re).test(path)) return fn(path); return []; };
vi.mock('../src/lib/api', () => ({ api: {
  get: vi.fn(async (p) => { store.gets.push(p); return JSON.parse(JSON.stringify(route(p))); }),
  post: vi.fn(async (p, b) => { store.posts.push([p, b]); const h = Object.entries(store.postHandlers || {}).find(([re]) => new RegExp(re).test(p)); return h ? h[1](b, p) : { ok: true }; }),
  patch: vi.fn(async () => ({})), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
} }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario', role: 'admin', blocked_pages: [] } }) }));

import { csvToInvoices, parseFecha, parseMonto, INVOICE_CSV_TEMPLATE } from '../src/lib/invoiceCsv.js';
import NewInvoiceModal from '../src/components/NewInvoiceModal.jsx';
import InvoiceImportModal from '../src/components/InvoiceImportModal.jsx';
import Invoicing from '../src/pages/Invoicing.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

if (!File.prototype.text) File.prototype.text = function () { return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsText(this); }); };
beforeEach(() => { store.posts = []; store.gets = []; store.handlers = {}; store.postHandlers = {}; });
afterEach(() => cleanup());

describe('CSV de facturas', () => {
  it('fechas y montos en formato latino', () => {
    expect(parseFecha('02/09/2026')).toBe('2026-09-02'); expect(parseFecha('13/08/2026')).toBe('2026-08-13'); expect(parseFecha('2026-10-16')).toBe('2026-10-16');
    expect(parseFecha('2 de enero de 2026')).toBe('2026-01-02'); expect(parseFecha('04 de febrero de 2026')).toBe('2026-02-04');
    expect(parseFecha('31/02/2026')).toBe(''); expect(parseFecha('hola')).toBe(''); expect(parseFecha('')).toBe('');
    expect(parseMonto('216,00')).toBe(216); expect(parseMonto('USD 1.234,50')).toBe(1234.5); expect(parseMonto('1,234.50')).toBe(1234.5); expect(parseMonto('')).toBeNull();
  });
  it('encabezados flexibles (con tildes, en inglés), comillas con coma y cobrada', () => {
    const csv = '\uFEFFNº Factura,Razón Social,Fecha emisión,Total,Moneda,NCF,Estado\n100044,"Tuco, SAS",16/11/2026,"216,00",usd,B0100000044,Pagada\n100045,Dominspec,2026-11-16,81,,B0100000045,pendiente\n,,,,,,';
    const { rows, faltantes } = csvToInvoices(csv, 'a.csv');
    expect(faltantes).toEqual([]); expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ numero: '100044', cliente: 'Tuco, SAS', fecha: '2026-11-16', monto: 216, moneda: 'USD', ncf: 'B0100000044', cobrada: true, archivo: 'a.csv', linea: 2 });
    expect(rows[1]).toMatchObject({ monto: 81, moneda: 'USD', cobrada: false });
  });
  it('avisa qué columnas faltan y la plantilla se lee sola', () => {
    expect(csvToInvoices('cliente,total\nX,5').faltantes).toEqual(['numero', 'fecha']);
    const t = csvToInvoices(INVOICE_CSV_TEMPLATE);
    expect(t.faltantes).toEqual([]); expect(t.rows).toHaveLength(2); expect(t.rows[1].monto).toBe(216);
  });
});

describe('Nueva factura', () => {
  const abrir = (props = {}) => { store.handlers = { '^/api/products': () => [{ id: 'p1', name: 'Bit Music', price: 81, active: true }], '^/api/companies': () => ({ data: [{ id: 'c1', name: 'DOMINSPEC SRL', country: 'República Dominicana' }], count: 1 }), '^/api/deals': () => [{ id: 'd1', title: 'Trato Oviedo', currency: 'COP', company_id: 'c9', contact_id: 'k9', companies: { name: 'Oviedo' } }] }; const onCreated = vi.fn(); render(<NewInvoiceModal onClose={() => {}} onCreated={onCreated} {...props} />); return onCreated; };
  it('crea con origen, cliente, fechas, línea de producto y la marca como cobrada', async () => {
    const onCreated = abrir();
    fireEvent.change(screen.getByLabelText('Empresa que facturó'), { target: { value: 'Bithub SRL' } });
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Dominspec' } });
    fireEvent.change(screen.getByLabelText('N.º de factura'), { target: { value: '100044' } });
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-11-16' } });
    await screen.findByRole('option', { name: 'Bit Music' }); // el catálogo carga de forma asíncrona
    fireEvent.change(screen.getByLabelText('Producto de la línea 1'), { target: { value: 'p1' } });
    await waitFor(() => expect(screen.getByLabelText('Precio de la línea 1').value).toBe('81'));
    fireEvent.click(screen.getByRole('switch', { name: 'Ya está cobrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [path, body] = store.posts[0];
    expect(path).toBe('/api/invoices');
    expect(body).toMatchObject({ invoice_number: '100044', source_account: 'Bithub SRL', client_name: 'Dominspec', issue_date: '2026-11-16', currency: 'USD', status: 'pagada', paid_amount: 81, due_date: null, company_id: null });
    expect(body.line_items).toEqual([{ product_id: 'p1', description: 'Bit Music', quantity: 1, unit_price: 81 }]);
  });
  it('elegir una empresa del CRM la liga; sin cobrada queda pendiente (no manda estado)', async () => {
    const onCreated = abrir();
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'domin' } });
    fireEvent.click(await screen.findByText(/DOMINSPEC SRL/));
    expect(screen.getByText(/Ligada a la empresa «DOMINSPEC SRL»/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Descripción de la línea 1'), { target: { value: 'Servicio' } });
    fireEvent.change(screen.getByLabelText('Precio de la línea 1'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const body = store.posts[0][1];
    expect(body.company_id).toBe('c1'); expect(body.client_name).toBe('DOMINSPEC SRL'); expect('status' in body).toBe(false);
  });
  it('elegir un trato toma su empresa, contacto y moneda', async () => {
    const onCreated = abrir();
    fireEvent.change(screen.getByLabelText('Trato'), { target: { value: 'oviedo' } });
    fireEvent.click(await screen.findByText(/Trato Oviedo/));
    expect(screen.getByLabelText('Moneda').value).toBe('COP'); expect(screen.getByLabelText('Cliente').value).toBe('Oviedo');
    fireEvent.change(screen.getByLabelText('Descripción de la línea 1'), { target: { value: 'X' } }); fireEvent.change(screen.getByLabelText('Precio de la línea 1'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(store.posts[0][1]).toMatchObject({ deal_id: 'd1', company_id: 'c9', contact_id: 'k9', currency: 'COP' });
  });
  it('exige una línea y un total mayor a 0, y muestra el error del servidor', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    expect(await screen.findByText(/Agrega al menos una línea/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Descripción de la línea 1'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    expect(await screen.findByText(/total debe ser mayor a 0/)).toBeTruthy();
    const { api } = await import('../src/lib/api'); api.post.mockRejectedValueOnce(new Error('Falla del servidor'));
    fireEvent.change(screen.getByLabelText('Precio de la línea 1'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear factura' }));
    expect(await screen.findByText('Falla del servidor')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear factura' }).disabled).toBe(false);
  });
});

describe('Importar facturas', () => {
  const filaServidor = (n, cli, extra = {}) => ({ n, archivo: `f${n}.pdf`, numero: String(100000 + n), cliente: cli, monto: 81, moneda: 'USD', fecha: '2026-09-02', ncf: `B01${String(n).padStart(8, '0')}`, estado: 'nueva', avisos: [], errores: [], incluir: true, cobrada: false, ...extra });
  const pdf = (name) => new File(['%PDF-1.4 x'], name, { type: 'application/pdf' });
  const subir = (files) => fireEvent.change(screen.getByLabelText('Archivos de facturas'), { target: { files } });

  it('PDFs: se leen en tandas de 10, se revisa el lote completo y se muestra la tabla con avisos', async () => {
    const parse = vi.fn((b) => ({ rows: b.files.map((f, i) => filaServidor(i, 'Tuco SAS', { archivo: f.name })), archivos_con_error: [] }));
    store.postHandlers = {
      '/import/parse': parse,
      '/import/preview': (b) => ({ rows: b.rows.map((r, i) => ({ ...r, n: i, estado: 'nueva', avisos: i === 1 ? ['NCF impreso con letra O (BO100000032) en vez de B01'] : (r.avisos || []), errores: [] })), huecos: ['100017–100020'] }),
    };
    const onClose = vi.fn(); render(<InvoiceImportModal onClose={onClose} onImported={() => {}} />);
    subir(Array.from({ length: 12 }, (_, i) => pdf(`a${i}.pdf`)));
    await screen.findByText('12 leídas');
    expect(parse).toHaveBeenCalledTimes(2);                                   // 10 + 2
    expect(parse.mock.calls[0][0].files).toHaveLength(10); expect(parse.mock.calls[1][0].files).toHaveLength(2);
    expect(parse.mock.calls[0][0].files[0].data).toBe(btoa('%PDF-1.4 x'));    // base64 real
    expect(store.posts.some(([p]) => p.endsWith('/import/preview'))).toBe(true);
    expect(screen.getByText('12 se importarán')).toBeTruthy(); expect(screen.getByText('1 con aviso')).toBeTruthy();
    expect(screen.getByText('100017–100020')).toBeTruthy();                    // huecos de numeración
    fireEvent.click(screen.getByLabelText(/Ver 1 avisos de/)); expect(await screen.findByText(/letra O/)).toBeTruthy();
  });

  it('importa: manda origen, filas con incluir/cobrada y muestra el resultado', async () => {
    store.postHandlers = {
      '/import/parse': (b) => ({ rows: [filaServidor(0, 'Dominspec'), filaServidor(1, 'Caleya, SAS', { avisos: ['algo raro'] })], archivos_con_error: [] }),
      '/import/preview': (b) => ({ rows: b.rows.map((r, i) => ({ ...r, n: i, estado: 'nueva', avisos: i === 1 ? ['algo raro'] : [], errores: [] })), huecos: [] }),
      '/import/commit': () => ({ creadas: 1, omitidas: 1, con_empresa: 1, total: 81 }),
    };
    render(<InvoiceImportModal onClose={() => {}} onImported={() => {}} />);
    fireEvent.change(screen.getByLabelText('Empresa que facturó'), { target: { value: 'Bithub SRL' } });
    subir([pdf('x.pdf'), pdf('y.pdf')]);
    await screen.findByText('2 leídas');
    fireEvent.click(screen.getByRole('button', { name: 'Importar solo las que no tienen aviso' }));
    expect(screen.getByRole('button', { name: 'Importar 1 factura' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Cobrada 100000'));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 factura' }));
    expect(await screen.findByText('1 factura importada')).toBeTruthy();
    const [, body] = store.posts.find(([p]) => p.endsWith('/import/commit'));
    expect(body.source_account).toBe('Bithub SRL'); expect(body.origen).toBe('pdf');
    expect(body.rows.map((r) => [r.cliente, r.incluir, r.cobrada])).toEqual([['Dominspec', true, true], ['Caleya, SAS', false, false]]);
    expect(screen.getByText(/1 se omitieron/)).toBeTruthy();
  });

  it('corregir una celda vuelve a revisar el lote con el valor nuevo', async () => {
    let n = 0;
    store.postHandlers = {
      '/import/parse': () => ({ rows: [filaServidor(0, 'Dominspec')], archivos_con_error: [] }),
      '/import/preview': (b) => ({ rows: b.rows.map((r, i) => ({ ...r, n: i, estado: 'nueva', avisos: [], errores: [] })), huecos: [] }),
    };
    render(<InvoiceImportModal onClose={() => {}} />);
    subir([pdf('x.pdf')]); await screen.findByText('1 leídas');
    const antes = store.posts.filter(([p]) => p.endsWith('/import/preview')).length; n = antes;
    const total = screen.getByLabelText('Total'); fireEvent.change(total, { target: { value: '99' } }); fireEvent.blur(total);
    await waitFor(() => expect(store.posts.filter(([p]) => p.endsWith('/import/preview')).length).toBe(n + 1));
    expect(store.posts.filter(([p]) => p.endsWith('/import/preview')).pop()[1].rows[0].monto).toBe(99);
  });

  it('las que ya existen o dan error no se pueden incluir y se explican', async () => {
    store.postHandlers = {
      '/import/parse': () => ({ rows: [filaServidor(0, 'A'), filaServidor(1, 'B'), filaServidor(2, 'C')], archivos_con_error: [] }),
      '/import/preview': (b) => ({ rows: [filaServidor(0, 'A'), filaServidor(1, 'B', { estado: 'existe', avisos: ['ya está cargada en Facturación; se omite'] }), filaServidor(2, 'C', { estado: 'error', errores: ['el total debe ser mayor a 0'] })], huecos: [] }),
    };
    render(<InvoiceImportModal onClose={() => {}} />);
    subir([pdf('x.pdf')]); await screen.findByText('3 leídas');
    expect(screen.getByText('1 se importarán')).toBeTruthy(); expect(screen.getByText('1 ya existen')).toBeTruthy(); expect(screen.getByText('1 con error')).toBeTruthy();
    expect(screen.getByLabelText(/Incluir 100001 B/).disabled).toBe(true); expect(screen.getByLabelText(/Incluir 100002 C/).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Ver 1 avisos de 100002/)); expect(await screen.findByText(/el total debe ser mayor a 0/)).toBeTruthy();
  });

  it('PDF ilegible y archivo de otro tipo: se reportan por archivo sin tumbar el lote', async () => {
    store.postHandlers = {
      '/import/parse': () => ({ rows: [filaServidor(0, 'A')], archivos_con_error: [{ archivo: 'raro.pdf', error: 'No reconozco la plantilla de esta factura' }] }),
      '/import/preview': (b) => ({ rows: b.rows.map((r, i) => ({ ...r, n: i, estado: 'nueva', avisos: [], errores: [] })), huecos: [] }),
    };
    render(<InvoiceImportModal onClose={() => {}} />);
    subir([pdf('ok.pdf'), pdf('raro.pdf'), new File(['x'], 'foto.png', { type: 'image/png' })]);
    await screen.findByText('1 leídas');
    expect(screen.getByText(/No pude leer estos 2 archivos/)).toBeTruthy(); expect(screen.getByText(/solo se aceptan PDF y CSV/)).toBeTruthy(); expect(screen.getByText(/No reconozco la plantilla/)).toBeTruthy();
  });

  it('CSV: se lee en el navegador, va a revisión y se importa marcado como CSV', async () => {
    store.postHandlers = {
      '/import/preview': (b) => ({ rows: b.rows.map((r, i) => ({ ...r, n: i, estado: 'nueva', avisos: [], errores: [] })), huecos: [] }),
      '/import/commit': () => ({ creadas: 2, omitidas: 0, con_empresa: 0, total: 297 }),
    };
    render(<InvoiceImportModal onClose={() => {}} />);
    subir([new File([INVOICE_CSV_TEMPLATE], 'facturas.csv', { type: 'text/csv' })]);
    await screen.findByText('2 leídas');
    expect(store.posts.some(([p]) => p.endsWith('/import/parse'))).toBe(false);   // el CSV no pasa por el lector de PDF
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 facturas' }));
    expect(await screen.findByText('2 facturas importadas')).toBeTruthy();
    const body = store.posts.find(([p]) => p.endsWith('/import/commit'))[1];
    expect(body.origen).toBe('csv'); expect(body.rows[0]).toMatchObject({ numero: '100044', cliente: 'Dominspec', fecha: '2026-11-16', monto: 81 });
  });

  it('CSV sin las columnas necesarias explica cuáles faltan', async () => {
    render(<InvoiceImportModal onClose={() => {}} />);
    subir([new File(['cliente,total\nX,5'], 'mal.csv', { type: 'text/csv' })]);
    expect(await screen.findByText(/faltan las columnas: numero, fecha/)).toBeTruthy();
  });
});

describe('Facturación: cabecera', () => {
  const abrirPagina = () => {
    store.handlers = { '^/api/invoices/summary': () => ({ total_facturado: 0, total_cobrado: 0, total_pendiente: 0, total_vencido: 0, por_mes: [], por_cuenta: [], vencidas: [] }), '^/api/invoices': () => [] };
    store.postHandlers = { '/invoice-sync/': () => ({ created: 3, skipped: 5 }) };
    render(<ConfirmProvider><MemoryRouter><Invoicing /></MemoryRouter></ConfirmProvider>);
  };
  it('tiene «Importar facturas», un menú «Sincronizar» y «Nueva factura»', async () => {
    abrirPagina();
    expect(await screen.findByRole('button', { name: /Importar facturas/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sincronizar Stripe' })).toBeNull(); // ya no hay 3 botones sueltos
    fireEvent.click(screen.getByRole('button', { name: /^Sincronizar/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sincronizar Alegra' }));
    await waitFor(() => expect(store.posts.some(([p]) => p === '/api/invoice-sync/alegra')).toBe(true));
    expect(await screen.findByText(/Alegra: 3 nuevas, 0 actualizadas, 5 sin cambios/)).toBeTruthy();
  });
  it('los botones abren las ventanas de importar y de nueva factura', async () => {
    abrirPagina();
    fireEvent.click(await screen.findByRole('button', { name: /Importar facturas/ }));
    expect(await screen.findByText('Sube PDFs o un CSV, revísalos y confirma')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Sube PDFs o un CSV, revísalos y confirma')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Nueva factura/ }));
    expect(await screen.findByText('Registra una factura y ligala a su empresa y trato')).toBeTruthy();
  });
});
