import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let authCallback = null;
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'tok' } } }),
      refreshSession: async () => ({ data: { session: { access_token: 'tok2' } } }),
      onAuthStateChange: (cb) => { authCallback = cb; return { data: { subscription: { unsubscribe() { } } } }; },
    },
  },
}));

const calls = [];
let slow = 0;
let nextResponse = null;
const respond = (path, method) => {
  if (nextResponse) { const r = nextResponse; nextResponse = null; return r; }
  if (path.startsWith('/api/pipelines')) return { status: 200, body: [{ id: 'p1', pipeline_stages: [{ id: 's1' }] }] };
  if (path.startsWith('/api/dashboard')) return { status: 200, body: { open_deals: 5, n: calls.length } };
  return { status: 200, body: { ok: true, n: calls.length } };
};
beforeEach(() => {
  calls.length = 0; slow = 0; nextResponse = null;
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, '');
    calls.push({ path, method: opts.method || 'GET' });
    if (slow) await new Promise((r) => setTimeout(r, slow));
    const r = respond(path, opts.method || 'GET');
    return { ok: r.status < 400, status: r.status, json: async () => JSON.parse(JSON.stringify(r.body)) };
  });
});
afterEach(() => { vi.useRealTimers(); });

describe('cliente de API', () => {
  it('junta peticiones iguales simultáneas en una sola y entrega copias independientes', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache(); slow = 30;
    const [a, b, c] = await Promise.all([api.get('/api/dashboard'), api.get('/api/dashboard'), api.get('/api/dashboard')]);
    expect(calls.filter((x) => x.path === '/api/dashboard')).toHaveLength(1);
    a.open_deals = 999;
    expect(b.open_deals).toBe(5); expect(c.open_deals).toBe(5);
  });

  it('el dashboard NUNCA se recuerda: una segunda lectura posterior sí va al servidor', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    await api.get('/api/dashboard'); await api.get('/api/dashboard');
    expect(calls.filter((x) => x.path === '/api/dashboard')).toHaveLength(2);
  });

  it('recuerda embudos/tasas/ajustes/mi perfil y los vuelve a pedir tras una escritura', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    for (const p of ['/api/pipelines', '/api/exchange-rates', '/api/settings/deal_card_fields', '/api/team/me']) { await api.get(p); await api.get(p); }
    expect(calls).toHaveLength(4); // 4 rutas × 1 petición real
    await api.patch('/api/deals/1', { title: 'x' });
    await api.get('/api/pipelines');
    expect(calls.filter((x) => x.path === '/api/pipelines')).toHaveLength(2); // después de escribir, vuelve a pedir
  });

  it('tratos, contactos y tareas siguen yendo siempre al servidor', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    for (const p of ['/api/deals?status=abierto', '/api/contacts', '/api/tasks']) { await api.get(p); await api.get(p); }
    expect(calls).toHaveLength(6);
  });

  it('un error no se recuerda y la siguiente petición reintenta', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    nextResponse = { status: 500, body: { error: 'caído' } };
    await expect(api.get('/api/pipelines')).rejects.toThrow('caído');
    const ok = await api.get('/api/pipelines');
    expect(ok[0].id).toBe('p1');
    expect(calls.filter((x) => x.path === '/api/pipelines')).toHaveLength(2);
  });

  it('una escritura que ocurre MIENTRAS se pide un dato impide recordarlo (no queda viejo)', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache(); slow = 40;
    const read = api.get('/api/pipelines');
    await new Promise((r) => setTimeout(r, 5));
    await api.post('/api/pipelines', { name: 'Nuevo' });
    await read; slow = 0;
    await api.get('/api/pipelines');
    expect(calls.filter((x) => x.path === '/api/pipelines' && x.method === 'GET')).toHaveLength(2);
  });

  it('cerrar sesión olvida todo lo recordado', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    await api.get('/api/team/me'); await api.get('/api/team/me');
    expect(calls).toHaveLength(1);
    authCallback('SIGNED_OUT');
    await api.get('/api/team/me');
    expect(calls).toHaveLength(2);
    authCallback('TOKEN_REFRESHED'); // un refresco de token NO borra nada
    await api.get('/api/team/me');
    expect(calls).toHaveLength(2);
  });

  it('las búsquedas de Prospección (POST de lectura) no vacían lo recordado', async () => {
    const { api, clearApiCache } = await import('../src/lib/api');
    clearApiCache();
    await api.get('/api/pipelines');
    await api.post('/api/prospecting/search', { provider: 'apollo' });
    await api.get('/api/pipelines');
    expect(calls.filter((x) => x.path === '/api/pipelines')).toHaveLength(1);
  });
});
