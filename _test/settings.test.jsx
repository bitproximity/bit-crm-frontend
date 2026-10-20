import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const gets = [];
const data = {
  '/api/team': [{ id: 'u1', full_name: 'Mario Ramos', email: 'm@x.com', role: 'admin', active: true, blocked_pages: [] }, { id: 'u2', full_name: 'Ex colaborador', email: 'e@x.com', role: 'outbound', active: false, blocked_pages: [] }],
  '/api/pipelines': [], '/api/role-permissions': [], '/api/mcp-keys': [],
  '/api/exchange-rates': [{ currency: 'USD', rate_to_usd: 1 }, { currency: 'COP', rate_to_usd: 0.00025 }],
};
vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(async (p) => { gets.push(p); const k = p.split('?')[0]; return JSON.parse(JSON.stringify(data[k] ?? [])); }),
    post: vi.fn(async () => ({})), patch: vi.fn(async () => ({})), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})),
  },
}));
import Settings, { SETTINGS_SECTIONS } from '../src/pages/Settings.jsx';
import { ConfirmProvider } from '../src/components/ConfirmModal.jsx';

const Where = () => { const l = useLocation(); return <div data-testid="url">{l.pathname + l.search}</div>; };
const open = (url = '/settings') => render(
  <ConfirmProvider><MemoryRouter initialEntries={[url]}><Routes><Route path="/settings" element={<><Settings /><Where /></>} /></Routes></MemoryRouter></ConfirmProvider>
);
beforeEach(() => { gets.length = 0; });
afterEach(() => cleanup());
const nav = () => screen.getByRole('navigation', { name: 'Secciones de configuración' });

describe('Configuración por secciones', () => {
  it('tiene las seis secciones y abre Equipo por defecto', async () => {
    open();
    expect(SETTINGS_SECTIONS.map((s) => s.key)).toEqual(['equipo', 'embudos', 'campos', 'tasas', 'permisos', 'mcp']);
    expect(nav().querySelectorAll('button').length).toBe(6);
    expect(await screen.findByText('Mario Ramos')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Equipo y permisos/ }).getAttribute('aria-current')).toBe('page');
  });
  it('solo carga los datos de la sección abierta (antes los seis paneles pedían todo a la vez)', async () => {
    open();
    await screen.findByText('Mario Ramos');
    expect(gets).toContain('/api/team');
    for (const otro of ['/api/pipelines', '/api/exchange-rates', '/api/role-permissions', '/api/mcp-keys']) expect(gets).not.toContain(otro);
    expect(gets.some((g) => g.startsWith('/api/custom-fields'))).toBe(false);
  });
  it('cambiar de sección muestra el panel y lo deja en la dirección (para enlazarlo y no perder dónde estabas)', async () => {
    open();
    await screen.findByText('Mario Ramos');
    fireEvent.click(screen.getByRole('button', { name: /Tipos de cambio/ }));
    expect(await screen.findByText(/A cuánto equivale 1 unidad/)).toBeTruthy();
    expect(screen.getByTestId('url').textContent).toBe('/settings?seccion=tasas');
    expect(screen.queryByText('Mario Ramos')).toBeNull();
    expect(gets).toContain('/api/exchange-rates');
    fireEvent.click(screen.getByRole('button', { name: /Equipo y permisos/ }));
    expect(await screen.findByText('Mario Ramos')).toBeTruthy();
    expect(screen.getByTestId('url').textContent).toBe('/settings'); // la primera sección no ensucia la dirección
  });
  it('una dirección con ?seccion= abre esa sección directo (los enlaces de otras pantallas)', async () => {
    open('/settings?seccion=permisos');
    expect(await screen.findByText(/Quién puede ver y gestionar cada sección/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Permisos por rol/ }).getAttribute('aria-current')).toBe('page');
    cleanup();
    open('/settings?seccion=mcp');
    expect(await screen.findByText('Claude / MCP', { selector: 'div' })).toBeTruthy();
  });
  it('una sección que no existe cae en Equipo en vez de dejar la pantalla vacía', async () => {
    open('/settings?seccion=inventada');
    expect(await screen.findByText('Mario Ramos')).toBeTruthy();
  });
  it('Equipo: el colaborador sin acceso aparece tachado y se puede reactivar; el activo no', async () => {
    open();
    const ex = await screen.findByText('Ex colaborador');
    expect(ex.className).toMatch(/line-through/);
    expect(screen.getByText('Mario Ramos').className).not.toMatch(/line-through/);
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeTruthy();
  });
});
