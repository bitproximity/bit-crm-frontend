import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getCalls = [];
vi.mock('../src/lib/api', () => ({
  api: { get: vi.fn(async (p) => { getCalls.push(p); if (p.startsWith('/api/dashboard')) return { open_deals: 5, won_this_month: 1, lost_this_month: 0, new_deals_this_month: 2, overdue_tasks: 0, team_pending_tasks: 0, my_open_tasks: 0, open_pipeline_value_usd: 100, pipeline_breakdown: [], recent_wins: [], top_pipeline_by_sales: null, top_product_by_sales: null }; if (p.includes('calendar')) return []; if (p.includes('unread')) return { count: 0 }; return {}; }), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Mario Ramos' } }) }));

import Dashboard from '../src/pages/Dashboard.jsx';
import NotificationBell from '../src/components/NotificationBell.jsx';

const setVisibility = (v) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); };
beforeEach(() => { getCalls.length = 0; setVisibility('visible'); getCalls.length = 0; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Dashboard', () => {
  it('pide el resumen UNA vez al entrar aunque se disparen focus y visibilitychange (antes eran 3)', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(getCalls.filter((p) => p === '/api/dashboard')).toHaveLength(1);
  });

  it('sigue refrescando solo cada 60 s mientras la pantalla está visible (comportamiento original)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(getCalls.filter((p) => p === '/api/dashboard')).toHaveLength(1);
    await act(async () => { vi.advanceTimersByTime(60000); await Promise.resolve(); await Promise.resolve(); });
    expect(getCalls.filter((p) => p === '/api/dashboard')).toHaveLength(2);
    setVisibility('hidden');
    await act(async () => { vi.advanceTimersByTime(60000); await Promise.resolve(); });
    expect(getCalls.filter((p) => p === '/api/dashboard')).toHaveLength(2); // oculta: no consulta
  });
});

describe('Campanita de notificaciones', () => {
  it('con la pestaña oculta NO consulta, y al volver a verla refresca de inmediato', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    const unread = () => getCalls.filter((p) => p.includes('unread-count')).length;
    expect(unread()).toBe(1);
    await act(async () => { vi.advanceTimersByTime(30000); await Promise.resolve(); });
    expect(unread()).toBe(2); // visible: cada 30 s
    setVisibility('hidden');
    await act(async () => { vi.advanceTimersByTime(120000); await Promise.resolve(); });
    expect(unread()).toBe(2); // oculta: cero consultas en 2 minutos
    await act(async () => { setVisibility('visible'); await Promise.resolve(); });
    expect(unread()).toBe(3); // al volver a verla, refresca
  });
});
