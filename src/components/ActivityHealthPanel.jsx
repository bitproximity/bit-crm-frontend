// Por vendedor: tratos abiertos sin próxima actividad o con la actividad vencida (todos los embudos).
// Clic en una persona → Pipeline filtrado por esa persona y solo los tratos a poner al día.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import { api } from '../lib/api';

export default function ActivityHealthPanel() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get('/api/deals/activity-health').then(setData).catch(() => setData(null)); }, []);
  if (!data || !data.rows?.length) return null;
  const max = Math.max(...data.rows.map((r) => r.pending), 1);
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-panel p-5 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="font-headline text-base font-semibold flex items-center gap-2">
          <CalendarX size={16} className="text-red-300" /> Tratos sin actividad al día, por vendedor
        </h2>
        <span className="text-xs text-brand-muted font-tech">{data.total_pending} de {data.total_open} tratos abiertos</span>
      </div>
      <p className="text-xs text-brand-muted mb-4">Sin próxima actividad agendada o con la actividad vencida. Clic en una persona para ver sus tratos en el Pipeline.</p>
      <div className="space-y-2">
        {data.rows.map((r) => (
          <button
            key={r.owner_id || 'none'}
            type="button"
            onClick={() => navigate(`/deals?sin_actividad=1${r.owner_id ? `&owner_id=${r.owner_id}` : ''}`)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="group-hover:text-brand-ice">{r.name}</span>
              <span className="font-tech text-xs text-brand-muted">
                <span className={r.pending ? 'text-red-300' : 'text-green-300'}>{r.pending}</span> / {r.open}
                {r.pending > 0 && ` · ${r.none} sin agendar · ${r.late} vencidas`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-500/80 to-brand-magenta" style={{ width: `${(r.pending / max) * 100}%` }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
