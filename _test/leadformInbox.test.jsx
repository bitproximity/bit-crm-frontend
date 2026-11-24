// Bandeja de respuestas: separadas por formulario, para asignar cada una a su trato.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const calls = { get: [], post: [], del: [] };
let INBOX;
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { calls.get.push(p); if (p.startsWith('/api/lead-forms/inbox')) return JSON.parse(JSON.stringify(INBOX(p))); if (p.startsWith('/api/deals?')) return [{ id: 'd-other', title: 'Otro trato', status: 'abierto' }]; return []; }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); if (p.endsWith('/assign')) return { ok: true, previous_deal_id: 'd-auto', previous_was_auto_created: true }; return { ok: true }; }),
    delete: vi.fn(async (p) => { calls.del.push(p); return {}; }),
  },
}));
import LeadFormInbox from '../src/components/LeadFormInbox.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

const FORMS = [
  { id: 'fm', name: 'Bit Music · Perfil musical de la marca', logo_url: '/brands/bitmusic-logo.png', pending: 1, total: 2 },
  { id: 'fw', name: 'Bitwifi · Brief WiFi Marketing', logo_url: '/brands/bitwifi-logo.png', pending: 0, total: 0 },
];
const ROW = {
  id: 's1', created_at: '2026-11-23T19:23:00Z', reviewed: false, matched_existing: false,
  form: { id: 'fm', name: 'Bit Music · Perfil musical de la marca', logo_url: '/brands/bitmusic-logo.png' },
  contact: { name: 'Carmen Bran', email: 'mercadeo@mundounico.com.co', phone: '3146395741', company: 'Mundo Único' },
  message: '',
  answers: [
    { field_id: 'a', label: '¿Cuántos puntos de venta tienen?', value: '11' },
    { field_id: 'b', label: '¿En qué países o ciudades tienen presencia?', value: 'Medellín, Cartagena, Bogotá, Cali' },
    { field_id: 'c', label: '¿Qué tipo de música quisieras en tus tiendas?', value: 'Electrónica' },
    { field_id: 'd', label: '¿Qué artistas se identifican con la marca?', value: 'Morat, Juanes, Carlos Vives' },
  ],
  deal: { id: 'd-auto', title: 'Mundo Único · Bit Music', status: 'abierto', pipeline: 'Bit Music', stage: 'Prospecto' },
  suggestions: [{ id: 'd-tivi', title: 'Tivi music - Mundo único', status: 'abierto', pipeline: 'Neomedia', stage: 'Negociación', value: 600000, currency: 'COP' }],
};
beforeEach(() => { calls.get = []; calls.post = []; calls.del = []; INBOX = (p) => ({ forms: FORMS, counts: { pending: 1, total: 2 }, status: 'pending', review_supported: true, rows: p.includes('form_id=fw') ? [] : [ROW] }); });
afterEach(() => cleanup());
const wrap = () => render(<ConfirmProvider><MemoryRouter><LeadFormInbox /></MemoryRouter></ConfirmProvider>);

describe('Bandeja de respuestas', () => {
  it('separa por formulario con sus contadores y muestra cada respuesta con su trato y las sugerencias de la empresa', async () => {
    wrap();
    const card = await screen.findByRole('article', { name: 'Respuesta de Mundo Único' });
    expect(within(card).getByText('Por asignar')).toBeTruthy();
    expect(within(card).getByText('11')).toBeTruthy();
    expect(within(card).queryByText('Morat, Juanes, Carlos Vives')).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: /Ver las 4 respuestas/ }));
    expect(within(card).getByText('Morat, Juanes, Carlos Vives')).toBeTruthy();
    expect(within(card).getByRole('link', { name: /Mundo Único · Bit Music/ }).getAttribute('href')).toBe('/deals/d-auto?tab=respuestas');
    expect(within(card).getByText(/Mundo Único ya tiene otro trato/)).toBeTruthy();
    expect(within(card).getByText('Tivi music - Mundo único')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Bitwifi/ })).toBeTruthy();
    expect(calls.get[0]).toBe('/api/lead-forms/inbox?status=pending');
  });

  it('«Asignar aquí» la pasa al trato sugerido y ofrece borrar el trato que había creado el formulario', async () => {
    wrap();
    const card = await screen.findByRole('article', { name: 'Respuesta de Mundo Único' });
    fireEvent.click(within(card).getByRole('button', { name: /Asignar aquí/ }));
    await waitFor(() => expect(calls.post[0]).toEqual(['/api/lead-forms/submissions/s1/assign', { deal_id: 'd-tivi' }]));
    expect(await screen.findByText(/quedó en «Tivi music - Mundo único»/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Borrar el trato que se había creado/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(calls.del).toEqual(['/api/deals/d-auto']));
  });

  it('«Asignar a otro trato» busca en todos los pipelines; «Dejar como trato nuevo» la marca revisada', async () => {
    wrap();
    const card = await screen.findByRole('article', { name: 'Respuesta de Mundo Único' });
    fireEvent.click(within(card).getByRole('button', { name: /Asignar a otro trato/ }));
    fireEvent.click(await within(card).findByText('Otro trato'));
    await waitFor(() => expect(calls.post.some(([p, b]) => p.endsWith('/assign') && b.deal_id === 'd-other')).toBe(true));
    expect(calls.get.some((p) => p.startsWith('/api/deals?') && !p.includes('pipeline_id'))).toBe(true);
    fireEvent.click(within(await screen.findByRole('article', { name: 'Respuesta de Mundo Único' })).getByRole('button', { name: /Dejar como trato nuevo/ }));
    await waitFor(() => expect(calls.post.some(([p, b]) => p === '/api/lead-forms/submissions/s1/review' && b.reviewed === true)).toBe(true));
  });

  it('filtrar por formulario y por estado vuelve a pedir la bandeja', async () => {
    wrap();
    await screen.findByRole('article');
    fireEvent.click(screen.getByRole('tab', { name: /Bitwifi/ }));
    expect(await screen.findByText('Nada por asignar.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    await waitFor(() => expect(calls.get[calls.get.length - 1]).toBe('/api/lead-forms/inbox?status=all&form_id=fw'));
  });
});
