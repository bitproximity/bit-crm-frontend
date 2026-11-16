// Regresiones de la revisión del 14–16/11/2026: cosas que llegaron rotas a producción y no deben volver.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const calls = { get: [], post: [] };
let responses = {};
let postFail = null;
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => {
      calls.get.push(p);
      const key = Object.keys(responses).filter((k) => p.startsWith(k)).sort((a, b) => b.length - a.length)[0];
      if (!key) return [];
      const v = responses[key];
      return typeof v === 'function' ? v(p) : JSON.parse(JSON.stringify(v));
    }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); if (postFail) throw new Error(postFail); return responses[`POST ${p}`] || {}; }),
    patch: vi.fn(async () => ({})), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { id: 'u1', full_name: 'Mario Ramos', role: 'admin', blocked_pages: [] } }) }));

import Deals from '../src/pages/Deals.jsx';
import Activities from '../src/pages/Activities.jsx';
import FinancePanel from '../src/components/FinancePanel.jsx';
import RevenueBreakdownPanel from '../src/components/RevenueBreakdownPanel.jsx';
import ActivityHealthPanel from '../src/components/ActivityHealthPanel.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

const wrap = (el, path = '/') => render(<ConfirmProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={el} /></Routes></MemoryRouter></ConfirmProvider>);
const future = new Date(Date.now() + 5 * 86400000).toISOString();
const past = new Date(Date.now() - 5 * 86400000).toISOString();
const stages = [{ id: 's1', name: 'Prospecto', position: 1 }, { id: 's2', name: 'Demo', position: 2 }];
const deal = (id, title, extra) => ({ id, title, value: 100, currency: 'USD', status: 'abierto', stage_id: 's1', pipeline_id: 'p1', owner_id: 'u1', companies: { name: `${title} SA` }, contacts: { first_name: 'Ana', last_name: 'Paz' }, team_members: { full_name: 'Mario Ramos' }, ...extra });

beforeEach(() => {
  calls.get = []; calls.post = []; postFail = null;
  responses = {
    '/api/pipelines': [{ id: 'p1', name: 'Bit WiFi', pipeline_stages: stages }],
    '/api/exchange-rates': [],
    '/api/deals?pipeline_id=p1&status=ganado,perdido': [],
    '/api/deals?pipeline_id=p1&status=abierto': [
      deal('d1', 'Sin Agenda', { next_activity: null }),
      deal('d2', 'Con Agenda', { next_activity: { due_date: future, title: 'Llamar', type: 'llamada' } }),
      deal('d3', 'Atrasado', { next_activity: { due_date: past, title: 'Demo', type: 'reunion' } }),
    ],
  };
});
afterEach(() => cleanup());

describe('Pipeline: próxima actividad en las tarjetas', () => {
  it('con una configuración de tarjetas GUARDADA ANTES de que existiera el campo, igual se muestra «Agendar» (antes quedaba oculto para siempre)', async () => {
    responses['/api/settings/deal_card_fields'] = { company: true, contact: true, value: true, due_date_warning: true, avatar: true };
    wrap(<Deals />);
    expect(await screen.findByText('Sin Agenda')).toBeTruthy();
    expect(screen.getAllByText('Agendar').length).toBe(1);
    expect(screen.getByText('2 sin actividad al día')).toBeTruthy();
  });
  it('si la persona apaga «Próxima actividad» en Personalizar tarjetas, se respeta', async () => {
    responses['/api/settings/deal_card_fields'] = { next_activity: false };
    wrap(<Deals />);
    expect(await screen.findByText('Sin Agenda')).toBeTruthy();
    expect(screen.queryByText('Agendar')).toBeNull();
  });
  it('el filtro «sin actividad al día» deja solo los tratos pendientes y avisa cuántos son', async () => {
    wrap(<Deals />);
    fireEvent.click(await screen.findByText('2 sin actividad al día'));
    await waitFor(() => expect(screen.queryByText('Con Agenda')).toBeNull());
    expect(screen.getByText('Sin Agenda')).toBeTruthy(); expect(screen.getByText('Atrasado')).toBeTruthy();
    expect(screen.getByText('Quitar filtro')).toBeTruthy();
    expect(screen.getByText(/sin próxima actividad y/)).toBeTruthy();
  });
  it('desde el Dashboard (?sin_actividad=1&owner_id=…) pide solo los tratos de ese vendedor', async () => {
    wrap(<Deals />, '/deals?sin_actividad=1&owner_id=u1');
    expect(await screen.findByText('Sin Agenda')).toBeTruthy();
    expect(calls.get.some((p) => p.includes('status=abierto') && p.includes('owner_id=u1'))).toBe(true);
    expect(screen.getByText('Quitar filtro')).toBeTruthy();
  });
});

