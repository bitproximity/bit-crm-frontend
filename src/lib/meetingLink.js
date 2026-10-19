// Mismo criterio que el backend (utils/meetingUrl.js): el link de reunión se guarda limpio y solo si es
// un enlace web real. Aquí se usa para validar mientras se escribe y para mostrar el servicio.
export function cleanMeetingUrl(value) {
  if (value == null) return null;
  let v = String(value).trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch (e) {
    return null;
  }
}

export function meetingProvider(url) {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase(); } catch (e) { return null; }
  if (/(^|\.)meet\.google\.com$/.test(h)) return 'Google Meet';
  if (/(^|\.)zoom\.(us|com)$/.test(h)) return 'Zoom';
  if (/teams\.(microsoft|live)\.com$/.test(h)) return 'Microsoft Teams';
  if (/(^|\.)whereby\.com$/.test(h)) return 'Whereby';
  return null;
}
