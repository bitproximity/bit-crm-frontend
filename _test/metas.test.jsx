import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const calls = { get: [], post: [] };
let failGet = false; let failPost = null;
const rowsFor = (month) => ([
  { team_member_id: 'u1', full_name: 'Ana Gabriela Espinel', target: 15, scheduled: 15, realized: 6, previous_target: 12 },
  { team_member_id: 'u2', full_name: 'Andrea Calderón', target: 12, scheduled: 5, realized: 3, previous_target: 10 },
  { team_member_id: 'u3', full_name: 'Mario Ramos', target: null, scheduled: 2, realized: 1, previous_target: null },
  { team_member_id: 'u4', full_name: 'Sofía Florido', target: 20, scheduled: 14, realized: 9, previous_target: 18 },
].map((r) => ({ ...r, by_client: [], _m: month })));
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => {
      calls.get.push(p);
      if (failGet) throw new Error('No se pudo calcular el avance de las metas: boom');
      const month = p.match(/month=(\d{4}-\d{2})/)[1];
      return { month, rows: rowsFor(month), unmatched: [{ name: 'Carolina', scheduled: 6, realized: 2 }], totals: { target: 47, scheduled: 34, realized: 18 } };
    }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); if (failPost) throw new Error(failPost); return { saved: 1, removed: 0 }; }),
  },
}));
import MeetingGoalsPanel, { paceHint, shiftMonth, localMonth, monthLabel } from '../src/components/MeetingGoalsPanel.jsx';

beforeEach(() => { calls.get = []; calls.post = []; failGet = false; failPost = null; });
afterEach(() => cleanup());
const open = (isAdmin = true) => render(<MemoryRouter><MeetingGoalsPanel isAdmin={isAdmin} /></MemoryRouter>);
const fila = (nombre) => screen.getByText(nombre).closest('div.px-5');

describe('Metas de reuniones: ayudas de cálculo', () => {
  it('meses: navegar cruza de año y la etiqueta sale en español', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12'); expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthLabel('2026-10')).toBe('octubre de 2026');
  });
  it('ritmo: cuántas por semana faltan en lo que queda del mes; cumplida; mes pasado; mes futuro', () => {
    const hoy = new Date(2026, 9, 20); // 20/10 → quedan 12 días = 2 semanas
    expect(paceHint({ target: 20, actual: 8, month: '2026-10', today: hoy })).toBe('Faltan 12 · unas 6 por semana');
    expect(paceHint({ target: 15, actual: 15, month: '2026-10', today: hoy })).toBe('¡Meta cumplida!');
    expect(paceHint({ target: 15, actual: 18, month: '2026-10', today: hoy })).toBe('¡Meta cumplida!');
    expect(paceHint({ target: 10, actual: 8, month: '2026-09', today: hoy })).toBe('Quedó en 80% de la meta');
    expect(paceHint({ target: 10, actual: 0, month: '2026-11', today: hoy })).toBe('');
    expect(paceHint({ target: null, actual: 3, month: '2026-10', today: hoy })).toBe('');
    expect(paceHint({ target: 8, actual: 0, month: '2026-10', today: new Date(2026, 9, 31) })).toBe('Faltan 8 · unas 8 por semana'); // último día: no divide por cero
  });
});

