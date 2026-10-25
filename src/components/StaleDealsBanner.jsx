import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PauseCircle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { fmtUsd } from '../lib/money';

// Aviso del Dashboard: cuántos tratos llevan 14+ días sin movimiento y cuánto dinero hay en juego.
// Si el usuario no tiene acceso a la lista (otro rol) o no hay tratos estáticos, no muestra nada.
export default function StaleDealsBanner({ days = 14 }) {
  const [s, setS] = useState(null);
  useEffect(() => { let on = true; api.get(`/api/stale-deals?days=${days}`).then((d) => { if (on) setS(d?.summary || null); }).catch(() => {}); return () => { on = false; }; }, [days]);
  if (!s || s.count === 0) return null;
  return (
    <Link to="/stale-deals" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition text-sm">
      <PauseCircle size={16} className="text-yellow-300 flex-shrink-0" />
      <span><b>{s.count}</b> trato{s.count === 1 ? '' : 's'} sin movimiento hace {days}+ días · <b>{fmtUsd(s.value_usd)}</b> en juego{s.without_next_step ? ` · ${s.without_next_step} sin siguiente paso` : ''}</span>
      <span className="ml-auto flex items-center gap-1 text-yellow-300 text-xs">Reactivar <ArrowRight size={13} /></span>
    </Link>
  );
}
