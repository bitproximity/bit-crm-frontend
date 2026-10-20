import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const calls = [];
const state = { canReveal: true, canCreateDeals: true, pages: 2 };
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => {
      if (p === '/api/prospecting/options') return { canReveal: state.canReveal, canCreateDeals: state.canCreateDeals, revealCap: 25, sizeRanges: ['1,10', '11,50', '51,200'] };
      if (p === '/api/tags/with-contact-counts') return [{ id: 't1', name: 'Prospección B2B', contact_count: 7 }];
      if (p === '/api/pipelines') return [{ id: 'pl1', name: 'Bit WiFi', pipeline_stages: [{ id: 's1', name: 'Prospecto' }, { id: 's2', name: 'Contactado' }] }, { id: 'pl2', name: 'Neomedia', pipeline_stages: [{ id: 's3', name: 'Lead' }] }];
      return {};
    }),
    post: vi.fn(async (p, body) => {
      calls.push({ p, body });
      if (p === '/api/prospecting/search') {
        const pg = body.page;
        const mk = (i, over = {}) => ({ key: `apollo:p${pg}_${i}`, source: 'apollo', externalId: `p${pg}_${i}`, firstName: `Nom${pg}${i}`, lastName: 'Ap***', title: 'CEO', companyName: `Co ${pg}${i}`, country: 'Panama', ...over });
        const list = pg === 1
          ? [mk(1, { crm: { companyId: 'c1', openDeals: 1, deals: [{ id: 'd9', title: 'x', pipeline: 'Bit WiFi', stage: 'Negociación' }], contactId: null, contactHasEmail: false } }),
             mk(2, { crm: { companyId: 'c2', openDeals: 0, contactId: 'k1', contactHasEmail: true } }), mk(3), mk(4, { crm: { companyId: 'c4', openDeals: 0, contactId: null } })]
          : [mk(5)];
        return { candidates: list, page: pg, hasMore: pg < state.pages, total: 5 };
      }
      if (p === '/api/prospecting/import') {
        return { imported: body.candidates.length, skipped: 0, revealed: body.revealEmails ? body.candidates.length : 0, dealsCreated: body.createDeal ? body.candidates.length : 0, dealsSkipped: 0, errors: 0, list_name: body.listName, pipeline: 'Bit WiFi', stage: 'Prospecto',
          results: body.candidates.map((c) => ({ key: c.key, status: 'imported', revealed: !!body.revealEmails, dealStatus: body.createDeal ? 'created' : null })) };
      }
      return {};
    }),
  },
}));
import Prospecting from '../src/pages/Prospecting.jsx';

const setup = async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Prospecting /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/Prospección B2B \(secuencias/)).toBeTruthy());
  return user;
};
beforeEach(() => { calls.length = 0; state.canReveal = true; state.canCreateDeals = true; cleanup(); vi.spyOn(window, 'confirm').mockReturnValue(true); });