describe('Metas de reuniones: panel', () => {
  it('muestra a cada persona con su avance, el total del equipo y quién no tiene meta', async () => {
    open();
    expect(await screen.findByText('Sofía Florido')).toBeTruthy();
    expect(calls.get[0]).toBe(`/api/quotas?month=${localMonth()}`);
    expect(within(fila('Sofía Florido')).getByText('14')).toBeTruthy();
    expect(within(fila('Sofía Florido')).getByText(/Agendadas 14 · Realizadas 9/)).toBeTruthy();
    expect(within(fila('Ana Gabriela Espinel')).getByText('100%')).toBeTruthy();
    expect(within(fila('Ana Gabriela Espinel')).getByText('¡Meta cumplida!')).toBeTruthy();
    expect(within(fila('Mario Ramos')).getByText(/Sin meta/)).toBeTruthy();
    const equipo = screen.getByText('Equipo').closest('div.px-5');
    expect(within(equipo).getByText('34')).toBeTruthy();       // 15 + 5 + 14: el total solo suma a quien tiene meta
    expect(within(equipo).getByText('/ 47')).toBeTruthy();     // 15 + 12 + 20
    expect(screen.getAllByRole('progressbar').length).toBe(4); // equipo + 3 personas con meta
  });
  it('avisa de las reuniones cuyo ejecutivo no tiene usuario (p. ej. Carolina) y enlaza a Configuración → Equipo', async () => {
    open();
    const aviso = (await screen.findByText(/no coinciden con ningún usuario activo/)).closest('div.px-5');
    expect(aviso.textContent).toMatch(/«Carolina» \(6 agendadas, 2 realizadas\)/);
    expect(within(aviso).getByRole('link', { name: /Configuración → Equipo/ }).getAttribute('href')).toBe('/settings?seccion=equipo');
  });
  it('«Realizadas» cambia lo que se compara contra la meta', async () => {
    open();
    await screen.findByText('Sofía Florido');
    fireEvent.click(screen.getByRole('button', { name: 'Realizadas' }));
    expect(screen.getByRole('button', { name: 'Realizadas' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(fila('Sofía Florido')).getByText('9')).toBeTruthy();
    expect(within(fila('Sofía Florido')).getByText('45%')).toBeTruthy();
    expect(within(fila('Ana Gabriela Espinel')).queryByText('¡Meta cumplida!')).toBeNull(); // realizó 6 de 15
    expect(calls.get.length).toBe(1); // cambiar de métrica no vuelve a pedir datos
  });
  it('navega por mes pidiendo ese mes al servidor', async () => {
    open();
    await screen.findByText('Sofía Florido');
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(calls.get).toContain(`/api/quotas?month=${shiftMonth(localMonth(), -1)}`));
    expect(await screen.findByText(/Estás viendo un mes distinto al actual/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() => expect(calls.get.at(-1)).toBe(`/api/quotas?month=${localMonth()}`));
  });
  it('si falla la carga lo dice y deja reintentar (no muestra ceros)', async () => {
    failGet = true;
    open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo calcular el avance/);
    expect(screen.queryByText('Sofía Florido')).toBeNull();
    failGet = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Sofía Florido')).toBeTruthy();
  });
  it('quien no es admin ve las metas pero no puede asignarlas', async () => {
    open(false);
    await screen.findByText('Sofía Florido');
    expect(screen.queryByRole('button', { name: 'Asignar metas' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'asignar' })).toBeNull();
  });
});

describe('Metas de reuniones: asignar las metas del equipo', () => {
  const abrirModal = async () => { open(); await screen.findByText('Sofía Florido'); fireEvent.click(screen.getByRole('button', { name: 'Asignar metas' })); return screen.findByRole('dialog'); };

  it('abre con las metas actuales y la del mes anterior a la vista', async () => {
    const dlg = await abrirModal();
    expect(within(dlg).getByLabelText('Meta de Sofía Florido').value).toBe('20');
    expect(within(dlg).getByLabelText('Meta de Mario Ramos').value).toBe('');
    expect(within(dlg).getByText('Mes anterior: 18')).toBeTruthy();
  });
  it('guarda todas de una vez: vacío quita la meta, y refresca el panel', async () => {
    const dlg = await abrirModal();
    fireEvent.change(within(dlg).getByLabelText('Meta de Sofía Florido'), { target: { value: '25' } });
    fireEvent.change(within(dlg).getByLabelText('Meta de Mario Ramos'), { target: { value: '8' } });
    fireEvent.change(within(dlg).getByLabelText('Meta de Andrea Calderón'), { target: { value: '' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar metas' }));
    await waitFor(() => expect(calls.post.length).toBe(1));
    const [url, body] = calls.post[0];
    expect(url).toBe('/api/quotas/bulk');
    expect(body.month).toBe(localMonth());
    const meta = (id) => body.goals.find((g) => g.team_member_id === id).target_meetings;
    expect([meta('u4'), meta('u3'), meta('u2'), meta('u1')]).toEqual([25, 8, null, 15]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());   // se cierra
    await waitFor(() => expect(calls.get.length).toBe(2));                   // y recarga el avance
  });
  it('«Misma meta para todos», «Copiar del mes anterior» y «Quitar todas»', async () => {
    const dlg = await abrirModal();
    fireEvent.change(within(dlg).getByLabelText('Misma meta para todos'), { target: { value: '20' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Aplicar a todos' }));
    for (const n of ['Sofía Florido', 'Ana Gabriela Espinel', 'Andrea Calderón', 'Mario Ramos']) expect(within(dlg).getByLabelText(`Meta de ${n}`).value).toBe('20');
    fireEvent.click(within(dlg).getByRole('button', { name: /Copiar del mes anterior/ }));
    expect(within(dlg).getByLabelText('Meta de Sofía Florido').value).toBe('18');
    expect(within(dlg).getByLabelText('Meta de Andrea Calderón').value).toBe('10');
    expect(within(dlg).getByLabelText('Meta de Mario Ramos').value).toBe('');   // no tenía meta el mes anterior
    fireEvent.click(within(dlg).getByRole('button', { name: /Quitar todas/ }));
    expect(within(dlg).getByLabelText('Meta de Sofía Florido').value).toBe('');
  });
  it('rechaza valores inválidos sin enviar nada, y muestra el error del servidor sin cerrar la ventana', async () => {
    const dlg = await abrirModal();
    fireEvent.change(within(dlg).getByLabelText('Meta de Sofía Florido'), { target: { value: '1.5' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar metas' }));
    expect((await within(dlg).findByRole('alert')).textContent).toMatch(/Sofía Florido.*entero/);
    expect(calls.post.length).toBe(0);
    fireEvent.change(within(dlg).getByLabelText('Meta de Sofía Florido'), { target: { value: '22' } });
    failPost = 'No tienes permisos para esta acción';
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar metas' }));
    expect((await within(dlg).findByRole('alert')).textContent).toMatch(/No tienes permisos/);
    expect(screen.getByRole('dialog')).toBeTruthy();                          // sigue abierta: no se pierde lo escrito
    expect(within(dlg).getByLabelText('Meta de Sofía Florido').value).toBe('22');
  });
});
