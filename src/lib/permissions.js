// Permisos por rol. admin = acceso total (sin restricción).
// Cualquier ruta que no empiece con uno de estos prefijos queda bloqueada para ese rol.
export const ROLE_ALLOWED_PREFIXES = {
  operaciones: ['/spaces', '/activities', '/projects', '/documents', '/tasks', '/deals'],
  outbound: ['/spaces', '/activities', '/projects', '/documents', '/tasks', '/b2b-meetings'],
};

export function isAdmin(role) {
  return role === 'admin';
}

export function canAccessPath(role, pathname) {
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
