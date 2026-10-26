// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

// Arranca el servidor REAL del sitio y mira las cabeceras con las que responde.
let proc; const PORT = 39000 + Math.floor(Math.random() * 500);
beforeAll(async () => {
  proc = spawn('node', ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(PORT) } });
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('el servidor no arrancó')), 8000); proc.stdout.on('data', (d) => { if (/sirviendo/.test(String(d))) { clearTimeout(t); resolve(); } }); proc.on('error', reject); });
}, 15000);
afterAll(() => { proc?.kill(); });

describe('Cabeceras de seguridad del sitio', () => {
  it('la página principal las lleva, y no anuncia que es Express', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/`); const h = r.headers;
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(h.get('content-security-policy')).toBe("frame-ancestors 'self'");
    expect(h.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(h.get('strict-transport-security')).toMatch(/max-age=31536000/);
    expect(h.get('x-powered-by')).toBeNull();
  });
  it('también las rutas internas del CRM (cualquier URL entrega la app) y los archivos estáticos', async () => {
    for (const p of ['/deals/abc', '/stale-deals', '/assets/no-existe.js']) {
      const r = await fetch(`http://127.0.0.1:${PORT}${p}`); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); expect(r.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    }
  });
});
