import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Percent, TrendingUp, Filter, Gauge, Package2, ListChecks, FolderKanban, Activity, Users } from 'lucide-react';

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

const ACTION_LABELS = {
  created: 'creó',
  updated: 'actualizó',
  deleted: 'eliminó',
  stage_changed: 'movió de etapa',
  status_changed: 'cambió el estado de',
  assigned: 'asignó',
};

const ENTITY_LABELS = {
  contact: 'contacto',
  company: 'empresa',
  deal: 'deal',
  task: 'tarea',
  project: 'proyecto',
};

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [meetings, setMeetings] = useState(null);

  useEffect(() => {
    api.get('/api/metrics').then(setMetrics).catch(console.error);
    api.get('/api/forecast?months=3').then(setForecast).catch(console.error);
    api.get('/api/insights/feed?limit=30').then(setFeed).catch(console.error);
    api.get('/api/metrics/meetings?weeks=8').then(setMeetings).catch(console.error);
    api.get('/api/pipelines').then((list) => {
      setPipelines(list);
      if (list.length) setPipelineId(list[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!pipelineId) return;
    api.get(`/api/insights/funnel?pipeline_id=${pipelineId}`).then(setFunnel).catch(console.error);
    api.get(`/api/insights/velocity?pipeline_id=${pipelineId}`).then(setVelocity).catch(console.error);
  }, [pipelineId]);

  if (!metrics || !forecast) return <div className="text-brand-muted">Cargando...</div>;

  const maxStageValue = Math.max(...metrics.deals_by_stage.map((s) => s.value), 1);
  const maxTaskCount = Math.max(...Object.values(metrics.tasks_by_status), 1);
  const maxVelocity = velocity ? Math.max(...velocity.velocity.map((v) => v.avg_days), 1) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Métricas</h1>
        <select
          value={pipelineId || ''}
          onChange={(e) => setPipelineId(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-sm font-tech"
        >
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-1"><Percent size={13} /> Win rate</div>
          <div className="text-2xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
            {metrics.win_rate_pct !== null ? `${metrics.win_rate_pct}%` : '—'}
          </div>
          <div className="text-xs text-brand-muted font-tech mt-1">
            {metrics.won_count} ganados / {metrics.lost_count} perdidos
          </div>
        </div>
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 md:col-span-2">
          <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2"><TrendingUp size={13} /> Forecast (próximos 3 meses, USD)</div>
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

      {/* Embudo de conversión */}
      {funnel && (
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-4">
          <div className="font-manrope font-medium mb-1 flex items-center gap-2"><Filter size={15} /> Embudo de conversión</div>
          <div className="text-xs text-brand-muted font-tech mb-4">{funnel.total_deals} deals totales en este pipeline</div>
          <div className="flex items-end gap-2 h-40">
            {funnel.funnel.map((s) => (
              <div key={s.stage_id} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-xs text-brand-ice font-tech mb-1">{s.pct_of_total}%</div>
                <div
                  className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t-md"
                  style={{ height: `${Math.max(s.pct_of_total, 3)}%` }}
                />
                <div className="text-xs text-brand-muted mt-2 text-center">{s.stage}</div>
                <div className="text-xs text-brand-muted font-tech">{s.deals_reached}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocidad por etapa */}
      {velocity && (
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-4">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><Gauge size={15} /> Velocidad por etapa (días promedio)</div>
          {velocity.velocity.map((v) => (
            <Bar key={v.stage_id} label={`${v.stage} (${v.sample_size} deals)`} value={v.avg_days} max={maxVelocity} suffix="d" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><Package2 size={15} /> Pipeline por etapa (valor)</div>
          {metrics.deals_by_stage.map((s) => (
            <Bar key={s.stage} label={s.stage} value={s.value} max={maxStageValue} />
          ))}
          {metrics.deals_by_stage.length === 0 && (
            <div className="text-brand-muted text-sm">Sin deals abiertos.</div>
          )}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><ListChecks size={15} /> Tareas por estado</div>
          {Object.entries(metrics.tasks_by_status).map(([status, count]) => (
            <Bar key={status} label={status} value={count} max={maxTaskCount} />
          ))}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 md:col-span-2">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><FolderKanban size={15} /> Avance de proyectos activos</div>
          {metrics.project_progress.map((p) => (
            <Bar key={p.project_id} label={p.name} value={p.progress_pct} max={100} suffix="%" />
          ))}
          {metrics.project_progress.length === 0 && (
            <div className="text-brand-muted text-sm">Sin proyectos activos.</div>
          )}
        </div>
      </div>

      {/* Reuniones agendadas */}
      {meetings && (
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="font-manrope font-medium flex items-center gap-2"><Users size={15} /> Reuniones agendadas (últimas 8 semanas)</div>
            <div className="text-2xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
              {meetings.total}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-brand-muted font-tech mb-2 uppercase">Por semana</div>
              <div className="flex items-end gap-1.5 h-20">
                {meetings.by_week.map((w) => {
                  const max = Math.max(...meetings.by_week.map((x) => x.count), 1);
                  return (
                    <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-xs text-brand-ice font-tech mb-1">{w.count}</div>
                      <div
                        className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t"
                        style={{ height: `${Math.max((w.count / max) * 100, 4)}%` }}
                      />
                    </div>
                  );
                })}
                {meetings.by_week.length === 0 && <div className="text-brand-muted text-xs">Sin datos</div>}
              </div>
            </div>
            <div>
              <div className="text-xs text-brand-muted font-tech mb-2 uppercase">Por vendedor</div>
              <div className="space-y-1.5">
                {meetings.by_owner.map((o) => (
                  <div key={o.owner} className="flex justify-between text-sm">
                    <span className="text-brand-muted">{o.owner}</span>
                    <span className="text-brand-ice font-tech">{o.count}</span>
                  </div>
                ))}
                {meetings.by_owner.length === 0 && <div className="text-brand-muted text-xs">Sin datos</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial / actividad reciente */}
      <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
        <div className="font-manrope font-medium mb-4 flex items-center gap-2"><Activity size={15} /> Actividad reciente</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {feed.map((f) => (
            <div key={f.id} className="flex justify-between text-sm border-b border-brand-border/50 pb-2">
              <div>
                <span className="text-brand-white">{f.team_members?.full_name || 'Alguien'}</span>{' '}
                <span className="text-brand-muted">{ACTION_LABELS[f.action] || f.action}</span>{' '}
                <span className="text-brand-ice">{ENTITY_LABELS[f.entity_type]} "{f.entity_label}"</span>
              </div>
              <div className="text-brand-muted font-tech text-xs whitespace-nowrap ml-3">
                {new Date(f.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {feed.length === 0 && <div className="text-brand-muted text-sm">Sin actividad todavía.</div>}
        </div>
      </div>
    </div>
  );
}
