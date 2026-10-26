// Limpia HTML que viene de la base de datos (documentos) antes de ponerlo en pantalla. Sin esto, cualquier persona con acceso a Documentos
// (incluido el socio externo) podía guardar «<img src=x onerror=…>» y ejecutar código en la sesión de quien abriera el documento
// (robándole la sesión: el administrador incluido). Se conserva todo el formato que ofrece el editor.
import DOMPurify from 'dompurify';

const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'font'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class', 'colspan', 'rowspan', 'color', 'face', 'size', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math', 'link', 'meta', 'base', 'video', 'audio', 'source'],
  FORBID_ATTR: ['srcset', 'formaction', 'action', 'xlink:href'],
};

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Enlaces: solo web, correo, teléfono, rutas internas y anclas (nunca javascript:, data:, ni «//sitio» sin protocolo).
    if (node.tagName === 'A' && node.hasAttribute('href') && !/^\s*(https?:|mailto:|tel:|\/(?!\/)|#)/i.test(node.getAttribute('href'))) node.removeAttribute('href');
    // Imágenes: por https, rutas internas o base64 png/jpg/gif/webp. Un SVG incrustado (data:image/svg+xml) puede llevar scripts: fuera.
    if (node.tagName === 'IMG' && node.hasAttribute('src') && !/^\s*(https?:|\/(?!\/)|data:image\/(?:png|jpe?g|gif|webp);base64,)/i.test(node.getAttribute('src'))) node.removeAttribute('src');
    // Los enlaces que abren pestaña nueva no deben poder controlar la página de origen.
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer');
    // Un estilo no debe poder tapar la pantalla con un falso aviso (position/z-index) ni cargar recursos externos (url()).
    if (node.hasAttribute && node.hasAttribute('style')) {
      const clean = node.getAttribute('style').replace(/(?:position|z-index|top|left|right|bottom)\s*:[^;]*;?/gi, '').replace(/url\s*\([^)]*\)/gi, '').replace(/expression\s*\([^)]*\)/gi, '');
      if (clean.trim()) node.setAttribute('style', clean); else node.removeAttribute('style');
    }
  });
}

export function sanitizeHtml(html) {
  ensureHooks();
  return DOMPurify.sanitize(String(html ?? ''), CONFIG);
}
