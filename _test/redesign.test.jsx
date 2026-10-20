import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const CATALOG = ['Bit Music', 'Bit Signage', 'Bit WiFi', 'Email Marketing', 'Loyalty', 'Neomedia', 'SMS', 'Venta de routers', 'WhatsApp Marketing']
  .map((name, i) => ({ id: `p${i}`, name, price: 50, currency: 'USD', type: 'servicio', active: true }));
const store = { posts: [], patches: [], gets: [], handlers: {} };
const route = (path) => { for (const [re, fn] of Object.entries(store.handlers)) if (new RegExp(re).test(path)) return fn(path); return []; };
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { store.gets.push(p); return JSON.parse(JSON.stringify(route(p))); }),
    post: vi.fn(async (p, b) => { store.posts.push([p, b]); return { id: 'new', ...b, calendar_sync: { ok: true } }; }),
    patch: vi.fn(async (p, b) => { store.patches.push([p, b]); return {}; }),
    put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { updateUser: vi.fn(async () => ({ error: null })) } } }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario Ramos', email: 'mario@bitproximity.com', role: 'admin', blocked_pages: [] } }) }));

import { hardwareOptionsFor, productOptions, familyOf, FALLBACK_PRODUCTS } from '../src/lib/productCatalog.js';
import { cleanMeetingUrl, meetingProvider } from '../src/lib/meetingLink.js';
import MeetingLinkField from '../src/components/MeetingLinkField.jsx';
import NewActivityModal, { quickDates } from '../src/components/NewActivityModal.jsx';
import AddDealModal from '../src/components/AddDealModal.jsx';
import Companies from '../src/pages/Companies.jsx';
import Profile from '../src/pages/Profile.jsx';
import LeadForms from '../src/pages/LeadForms.jsx';
import Tasks, { TaskDetailModal } from '../src/pages/Tasks.jsx';
import NewTaskModal from '../src/components/NewTaskModal.jsx';
import ProductModal from '../src/components/ProductModal.jsx';
import Products from '../src/pages/Products.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

beforeEach(() => { store.posts = []; store.patches = []; store.gets = []; store.handlers = {}; });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const wrap = (ui, path = '/') => render(<ConfirmProvider><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></ConfirmProvider>);

describe('Producto desde el catálogo + hardware según producto', () => {
  it('los servicios de software no llevan hardware; los productos con equipos sí', () => {
    for (const name of ['Email Marketing', 'WhatsApp Marketing', 'Loyalty', 'SMS', 'Comisiones', 'Implementación Pipedrive']) expect(hardwareOptionsFor({ productLine: name })).toEqual([]);
    expect(hardwareOptionsFor({ productLine: 'Bit WiFi' })).toContain('Meraki');
    expect(hardwareOptionsFor({ productLine: 'Venta de routers' })).toContain('Mikrotik');
    expect(hardwareOptionsFor({ productLine: 'Bit Music' })).toEqual(['Android Box', 'Computadora', 'Tablet', 'Otro']);
    expect(hardwareOptionsFor({ productLine: 'Neomedia' })).toContain('LED');
    expect(hardwareOptionsFor({ productLine: 'Bit Signage' })).toContain('Monitor profesional');
    expect(hardwareOptionsFor({ productLine: 'Venta de pantallas' })).toContain('TV');
  });
  it('Bit Signage y Neomedia son productos separados', () => {
    expect(FALLBACK_PRODUCTS).toContain('Bit Signage'); expect(FALLBACK_PRODUCTS).toContain('Cartelería Digital (Neomedia)'); expect(FALLBACK_PRODUCTS).not.toContain('Neomedia'); expect(FALLBACK_PRODUCTS).not.toContain('WhatsApp');
    expect(FALLBACK_PRODUCTS).not.toContain('Bit Signage / Neomedia');
    expect(familyOf('Bit Signage')?.key).toBe('signage'); expect(familyOf('Neomedia')?.key).toBe('signage'); expect(familyOf('Cartelería Digital (Neomedia)')?.key).toBe('signage'); expect(familyOf('WhatsApp Marketing')).toBeNull();
  });
  it('sin producto: el embudo manda (Bit WiFi) o lista genérica en embudos por país', () => {
    expect(hardwareOptionsFor({ pipelineName: 'Bit WiFi' })).toContain('Cisco');
    expect(hardwareOptionsFor({ pipelineName: 'Bit Ecuador' })).toContain('Pantalla / TV');
  });
  it('el desplegable usa el catálogo; respalda con la lista fija solo si no hay catálogo; conserva el valor viejo', () => {
    expect(productOptions(CATALOG)).toEqual([...CATALOG.map((p) => p.name)].sort((a, b) => a.localeCompare(b, 'es')));
    expect(productOptions([])).toEqual([...FALLBACK_PRODUCTS].sort((a, b) => a.localeCompare(b, 'es')));
    expect(productOptions(CATALOG, 'Bit Signage / Neomedia')).toContain('Bit Signage / Neomedia');
  });
});

