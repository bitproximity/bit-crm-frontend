// Parser de CSV simple (soporta comillas y comas dentro de campos entrecomillados).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else field += char;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

// Mapea encabezados comunes en español/inglés a las claves que espera el backend.
const HEADER_MAP = {
  nombre: 'first_name', first_name: 'first_name', name: 'first_name', 'first name': 'first_name',
  apellido: 'last_name', apellidos: 'last_name', last_name: 'last_name', 'last name': 'last_name',
  email: 'email', correo: 'email', 'e-mail': 'email',
  'e-mail 1 - value': 'email', 'e-mail 2 - value': 'email', 'e-mail 3 - value': 'email',
  telefono: 'phone', 'teléfono': 'phone', phone: 'phone',
  'phone 1 - value': 'phone', 'phone 2 - value': 'phone', 'phone 3 - value': 'phone',
  empresa: 'company_name', company: 'company_name', company_name: 'company_name',
  organización: 'company_name', organizacion: 'company_name', organization: 'company_name',
  'organization name': 'company_name',
  origen: 'source', source: 'source',
};

export function csvToContacts(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] || null);

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((key, i) => {
      if (key && !obj[key] && row[i] !== undefined && row[i].trim() !== '') obj[key] = row[i].trim();
    });
    return obj;
  }).filter((c) => c.first_name);
}

// Mapeo de encabezados para deals — incluye los que exporta Pipedrive en español.
const DEAL_HEADER_MAP = {
  'título': 'title', 'titulo': 'title', title: 'title', 'trato - título': 'title', 'trato': 'title', 'deal': 'title', 'deal - title': 'title',
  valor: 'value', value: 'value', 'trato - valor': 'value',
  moneda: 'currency', currency: 'currency',
  etapa: 'stage_name', stage: 'stage_name', 'trato - etapa': 'stage_name',
  'persona de contacto': 'contact_name', contact: 'contact_name', 'contacto': 'contact_name', person: 'contact_name',
  email: 'contact_email', correo: 'contact_email',
  organización: 'company_name', organizacion: 'company_name', organization: 'company_name', empresa: 'company_name', company: 'company_name',
  probabilidad: 'probability', probability: 'probability',
  // FIX: Pipedrive exporta el estado del trato (Ganado/Perdido/Abierto) en una columna
  // que antes no se mapeaba a nada — se perdía en la importación y TODO quedaba como
  // "abierto" sin importar si en Pipedrive ya estaba ganado o perdido.
  estado: 'status_raw', status: 'status_raw', 'trato - estado': 'status_raw', 'deal - status': 'status_raw',
  'fecha de cierre': 'closed_at_raw', 'close date': 'closed_at_raw', 'closed date': 'closed_at_raw',
  'fecha en la que se ganó': 'closed_at_raw', 'fecha en la que se perdió': 'closed_at_raw',
  'won time': 'closed_at_raw', 'lost time': 'closed_at_raw',
  'razón de la pérdida': 'lost_reason', 'razon de la perdida': 'lost_reason', 'lost reason': 'lost_reason',
};

// Normaliza los valores de estado que trae Pipedrive (español/inglés) a los tres
// valores canónicos que usa el backend: 'abierto' | 'ganado' | 'perdido'.
const DEAL_STATUS_MAP = {
  ganado: 'ganado', gano: 'ganado', won: 'ganado', win: 'ganado', 'closed won': 'ganado',
  perdido: 'perdido', lost: 'perdido', 'closed lost': 'perdido',
  abierto: 'abierto', open: 'abierto', 'en curso': 'abierto',
};

function normalizeDealStatus(raw) {
  if (!raw) return undefined;
  return DEAL_STATUS_MAP[raw.trim().toLowerCase()] || undefined;
}

export function csvToDeals(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => DEAL_HEADER_MAP[h.trim().toLowerCase()] || null);

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((key, i) => {
      if (key && row[i] !== undefined && row[i] !== '') obj[key] = row[i].trim();
    });

    if (obj.status_raw) {
      const normalized = normalizeDealStatus(obj.status_raw);
      if (normalized) obj.status = normalized;
      delete obj.status_raw;
    }
    if (obj.closed_at_raw) {
      obj.closed_at = obj.closed_at_raw;
      delete obj.closed_at_raw;
    }

    return obj;
  }).filter((d) => d.title);
}

// Mapeo de encabezados para actividades — incluye los que exporta Pipedrive.
const ACTIVITY_HEADER_MAP = {
  asunto: 'title', subject: 'title', título: 'title', titulo: 'title', 'actividad - asunto': 'title',
  tipo: 'type', type: 'type',
  'fecha de vencimiento': 'due_date', 'due date': 'due_date', 'fecha límite': 'due_date',
  trato: 'deal_title', deal: 'deal_title',
  persona: 'contact_name', person: 'contact_name', 'persona de contacto': 'contact_name',
  finalizada: 'done', done: 'done', completada: 'done',
};

export function csvToActivities(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => ACTIVITY_HEADER_MAP[h.trim().toLowerCase()] || null);

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((key, i) => {
      if (key && row[i] !== undefined && row[i] !== '') obj[key] = row[i].trim();
    });
    return obj;
  }).filter((a) => a.title);
}
