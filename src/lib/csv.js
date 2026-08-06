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
  nombre: 'first_name', first_name: 'first_name', name: 'first_name',
  apellido: 'last_name', last_name: 'last_name',
  email: 'email', correo: 'email', 'e-mail': 'email',
  telefono: 'phone', 'teléfono': 'phone', phone: 'phone',
  empresa: 'company_name', company: 'company_name', company_name: 'company_name',
  origen: 'source', source: 'source',
};

export function csvToContacts(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] || null);

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((key, i) => {
      if (key && row[i] !== undefined && row[i] !== '') obj[key] = row[i].trim();
    });
    return obj;
  }).filter((c) => c.first_name);
}