describe('AddDealModal en un embudo por país', () => {
  const pipelines = [{ id: 'p1', name: 'Bit Ecuador', pipeline_stages: [{ id: 's1', name: 'Prospecto', position: 1 }] }, { id: 'p2', name: 'Bit WiFi', pipeline_stages: [{ id: 's2', name: 'Prospecto', position: 1 }] }];
  const open = async (pipelineId = 'p1') => {
    store.handlers = { '^/api/products': () => CATALOG };
    wrap(<AddDealModal open pipelines={pipelines} pipelineId={pipelineId} onClose={() => {}} onCreated={() => {}} />);
    await waitFor(() => expect(screen.queryByText('Producto')).toBeTruthy());
  };
  const productSelect = () => screen.getByText('Producto').parentElement.querySelector('select');
  it('«Producto» ofrece el catálogo del CRM (no la lista fija) y cada opción existe una sola vez', async () => {
    await open();
    const opts = [...productSelect().querySelectorAll('option')].map((o) => o.textContent).filter((t) => t !== 'Sin especificar');
    await waitFor(() => expect([...productSelect().querySelectorAll('option')].length).toBeGreaterThan(5));
    const now = [...productSelect().querySelectorAll('option')].map((o) => o.textContent).filter((t) => t !== 'Sin especificar');
    expect(now).toEqual(CATALOG.map((p) => p.name).sort((a, b) => a.localeCompare(b, 'es')));
    expect(now).not.toContain('Bit Signage / Neomedia');
    expect(new Set(now).size).toBe(now.length);
    expect(opts).toBeDefined();
  });
  it('un servicio (Email Marketing) oculta el hardware; Bit WiFi lo muestra con sus marcas', async () => {
    await open();
    await waitFor(() => expect(productSelect().querySelectorAll('option').length).toBeGreaterThan(5));
    expect(screen.getByText('Tipo de hardware')).toBeTruthy(); // sin producto: lista genérica
    fireEvent.change(productSelect(), { target: { value: 'Email Marketing' } });
    expect(screen.queryByText('Tipo de hardware')).toBeNull();
    fireEvent.change(productSelect(), { target: { value: 'Bit WiFi' } });
    const hw = screen.getByText('Tipo de hardware').parentElement.querySelector('select');
    expect([...hw.querySelectorAll('option')].map((o) => o.textContent)).toContain('Meraki');
  });
  it('en un embudo que ya es una línea (Bit WiFi) no se pide «Producto»', async () => {
    store.handlers = { '^/api/products': () => CATALOG };
    wrap(<AddDealModal open pipelines={pipelines} pipelineId="p2" onClose={() => {}} onCreated={() => {}} />);
    await waitFor(() => expect(screen.getByText('Frecuencia de facturación')).toBeTruthy());
    expect(screen.queryByText('Producto')).toBeNull();
  });
  it('guarda product_line con el nombre del catálogo y el hardware elegido', async () => {
    await open();
    await waitFor(() => expect(productSelect().querySelectorAll('option').length).toBeGreaterThan(5));
    fireEvent.change(screen.getByPlaceholderText(/Suscripción anual/), { target: { value: 'Trato de prueba' } });
    fireEvent.change(productSelect(), { target: { value: 'Bit WiFi' } });
    fireEvent.change(screen.getByText('Tipo de hardware').parentElement.querySelector('select'), { target: { value: 'Meraki' } });
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    await waitFor(() => expect(store.posts.find(([p]) => p === '/api/deals')).toBeTruthy());
    const body = store.posts.find(([p]) => p === '/api/deals')[1];
    expect(body.product_line).toBe('Bit WiFi'); expect(body.hardware_type).toBe('Meraki');
  });
});

