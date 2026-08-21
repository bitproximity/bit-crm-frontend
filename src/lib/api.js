import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

async function getToken(forceRefresh = false) {
  if (forceRefresh) {
    // getSession() normalmente refresca sola si el token venció, pero si la pestaña
    // estuvo en segundo plano o la máquina en reposo, ese refresco automático puede
    // no haber alcanzado a correr a tiempo — se fuerza uno explícito antes de rendirse.
    const { data } = await supabase.auth.refreshSession();
    return data?.session?.access_token;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.access_token;
}

async function request(path, options = {}, _retried = false) {
  const token = await getToken(_retried);

  const mergedHeaders = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
    ...(options.headers || {}),
  };
  Object.keys(mergedHeaders).forEach((key) => {
    if (mergedHeaders[key] === undefined) delete mergedHeaders[key];
  });

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isExpiredToken = res.status === 401 && /token inválido|expirado/i.test(body.error || '');
    // Un solo reintento tras forzar el refresco de sesión — así una sesión vencida
    // se recupera sola en vez de tirar el formulario que el usuario ya llenó.
    if (isExpiredToken && !_retried) {
      return request(path, options, true);
    }
    throw new Error(body.error || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, body) => request(path, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, headers: { 'Content-Type': undefined } }),
};
