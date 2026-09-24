// Permisos por rol. admin = acceso total (sin restricción).
// Cualquier ruta que no empiece con uno de estos prefijos queda bloqueada para ese rol.
export const ROLE_ALLOWED_PREFIXES = {
  operaciones: ['/spaces', '/activities', '/projects', '/documents', '/tasks', '/deals', '/contacts', '/companies', '/products'],
  outbound: ['/spaces', '/activities', '/projects', '/documents', '/tasks', '/b2b-meetings', '/contacts', '/companies', '/products'],
  // Socio externo (ej. Bit WiFi) — el bloqueo real por PIPELINE (solo ve tratos de "Bit
  // WiFi") vive en el backend (deals.js), esto solo controla qué páginas ve.
  wifi_partner: ['/spaces', '/projects', '/documents', '/tasks', '/deals', '/contacts', '/companies', '/metrics'],
};

export function isAdmin(role) {
  return role === 'admin';
}

// Rutas accesibles para cualquier rol autenticado, sin importar restricciones —
// datos/ajustes personales de cada quien (conectar su Gmail, cambiar su contraseña, etc.)
const UNIVERSAL_PATHS = ['/profile'];

export function canAccessPath(role, pathname) {
  if (UNIVERSAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (isAdmin(role)) return true;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (!allowed) return false; // rol desconocido/sin mapear -> denegar por seguridad
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function firstAllowedPath(role) {
  if (isAdmin(role)) return '/';
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  return allowed?.[0] || '/';
}
