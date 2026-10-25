import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within, act, renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const calls = { get: [], post: [], patch: [] };
let responses = {};
let failFor = null; // regex de rutas que fallan
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => {
      calls.get.push(p);
      if (failFor && failFor.test(p)) throw new Error(failFor.message || 'No tienes permisos para esta acción');
      const key = Object.keys(responses).find((k) => p.startsWith(k));
      if (!key) return [];
      const v = responses[key];
      return typeof v === 'function' ? v(p) : JSON.parse(JSON.stringify(v));
    }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); const k = Object.keys(responses).find((x) => x === `POST ${p}`); return k ? JSON.parse(JSON.stringify(responses[k])) : {}; }),
    patch: vi.fn(async (p, b) => { calls.patch.push([p, b]); return {}; }), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario Ramos', role: 'admin', blocked_pages: [] } }) }));

import { fmtUsd, fmtNative, ago, agoFrom, pct } from '../src/lib/money.js';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh.js';
import LiveStatus from '../src/components/LiveStatus.jsx';
import ReconciliationPanel from '../src/components/ReconciliationPanel.jsx';
import FinancePanel, { FinanceStrip } from '../src/components/FinancePanel.jsx';
import StaleDealsBanner from '../src/components/StaleDealsBanner.jsx';
import StaleDeals from '../src/pages/StaleDeals.jsx';
import Invoicing from '../src/pages/Invoicing.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';
import { canAccessPath } from '../src/lib/permissions.js';

