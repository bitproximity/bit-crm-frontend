// Un enlace que escribió una persona (LinkedIn de una empresa, enlace de una reunión, un archivo) solo puede abrir web, correo o teléfono.
// Un «javascript:…» guardado ahí se ejecutaría con la sesión de quien le diera clic. Devuelve undefined si no es seguro (el enlace queda sin
// destino en vez de apuntar a algo peligroso). «linkedin.com/in/ana» sin https se completa solo.
export function safeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  // Los navegadores ignoran tabuladores y saltos de línea dentro del protocolo («java\tscript:»): se quitan antes de mirar.
  const probe = raw.replace(/[\u0000-\u001f\u007f]/g, '');
  if (/^(https?:|mailto:|tel:)/i.test(probe)) return probe;
  if (/^[a-z][a-z0-9+.-]*:/i.test(probe)) return undefined;   // javascript:, data:, vbscript:, file:, blob:…
  if (/^\/\//.test(probe)) return undefined;                   // «//sitio» (hereda el protocolo de la página)
  if (/^[\w-]+(\.[\w-]+)+(\/|\?|#|$)/.test(probe)) return `https://${probe}`;
  return undefined;
}
