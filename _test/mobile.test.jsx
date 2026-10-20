import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const stages = ['Prospecto', 'Contactado', 'Demo'].map((name, i) => ({ id: `s${i + 1}`, name, position: i + 1 }));
const mo = ['2026-08', '2026-09', '2026-10'];
const contacts = Array.from({ length: 3 }, (_, i) => ({ id: `k${i}`, first_name: ['Luis', 'Mayra', 'Ana'][i], last_name: 'Prueba', email: `p${i}@x.com`, phone: '+593 99 0', position: 'Gerente', country: 'Ecuador', status: 'activo', created_at: iso(-i), companies: { id: 'c1', name: 'Grupo Ramos' }, team_members: { full_name: 'Mario Ramos' } }));
const fixtures = [
  [/^\/api\/dashboard$/, () => ({ open_deals: 172, open_pipeline_value_usd: 187789, won_this_month: 4, lost_this_month: 2, new_deals_this_month: 18, my_open_tasks: 7, overdue_tasks: 1, team_pending_tasks: 23, top_pipeline_by_sales: { id: 'p1', name: 'Bit WiFi', value_usd: 88938 }, top_product_by_sales: { name: 'Bit WiFi', revenue_usd: 88938 }, pipeline_breakdown: [{ name: 'Bit WiFi', value_usd: 88938, count: 253 }], recent_wins: [] })],
  [/^\/api\/gmail\/calendar\/events/, () => []], [/^\/api\/gmail\/status/, () => ({ connected: false })], [/^\/api\/gmail\/contacts/, () => []],
  [/^\/api\/contacts\?/, () => ({ data: contacts, count: 3 })], [/^\/api\/team/, () => []],
  [/^\/api\/documents\/tree/, () => [{ id: 'dc1', title: 'Propuesta comercial', parent_id: null, updated_at: iso(-1), company_name: 'Grupo Ramos' }]],
  [/^\/api\/document-files/, () => []], [/^\/api\/documents\/dc1/, () => ({ id: 'dc1', title: 'Propuesta comercial', content: '<p>Hola</p>', companies: { id: 'c1', name: 'Grupo Ramos' }, deals: null, projects: null })],
  [/^\/api\/tags\/with-contact-counts/, () => [{ id: 't1', name: 'Restaurantes', color: '#8500FF', contact_count: 12 }]],
  [/^\/api\/pipelines$/, () => [{ id: 'p1', name: 'Bit Ecuador', pipeline_stages: stages }]],
  [/^\/api\/metrics$/, () => ({ deals_by_stage: stages.map((s) => ({ stage_id: s.id, name: s.name, count: 3, value: 1000, avg_days: 5 })), tasks_by_status: { pendiente: 1, completada: 2 }, win_rate_pct: 38, won_count: 12, lost_count: 20, project_progress: [] })],
  [/^\/api\/forecast/, () => ({ months: [{ month: '2026-11', unweighted_usd: 1000, weighted_usd: 500 }] })], [/^\/api\/insights\/feed/, () => []],
  [/^\/api\/metrics\/meetings/, () => ({ total: 0, by_week: [], by_owner: [] })], [/^\/api\/metrics\/products/, () => ({ top: null, products: [] })],
  [/^\/api\/insights\/funnel/, () => ({ total_deals: 0, funnel: [] })], [/^\/api\/insights\/velocity/, () => ({ velocity: [] })],
  [/^\/api\/insights\/dashboard/, () => ({ year: 2026, deal_duration_avg_days: 34, deal_duration_avg_days_won: 28, deal_duration_avg_days_lost: 41, lost_total: 0, won_avg_value: { current: 1450, pct_change: null, count: 12 }, deals_lost_by_reason: [], mrr_arr: { mrr_won: 1, arr_won: 12, mrr_pipeline: 1, arr_pipeline: 12, mrr_pipeline_weighted: 1, arr_pipeline_weighted: 12 }, mrr_by_country_pipeline: [], sales_by_country: [], sales_by_facturacion: [],
    deals_won_by_month: mo.map((month, i) => ({ month, value: 1000 * (i + 1), is_current_month: i === 2 })), deals_by_month: mo.map((month, i) => ({ month, total: 1000 * (i + 1), by_pipeline: { 'Bit WiFi': 1000 * (i + 1) }, is_current_month: i === 2 })), pipelines: [{ name: 'Bit WiFi' }],
    hardware_insights: [{ name: 'Android Box', won_value_usd: 9000, won_count: 6, pipeline_value_usd: 12000, pipeline_count: 8 }],
    product_insights: [{ name: 'Bit WiFi', won_value_usd: 88938, won_count: 253, pipeline_value_usd: 40000, pipeline_count: 60 }] })],
];
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { for (const [re, fn] of fixtures) if (re.test(p)) return JSON.parse(JSON.stringify(fn())); return []; }),
    post: vi.fn(async () => ({})), patch: vi.fn(async () => ({})), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario Ramos', role: 'admin', blocked_pages: [] } }) }));