describe('Prospección del CRM', () => {
  it('busca con filtros y paginación, marca lo que ya existe', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO, Marketing');
    await user.type(screen.getByLabelText('País'), 'Panama');
    await user.click(screen.getByText('Más filtros'));
    await user.type(screen.getByLabelText('Industria'), 'retail');
    await user.type(screen.getByLabelText('Empresa'), 'Banco');
    await user.click(screen.getByText('51–200'));
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    const s = calls.find((c) => c.p === '/api/prospecting/search').body;
    expect(s).toMatchObject({ provider: 'apollo', title: 'CEO, Marketing', country: 'Panama', industry: 'retail', company: 'Banco', sizes: ['51,200'], page: 1 });
    expect(screen.getByText(/Trato abierto: Bit WiFi · Negociación/)).toBeTruthy();
    expect(screen.getByText(/Ya es contacto · con email/)).toBeTruthy();
    expect(screen.getByText('Empresa en el CRM')).toBeTruthy();
    expect(screen.getByText('Nuevo')).toBeTruthy();
    await user.click(screen.getByText(/Ver más \(página 2\)/));
    await screen.findByText(/Nom25/);
    expect(calls.filter((c) => c.p === '/api/prospecting/search').pop().body.page).toBe(2);
    expect(document.body.textContent).toMatch(/5\s*resultados\s*de ~5/);
    expect(screen.queryByText(/Ver más/)).toBeNull();
  });

  it('«seleccionar solo los nuevos» deja fuera a quien ya es contacto', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    await user.click(screen.getByText(/Seleccionar solo los nuevos \(3\)/));
    expect(screen.getByText('Importar seleccionados (3)')).toBeTruthy();
    expect(screen.getByLabelText('Elegir Nom12').checked).toBe(false);
  });

  it('importa a una lista sin revelar ni crear trato por defecto (no gasta créditos)', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    await user.click(screen.getByLabelText('Elegir Nom13'));
    await user.type(screen.getByLabelText('Lista'), 'Mi lista');
    await user.click(screen.getByText('Importar seleccionados (1)'));
    await screen.findByTestId('import-result');
    const imp = calls.find((c) => c.p === '/api/prospecting/import').body;
    expect(imp).toMatchObject({ listName: 'Mi lista', revealEmails: false });
    expect(imp.createDeal).toBeUndefined();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Se importaron 1 contacto\(s\) a la lista «Mi lista»/)).toBeTruthy();
    expect(screen.getByText('Importado')).toBeTruthy();
    expect(screen.getByText('Trabajarla en Prospección B2B').closest('a').href).toContain('prospeccion.bitproximity.com/?lista=Mi%20lista');
  });

  it('revelar email pide confirmación con el costo y crear trato manda embudo+etapa', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    await user.click(screen.getByLabelText('Seleccionar todos'));
    await user.click(screen.getByLabelText('Revelar email'));
    await user.click(screen.getByLabelText('Crear trato'));
    await user.selectOptions(screen.getByLabelText('Etapa'), 's2');
    await user.click(screen.getByText(/Importar seleccionados \(4\)/));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm.mock.calls[0][0]).toMatch(/hasta 3 contacto\(s\).*créditos de Apollo/);
    await screen.findByTestId('import-result');
    const imp = calls.find((c) => c.p === '/api/prospecting/import').body;
    expect(imp.revealEmails).toBe(true);
    expect(imp.createDeal).toMatchObject({ pipelineId: 'pl1', stageId: 's2', title: '{empresa} — Prospección' });
    expect(screen.getByText(/Se crearon 4 trato\(s\) en Bit WiFi · Prospecto/)).toBeTruthy();
  });

  it('si cancelas la confirmación de créditos, no se importa nada', async () => {
    window.confirm.mockReturnValue(false);
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    await user.click(screen.getByLabelText('Elegir Nom13'));
    await user.click(screen.getByLabelText('Revelar email'));
    await user.click(screen.getByText('Importar seleccionados (1)'));
    expect(calls.find((c) => c.p === '/api/prospecting/import')).toBeUndefined();
  });

  it('sin permisos no muestra revelar ni crear trato', async () => {
    state.canReveal = false; state.canCreateDeals = false;
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    expect(screen.queryByLabelText('Revelar email')).toBeNull();
    expect(screen.queryByLabelText('Crear trato')).toBeNull();
  });

  it('Lusha: pide departamentos, avisa del costo y oculta industria', async () => {
    const user = await setup();
    await user.click(screen.getByText('Lusha'));
    expect(screen.getByLabelText('Departamentos')).toBeTruthy();
    expect(screen.getByText(/Lusha cobra créditos por cada resultado/)).toBeTruthy();
    await user.click(screen.getByText('Más filtros'));
    expect(screen.queryByLabelText('Industria')).toBeNull();
  });

  it('los filtros Todos/Nuevos/En tu CRM filtran la lista y las pistas de error ayudan', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByText(/Nom11/);
    await user.click(screen.getByRole('button', { name: /En tu CRM/ }));
    expect(screen.queryByText(/Nom13/)).toBeNull();
    expect(screen.getByText(/Nom11/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Nuevos/ }));
    expect(screen.queryByText(/Nom12/)).toBeNull();
    expect(screen.getByText(/Nom13/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Todos/ }));
    expect(screen.getByText(/Nom12/)).toBeTruthy();
  });

  it('muestra una pista accionable cuando falta la key de Apollo', async () => {
    const { api } = await import('../src/lib/api');
    api.post.mockRejectedValueOnce(new Error('Apollo no está configurado: falta la variable APOLLO_API_KEY en Railway (Settings → Variables).'));
    const user = await setup();
    await user.type(screen.getByLabelText('Cargos'), 'CEO');
    await user.click(screen.getByText('Buscar'));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toMatch(/APOLLO_API_KEY/);
    expect(screen.getByRole('alert').textContent).toMatch(/Railway → bit-crm-backend → Variables/);
  });

  it('las búsquedas rápidas de Apollo lanzan la búsqueda con sus filtros', async () => {
    const user = await setup();
    await user.click(screen.getByText('Marketing · Colombia'));
    await screen.findByText(/Nom11/);
    expect(calls.find((c) => c.p === '/api/prospecting/search').body).toMatchObject({ provider: 'apollo', title: 'Director de Marketing, CMO', country: 'Colombia', page: 1 });
  });
});