describe('Actividades', () => {
  it('las notas no aparecen como actividades pendientes (eran 12 de 15)', async () => {
    responses['/api/activities'] = [
      { id: 'a1', type: 'followup', title: 'Seguimiento real', due_date: future, done: false, entity_type: 'deal', entity_label: 'Trato X' },
      { id: 'a2', type: 'nota', title: 'Tienen 7 locales con pantallas', due_date: null, done: false, entity_type: 'deal', entity_label: 'Trato Y' },
    ];
    wrap(<Activities />);
    expect(await screen.findByText('Seguimiento real')).toBeTruthy();
    expect(screen.queryByText('Tienen 7 locales con pantallas')).toBeNull();
  });
});

describe('Resumen semanal', () => {
  const FIN = {
    year: 2026, month: '2026-11',
    sales: { won_month_usd: 14200, won_ytd_usd: 188400, won_count_month: 5, won_count_ytd: 64 }, billing: { facturado_month_usd: 9800, facturado_ytd_usd: 128450, invoices_ytd: 790 },
    collections: { cobrado_ytd_usd: 91200, cobros_month_usd: 6400, por_cobrar_usd: 37250, vencido_usd: 12400, vencido_count: 7, collection_rate_pct: 71, aging: { al_dia: 24850, '1_30': 5200, '31_60': 4600, '61_90': 1800, mas_90: 800 }, dso_days: 23, dso_sample: 118, dso_by_account: [] },
    top_debtors: [], slowest_payers: [], leaders: { product: null, country: null, pipeline: null }, by_country: [], by_product: [], by_pipeline: [],
    closing_speed: { avg_days: 38, sample: 52, slowest_pipelines: [], slowest_countries: [], slowest_products: [] },
    reconciliation: { won_usd: 188400, won_with_invoice_usd: 132000, coverage_pct: 70, won_without_invoice: 26, won_without_invoice_usd: 56400, invoices_unlinked: 138 },
    rates: { updated_at: new Date().toISOString(), currencies: ['COP', 'USD'], missing: [] },
  };
  it('«Enviarme el resumen semanal» lo pide al servidor y confirma a qué correo salió', async () => {
    responses['/api/finance'] = FIN; responses['POST /api/finance/weekly-digest/send'] = { sent: true, to: 'mario@bitproximity.com' };
    wrap(<FinancePanel />);
    fireEvent.click(await screen.findByText('Enviarme el resumen semanal'));
    expect(await screen.findByText('Enviado a mario@bitproximity.com')).toBeTruthy();
    expect(calls.post[0][0]).toBe('/api/finance/weekly-digest/send');
  });
  it('si el correo falla, muestra el motivo', async () => {
    responses['/api/finance'] = FIN; postFail = 'No se pudo enviar el correo: SES';
    wrap(<FinancePanel />);
    fireEvent.click(await screen.findByText('Enviarme el resumen semanal'));
    expect(await screen.findByText('No se pudo enviar el correo: SES')).toBeTruthy();
  });
});

describe('Paneles de cobrado y de actividad', () => {
  it('«Cobrado por producto y país» muestra productos, países y avisa cuando falta detalle', async () => {
    responses['/api/insights/revenue-breakdown'] = { total_usd: 1000, detail_coverage_pct: 40, by_product: [{ name: 'Bit WiFi', usd: 400, pct: 40 }, { name: 'Sin detalle de productos', usd: 600, pct: 60 }], by_country: [{ name: 'Ecuador', usd: 1000, pct: 100, top_products: [{ product: 'Bit WiFi', usd: 400 }] }] };
    wrap(<RevenueBreakdownPanel />);
    expect(await screen.findByText('Cobrado por producto y país')).toBeTruthy();
    expect(screen.getByText('Bit WiFi')).toBeTruthy(); expect(screen.getByText('Ecuador')).toBeTruthy();
    expect(screen.getByText(/Solo el 40% de lo cobrado tiene detalle/)).toBeTruthy();
  });
  it('sin acceso o sin datos, el panel no se muestra (no rompe Métricas)', async () => {
    responses['/api/insights/revenue-breakdown'] = { total_usd: 0, by_product: [], by_country: [] };
    const { container } = wrap(<RevenueBreakdownPanel />);
    await waitFor(() => expect(calls.get.length).toBe(1));
    expect(container.textContent).toBe('');
  });
  it('«Tratos sin actividad al día, por vendedor» lista a cada persona con sus pendientes', async () => {
    responses['/api/deals/activity-health'] = { total_open: 10, total_pending: 7, rows: [{ owner_id: 'u1', name: 'Mario Ramos', open: 8, none: 6, late: 1, pending: 7, pct: 88 }, { owner_id: 'u2', name: 'Ana Espinel', open: 2, none: 0, late: 0, pending: 0, pct: 0 }] };
    wrap(<ActivityHealthPanel />);
    expect(await screen.findByText('Mario Ramos')).toBeTruthy();
    expect(screen.getByText('7 de 10 tratos abiertos')).toBeTruthy();
    expect(screen.getByText(/6 sin agendar · 1 vencidas/)).toBeTruthy();
  });
});
