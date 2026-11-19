// Formularios con marca (réplica del de forms.app de Bit Music), respuestas y métricas.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const calls = { get: [], post: [], patch: [] };
let responses = {};
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { calls.get.push(p); const k = Object.keys(responses).filter((x) => p.startsWith(x)).sort((a, b) => b.length - a.length)[0]; const v = k ? responses[k] : []; return JSON.parse(JSON.stringify(typeof v === 'function' ? v(p) : v)); }),
    post: vi.fn(async (p, b) => { calls.post.push([p, b]); return responses[`POST ${p}`] || {}; }),
    patch: vi.fn(async (p, b) => { calls.patch.push([p, b]); return {}; }),
    put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));

import LeadFormView from '../src/components/LeadFormView.jsx';
import PublicLeadForm from '../src/pages/PublicLeadForm.jsx';
import LeadForms from '../src/pages/LeadForms.jsx';
import { ResponsesDrawer, DesignDrawer, responsesCsv } from '../src/components/LeadFormPanels.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

const SETTINGS = {
  title: 'Musicalizamos espacios comerciales', description: 'Cuéntanos sobre tu marca.', thank_you: 'Armamos tu propuesta musical.',
  labels: { name: 'Nombre completo', email: 'Correo electrónico', phone: 'Número de teléfono', company: '¿Cuál es el nombre de tu marca?' },
  required: { email: true, company: true }, hide_message: true,
  theme: { brand_name: 'Bit Music', logo_url: 'https://bitmusicapp.com/assets/home/logo.webp', primary: '#AA00FF', secondary: '#E000FF', accent: '#D9F6FF', background: '#0B0A0F', card: '#13111C' },
};
const FIELDS = [
  { id: 'q1', label: '¿Cuántos puntos de venta tienen?', field_type: 'number', required: true },
  { id: 'q2', label: '¿Qué sensación quieren generar?', field_type: 'text', long: true, hint: 'Ejemplo: energía, diversión, chill.' },
  { id: 'q3', label: '¿Quisieras incluir tus propios anuncios comerciales?', field_type: 'select', options: ['Sí', 'No'] },
];
const FORM = { id: 'f1', name: 'Bit Music · Perfil musical de la marca', active: true, settings: SETTINGS, custom_fields: FIELDS };

