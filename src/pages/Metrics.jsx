import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Bar({ label, value, max, suffix = '' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-brand-muted font-tech mb-1">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    api.get('/api/metrics').then(setMetrics).catch(console.error);
    api.get('/api/forecast?months=3').then(setForecast).catch(console.error);
  }, []);

  if (!metrics || !forecast) return <div className="text-brand-muted">Cargando...</div>;

  const maxStageValue = Math.max(...metrics.deals_by_stage.map((s) => s.value), 1);
  const maxTaskCount = Math.max(...Object.values(metrics.tasks_by_status), 1);
  const maxForecast = Math.max(...forecast.months.map((m) => m.unweighted_usd), 1);

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Métricas</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="text-brand-muted text-sm mb-1">Win rate</div>
          <div className="text-2xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
            {metrics.win_rate_pct !== null ? `${metrics.win_rate_pct}%` : '—'}
          </div>
          <div className="text-xs text-brand-muted font-tech mt-1">
            {metrics.won_count} ganados / {metrics.lost_count} perdidos
          </div>
        </div>
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 md:col-span-2">
          <div className="text-brand-muted text-sm mb-2">Forecast (próximos 3 meses, USD)</div>
          <div className="flex gap-4">
            {forecast.months.map((m) => (
              <div key={m.month} className="flex-1">
                <div className="text-xs text-brand-muted font-tech mb-1">{m.month}</div>
                <div className="text-brand-ice font-tech text-sm">${m.weighted_usd.toLocaleString()}</div>
                <div className="text-brand-muted font-tech text-xs">de ${m.unweighted_usd.toLocaleString()} total</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-4">Pipeline por etapa (valor)</div>
          {metrics.deals_by_stage.map((s) => (
            <Bar key={s.stage} label={s.stage} value={s.value} max={maxStageValue} />
          ))}
          {metrics.deals_by_stage.length === 0 && (
            <div className="text-brand-muted text-sm">Sin deals abiertos.</div>
          )}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-4">Tareas por estado</div>
          {Object.entries(metrics.tasks_by_status).map(([status, count]) => (
            <Bar key={status} label={status} value={count} max={maxTaskCount} />
          ))}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 md:col-span-2">
          <div className="font-manrope font-medium mb-4">Avance de proyectos activos</div>
          {metrics.project_progress.map((p) => (
            <Bar key={p.project_id} label={p.name} value={p.progress_pct} max={100} suffix="%" />
          ))}
          {metrics.project_progress.length === 0 && (
            <div className="text-brand-muted text-sm">Sin proyectos activos.</div>
          )}
        </div>
      </div>
    </div>
  );
}
