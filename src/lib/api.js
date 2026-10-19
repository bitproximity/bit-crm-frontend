import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

// ── Menos viajes al servidor, mismos datos ────────────────────────────────────────────────
// Cada petición cuesta ~160 ms solo de viaje (Panamá → servidor) más lo que tarde la base. Dos reglas:
//  1) PETICIONES IGUALES A LA VEZ se juntan en una sola (antes el Dashboard pedía lo mismo 3 veces
//     al cargar). Todos reciben su propia copia del resultado.
//  2) DATOS QUE CASI NUNCA CAMBIAN (embudos, tasas de cambio, ajustes, mi perfil, listas) se
//     recuerdan unos segundos para no volver a pedirlos en cada pantalla. Cualquier escritura
//     (POST/PATCH/DELETE) vacía todo lo recordado, y también al cerrar sesión. Todo lo demás
//     (tratos, contactos, tareas, dashboard...) sigue yendo siempre al servidor: "no-store".
const REMEMBER = [
  [/^\/api\/pipelines$/, 60000],
  [/^\/api\/exchange-rates$/, 60000],
  [/^\/api\/settings\/[^/?]+$/, 60000],
  [/^\/api\/team\/me$/, 60000],
  [/^\/api\/tags\/with-contact-counts$/, 30000],
  [/^\/api\/products\?active=true$/, 60000],
];
const READ_ONLY_POSTS = new Set(['/api/prospecting/search', '/api/prospeccion-tool/search']);
const remembered = new Map(); // path -> { value, expiresAt }
const inflight = new Map(); // path -> Promise (resultado sin copiar)

export function clearApiCache() {
  remembered.clear();
  inflight.clear();
}

// Al cerrar sesión se olvida todo, para que la siguiente persona no vea datos de la anterior.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') clearApiCache();
});

const rememberTtl = (path) => {
  const hit = REMEMBER.find(([re]) => re.test(path));
  return hit ? hit[1] : 0;
};
const copy = (v) => (v == null || typeof v !== 'object' ? v : structuredClone(v));

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

  // Defensa extra: si el backend genuinamente nunca responde (una petición colgada
  // de verdad, no solo lenta), corta sola a los 30s en vez de dejar la pantalla
  // cargando para siempre sin ningún aviso.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: mergedHeaders,
      signal: controller.signal,
      // "cache: no-store" le dice al navegador (y a cualquier proxy/CDN en el medio,
      // como Cloudflare) que nunca sirva una respuesta guardada para esta petición —
      // siempre va contra el servidor de verdad. Sin esto, algunas pantallas (ej. el
      // Dashboard) podían quedar mostrando números viejos aunque el dato real ya
      // hubiera cambiado, porque el navegador reutilizaba una respuesta anterior.
      cache: 'no-store',
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder. Intenta de nuevo.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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

async function get(path) {
  const ttl = rememberTtl(path);
  if (ttl) {
    const hit = remembered.get(path);
    if (hit && hit.expiresAt > Date.now()) return copy(hit.value);
  }
  let pending = inflight.get(path);
  if (!pending) {
    const generation = writes;
    pending = request(path)
      .then((value) => {
        // Si hubo una escritura mientras se pedía, el dato pudo quedar viejo: se entrega, pero no se recuerda.
        if (ttl && generation === writes) remembered.set(path, { value, expiresAt: Date.now() + ttl });
        return value;
      })
      .finally(() => inflight.delete(path));
    inflight.set(path, pending);
  }
  return copy(await pending);
}

// Contador de escrituras: sube con cada POST/PATCH/DELETE/upload.
let writes = 0;
const write = (path, options) => {
  writes++;
  clearApiCache();
  return request(path, options).finally(() => { writes++; clearApiCache(); });
};

export const api = {
  get,
  // Las búsquedas de Prospección son POST pero solo leen: no tienen por qué vaciar lo recordado.
  post: (path, body) => (READ_ONLY_POSTS.has(path) ? request(path, { method: 'POST', body: JSON.stringify(body) }) : write(path, { method: 'POST', body: JSON.stringify(body) })),
  patch: (path, body) => write(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, body) => write(path, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
  upload: (path, formData) => write(path, { method: 'POST', body: formData, headers: { 'Content-Type': undefined } }),
};
