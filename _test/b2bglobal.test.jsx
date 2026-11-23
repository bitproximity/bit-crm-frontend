// Bit Prospect · Resumen global: todas las marcas juntas, por ejecutivo y mes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
let reply;
vi.mock('../src/lib/api', () => ({ api: { get: vi.fn(async (p) => { calls.push(p); return JSON.parse(JSON.stringify(reply(p))); }) } }));
import B2bGlobalSummary, { summaryCsv } from '../src/components/B2bGlobalSummary.jsx';

const months = ['2026-09', '2026-10', '2026-11'];
const DATA = (focus) => ({
  period: { from: '2026-09', to: '2026-11', months },
  totals: { meetings: 7, realized: 3, this_month: 2, executives_with_meetings: 2, best_month: { month: '2026-10', count: 4 }, undated: 1 },
  month_totals: { '2026-09': 1, '2026-10': 4, '2026-11': 2 },
  executives: [
    { key: 'sofia', name: 'Sofía Pérez', total: 5, realized: 2, avg_per_month: 1.7, brands: 3, undated: 0, by_month: { '2026-09': 1, '2026-10': 3, '2026-11': 1 } },
    { key: 'martina', name: 'Martina', total: 2, realized: 1, avg_per_month: 0.7, brands: 1, undated: 1, by_month: { '2026-09': 0, '2026-10': 1, '2026-11': 1 } },
    { key: 'mariana', name: 'Mariana', total: 0, realized: 0, avg_per_month: 0, brands: 0, undated: 0, by_month: { '2026-09': 0, '2026-10': 0, '2026-11': 0 } },
  ],
  focus: focus || null,
  focus_total: focus ? 5 : 7,
  by_brand: [{ name: 'Spoonity', count: 4, pct: 57 }, { name: 'Fiweex', count: 3, pct: 43 }],
  by_industry: [{ name: 'Restaurantes', count: 5, pct: 71 }, { name: 'Sin especificar', count: 2, pct: 29 }],
  by_country: [{ name: 'Colombia', count: 6, pct: 86 }, { name: 'Panamá', count: 1, pct: 14 }],
});

beforeEach(() => { calls.length = 0; reply = (p) => DATA(new URLSearchParams(p.split('?')[1]).get('executive')); });
afterEach(() => cleanup());

describe('Bit Prospect · Resumen global', () => {
  it('muestra la matriz ejecutivo × mes con totales, el reparto global y el aviso de reuniones sin fecha', async () => {
    render(<B2bGlobalSummary />);
    const table = await screen.findByRole('table');
    const sofia = within(table).getByText('Sofía Pérez').closest('tr');
    expect(within(sofia).getByText('3')).toBeTruthy();
    expect(within(sofia).getByText('5')).toBeTruthy();
    expect(within(table).getByText('Total equipo')).toBeTruthy();
    expect(within(table).getByText('Mariana')).toBeTruthy();
    expect(screen.getByText('Spoonity')).toBeTruthy();
    expect(screen.getByText('Restaurantes')).toBeTruthy();
    expect(screen.getByText('Colombia')).toBeTruthy();
    expect(screen.getByText(/1 reunion marcada como agendada no tiene fecha/)).toBeTruthy();
    expect(calls[0]).toMatch(/^\/api\/b2b\/global-summary\?from=\d{4}-\d{2}&to=\d{4}-\d{2}$/);
  });

  it('tocar un ejecutivo filtra marcas, industrias y países a lo suyo; la X lo quita', async () => {
    render(<B2bGlobalSummary />);
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByText('Sofía Pérez'));
    await waitFor(() => expect(calls.some((p) => p.includes('executive=Sof%C3%ADa+P%C3%A9rez'))).toBe(true));
    fireEvent.click(await screen.findByLabelText('Quitar filtro'));
    await waitFor(() => expect(calls[calls.length - 1]).not.toMatch(/executive=/));
  });

  it('cambiar el período vuelve a pedir el resumen («Todo» = from=all)', async () => {
    render(<B2bGlobalSummary />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Todo' }));
    await waitFor(() => expect(calls[calls.length - 1]).toMatch(/from=all/));
  });

  it('el CSV trae un ejecutivo por fila, un mes por columna y el total del equipo', () => {
    const csv = summaryCsv(DATA());
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('"Ejecutivo","septiembre 2026","octubre 2026","noviembre 2026","Total","Realizadas","Promedio por mes","Marcas","Agendadas sin fecha"');
    expect(lines[1]).toBe('"Sofía Pérez","1","3","1","5","2","1.7","3","0"');
    expect(lines[lines.length - 1].startsWith('"Total equipo","1","4","2","7","3"')).toBe(true);
  });
});
