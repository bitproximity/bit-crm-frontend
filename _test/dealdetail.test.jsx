import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const day = 86400000;
const iso = (d) => new Date(Date.now() + d * day).toISOString();
const stages = ['Prospecto', 'Contactado', 'Demo agendada', 'Propuesta enviada', 'Negociación'].map((name, i) => ({ id: `s${i + 1}`, name, position: i + 1 }));
let deal; let acts; const calls = { patch: [], post: [] };
const baseDeal = () => ({
  id: 'd1', title: 'Bit Music — Grupo Ramos', value: 4800, currency: 'USD', status: 'abierto', probability: 60, stage_id: 's4', pipeline_id: 'p1', owner_id: 'u1', company_id: 'c1', contact_id: 'k1',
  created_at: iso(-47), expected_close_date: iso(12).slice(0, 10), facturacion: 'Bit LLC', billing_frequency: 'mensual', product_line: 'Bit Music', hardware_type: 'Android Box', tags: [],
  pipelines: { name: 'Bit Ecuador' }, pipeline_stages: { name: 'Propuesta enviada' }, companies: { id: 'c1', name: 'Grupo Ramos' }, contacts: { id: 'k1', first_name: 'Luis', last_name: 'Cáceres' }, team_members: { full_name: 'Mario Ramos' },
  history: [{ changed_at: iso(-9), from_stage_id: 's3', to_stage_id: 's4', team_members: { full_name: 'Mario' } }],
});
const handlers = () => ([
  [/^\/api\/deals\/d1$/, () => deal], [/^\/api\/deals\/d1\/line-items/, () => [{ id: 'li1', product_id: 'p', quantity: 1, unit_price: 4800 }]], [/^\/api\/activities\/for\/deal/, () => acts],
  [/^\/api\/pipelines$/, () => [{ id: 'p1', name: 'Bit Ecuador', pipeline_stages: stages }]], [/^\/api\/team$/, () => [{ id: 'u1', full_name: 'Mario Ramos' }]], [/^\/api\/tags$/, () => []],
  [/^\/api\/exchange-rates/, () => [{ currency: 'USD', rate_to_usd: 1 }, { currency: 'COP', rate_to_usd: 0.00025 }]], [/^\/api\/gmail\/status/, () => ({ connected: false })], [/^\/api\/calcom\/status/, () => ({ connected: false })],
  [/^\/api\/products/, () => []], [/^\/api\/custom-fields/, () => []],
]);
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { for (const [re, fn] of handlers()) if (re.test(p)) return JSON.parse(JSON.stringify(fn())); return []; }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); return {}; }), patch: vi.fn(async (p, b) => { calls.patch.push([p, b]); return {}; }),
    put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario', role: 'admin', blocked_pages: [] } }) }));
import DealDetail from '../src/pages/DealDetail.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

beforeEach(() => { deal = baseDeal(); acts = []; calls.patch = []; calls.post = []; });
afterEach(() => cleanup());
const open = async () => {
  render(<ConfirmProvider><MemoryRouter initialEntries={['/deals/d1']}><Routes><Route path="/deals/:id" element={<DealDetail />} /></Routes></MemoryRouter></ConfirmProvider>);
  await screen.findByRole('heading', { name: /Bit Music — Grupo Ramos/ });
};
const kpi = (label) => screen.getByText(label, { selector: 'div' }).closest('div.rounded-xl');