beforeEach(() => { calls.get = []; calls.post = []; calls.patch = []; responses = {}; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Formulario con la marca de Bit Music', () => {
  it('muestra logo, título, descripción, preguntas numeradas, ayuda, respuesta larga y Sí/No como botones; sin «Mensaje»', () => {
    const { container } = render(<LeadFormView form={FORM} onSubmit={async () => {}} />);
    expect(screen.getByAltText('Bit Music').getAttribute('src')).toBe('https://bitmusicapp.com/assets/home/logo.webp');
    expect(screen.getByText('Musicalizamos espacios comerciales')).toBeTruthy();
    expect(screen.getByText('Cuéntanos sobre tu marca.')).toBeTruthy();
    expect(screen.getByText('¿Cuál es el nombre de tu marca?')).toBeTruthy();
    expect(screen.getByText('7.')).toBeTruthy(); // 4 de contacto + 3 preguntas
    expect(screen.getByText('Ejemplo: energía, diversión, chill.')).toBeTruthy();
    expect(container.querySelector('textarea#lf-q2')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Sí', 'No']);
    expect(container.querySelector('#lf-message')).toBeNull();
    const root = container.querySelector('.lf-root');
    expect(root.style.getPropertyValue('--lf-s')).toBe('#E000FF'); expect(root.style.getPropertyValue('--lf-bg')).toBe('#0B0A0F');
  });

  it('no deja enviar si faltan obligatorias y dice cuál; completo, envía todo y muestra el agradecimiento', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<LeadFormView form={FORM} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('#lf-name'), { target: { value: 'Ana Ruiz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Faltan 3 respuestas obligatorias/);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(container.querySelector('#lf-email'), { target: { value: 'ana@toks.mx' } });
    fireEvent.change(container.querySelector('#lf-company'), { target: { value: 'Toks' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByRole('alert').textContent).toBe('Falta: ¿Cuántos puntos de venta tienen?');
    fireEvent.change(container.querySelector('#lf-q1'), { target: { value: '180' } });
    fireEvent.change(container.querySelector('#lf-q2'), { target: { value: 'Energía' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Sí' }));
    expect(screen.getByRole('radio', { name: 'Sí' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Ana Ruiz', email: 'ana@toks.mx', company: 'Toks', website: '', custom_answers: { q1: '180', q2: 'Energía', q3: 'Sí' } });
    expect(await screen.findByText('¡Gracias, Ana!')).toBeTruthy();
    expect(screen.getByText('Armamos tu propuesta musical.')).toBeTruthy();
  });

  it('escribir en un campo no le quita el foco (antes la página se re-montaba en cada tecla)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...FORM, custom_fields: FIELDS }) })));
    const { container } = render(<MemoryRouter initialEntries={['/public/lead-forms/f1']}><Routes><Route path="/public/lead-forms/:id" element={<PublicLeadForm />} /></Routes></MemoryRouter>);
    await screen.findByText('Musicalizamos espacios comerciales');
    const input = container.querySelector('#lf-name'); input.focus();
    fireEvent.change(input, { target: { value: 'A' } });
    expect(document.activeElement).toBe(container.querySelector('#lf-name'));
    expect(document.title).toBe('Musicalizamos espacios comerciales');
  });

  it('si el servidor rechaza el envío, muestra su motivo', async () => {
    const { container } = render(<LeadFormView form={{ ...FORM, settings: {}, custom_fields: [] }} onSubmit={async () => { throw new Error('Este formulario ya no está activo.'); }} />);
    fireEvent.change(container.querySelector('#lf-name'), { target: { value: 'Eva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Este formulario ya no está activo.')).toBeTruthy();
  });
});

const RESP = {
  form: { id: 'f1', name: FORM.name, settings: SETTINGS },
  fields: [{ id: 'q1', label: 'Puntos de venta', field_type: 'number' }, { id: 'q3', label: 'Anuncios propios', field_type: 'select' }],
  metrics: {
    total: 3, clients: 2, last_7_days: 2, last_30_days: 3, new_deals: 1, attached_to_existing: 2,
    weeks: Array.from({ length: 12 }, (_, i) => ({ week: `2026-09-${String(i + 1).padStart(2, '0')}`, count: i === 11 ? 2 : 0 })),
    deals: { abierto: 1, ganado: 1, perdido: 0, total: 2, win_rate_pct: 100 },
    questions: [
      { id: 'q1', label: 'Puntos de venta', field_type: 'number', answered: 2, answered_pct: 100, stats: { sum: 202, avg: 101, min: 12, max: 190 } },
      { id: 'q3', label: 'Anuncios propios', field_type: 'select', answered: 2, answered_pct: 100, distribution: [{ value: 'Sí', count: 2, pct: 100 }] },
    ],
  },
  rows: [
    { id: 's2', created_at: '2026-11-18T15:00:00Z', matched_existing: true, name: 'Ana Ruiz', email: 'ana@toks.mx', phone: '', company: 'Toks', message: '', custom: { q1: '190', q3: 'Sí' }, deal: { id: 'd-toks', title: 'Toks · Bit Music', status: 'ganado', stage: 'Ganado' } },
    { id: 's1', created_at: '2026-11-17T15:00:00Z', matched_existing: false, name: 'Luis Paz', email: 'luis@pollo.co', phone: '+57 300', company: 'Pollo "Feliz"', message: '', custom: { q1: '12', q3: 'Sí' }, deal: { id: 'd2', title: 'Pollo Feliz · Bit Music', status: 'abierto', stage: 'Prospecto' } },
  ],
};

describe('Respuestas y métricas', () => {
  it('muestra totales, reparto por opción, estadísticas numéricas y cada respuesta con su trato', async () => {
    responses['/api/lead-forms/f1/responses'] = RESP;
    render(<MemoryRouter><ResponsesDrawer form={{ id: 'f1', name: FORM.name }} onClose={() => {}} /></MemoryRouter>);
    expect(await screen.findByText('2 a tratos existentes')).toBeTruthy();
    expect(screen.getByText('100% de los cerrados')).toBeTruthy();
    expect(screen.getByText('202')).toBeTruthy();
    expect(screen.getByText('2 · 100%')).toBeTruthy();
    fireEvent.click(screen.getByText('Toks'));
    expect(screen.getByRole('link', { name: /Toks · Bit Music/ }).getAttribute('href')).toBe('/deals/d-toks');
    expect(screen.getByRole('button', { name: /Descargar CSV/ })).toBeTruthy();
  });

  it('el CSV abre bien en Excel (BOM, columnas con las preguntas, comillas escapadas)', () => {
    const csv = responsesCsv(RESP);
    expect(csv.startsWith('﻿')).toBe(true);
    const [head, , second] = csv.slice(1).split('\r\n');
    expect(head).toContain('"¿Cuál es el nombre de tu marca?","Puntos de venta","Anuncios propios"');
    expect(second).toContain('"Pollo ""Feliz"""'); expect(second).toContain('"Abierto","No"');
  });

  it('si falta el script 066, lo dice', async () => {
    const { api } = await import('../src/lib/api');
    api.get.mockImplementationOnce(async () => { throw new Error('Falta correr el script 066 en Supabase para guardar las respuestas.'); });
    render(<MemoryRouter><ResponsesDrawer form={{ id: 'f1', name: 'X' }} onClose={() => {}} /></MemoryRouter>);
    expect(await screen.findByText(/script 066/)).toBeTruthy();
  });
});

describe('Pantalla de formularios', () => {
  const wrap = () => render(<ConfirmProvider><MemoryRouter><LeadForms /></MemoryRouter></ConfirmProvider>);
  it('«Plantilla Bit Music» crea el formulario desde el servidor', async () => {
    responses['/api/lead-forms'] = [];
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: /Plantilla Bit Music/ }));
    await waitFor(() => expect(calls.post.some(([p]) => p === '/api/lead-forms/templates/bitmusic')).toBe(true));
  });

  it('cada formulario abre sus respuestas y su diseño; guardar el diseño manda los ajustes', async () => {
    responses['/api/lead-forms/f1/responses'] = RESP;
    responses['/api/lead-forms'] = [{ id: 'f1', name: FORM.name, active: true, submissions_count: 3, field_ids: ['q1'], settings: { ...SETTINGS, required_field_ids: [], long_field_ids: [] }, pipelines: { name: 'Bit Music' }, pipeline_stages: { name: 'Prospecto' } }];
    responses['/api/custom-fields'] = [{ id: 'q1', label: '¿Cuántos puntos de venta tienen?', field_type: 'number' }];
    wrap();
    expect(await screen.findByText(FORM.name, { selector: 'h3' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Plantilla Bit Music/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Respuestas y métricas/ }));
    expect(await screen.findByText('2 a tratos existentes')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Diseño y textos/ }));
    const title = await screen.findByDisplayValue('Musicalizamos espacios comerciales');
    fireEvent.change(title, { target: { value: 'Tu música, tu marca' } });
    fireEvent.click(screen.getByLabelText('Obligatoria'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.patch.length).toBe(1));
    const [path, body] = calls.patch[0];
    expect(path).toBe('/api/lead-forms/f1');
    expect(body.settings).toMatchObject({ title: 'Tu música, tu marca', required_field_ids: ['q1'], theme: { secondary: '#E000FF', logo_url: SETTINGS.theme.logo_url } });
  });

  it('la vista previa usa el mismo diseño de marca que ve el cliente', async () => {
    responses['/api/lead-forms'] = [{ id: 'f1', name: FORM.name, active: true, field_ids: [], settings: SETTINGS, pipelines: { name: 'Bit Music' }, pipeline_stages: { name: 'Prospecto' } }];
    wrap();
    await screen.findByText(FORM.name, { selector: 'h3' });
    fireEvent.click(screen.getByRole('button', { name: /^Vista previa$/ }));
    expect(await screen.findByAltText('Bit Music')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Faltan 3|Vista previa/);
  });
});

describe('Diseño: cada campo de contacto puede ser obligatorio', () => {
  it('marcar «Teléfono» obligatorio se guarda', async () => {
    render(<DesignDrawer form={{ id: 'f9', name: 'X', settings: {} }} fields={[]} onClose={() => {}} />);
    const boxes = screen.getAllByLabelText('Obligatorio');
    fireEvent.click(boxes[1]); // correo, TELÉFONO, empresa
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.patch.length).toBe(1));
    expect(calls.patch[0][1].settings.required).toMatchObject({ phone: true });
  });
});