const wrap = (el, path = '/') => render(<ConfirmProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={el} /></Routes></MemoryRouter></ConfirmProvider>);
beforeEach(() => { calls.get = []; calls.post = []; calls.patch = []; responses = {}; failFor = null; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const FIN = {
  year: 2026, month: '2026-10',
  sales: { won_month_usd: 14200, won_ytd_usd: 188400, won_count_month: 5, won_count_ytd: 64 }, billing: { facturado_month_usd: 9800, facturado_ytd_usd: 128450, invoices_ytd: 790 },
  collections: { cobrado_ytd_usd: 91200, cobros_month_usd: 6400, por_cobrar_usd: 37250, vencido_usd: 12400, vencido_count: 7, collection_rate_pct: 71, aging: { al_dia: 24850, '1_30': 5200, '31_60': 4600, '61_90': 1800, mas_90: 800 }, dso_days: 23, dso_sample: 118, dso_by_account: [] },
  top_debtors: [{ client: 'ETH SOLUCIONES', overdue_usd: 4100, invoices: 3, max_days_late: 64 }], slowest_payers: [{ client: 'Alcaldía de Castilla', avg_days_to_pay: 58, invoices: 3 }],
  leaders: { product: { name: 'Bit WiFi', won_usd: 88938 }, country: { name: 'Ecuador', won_usd: 71200 }, pipeline: { name: 'Bit WiFi', won_usd: 88938 } },
  by_country: [{ name: 'Ecuador', won_usd: 71200, won_count: 22 }], by_product: [{ name: 'Bit WiFi', won_usd: 88938, won_count: 253 }], by_pipeline: [{ name: 'Bit WiFi', won_usd: 88938, won_count: 253 }],
  closing_speed: { avg_days: 38, sample: 52, slowest_pipelines: [{ name: 'Neomedia', avg_days: 71, deals: 9 }], slowest_countries: [{ name: 'Colombia', avg_days: 52, deals: 14 }], slowest_products: [] },
  reconciliation: { won_usd: 188400, won_with_invoice_usd: 132000, coverage_pct: 70, won_without_invoice: 26, won_without_invoice_usd: 56400, invoices_unlinked: 138 },
  rates: { updated_at: new Date(Date.now() - 3 * 3600000).toISOString(), currencies: ['COP', 'USD'], missing: [] },
};

describe('formato de dinero y tiempo', () => {
  it('USD con separadores, monto original y porcentajes', () => {
    expect(fmtUsd(188400)).toBe('USD 188,400'); expect(fmtUsd(267.75)).toBe('USD 268'); expect(fmtUsd(null)).toBe('USD 0');
    expect(fmtNative(1071000, 'COP')).toBe('COP 1,071,000'); expect(pct(2000, 8527)).toBe(23); expect(pct(1, 0)).toBe(0);
  });
  it('«hace X» en segundos, minutos, horas y días', () => {
    expect([ago(2), ago(12), ago(300), ago(7200), ago(200000)]).toEqual(['ahora', 'hace 12 s', 'hace 5 min', 'hace 2 h', 'hace 2 d']);
    expect(agoFrom(null)).toBeNull();
  });
});

describe('actualización automática', () => {
  it('pide los datos cada intervalo mientras la pestaña está a la vista, y no cuando está oculta', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fn = vi.fn(async () => {});
    renderHook(() => useAutoRefresh(fn, { intervalMs: 30000 }));
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(fn).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(fn).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('al volver a la ventana actualiza de inmediato, nunca corre dos a la vez y se detiene si se desactiva', async () => {
    let release; const fn = vi.fn(() => new Promise((r) => { release = r; }));
    const { rerender } = renderHook(({ on }) => useAutoRefresh(fn, { intervalMs: 999999, enabled: on }), { initialProps: { on: true } });
    await act(async () => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
    expect(fn).toHaveBeenCalledTimes(1);          // el segundo foco se ignora: ya hay uno en curso
    await act(async () => { release(); });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(fn).toHaveBeenCalledTimes(2);
    rerender({ on: false });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('un error al actualizar no rompe nada ni detiene las siguientes', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('caído')).mockResolvedValue(undefined);
    renderHook(() => useAutoRefresh(fn, { intervalMs: 999999 }));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('indicador en vivo', () => {
  it('cargando → en vivo con la antigüedad → ámbar si pasan 2 minutos; el clic actualiza', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const onRefresh = vi.fn();
    const { rerender } = render(<LiveStatus lastUpdated={null} onRefresh={onRefresh} />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
    rerender(<LiveStatus lastUpdated={Date.now()} onRefresh={onRefresh} />);
    expect(screen.getByText(/En vivo · ahora/)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.getByText(/En vivo · hace 20 s/)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(130000); });
    expect(screen.getByText(/Sin actualizar · hace 2 min/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar ahora' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('Conciliación factura ↔ trato', () => {
  const REC = {
    year: 2026, missing_rates: ['PYG'],
    totals: { won_deals: 64, won_usd: 188400, won_with_invoice: 38, won_with_invoice_usd: 132000, won_without_invoice: 26, won_without_invoice_usd: 56400, coverage_pct: 70, invoices_total: 840, invoices_linked: 702, invoices_unlinked: 138, invoices_unlinked_usd: 41200, auto_linkable: 31 },
    unlinked_invoices: [
      { id: 'f3', invoice_number: 'BIT7', client_name: 'ETH SOLUCIONES', source_account: 'Bit Colombia SAS', issue_date: '2026-09-25', total: 357000, currency: 'COP', total_usd: 89, company_id: 'c1', confidence: 'alta', suggestions: [{ deal_id: 'd1', title: 'Alcaldía de Castilla', value_usd: 268, amount_match: false }] },
      { id: 'f4', invoice_number: '100041', client_name: 'Caleya, SAS', source_account: 'Bithub SRL', issue_date: '2026-10-16', total: 27, currency: 'USD', total_usd: 27, company_id: 'c2', confidence: 'media', suggestions: [{ deal_id: 'd2', title: 'Caleya sede 1', value_usd: 324, amount_match: false }, { deal_id: 'd3', title: 'Caleya sede 2', value_usd: 27, amount_match: true }] },
      { id: 'f9', invoice_number: 'B2091', client_name: 'Nuevo SAS', source_account: 'Mario Colombia', issue_date: '2026-10-21', total: 800, currency: 'USD', total_usd: 800, company_id: null, confidence: 'ninguna', suggestions: [] },
    ],
    won_without_invoice: [{ id: 'w1', title: 'Neomedia — Banco Unión', company_name: 'Banco Unión', value: 18000, currency: 'USD', value_usd: 18000, closed_at: '2026-09-30T15:00:00Z', product_line: 'Neomedia' }],
  };
  beforeEach(() => { responses['/api/finance/reconciliation'] = REC; responses['POST /api/finance/auto-link'] = { linked_deals: 31, linked_companies: 12 }; });

  it('muestra lo ganado vs lo facturado en USD, las facturas sin trato con su confianza y los ganados sin factura', async () => {
    wrap(<ReconciliationPanel isAdmin />);
    expect(await screen.findByText('USD 188,400')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('USD 56,400')).toBeTruthy();
    expect(calls.get[0]).toBe(`/api/finance/reconciliation?year=${new Date().getFullYear()}`);
    expect(screen.getByText(/Falta la tasa de cambio de PYG/)).toBeTruthy();
    const bit7 = screen.getByText(/BIT7/).closest('div.px-4');
    expect(within(bit7).getByText('Seguro')).toBeTruthy(); expect(within(bit7).getByText('USD 89')).toBeTruthy(); expect(within(bit7).getByText('COP 357,000')).toBeTruthy();
    const cal = screen.getByText(/100041/).closest('div.px-4');
    expect(within(cal).getAllByText('Posible').length).toBe(2); expect(within(cal).getByText(/USD 27 ✓/)).toBeTruthy(); // el que coincide en monto
    expect(screen.getByText(/No se reconoce la empresa por su nombre/)).toBeTruthy();
    expect(screen.getByText('Neomedia — Banco Unión')).toBeTruthy();
  });
  it('vincular una factura a la sugerencia llama al servicio con su trato y su empresa, y recarga', async () => {
    wrap(<ReconciliationPanel isAdmin onChanged={() => calls.get.push('cambió')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Seguro.*Alcaldía de Castilla/ }));
    await waitFor(() => expect(calls.patch).toContainEqual(['/api/invoices/f3', { deal_id: 'd1', company_id: 'c1' }]));
    expect(await screen.findByText(/BIT7 quedó vinculada a «Alcaldía de Castilla»/)).toBeTruthy();
    expect(calls.get.filter((g) => String(g).startsWith('/api/finance/reconciliation')).length).toBe(2);
  });
  it('«Vincular automáticamente» pide confirmación antes de actuar y avisa el resultado', async () => {
    wrap(<ReconciliationPanel isAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /Vincular automáticamente \(31 seguras\)/ }));
    expect(calls.post.length).toBe(0);                                  // todavía no: espera el «Vincular» del cuadro
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(calls.post).toContainEqual(['/api/finance/auto-link', {}]));
    expect(await screen.findByText(/31 facturas vinculadas a su trato y 12 a su empresa/)).toBeTruthy();
  });
  it('quien no es admin ve la conciliación pero no el botón de vinculación automática', async () => {
    wrap(<ReconciliationPanel isAdmin={false} />);
    await screen.findByText('USD 188,400');
    expect(screen.queryByRole('button', { name: /Vincular automáticamente/ })).toBeNull();
  });
  it('cambiar de año pide ese año; si falla, avisa y permite reintentar', async () => {
    wrap(<ReconciliationPanel isAdmin />);
    await screen.findByText('USD 188,400');
    fireEvent.click(screen.getByRole('button', { name: String(new Date().getFullYear() - 1) }));
    await waitFor(() => expect(calls.get).toContain(`/api/finance/reconciliation?year=${new Date().getFullYear() - 1}`));
    cleanup(); failFor = Object.assign(/reconciliation/, { message: 'No se pudo calcular la conciliación: boom' });
    wrap(<ReconciliationPanel isAdmin />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo calcular la conciliación/);
    failFor = null; fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('USD 188,400')).toBeTruthy();
  });
});

describe('Finanzas del CEO', () => {
  beforeEach(() => { responses['/api/finance'] = FIN; });
  it('la franja del Dashboard muestra ganado, facturado, cobros, por cobrar y vencido en USD, con los líderes', async () => {
    wrap(<FinanceStrip />);
    expect(await screen.findByText('USD 14,200')).toBeTruthy();
    for (const t of ['USD 9,800', 'USD 6,400', 'USD 37,250', 'USD 12,400']) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText(/71% de lo facturado en el año/)).toBeTruthy(); expect(screen.getByText(/se cobra en ~23 días/)).toBeTruthy();
    expect(screen.getByText('Bit WiFi')).toBeTruthy(); expect(screen.getByText('Ecuador')).toBeTruthy();
    expect(screen.getByText(/Alcaldía de Castilla/)).toBeTruthy(); expect(screen.getByText(/58 días/)).toBeTruthy();
    expect(screen.getByText(/26 tratos ganados sin factura \(USD 56,400\)/)).toBeTruthy();
  });
  it('sin permiso a Facturación el bloque desaparece; otros errores se muestran con «Reintentar»', async () => {
    failFor = Object.assign(/\/api\/finance/, { message: 'No tienes permisos para esta acción' });
    const { container } = wrap(<FinanceStrip />);
    await waitFor(() => expect(calls.get.length).toBeGreaterThan(0));
    await waitFor(() => expect(container.querySelector('section')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup(); failFor = Object.assign(/\/api\/finance/, { message: 'No se pudieron calcular las métricas financieras: boom' });
    wrap(<FinanceStrip />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/boom/);
  });
  it('el panel completo de Métricas: cartera, morosos, quién tarda en pagar, países, productos y velocidad de cierre', async () => {
    wrap(<FinancePanel />);
    expect(await screen.findByText(/Finanzas y cobranza/)).toBeTruthy();
    expect(screen.getByText('USD 24,850')).toBeTruthy(); expect(screen.getByText('USD 800')).toBeTruthy();
    expect(screen.getByText('ETH SOLUCIONES')).toBeTruthy(); expect(screen.getByText(/hasta 64 días de atraso/)).toBeTruthy();
    expect(screen.getByText(/Promedio general de cobro:/).textContent).toMatch(/23 días \(118 facturas\)/);
    expect(screen.getByText(/promedio 38 días/)).toBeTruthy(); expect(screen.getByText('71 d')).toBeTruthy();
    expect(screen.getByText(/70% de lo ganado en 2026 ya tiene factura/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /26 sin factura · 138 facturas sin trato/ }).getAttribute('href')).toBe('/invoicing');
  });
  it('avisa si falta la tasa de una moneda y que lo de esa moneda no se suma', async () => {
    responses['/api/finance'] = { ...FIN, rates: { ...FIN.rates, missing: ['PYG'] } };
    wrap(<FinanceStrip />);
    expect(await screen.findByText(/Falta la tasa de cambio de PYG/)).toBeTruthy();
  });
  it('la señal de actualizar de la pantalla vuelve a pedir las finanzas', async () => {
    const { rerender } = wrap(<FinanceStrip refreshSignal={0} />);
    await screen.findByText('USD 14,200');
    const n = calls.get.length;
    rerender(<ConfirmProvider><MemoryRouter><Routes><Route path="*" element={<FinanceStrip refreshSignal={1} />} /></Routes></MemoryRouter></ConfirmProvider>);
    await waitFor(() => expect(calls.get.length).toBeGreaterThan(n));
  });
});

describe('Tratos estáticos', () => {
  const STALE = {
    days: 14, missing_rates: [],
    summary: { count: 3, value_usd: 21150, without_next_step: 2, with_reminder: 1, buckets: { '14_29': { count: 1, value_usd: 2250 }, '30_59': { count: 1, value_usd: 18000 }, '60_89': { count: 1, value_usd: 900 }, '90_mas': { count: 0, value_usd: 0 } }, by_owner: [{ owner_id: 'u1', owner: 'Sofia Florido', count: 1, value_usd: 18000 }] },
    deals: [
      { id: 's1', title: 'Neomedia — Banco Unión', company: 'Banco Unión', owner: 'Sofia Florido', stage: 'Propuesta', pipeline: 'Neomedia', value: 18000, currency: 'USD', value_usd: 18000, days_idle: 41, last_touch: '2026-09-14T10:00:00Z', last_touch_kind: 'actividad', last_activity: { type: 'nota', summary: 'Pidió ajustar el precio' }, open_tasks: 0, has_reminder: false, priority: 'alta' },
      { id: 's2', title: 'Bit WiFi — Hotel Mirador', company: 'Hotel Mirador', owner: 'Ana Espinel', stage: 'Demo', pipeline: 'Bit WiFi', value: 9000000, currency: 'COP', value_usd: 2250, days_idle: 27, last_touch: '2026-09-28T10:00:00Z', last_touch_kind: 'actividad', last_activity: null, open_tasks: 1, has_reminder: false, priority: 'media' },
      { id: 's3', title: 'Email Marketing — Centro Cerámico', company: 'Centro Cerámico', owner: null, stage: 'Negociación', pipeline: 'Bit WiFi', value: 900, currency: 'USD', value_usd: 900, days_idle: 66, last_touch: '2026-08-20T10:00:00Z', last_touch_kind: 'creación', last_activity: null, open_tasks: 1, has_reminder: true, priority: 'baja' },
    ],
  };
  beforeEach(() => { responses['/api/stale-deals'] = STALE; responses['POST /api/stale-deals/remind'] = { created: 2, skipped: 0, already_had_reminder: 0, not_open: 0 }; });

  it('lista los tratos por dinero en juego, en USD con el monto original, con su estado', async () => {
    wrap(<StaleDeals />);
    expect(await screen.findByText('Neomedia — Banco Unión')).toBeTruthy();
    expect(calls.get[0]).toBe('/api/stale-deals?days=14');
    expect(screen.getByText('USD 21,150')).toBeTruthy();
    const r2 = screen.getByText('Bit WiFi — Hotel Mirador').closest('tr');
    expect(within(r2).getByText('USD 2,250')).toBeTruthy(); expect(within(r2).getByText('COP 9,000,000')).toBeTruthy(); expect(within(r2).getByText('1 tarea abierta')).toBeTruthy();
    expect(within(screen.getByText('Neomedia — Banco Unión').closest('tr')).getByText('Sin siguiente paso')).toBeTruthy();
    expect(within(screen.getByText('Email Marketing — Centro Cerámico').closest('tr')).getByText('Recordatorio creado')).toBeTruthy();
    expect(within(screen.getByText('Email Marketing — Centro Cerámico').closest('tr')).getByText('Sin responsable')).toBeTruthy();
  });
  it('el umbral de días vuelve a pedir la lista con ese umbral', async () => {
    wrap(<StaleDeals />);
    await screen.findByText('Neomedia — Banco Unión');
    fireEvent.click(screen.getByRole('button', { name: '30+ días' }));
    await waitFor(() => expect(calls.get).toContain('/api/stale-deals?days=30'));
  });
  it('«Seleccionar los que no tienen recordatorio» + «Crear recordatorios» envía solo esos tratos', async () => {
    wrap(<StaleDeals />);
    await screen.findByText('Neomedia — Banco Unión');
    expect(screen.getByRole('button', { name: /Crear recordatorios/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar los que no tienen recordatorio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear recordatorios (2)' }));
    await waitFor(() => expect(calls.post).toContainEqual(['/api/stale-deals/remind', { deal_ids: ['s1', 's2'], due_in_days: 1 }]));
    expect(await screen.findByText(/2 recordatorios creados para mañana a las 9:00/)).toBeTruthy();
  });
  it('la búsqueda filtra, y el estado vacío es amable', async () => {
    wrap(<StaleDeals />);
    await screen.findByText('Neomedia — Banco Unión');
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'mirador' } });
    expect(screen.queryByText('Neomedia — Banco Unión')).toBeNull(); expect(screen.getByText('Bit WiFi — Hotel Mirador')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'zzz' } });
    expect(screen.getByText(/Ningún trato coincide/)).toBeTruthy();
    cleanup(); responses['/api/stale-deals'] = { ...STALE, deals: [], summary: { ...STALE.summary, count: 0, value_usd: 0, without_next_step: 0, with_reminder: 0 } };
    wrap(<StaleDeals />);
    expect(await screen.findByText(/Ningún trato lleva 14\+ días sin movimiento/)).toBeTruthy();
  });
  it('si el usuario no tiene acceso lo dice; el aviso del Dashboard solo sale si hay tratos', async () => {
    failFor = Object.assign(/stale-deals/, { message: 'No tienes permisos para esta acción' });
    wrap(<StaleDeals />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/No tienes permisos/);
    cleanup(); failFor = null;
    wrap(<StaleDealsBanner />);
    expect(await screen.findByText(/sin movimiento hace 14\+ días/)).toBeTruthy();
    expect(screen.getByText('USD 21,150')).toBeTruthy(); expect(screen.getByText(/2 sin siguiente paso/)).toBeTruthy();
    cleanup(); responses['/api/stale-deals'] = { ...STALE, summary: { ...STALE.summary, count: 0 } };
    const { container } = wrap(<StaleDealsBanner />);
    await waitFor(() => expect(calls.get.length).toBeGreaterThan(1)); expect(container.querySelector('a')).toBeNull();
  });
});

describe('Facturación rediseñada', () => {
  const day = (n) => new Date(Date.now() + n * 86400000 - 5 * 3600000).toISOString().slice(0, 10);
  const inv = (o) => ({ id: o.id, invoice_number: o.n, client_name: o.client, source_account: o.src, currency: o.cur, total: o.total, paid_amount: o.paid, status: o.status, issue_date: day(-5), due_date: o.due == null ? null : day(o.due), deals: o.deal ? { title: o.deal } : null, total_usd: o.usd, paid_usd: o.paidUsd, overdue: o.due != null && o.due < 0 && o.status !== 'pagada', days_late: o.due < 0 ? -o.due : 0, rate_missing: !!o.noRate });
  beforeEach(() => {
    responses['/api/invoices/summary'] = { total_facturado: 128450, total_cobrado: 91200, total_pendiente: 37250, total_vencido: 12400, count: 840, count_overdue: 7, collection_rate_pct: 71, missing_rates: ['PYG'], rates_updated_at: new Date(Date.now() - 3 * 3600000).toISOString(), by_account: [{ name: 'Bit Colombia SAS', facturado: 38000, cobrado: 22000, pendiente: 16000 }], aging: { al_dia: 1, '1_30': 0, '31_60': 0, '61_90': 0, mas_90: 0 } };
    responses['/api/invoices?'] = [];
    responses['/api/invoices'] = [
      inv({ id: 'a', n: 'BIT8', client: 'ETH SOLUCIONES', src: 'Bit Colombia SAS', cur: 'COP', total: 1071000, paid: 0, status: 'pendiente', due: 9, deal: 'Alcaldia de Castilla La Nueva', usd: 268, paidUsd: 0 }),
      inv({ id: 'b', n: 'BIT7', client: 'ETH SOLUCIONES', src: 'Bit Colombia SAS', cur: 'COP', total: 357000, paid: 0, status: 'pendiente', due: -16, deal: null, usd: 89, paidUsd: 0 }),
      inv({ id: 'c', n: 'PY-7', client: 'Tienda Asunción', src: 'Bit Paraguay EAS', cur: 'PYG', total: 5200000, paid: 1000000, status: 'parcial', due: 4, deal: null, usd: 0, paidUsd: 0, noRate: true }),
      inv({ id: 'd', n: '100041', client: 'Caleya', src: 'Bithub SRL', cur: 'USD', total: 27, paid: 27, status: 'pagada', due: 2, deal: 'Bit Music', usd: 27, paidUsd: 27 }),
    ];
    responses['/api/invoice-sync/status'] = { last_run_at: new Date().toISOString(), sources: { Alegra: { at: new Date(Date.now() - 7 * 60000).toISOString(), ok: true, discrepancies: [{ invoice_number: 'BIT1', external_id: '1', source: 'Alegra (BitProximity LLC)', kind: 'pagada_en_crm_abierta_en_origen' }] }, Stripe: { at: new Date(Date.now() - 7 * 60000).toISOString(), ok: true, discrepancies: [] } } };
    responses['/api/finance/reconciliation'] = { year: 2026, missing_rates: [], totals: { won_deals: 0, won_usd: 0, won_with_invoice: 0, won_with_invoice_usd: 0, won_without_invoice: 0, won_without_invoice_usd: 0, coverage_pct: null, invoices_total: 0, invoices_linked: 0, invoices_unlinked: 0, invoices_unlinked_usd: 0, auto_linkable: 0 }, unlinked_invoices: [], won_without_invoice: [] };
    responses['POST /api/invoice-sync/alegra'] = { created: 0, updated: 2, skipped: 5 };
    responses['POST /api/invoice-sync/stripe'] = { created: 1, updated: 0, skipped: 12 };
    responses['POST /api/invoice-sync/facturero-movil'] = { created: 0, updated: 0, skipped: 3 };
  });
  const fila = async (n) => (await screen.findAllByText(n))[0].closest('tr');

  it('el total va en USD y el monto original debajo; el trato se ve completo; lo que no tiene trato se marca', async () => {
    wrap(<Invoicing />);
    const r1 = await fila('BIT8');
    expect(within(r1).getByText('USD 268')).toBeTruthy(); expect(within(r1).getByText('COP 1,071,000')).toBeTruthy();
    expect(within(r1).getByText('Alcaldia de Castilla La Nueva')).toBeTruthy();
    const r2 = await fila('BIT7');
    expect(within(r2).getByText('Sin trato')).toBeTruthy(); expect(within(r2).getByText('Vencida hace 16 d')).toBeTruthy();
    expect(within(await fila('BIT8')).queryByText(/Vence en|Vencida/)).toBeNull();      // faltan 9 días: sin etiqueta
    expect(within(await fila('PY-7')).getByText('Vence en 4 d')).toBeTruthy();
  });
  it('una moneda sin tasa muestra el monto original y lo avisa, no «USD 0»', async () => {
    wrap(<Invoicing />);
    const r = await fila('PY-7');
    expect(within(r).getByText('PYG 5,200,000')).toBeTruthy(); expect(within(r).getByText('sin tasa de cambio')).toBeTruthy();
    expect(within(r).queryByText('USD 0')).toBeNull();
    expect(screen.getByText(/Falta la tasa de cambio de PYG/)).toBeTruthy();
  });
  it('las tarjetas, la tasa de cobranza, la hora de las tasas y el estado de la sincronización', async () => {
    wrap(<Invoicing />);
    expect(await screen.findByText('USD 128,450')).toBeTruthy();
    for (const t of ['USD 91,200', 'USD 37,250', 'USD 12,400', '7 facturas vencidas']) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText(/71% de lo facturado/)).toBeTruthy(); expect(screen.getByText(/actualizadas hace 3 h/)).toBeTruthy();
    expect(screen.getByText(/Sincronización automática cada 15 min/).textContent).toMatch(/Alegra hace 7 min · Stripe hace 7 min/);
    expect(screen.getByText(/En vivo/)).toBeTruthy();
  });
  it('las diferencias con el origen se avisan y se pueden desplegar, sin cambiar nada', async () => {
    wrap(<Invoicing />);
    const aviso = await screen.findByRole('button', { name: /1 factura no cuadra con su origen/ });
    expect(screen.queryByText(/abierta en el origen/)).toBeNull();
    fireEvent.click(aviso);
    expect(screen.getByText(/está pagada en el CRM pero abierta en el origen/)).toBeTruthy(); expect(screen.getByText('BIT1')).toBeTruthy();
    expect(calls.patch.length).toBe(0);
  });
  it('«Sincronizar → Todo» corre las tres fuentes y cuenta las actualizadas', async () => {
    wrap(<Invoicing />);
    await fila('BIT8');
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Todo \(las 3 fuentes\)/ }));
    await waitFor(() => expect(calls.post.map(([p]) => p)).toEqual(['/api/invoice-sync/stripe', '/api/invoice-sync/alegra', '/api/invoice-sync/facturero-movil']));
    expect(await screen.findByText(/Alegra: \+0 nuevas, 2 actualizadas/)).toBeTruthy();
  });
  it('la pestaña «Conciliación con tratos» abre la conciliación', async () => {
    wrap(<Invoicing />);
    await fila('BIT8');
    fireEvent.click(screen.getByRole('tab', { name: /Conciliación con tratos/ }));
    await waitFor(() => expect(calls.get.some((g) => String(g).startsWith('/api/finance/reconciliation'))).toBe(true));
    expect(screen.getByRole('tab', { name: /Conciliación con tratos/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByPlaceholderText(/Buscar por cliente/)).toBeNull();      // la lista de facturas se oculta mientras tanto
  });
  it('se actualiza sola cada 30 s con la pestaña visible', async () => {
    const timers = []; const real = window.setInterval.bind(window);
    const spy = vi.spyOn(window, 'setInterval').mockImplementation((fn, ms, ...a) => { timers.push([fn, ms]); return real(fn, ms, ...a); });
    wrap(<Invoicing />);
    await fila('BIT8');
    const tick = timers.find(([, ms]) => ms === 30000);
    expect(tick).toBeTruthy();                                   // la pantalla programó su actualización cada 30 s
    const n = calls.get.filter((g) => g === '/api/invoices/summary').length;
    await act(async () => { tick[0](); });
    expect(calls.get.filter((g) => g === '/api/invoices/summary').length).toBe(n + 1);
    spy.mockRestore();
  });
});

describe('Permisos de la nueva pantalla', () => {
  it('Tratos estáticos: administración y operaciones sí; prospección y el socio externo no; se bloquea junto con los tratos', () => {
    expect(canAccessPath('admin', '/stale-deals', [])).toBe(true);
    expect(canAccessPath('operaciones', '/stale-deals', [])).toBe(true);
    expect(canAccessPath('outbound', '/stale-deals', [])).toBe(false);
    expect(canAccessPath('wifi_partner', '/stale-deals', [])).toBe(false);
    expect(canAccessPath('admin', '/stale-deals', ['deals'])).toBe(false);
  });
});