describe('Detalle del trato: indicadores', () => {
  it('muestra valor, valor ponderado (valor × probabilidad), tiempo abierto y cierre esperado', async () => {
    await open();
    expect(within(kpi('Valor')).getByText('USD 4,800')).toBeTruthy();
    expect(within(kpi('Valor ponderado')).getByText('USD 2,880')).toBeTruthy(); // 4.800 × 60 %
    expect(within(kpi('Valor ponderado')).getByText('60% de probabilidad')).toBeTruthy();
    expect(within(kpi('Tiempo en el embudo')).getByText('47 días')).toBeTruthy();
    expect(within(kpi('Cierre esperado')).getByText(/^en 1[12] d$/)).toBeTruthy();
  });
  it('en otra moneda muestra el equivalente en USD con la tasa del día', async () => {
    deal.currency = 'COP'; deal.value = 4000000;
    await open();
    expect(within(kpi('Valor')).getByText('≈ USD 1,000')).toBeTruthy();
    await waitFor(() => expect(within(kpi('Valor ponderado')).getByText('USD 600')).toBeTruthy()); // 1.000 × 60 %
  });
  it('la próxima actividad es la pendiente más cercana; sin ninguna avisa que falta programar', async () => {
    acts = [{ id: 'a1', type: 'llamada', title: 'Llamar a Luis', due_date: iso(3), done: false, team_members: {} }, { id: 'a2', type: 'reunion', title: 'Demo', due_date: iso(1), done: false, team_members: {} }, { id: 'a3', type: 'nota', summary: 'x', due_date: iso(0), done: false, team_members: {} }];
    await open();
    expect(within(kpi('Próxima actividad')).getByText('Demo')).toBeTruthy(); // la de mañana, no la nota ni la de +3
    cleanup(); acts = [];
    await open();
    expect(within(kpi('Próxima actividad')).getByText('Sin programar')).toBeTruthy();
  });
  it('cierre esperado vencido se marca; un trato ganado muestra «Estado» y no ofrece próxima actividad', async () => {
    deal.expected_close_date = iso(-5).slice(0, 10);
    await open();
    expect(within(kpi('Cierre esperado')).getByText(/venció hace/)).toBeTruthy();
    cleanup(); deal = baseDeal(); deal.status = 'ganado';
    await open();
    expect(within(kpi('Estado')).getByText('Ganado')).toBeTruthy();
    expect(screen.queryByText('Próxima actividad')).toBeNull();
    expect(screen.queryByText('Valor ponderado')).toBeNull();
  });
});

describe('Detalle del trato: la lógica de edición no cambió', () => {
  it('la barra de etapas marca la actual y cambiar de etapa llama al mismo servicio', async () => {
    await open();
    const actual = screen.getByRole('button', { name: /Propuesta enviada/, current: 'step' });
    expect(actual).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Negociación/ }));
    await waitFor(() => expect(calls.patch).toContainEqual(['/api/deals/d1/stage', { stage_id: 's5' }]));
  });
  it('en un trato cerrado las etapas no se pueden tocar', async () => {
    deal.status = 'perdido'; deal.lost_reason = 'Precio muy alto';
    await open();
    expect(screen.getByRole('button', { name: /Negociación/ }).disabled).toBe(true);
  });
  it('Resumen: cada fila abre su editor y guarda con el mismo servicio (Facturación y Probabilidad)', async () => {
    await open();
    fireEvent.click(screen.getByText('Facturación'));                      // fila etiqueta/valor
    await waitFor(() => expect(document.activeElement.tagName).toBe('SELECT')); // el editor se abre con foco
    const select = document.activeElement;
    const opcion = [...select.querySelectorAll('option')].map((o) => o.value).find((v) => v);
    fireEvent.change(select, { target: { value: opcion } });
    await waitFor(() => expect(calls.patch).toContainEqual(['/api/deals/d1', { facturacion: opcion }]));
    fireEvent.click(screen.getByText('Probabilidad'));
    const prob = await screen.findByDisplayValue('60');
    fireEvent.change(prob, { target: { value: '80' } });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(calls.patch).toContainEqual(['/api/deals/d1', { probability: 80 }]));
  });
  it('«Ganado» sigue llamando al mismo servicio', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Ganado' }));
    await waitFor(() => expect(calls.post).toContainEqual(['/api/deals/d1/win', {}]));
  });
  it('las pestañas muestran cuántas notas y actividades hay', async () => {
    acts = [{ id: 'n1', type: 'nota', summary: 'a', team_members: {} }, { id: 'n2', type: 'nota', summary: 'b', team_members: {} }, { id: 'c1', type: 'llamada', title: 'c', team_members: {} }];
    await open();
    expect(screen.getByRole('button', { name: /^Notas\s*2$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Actividad\s*1$/ })).toBeTruthy();
  });
});