describe('Link de la reunión', () => {
  it('limpia, valida y reconoce el servicio (igual que el backend)', () => {
    expect(cleanMeetingUrl('meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
    expect(cleanMeetingUrl('javascript:alert(1)')).toBeNull(); expect(cleanMeetingUrl('hola')).toBeNull();
    expect(meetingProvider('https://us02web.zoom.us/j/1')).toBe('Zoom'); expect(meetingProvider('https://teams.microsoft.com/l/x')).toBe('Microsoft Teams');
  });
  it('un link inválido muestra aviso y NO se guarda; uno válido se guarda al salir del campo', () => {
    const onSave = vi.fn();
    render(<MeetingLinkField value="" onSave={onSave} />);
    const input = screen.getByLabelText('Link de la reunión');
    fireEvent.change(input, { target: { value: 'esto no es un link' } }); fireEvent.blur(input);
    expect(screen.getByText(/no parece un link/)).toBeTruthy(); expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'https://meet.google.com/abc-defg-hij' } });
    expect(screen.getByText('Google Meet')).toBeTruthy();
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
  });
  it('avisa cada cambio válido con onDraft (crear justo después de pegar no pierde el link)', () => {
    const onDraft = vi.fn();
    render(<MeetingLinkField value="" onDraft={onDraft} onSave={() => {}} />);
    fireEvent.change(screen.getByLabelText('Link de la reunión'), { target: { value: 'zoom.us/j/123' } });
    expect(onDraft).toHaveBeenLastCalledWith('https://zoom.us/j/123');
  });
});

describe('Tarea: el link va antes de los comentarios', () => {
  const task = { id: 't1', title: 'Reunion Spoonity', status: 'pendiente', priority: 'media', assignee_id: 'u2', due_date: null, meeting_url: '', google_event_id: null, comments: [], subtasks: [] };
  it('muestra «Reunión» antes de «Comentarios» y guarda el link con PATCH', async () => {
    store.handlers = { '^/api/tasks/t1$': () => task };
    wrap(<TaskDetailModal taskId="t1" team={[{ id: 'u2', full_name: 'Sofia Florido' }]} onClose={() => {}} onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('Link de la reunión')).toBeTruthy());
    const html = document.body.innerHTML;
    expect(html.indexOf('Reunión')).toBeGreaterThan(-1);
    expect(html.indexOf('Reunión')).toBeLessThan(html.indexOf('Comentarios'));
    const input = screen.getByLabelText('Link de la reunión');
    fireEvent.change(input, { target: { value: 'https://us02web.zoom.us/j/555' } }); fireEvent.blur(input);
    await waitFor(() => expect(store.patches.find(([p]) => p === '/api/tasks/t1')).toBeTruthy());
    expect(store.patches[0][1]).toEqual({ meeting_url: 'https://us02web.zoom.us/j/555' });
  });
});

