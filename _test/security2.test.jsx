import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { safeUrl } from '../src/lib/safeUrl.js';
import { embedSnippet } from '../src/pages/LeadForms.jsx';
import PublicLeadForm from '../src/pages/PublicLeadForm.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Enlaces escritos por personas', () => {
  it('web, correo y teléfono pasan; todo lo demás se descarta', () => {
    expect(safeUrl('https://linkedin.com/in/ana')).toBe('https://linkedin.com/in/ana');
    expect(safeUrl('  http://x.com/a?b=1#c ')).toBe('http://x.com/a?b=1#c');
    expect(safeUrl('mailto:ana@acme.com')).toBe('mailto:ana@acme.com');
    expect(safeUrl('tel:+5075551234')).toBe('tel:+5075551234');
    expect(safeUrl('HTTPS://EJEMPLO.COM')).toBe('HTTPS://EJEMPLO.COM');
  });
  it('«javascript:», «data:» y compañía nunca llegan a un enlace, ni disfrazados con espacios o saltos de línea', () => {
    for (const malo of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'blob:https://x.com/uuid', '//sitio-malo.com/x', 'java script:alert(1)']) {
      expect(safeUrl(malo), malo).toBeUndefined();
    }
  });
  it('un dominio sin protocolo se completa con https; lo vacío o sin sentido no genera enlace', () => {
    expect(safeUrl('linkedin.com/in/ana')).toBe('https://linkedin.com/in/ana');
    expect(safeUrl('www.acme.com')).toBe('https://www.acme.com');
    for (const v of [undefined, null, '', '   ', 'hola', 'no es un enlace']) expect(safeUrl(v)).toBeUndefined();
  });
});

describe('Formulario público: campo trampa contra robots', () => {
  const wrap = () => render(<MemoryRouter initialEntries={['/f/abc']}><Routes><Route path="/f/:id" element={<PublicLeadForm />} /></Routes></MemoryRouter>);
  const stubFetch = (calls) => vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    calls.push([String(url), opts]);
    if (!opts) return { ok: true, json: async () => ({ id: 'abc', name: 'Contacto', active: true, custom_fields: [] }) };
    return { ok: true, status: 201, json: async () => ({ ok: true }) };
  }));

  it('la página trae un campo «website» oculto para las personas (fuera de pantalla, sin foco, sin autocompletar)', async () => {
    stubFetch([]); const { container } = wrap();
    await screen.findByText('Contacto');
    const trampa = container.querySelector('input[name="website"]');
    expect(trampa).toBeTruthy();
    expect(trampa.getAttribute('tabindex')).toBe('-1'); expect(trampa.getAttribute('autocomplete')).toBe('off');
    const caja = trampa.parentElement;
    expect(caja.getAttribute('aria-hidden')).toBe('true'); expect(caja.style.left).toBe('-9999px');
  });
  it('una persona envía el formulario con el campo vacío; un robot que lo llena lo manda tal cual para que el servidor lo descarte', async () => {
    const calls = []; stubFetch(calls); const { container } = wrap();
    await screen.findByText('Contacto');
    fireEvent.change(container.querySelectorAll('input')[1], { target: { value: 'Ana Pérez' } });   // la 0 es la trampa (va primero)
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(calls.filter(([, o]) => o?.method === 'POST').length).toBe(1));
    expect(JSON.parse(calls.find(([, o]) => o?.method === 'POST')[1].body)).toMatchObject({ name: 'Ana Pérez', website: '' });
    cleanup(); calls.length = 0; stubFetch(calls); const r = wrap();
    await screen.findByText('Contacto');
    fireEvent.change(r.container.querySelector('input[name="website"]'), { target: { value: 'http://spam.example' } });
    fireEvent.change(r.container.querySelectorAll('input')[1], { target: { value: 'Robot' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(calls.filter(([, o]) => o?.method === 'POST').length).toBe(1));
    expect(JSON.parse(calls.find(([, o]) => o?.method === 'POST')[1].body).website).toBe('http://spam.example');
  });
  it('el código para pegar en otra web también lleva la trampa, fuera de pantalla y fuera del orden del teclado', () => {
    const html = embedSnippet('form-1', []);
    expect(html).toMatch(/<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" \/>/);
    expect(html.indexOf('name="website"')).toBeGreaterThan(html.indexOf('name="company"'));
    expect(html).toContain('/api/public/lead-forms/form-1/submit');
  });
});