import Dashboard from '../src/pages/Dashboard.jsx';
import Contacts from '../src/pages/Contacts.jsx';
import Documents from '../src/pages/Documents.jsx';
import Metrics from '../src/pages/Metrics.jsx';
import Lists from '../src/pages/Lists.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

afterEach(() => cleanup());
const mount = (path, el) => render(<ConfirmProvider><MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={el} /></Routes></MemoryRouter></ConfirmProvider>);
const cls = (el) => el.className || '';

describe('Celular: Dashboard', () => {
  it('la tarjeta principal ocupa dos columnas y muestra el valor completo; las etiquetas no se recortan', async () => {
    mount('/', <Dashboard />);
    const valor = await screen.findByText('$187,789');
    const tarjeta = valor.closest('.card-elevated');
    expect(cls(tarjeta)).toMatch(/\bcol-span-2\b/);            // antes solo desde «sm»: en celular el número se cortaba a «$18…»
    expect(cls(valor)).toMatch(/\btext-3xl\b.*\bsm:text-4xl\b/);         // letra más chica en celular para que quepa completo
    const etiqueta = screen.getByText('Mis tareas pendientes');
    expect(cls(etiqueta)).not.toMatch(/\btruncate\b/);          // se parte en dos líneas en vez de cortarse
  });
});

describe('Celular: Contactos', () => {
  it('el encabezado se acomoda en filas y «Nuevo contacto» sigue disponible', async () => {
    mount('/contacts', <Contacts />);
    const nuevo = await screen.findByRole('button', { name: /Nuevo contacto/ });
    expect(cls(nuevo.parentElement)).toMatch(/\bflex-wrap\b/);
    expect(cls(nuevo.parentElement.parentElement)).toMatch(/\bflex-wrap\b/);
  });
  it('en pantallas chicas la tabla solo conserva Contacto y Empresa/Cargo; las demás columnas se ocultan', async () => {
    mount('/contacts', <Contacts />);
    await screen.findByText('Luis Prueba');
    const th = (t) => screen.getByRole('columnheader', { name: t });
    expect(cls(th('Contacto'))).not.toMatch(/\bhidden\b/);
    expect(cls(th('Empresa / Cargo'))).not.toMatch(/\bhidden\b/);
    for (const t of ['País', 'Teléfono', 'Estado', 'Dueño', 'Registro', 'Acciones']) expect(cls(th(t))).toMatch(/\bhidden\b/);
  });
});

describe('Celular: Documentos (lista / detalle)', () => {
  it('sin documento abierto se ve el árbol; con uno abierto, el documento y un botón para volver', async () => {
    mount('/documents', <Documents />);
    const arbol = (await screen.findByPlaceholderText(/Buscar documento/)).closest('div.border-r');
    expect(cls(arbol)).not.toMatch(/\bhidden\b/);
    expect(cls(arbol)).toMatch(/\bw-full\b/);
    fireEvent.click((await screen.findAllByText('Propuesta comercial'))[0]);   // la del árbol lateral
    const volver = await screen.findByRole('button', { name: /Documentos/ });
    expect(cls(volver)).toMatch(/\bmd:hidden\b/);              // solo en celular
    await waitFor(() => expect(cls(arbol)).toMatch(/\bhidden md:flex\b/)); // el árbol cede su lugar al documento
    fireEvent.click(volver);
    await waitFor(() => expect(cls(arbol)).not.toMatch(/\bhidden\b/));     // vuelve al árbol
  });
});

describe('Celular: Métricas', () => {
  it('«Ventas por producto» y «Hardware»: el conteo pasa debajo de cada monto y las columnas extra se ocultan', async () => {
    mount('/metrics', <Metrics />);
    expect(await screen.findByText('Ventas por producto')).toBeTruthy();
    const ganados = await screen.findAllByText('253 ganados');
    expect(cls(ganados[0])).toMatch(/\bsm:hidden\b/);
    expect(screen.getAllByText('60 abiertos').length).toBeGreaterThan(0);
    for (const t of ['Participación (ganado)', '# Ganados', '# Abiertos']) {
      for (const h of screen.getAllByRole('columnheader', { name: t })) expect(cls(h)).toMatch(/\bhidden sm:table-cell\b/);
    }
    expect(screen.getAllByText('Hardware').length).toBeGreaterThan(0);
    expect(screen.getByText(/Elige un pipeline arriba/)).toBeTruthy();   // texto en «tú», no en voseo
  });
});

describe('Listas', () => {
  it('«Nueva lista» es un botón principal, como el resto del CRM', async () => {
    mount('/lists', <Lists />);
    const boton = await screen.findByRole('button', { name: /Nueva lista/ });
    expect(cls(boton)).toMatch(/bg-gradient-to-r/);
    fireEvent.click(boton);
    expect(await screen.findByText('Nueva lista', { selector: 'span' })).toBeTruthy();
  });
});