describe('Nueva actividad', () => {
  it('fechas rápidas: Hoy +2 h (si cae el mismo día), Mañana 9:00, próximo lunes 9:00, +1 semana', () => {
    const now = new Date(2026, 9, 14, 10, 15); // miércoles 14/10/2026 10:15
    const q = Object.fromEntries(quickDates(now).map((x) => [x.key, x.date]));
    expect(q.hoy.getHours()).toBe(12); expect(q.hoy.getDate()).toBe(14);
    expect(q.manana.getDate()).toBe(15); expect(q.manana.getHours()).toBe(9);
    expect(q.lunes.getDay()).toBe(1); expect(q.lunes.getDate()).toBe(19);
    expect(q.semana.getDate()).toBe(21);
    const late = Object.fromEntries(quickDates(new Date(2026, 9, 14, 22, 40)).map((x) => [x.key, 1]));
    expect(late.hoy).toBeUndefined();
  });
  it('crea una reunión con tipo, asunto, fecha, link limpio y notas', async () => {
    const onCreated = vi.fn();
    render(<NewActivityModal onClose={() => {}} onCreated={onCreated} />);
    const btn = screen.getByRole('button', { name: 'Crear actividad' });
    expect(btn.disabled).toBe(true); // sin asunto
    fireEvent.click(screen.getByRole('radio', { name: /Reunión/ }));
    fireEvent.change(screen.getByPlaceholderText(/Demo con Grupo Ramos/), { target: { value: '  Demo con Banco Unión ' } });
    fireEvent.click(screen.getByText('Mañana'));
    fireEvent.change(screen.getByLabelText('Link de la reunión'), { target: { value: 'meet.google.com/abc-defg-hij' } });
    fireEvent.change(screen.getByPlaceholderText(/Contexto, temas/), { target: { value: 'Llevar propuesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [path, body] = store.posts[0];
    expect(path).toBe('/api/activities');
    expect(body).toMatchObject({ title: 'Demo con Banco Unión', type: 'reunion', summary: 'Llevar propuesta', meeting_url: 'https://meet.google.com/abc-defg-hij' });
    expect(new Date(body.due_date).getHours()).toBe(9);
  });
  it('una nota no pide link y no lo envía', async () => {
    const onCreated = vi.fn();
    render(<NewActivityModal onClose={() => {}} onCreated={onCreated} />);
    fireEvent.click(screen.getByRole('radio', { name: /Nota/ }));
    expect(screen.queryByLabelText('Link de la reunión')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/Resumen de la llamada/), { target: { value: 'Resumen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect('meeting_url' in store.posts[0][1]).toBe(false);
  });
  it('si el servidor falla muestra el error y no cierra', async () => {
    const { api } = await import('../src/lib/api');
    api.post.mockRejectedValueOnce(new Error('No se pudo crear'));
    const onCreated = vi.fn();
    render(<NewActivityModal onClose={() => {}} onCreated={onCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Llamar a Juan/), { target: { value: 'Algo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad' }));
    await waitFor(() => expect(screen.getByText('No se pudo crear')).toBeTruthy());
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe('Empresas', () => {
  const rows = [{ id: 'c1', name: 'Grupo Ramos', industry: 'Retail', country: 'Perú', contacts: [{ count: 3 }], deals: [{ count: 1 }], team_members: null }];
  it('muestra los conteos y filtra por país e industria hacia el servidor', async () => {
    store.handlers = { '^/api/companies\\?': () => ({ data: rows, count: 1 }) };
    wrap(<Companies />);
    await waitFor(() => expect(screen.getByText('Grupo Ramos')).toBeTruthy());
    expect(screen.getByText('contactos')).toBeTruthy(); expect(screen.getByText('trato')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'Perú' } });
    await waitFor(() => expect(store.gets.some((g) => g.includes('country=Per%C3%BA'))).toBe(true));
    fireEvent.change(screen.getByLabelText('Industria'), { target: { value: 'Retail' } });
    await waitFor(() => expect(store.gets.some((g) => g.includes('industry=Retail') && g.includes('country=Per%C3%BA'))).toBe(true));
    expect(screen.getByText('Limpiar filtros')).toBeTruthy();
  });
  it('estado vacío con filtros ofrece limpiar; la búsqueda espera antes de consultar', async () => {
    store.handlers = { '^/api/companies\\?': () => ({ data: [], count: 0 }) };
    wrap(<Companies />);
    await waitFor(() => expect(screen.getByText('Sin empresas todavía')).toBeTruthy());
    const before = store.gets.length;
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'zzz' } });
    expect(store.gets.length).toBe(before); // aún no (debounce)
    await waitFor(() => expect(store.gets.some((g) => g.includes('search=zzz'))).toBe(true), { timeout: 2000 }); // llegó la consulta tras la espera
    await waitFor(() => expect(screen.getByText('Ninguna empresa coincide con estos filtros')).toBeTruthy());
  });
});

describe('Mi Perfil', () => {
  beforeEach(() => { store.handlers = { '^/api/gmail/status': () => ({ connections: [{ email: 'a@x.com' }, { email: 'b@x.com' }] }), '^/api/calcom/status': () => ({ connected: false }) }; });
  it('muestra identidad, cuentas de Google (la primera es la principal) y valida la contraseña', async () => {
    wrap(<Profile />);
    expect(screen.getByText('Mario Ramos')).toBeTruthy(); expect(screen.getByText('Administrador')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeTruthy());
    expect(screen.getByText('principal')).toBeTruthy(); expect(screen.getByText('2 conectadas')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Nueva contraseña'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar contraseña'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Nueva contraseña'), { target: { value: 'abcdef1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
  });
  it('contraseña válida y coincidente: la actualiza', async () => {
    const { supabase } = await import('../src/lib/supabase');
    wrap(<Profile />);
    fireEvent.change(screen.getByPlaceholderText('Nueva contraseña'), { target: { value: 'Segura123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar contraseña'), { target: { value: 'Segura123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    await waitFor(() => expect(screen.getByText('Contraseña actualizada.')).toBeTruthy());
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Segura123' });
  });
});

describe('Formularios de captura', () => {
  const forms = [{ id: 'f1', name: 'Bit Music', active: true, submissions_count: 5, pipelines: { name: 'Bit Music' }, pipeline_stages: { name: 'Prospecto' }, team_members: { full_name: 'Mario Ramos' }, field_ids: [] }];
  beforeEach(() => {
    store.handlers = {
      '^/api/lead-forms$': () => forms, '^/api/pipelines$': () => [{ id: 'p1', name: 'Bit Music', pipeline_stages: [{ id: 's1', name: 'Prospecto', position: 1 }] }],
      '^/api/team$': () => [{ id: 'u1', full_name: 'Mario Ramos' }], '^/api/custom-fields': () => [],
    };
  });
  it('resume y el interruptor pausa el formulario', async () => {
    wrap(<LeadForms />);
    await waitFor(() => expect(screen.getByText('Bit Music', { selector: 'h3' })).toBeTruthy());
    expect(screen.getByText('Recibiendo envíos')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Pausar Bit Music' }));
    await waitFor(() => expect(store.patches.find(([p]) => p === '/api/lead-forms/f1')).toBeTruthy());
    expect(store.patches[0][1]).toEqual({ active: false });
  });
  it('crear: el botón espera nombre, pipeline y etapa; luego envía el formulario', async () => {
    wrap(<LeadForms />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Nuevo formulario/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Nuevo formulario/ }));
    const create = screen.getByRole('button', { name: 'Crear formulario' });
    expect(create.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Web — Contacto/), { target: { value: 'Landing' } });
    const dialog = screen.getByRole('dialog');
    const selects = dialog.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'p1' } });
    fireEvent.change(dialog.querySelectorAll('select')[1], { target: { value: 's1' } });
    expect(screen.getByRole('button', { name: 'Crear formulario' }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Crear formulario' }));
    await waitFor(() => expect(store.posts.find(([p]) => p === '/api/lead-forms')).toBeTruthy());
    expect(store.posts.find(([p]) => p === '/api/lead-forms')[1]).toMatchObject({ name: 'Landing', pipeline_id: 'p1', stage_id: 's1' });
  });
});

describe('Nueva tarea', () => {
  const projects = [{ id: 'pj1', name: 'Customer success (follow up)' }, { id: 'pj2', name: 'Lanzamiento Bit Music' }];
  const team = [{ id: 'u1', full_name: 'Mario Ramos' }, { id: 'u2', full_name: 'Sofia Florido' }];
  const renderModal = (extra = {}) => { const onCreated = vi.fn(); const onClose = vi.fn(); render(<NewTaskModal projects={projects} team={team} onClose={onClose} onCreated={onCreated} {...extra} />); return { onCreated, onClose }; };

  it('no deja crear sin título', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Crear tarea' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Crear y añadir otra' }).disabled).toBe(true);
  });
  it('crea con proyecto, fecha rápida, prioridad, responsable y link limpio', async () => {
    const { onCreated } = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Enviar propuesta/), { target: { value: '  Reunión con Spoonity ' } });
    fireEvent.focus(screen.getByPlaceholderText(/Sin proyecto/));
    fireEvent.click(screen.getByText('Lanzamiento Bit Music'));
    fireEvent.click(screen.getByText('Mañana'));
    fireEvent.click(screen.getByRole('radio', { name: /Urgente/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Sofia Florido/ }));
    fireEvent.change(screen.getByLabelText('Link de la reunión'), { target: { value: 'meet.google.com/abc-defg-hij' } });
    expect(screen.getByText(/aparece en el Google Calendar de Sofia Florido/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [path, body] = store.posts[0];
    expect(path).toBe('/api/tasks');
    expect(body).toMatchObject({ title: 'Reunión con Spoonity', project_id: 'pj2', assignee_id: 'u2', priority: 'urgente', meeting_url: 'https://meet.google.com/abc-defg-hij' });
    expect(new Date(body.due_date).getHours()).toBe(9);
  });
  it('valores por defecto: media, sin responsable, sin proyecto, sin fecha y sin link', async () => {
    const { onCreated } = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Enviar propuesta/), { target: { value: 'Algo simple' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(store.posts[0][1]).toEqual({ title: 'Algo simple', due_date: null, assignee_id: null, project_id: null, priority: 'media' });
  });
  it('«Crear y añadir otra» deja la ventana abierta, limpia título/fecha/link y conserva proyecto, responsable y prioridad', async () => {
    const { onCreated, onClose } = renderModal({ presetProjectId: 'pj1' });
    fireEvent.change(screen.getByPlaceholderText(/Enviar propuesta/), { target: { value: 'Primera' } });
    fireEvent.click(screen.getByRole('radio', { name: /Alta/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Mario Ramos/ }));
    fireEvent.click(screen.getByText('Mañana'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear y añadir otra' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.anything(), { another: true }));
    await waitFor(() => expect(screen.getByPlaceholderText(/Enviar propuesta/).value).toBe(''));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('1 creada en esta sesión')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Alta/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /Mario Ramos/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Customer success (follow up)')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Enviar propuesta/), { target: { value: 'Segunda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await waitFor(() => expect(store.posts.length).toBe(2));
    expect(store.posts[1][1]).toMatchObject({ title: 'Segunda', project_id: 'pj1', assignee_id: 'u1', priority: 'alta', due_date: null });
  });
  it('si el servidor falla muestra el error y no cierra', async () => {
    const { api } = await import('../src/lib/api');
    api.post.mockRejectedValueOnce(new Error('No se pudo crear la tarea (prueba)'));
    const { onCreated } = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Enviar propuesta/), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await waitFor(() => expect(screen.getByText('No se pudo crear la tarea (prueba)')).toBeTruthy());
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Crear tarea' }).disabled).toBe(false); // se puede reintentar
  });
  it('en la página: «Nueva tarea» abre la ventana, crea y la cierra', async () => {
    store.handlers = { '^/api/tasks$': () => [], '^/api/team$': () => team, '^/api/projects': () => projects };
    wrap(<Tasks />);
    fireEvent.click(await screen.findByRole('button', { name: /Nueva tarea/ }));
    fireEvent.change(await screen.findByPlaceholderText(/Enviar propuesta/), { target: { value: 'Desde la página' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Enviar propuesta/)).toBeNull());
    expect(store.posts[0][1].title).toBe('Desde la página');
    expect(screen.getByText('Tarea creada.')).toBeTruthy();
  });
});

describe('Productos: crear y editar', () => {
  const rates = [{ currency: 'USD', rate_to_usd: 1 }, { currency: 'COP', rate_to_usd: 0.00025 }];
  const renderModal = (props = {}) => { store.handlers = { '^/api/exchange-rates$': () => rates }; const onSubmit = props.onSubmit || vi.fn(async () => {}); const onClose = vi.fn(); render(<ProductModal existingNames={['Bit WiFi']} onClose={onClose} onSubmit={onSubmit} {...props} />); return { onSubmit, onClose }; };

  it('no deja crear sin nombre ni con precio negativo', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Crear producto' }).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Algo' } });
    expect(screen.getByRole('button', { name: 'Crear producto' }).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '-5' } });
    expect(screen.getByText(/igual o mayor a 0/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear producto' }).disabled).toBe(true);
  });
  it('crea con tipo, facturación, precio, moneda y SKU; valores por defecto producto/mensual/USD', async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: '  SMS Marketing ' } });
    fireEvent.click(screen.getByRole('radio', { name: /Servicio/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Anual/ }));
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'COP' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. EML-001'), { target: { value: ' SMS-01 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'SMS Marketing', type: 'servicio', billing_frequency: 'anual', price: 1200, currency: 'COP', sku: 'SMS-01' });
  });
  it('sin precio guarda 0 y por defecto es producto mensual en USD', async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Loyalty' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Loyalty', type: 'producto', billing_frequency: 'mensual', price: 0, currency: 'USD', sku: '' });
  });
  it('avisa si el nombre ya existe (sin importar mayúsculas) pero no lo bloquea', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'bit wifi' } });
    expect(screen.getByText(/Ya existe un producto con este nombre/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear producto' }).disabled).toBe(false);
  });
  it('muestra el equivalente en USD para otras monedas y el aviso de hardware según el nombre', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Venta de routers' } });
    expect(screen.getByText(/tipo de hardware \(WiFi\)/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Email Marketing' } });
    expect(screen.getByText(/no pedirá hardware/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '4000000' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'COP' } });
    await waitFor(() => expect(screen.getByText(/≈ USD 1,000/)).toBeTruthy());
  });
  it('error de SKU repetido se explica en español y la ventana sigue abierta', async () => {
    const onSubmit = vi.fn(async () => { throw new Error('duplicate key value violates unique constraint "products_sku_key"'); });
    renderModal({ onSubmit });
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Algo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
    await waitFor(() => expect(screen.getByText('Ese SKU ya lo está usando otro producto.')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Crear producto' }).disabled).toBe(false);
  });
  it('«Crear y añadir otro» conserva tipo, facturación y moneda y limpia nombre, precio y SKU', async () => {
    const { onSubmit, onClose } = renderModal();
    fireEvent.click(screen.getByRole('radio', { name: /Servicio/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Único/ }));
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'EUR' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. Email Marketing'), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear y añadir otro' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { another: true }));
    await waitFor(() => expect(screen.getByPlaceholderText('Ej. Email Marketing').value).toBe(''));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('1 creado en esta sesión')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Servicio/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /Único/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Moneda').value).toBe('EUR');
  });
  it('editar: precarga el producto, permite archivarlo y no ofrece «añadir otro»', async () => {
    const product = { id: 'p1', name: 'Bit Music', type: 'producto', billing_frequency: 'mensual', price: 10, currency: 'USD', sku: 'BM-1', active: true };
    const { onSubmit } = renderModal({ product });
    expect(screen.getByPlaceholderText('Ej. Email Marketing').value).toBe('Bit Music');
    expect(screen.queryByRole('button', { name: 'Crear y añadir otro' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Disponible en los tratos' }));
    expect(screen.getByText('Archivado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Bit Music', sku: 'BM-1', price: 10, active: false });
  });

  describe('página', () => {
    const catalog = [
      { id: 'a', name: 'Bit WiFi', type: 'servicio', price: 25, currency: 'USD', billing_frequency: 'mensual', sku: null, active: true },
      { id: 'b', name: 'Comisiones', type: 'producto', price: 0, currency: 'USD', billing_frequency: 'unico', sku: 'COM', active: true },
      { id: 'c', name: 'Producto viejo', type: 'producto', price: 5, currency: 'USD', billing_frequency: 'mensual', sku: null, active: false },
    ];
    it('lista solo lo disponible, filtra, busca y muestra archivados aparte', async () => {
      store.handlers = { '^/api/products$': () => catalog, '^/api/exchange-rates$': () => rates };
      wrap(<Products />);
      await waitFor(() => expect(screen.getByText('Bit WiFi')).toBeTruthy());
      expect(screen.queryByText('Producto viejo')).toBeNull();
      expect(screen.getByText(/disponibles en los tratos/)).toBeTruthy();
      fireEvent.click(screen.getByRole('tab', { name: 'Servicios' }));
      expect(screen.queryByText('Comisiones')).toBeNull();
      fireEvent.click(screen.getByRole('tab', { name: 'Todos' }));
      fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o SKU/), { target: { value: 'COM' } });
      expect(screen.getByText('Comisiones')).toBeTruthy(); expect(screen.queryByText('Bit WiFi')).toBeNull();
      fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o SKU/), { target: { value: '' } });
      fireEvent.click(screen.getByRole('tab', { name: 'Archivados' }));
      expect(screen.getByText('Producto viejo')).toBeTruthy(); expect(screen.getByText('Archivado')).toBeTruthy();
    });
    it('crea desde la ventana, envía el producto y avisa', async () => {
      store.handlers = { '^/api/products$': () => catalog, '^/api/exchange-rates$': () => rates };
      wrap(<Products />);
      fireEvent.click(await screen.findByRole('button', { name: /Nuevo producto/ }));
      fireEvent.change(await screen.findByPlaceholderText('Ej. Email Marketing'), { target: { value: 'WhatsApp Marketing' } });
      fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '90' } });
      fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
      await waitFor(() => expect(store.posts.find(([p]) => p === '/api/products')).toBeTruthy());
      expect(store.posts.find(([p]) => p === '/api/products')[1]).toMatchObject({ name: 'WhatsApp Marketing', price: 90, currency: 'USD', type: 'producto', billing_frequency: 'mensual' });
      await waitFor(() => expect(screen.queryByPlaceholderText('Ej. Email Marketing')).toBeNull());
      expect(screen.getByText(/«WhatsApp Marketing» creado/)).toBeTruthy();
    });
    it('si borrar falla explica que se puede archivar', async () => {
      const { api } = await import('../src/lib/api');
      api.delete.mockRejectedValueOnce(new Error('violates foreign key constraint'));
      store.handlers = { '^/api/products$': () => catalog, '^/api/exchange-rates$': () => rates };
      wrap(<Products />);
      fireEvent.click(await screen.findByRole('button', { name: 'Borrar Bit WiFi' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
      await waitFor(() => expect(screen.getByText(/Archívalo desde Editar/)).toBeTruthy());
    });
  });
});
