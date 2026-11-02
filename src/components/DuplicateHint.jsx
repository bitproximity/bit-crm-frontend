// Aviso de posibles duplicados mientras se escribe (antes de crear). No bloquea: solo muestra
// lo que ya existe para que se use en lugar de crear otro registro.
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Empresa: onPick(c) opcional → muestra botón «Usar esta» (ej. al crear un contacto)
export function CompanyDuplicateHint({ name, onPick, disabled }) {
  const q = useDebounced((name || '').trim());
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    if (disabled || q.length < 3) { setMatches([]); return; }
    let alive = true;
    api.get(`/api/dup-check/company?name=${encodeURIComponent(q)}`)
      .then((r) => { if (alive) setMatches(r.matches || []); })
      .catch(() => { if (alive) setMatches([]); });
    return () => { alive = false; };
  }, [q, disabled]);
  if (!matches.length) return null;
  return (
    <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 text-yellow-300 mb-1">
        <AlertTriangle size={13} /> {matches.some((m) => m.exact) ? 'Esta empresa ya existe' : 'Puede que ya exista'}
      </div>
      <div className="space-y-1">
        {matches.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <a href={`/companies/${c.id}`} target="_blank" rel="noreferrer" className="text-brand-ice hover:underline truncate">{c.name}</a>
            {c.country && <span className="text-brand-muted">· {c.country}</span>}
            {onPick && (
              <button type="button" onClick={() => onPick(c)} className="ml-auto px-2 py-0.5 rounded-md border border-brand-border hover:border-brand-violet text-brand-white">
                Usar esta
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactDuplicateHint({ email, firstName, lastName, companyId }) {
  const key = useDebounced(JSON.stringify({ email: (email || '').trim(), firstName: (firstName || '').trim(), lastName: (lastName || '').trim(), companyId: companyId || '' }));
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    const p = JSON.parse(key);
    if (!p.email.includes('@') && !(p.firstName && p.lastName)) { setMatches([]); return; }
    let alive = true;
    const qs = new URLSearchParams({ email: p.email, first_name: p.firstName, last_name: p.lastName, ...(p.companyId ? { company_id: p.companyId } : {}) });
    api.get(`/api/dup-check/contact?${qs}`)
      .then((r) => { if (alive) setMatches(r.matches || []); })
      .catch(() => { if (alive) setMatches([]); });
    return () => { alive = false; };
  }, [key]);
  if (!matches.length) return null;
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 text-yellow-300 mb-1"><AlertTriangle size={13} /> Este contacto puede que ya exista</div>
      {matches.map((c) => (
        <div key={c.id} className="text-brand-muted truncate">
          <span className="text-brand-ice">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</span>
          {c.companies?.name ? ` · ${c.companies.name}` : ''}{c.email ? ` · ${c.email}` : ''} <span className="text-yellow-300/80">({c.reason})</span>
        </div>
      ))}
    </div>
  );
}
