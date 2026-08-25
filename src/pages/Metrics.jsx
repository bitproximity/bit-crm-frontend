import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Percent, TrendingUp, Filter, Gauge, Package2, ListChecks, Activity, Users, Clock, PieChart, DollarSign, Trophy, Globe, Briefcase } from 'lucide-react';

function Bar({ label, value, max, suffix = '', prefix = '' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-brand-muted font-tech mb-1">
        <span>{label}</span>
        <span>{prefix}{value.toLocaleString()}{suffix}</span>
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
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [meetings, setMeetings] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [productMetrics, setProductMetrics] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);

  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);

  useEffect(() => {
    const onErr = (label) => (err) => setLoadError((prev) => prev || `${label}: ${err.message}`);
    api.get('/api/metrics').then(setMetrics).catch(onErr('Métricas'));
    api.get('/api/forecast?months=3').then(setForecast).catch(onErr('Forecast'));
    api.get('/api/insights/feed?limit=30').then(setFeed).catch(onErr('Feed'));
    api.get('/api/metrics/meetings?weeks=8').then(setMeetings).catch(onErr('Reuniones'));
    api.get('/api/metrics/products').then(setProductMetrics).catch(onErr('Productos'));
    api.get('/api/pipelines').then((list) => {
      setPipelines(list);
      if (list.length) setPipelineId(list[0].id);
      setPipelinesLoaded(true);
    }).catch(onErr('Pipelines'));
  }, []);

  useEffect(() => {
    // Espera a que se resuelva el pipeline por defecto antes de pedir el dashboard —
    // si no, se pide dos veces: primero "todos los pipelines" (pipelineId aún null) y
    // después el pipeline real, y se ve como un dato "de paso" que cambia solo.
    if (!pipelinesLoaded) return;
    const qs = pipelineId ? `?pipeline_id=${pipelineId}` : '';
    api.get(`/api/insights/dashboard${qs}`).then(setDashboard).catch(console.error);
    if (pipelineId) {
      api.get(`/api/insights/funnel?pipeline_id=${pipelineId}`).then(setFunnel).catch(console.error);
      api.get(`/api/insights/velocity?pipeline_id=${pipelineId}`).then(setVelocity).catch(console.error);
    } else {
      setFunnel(null);
      setVelocity(null);
    }
  }, [pipelineId, pipelinesLoaded]);

  if (loadError) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{loadError}</div>;
  if (!metrics || !forecast) return <SkeletonPage />;

  const maxStageValue = Math.max(...metrics.deals_by_stage.map((s) => s.value), 1);
  const maxTaskCount = Math.max(...Object.values(metrics.tasks_by_status), 1);
  const maxVelocity = velocity ? Math.max(...velocity.velocity.map((v) => v.avg_days), 1) : 1;

  const dealsListUrl = (extraParams) => {
    const qs = new URLSearchParams(extraParams);
    if (pipelineId) qs.set('pipeline_id', pipelineId);
    return `/deals-list?${qs.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Métricas</h1>
        <select
          value={pipelineId || ''}
          onChange={(e) => setPipelineId(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-sm font-tech"
        >
          <option value="">Todos los pipelines</option>
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Insights AI Report — valor de deals creados por mes, apilado por pipeline */}
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-2">
            <div className="flex items-center gap-1.5 text-sm font-manrope font-medium mb-4">
              <TrendingUp size={15} className="text-brand-muted" /> Valor de tratos creados por mes
            </div>
            {(() => {
              const pipelineNames = dashboard.pipelines.map((p) => p.name);
              const COLORS = ['#8500FF', '#E000FF', '#D9F6FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];
              const colorByPipeline = Object.fromEntries(pipelineNames.map((n, i) => [n, COLORS[i % COLORS.length]]));
              const max = Math.max(...dashboard.deals_by_month.map((m) => m.total), 1);
              return (
                <>
                  <div className="flex items-end gap-2 h-48">
                    {dashboard.deals_by_month.map((m) => (
                      <div
                        key={m.month}
                        onClick={() => m.total > 0 && navigate(dealsListUrl({ status: 'abierto,ganado,perdido', created_month: m.month }))}
                        className={`flex-1 flex flex-col items-center justify-end h-full group relative ${m.total > 0 ? 'cursor-pointer' : ''}`}
                      >
                        {m.total > 0 && (
                          <div className="text-[10px] text-brand-muted font-tech mb-1 group-hover:text-brand-ice transition">${(m.total / 1000).toFixed(1)}K</div>
                        )}
                        <div className={`w-full flex flex-col-reverse rounded-t-md overflow-hidden transition ${m.total > 0 ? 'group-hover:opacity-80' : ''}`} style={{ height: `${Math.max((m.total / max) * 100, m.total > 0 ? 3 : 0)}%` }}>
                          {Object.entries(m.by_pipeline).map(([pName, val]) => (
                            <div
                              key={pName}
                              title={`${pName}: $${val.toLocaleString()}`}
                              style={{ height: `${(val / m.total) * 100}%`, backgroundColor: colorByPipeline[pName] }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {dashboard.deals_by_month.map((m) => (
                      <div key={m.month} className="flex-1 text-center text-[10px] text-brand-muted font-tech">{m.label}</div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4">
                    {pipelineNames.map((n) => (
                      <div key={n} className="flex items-center gap-1.5 text-xs text-brand-muted">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorByPipeline[n] }} />
                        {n}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Deal duration */}
          <div
            onClick={() => navigate(dealsListUrl({ status: 'ganado,perdido' }))}
            className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth flex flex-col cursor-pointer hover:border-brand-violet transition"
          >
            <div className="flex items-center gap-1.5 text-sm font-manrope font-medium mb-4">
              <Clock size={15} className="text-brand-muted" /> Duración de los tratos
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-headline font-semibold">{dashboard.deal_duration_avg_days} días</div>
              <div className="text-xs text-brand-muted mt-2">Duración promedio (días)</div>
            </div>
          </div>

          {/* Deals lost by reasons */}
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-1">
            <div className="flex items-center gap-1.5 text-sm font-manrope font-medium mb-4">
              <PieChart size={15} className="text-brand-muted" /> Tratos perdidos por motivo
            </div>
            {dashboard.lost_total === 0 ? (
              <div className="text-brand-muted text-sm">Sin tratos perdidos todavía.</div>
            ) : (() => {
              const COLORS = ['#f59e0b', '#ef4444', '#8500FF', '#3b82f6', '#22c55e', '#ec4899'];
              let cumulative = 0;
              const gradientParts = dashboard.deals_lost_by_reason.map((r, i) => {
                const start = cumulative;
                cumulative += r.pct;
                return `${COLORS[i % COLORS.length]} ${start}% ${cumulative}%`;
              });
              return (
                <div className="flex items-center gap-4">
                  <div
                    className="w-28 h-28 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
                  />
                  <div className="space-y-1.5 min-w-0">
                    {dashboard.deals_lost_by_reason.map((r, i) => (
                      <div
                        key={r.reason}
                        onClick={() => navigate(dealsListUrl({ status: 'perdido', lost_reason: r.reason }))}
                        className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-brand-bg rounded px-1 -mx-1 py-0.5 transition"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-brand-muted truncate">{r.reason}</span>
                        <span className="text-brand-white font-tech flex-shrink-0">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="text-xs text-brand-muted font-tech mt-3">{dashboard.lost_total} tratos perdidos en total</div>
          </div>

          {/* Average value of won deals */}
          <div
            onClick={() => navigate(dealsListUrl({ status: 'ganado', closed_year: String(new Date().getFullYear()) }))}
            className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth flex flex-col cursor-pointer hover:border-brand-violet transition"
          >
            <div className="flex items-center gap-1.5 text-sm font-manrope font-medium mb-4">
              <DollarSign size={15} className="text-brand-muted" /> Valor promedio de tratos ganados
            </div>
            {dashboard.won_avg_value.pct_change !== null && (
              <div className={`text-sm font-tech mb-1 ${dashboard.won_avg_value.pct_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {dashboard.won_avg_value.pct_change >= 0 ? '▲' : '▼'} {Math.abs(dashboard.won_avg_value.pct_change)}%
              </div>
            )}
            <div className="text-3xl font-headline font-semibold">${dashboard.won_avg_value.current.toLocaleString()}</div>
            <div className="text-xs text-brand-muted mt-2">{dashboard.won_avg_value.count} tratos ganados este año</div>
          </div>

          {/* Deals won over time */}
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-2">
            <div className="flex items-center gap-1.5 text-sm font-manrope font-medium mb-4">
              <TrendingUp size={15} className="text-brand-muted" /> Tratos ganados a lo largo del tiempo
            </div>
            {(() => {
              const max = Math.max(...dashboard.deals_won_by_month.map((m) => m.value), 1);
              return (
                <>
                  <div className="flex items-end gap-2 h-40">
                    {dashboard.deals_won_by_month.map((m) => (
                      <div
                        key={m.month}
                        onClick={() => m.value > 0 && navigate(dealsListUrl({ status: 'ganado', closed_month: m.month }))}
                        className={`flex-1 flex flex-col items-center justify-end h-full group ${m.value > 0 ? 'cursor-pointer' : ''}`}
                      >
                        {m.value > 0 && <div className="text-[10px] text-brand-muted font-tech mb-1 group-hover:text-brand-ice transition">${(m.value / 1000).toFixed(1)}K</div>}
                        <div
                          className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t-md group-hover:opacity-80 transition"
                          style={{ height: `${Math.max((m.value / max) * 100, m.value > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {dashboard.deals_won_by_month.map((m) => (
                      <div key={m.month} className="flex-1 text-center text-[10px] text-brand-muted font-tech">{m.label}</div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-1"><Percent size={13} /> Win rate</div>
          <div className="text-2xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
            {metrics.win_rate_pct !== null ? `${metrics.win_rate_pct}%` : '—'}
          </div>
          <div className="text-xs text-brand-muted font-tech mt-1">
            {metrics.won_count} ganados / {metrics.lost_count} perdidos
          </div>
        </div>
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth md:col-span-2">
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
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mb-4">
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
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mb-4">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><Gauge size={15} /> Velocidad por etapa (días promedio)</div>
          {velocity.velocity.map((v) => (
            <Bar key={v.stage_id} label={`${v.stage} (${v.sample_size} deals)`} value={v.avg_days} max={maxVelocity} suffix="d" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><Package2 size={15} /> Pipeline por etapa (valor)</div>
          {metrics.deals_by_stage.map((s) => (
            <Bar key={s.stage} label={s.stage} value={s.value} max={maxStageValue} prefix="$" />
          ))}
          {metrics.deals_by_stage.length === 0 && (
            <div className="text-brand-muted text-sm">Sin deals abiertos.</div>
          )}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="font-manrope font-medium mb-4 flex items-center gap-2"><ListChecks size={15} /> Tareas por estado</div>
          {Object.entries(metrics.tasks_by_status).map(([status, count]) => (
            <Bar key={status} label={status} value={count} max={maxTaskCount} />
          ))}
        </div>
      </div>

      {/* Reuniones agendadas */}
      {meetings && (
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="font-manrope font-medium flex items-center gap-2"><Users size={15} /> Reuniones agendadas (últimas 8 semanas)</div>
            <div className="text-2xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
              {meetings.total}
            </div>
          </div>
          <p className="text-xs text-brand-muted mb-4">Cruza todas las marcas de Bit Prospect con fecha de reunión cargada.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-brand-muted font-tech mb-2 uppercase">Por semana</div>
              {meetings.by_week.length > 0 ? (
                <div className="flex items-end gap-1.5 h-24">
                  {meetings.by_week.map((w) => {
                    const max = Math.max(...meetings.by_week.map((x) => x.count), 1);
                    const d = new Date(`${w.week}T00:00:00`);
                    return (
                      <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div className="text-xs text-brand-ice font-tech mb-1 group-hover:scale-110 transition-transform">{w.count}</div>
                        <div
                          className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t group-hover:opacity-80 transition"
                          style={{ height: `${Math.max((w.count / max) * 100, 4)}%` }}
                          title={`Semana del ${d.toLocaleDateString()}`}
                        />
                        <div className="text-[9px] text-brand-muted font-tech mt-1">{d.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-brand-muted text-xs py-6">Sin reuniones con fecha en las últimas {8} semanas.</div>
              )}
            </div>
            <div>
              <div className="text-xs text-brand-muted font-tech mb-2 uppercase">Por vendedor</div>
              {meetings.by_owner.length > 0 ? (
                <div className="space-y-2">
                  {meetings.by_owner.map((o) => {
                    const max = Math.max(...meetings.by_owner.map((x) => x.count), 1);
                    return (
                      <div key={o.owner}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-brand-muted truncate">{o.owner}</span>
                          <span className="text-brand-ice font-tech flex-shrink-0 ml-2">{o.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta rounded-full" style={{ width: `${(o.count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-brand-muted text-xs py-6">Sin datos todavía.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Producto que más se vende — ingresos reales (tratos ganados), por país e industria */}
      {productMetrics && (
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mb-4">
          <div className="font-manrope font-medium mb-1 flex items-center gap-2"><Trophy size={15} className="text-yellow-400" /> Producto que más se vende</div>
          <div className="text-xs text-brand-muted font-tech mb-4">Ingresos en USD de tratos ganados con productos asociados</div>

          {productMetrics.products.length === 0 ? (
            <div className="text-brand-muted text-sm">Todavía no hay tratos ganados con productos agregados en su detalle.</div>
          ) : (
            <>
              {productMetrics.top && (
                <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-gradient-to-r from-brand-violet/15 to-brand-magenta/15 border border-brand-violet/30">
                  <div className="text-3xl">🏆</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-brand-muted uppercase tracking-wide">Top #1</div>
                    <div className="font-headline text-lg font-semibold truncate">{productMetrics.top.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-brand-ice font-tech text-lg">${productMetrics.top.revenue_usd.toLocaleString()}</div>
                    <div className="text-brand-muted text-xs">{productMetrics.top.quantity} unidades</div>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead className="bg-brand-panel/80 text-brand-muted text-left">
                  <tr>
                    <th className="py-2 font-manrope font-normal">Producto</th>
                    <th className="py-2 font-manrope font-normal">Unidades</th>
                    <th className="py-2 font-manrope font-normal">Ingresos (USD)</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {productMetrics.products.map((p, i) => {
                    const isOpen = expandedProduct === p.name;
                    return (
                      <>
                        <tr
                          key={p.product_id || p.name}
                          onClick={() => setExpandedProduct(isOpen ? null : p.name)}
                          className="border-t border-brand-border cursor-pointer row-hover"
                        >
                          <td className="py-2.5 flex items-center gap-2">
                            {i === 0 && <span className="text-yellow-400 text-xs">🏆</span>}
                            {p.name}
                          </td>
                          <td className="py-2.5 text-brand-muted font-tech">{p.quantity}</td>
                          <td className="py-2.5 text-brand-ice font-tech">${p.revenue_usd.toLocaleString()}</td>
                          <td className="py-2.5 text-brand-muted text-xs text-right">{isOpen ? '▲' : '▼'} país / industria</td>
                        </tr>
                        {isOpen && (
                          <tr key={`${p.name}-detail`} className="bg-brand-bg/40">
                            <td colSpan={4} className="py-4 px-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs text-brand-muted uppercase tracking-wide mb-2">
                                    <Globe size={12} /> Por país
                                  </div>
                                  <div className="space-y-1.5">
                                    {p.by_country.map((c) => (
                                      <div key={c.name} className="flex justify-between text-xs">
                                        <span className="text-brand-muted">{c.name}</span>
                                        <span className="text-brand-white font-tech">${c.revenue_usd.toLocaleString()} · {c.quantity}u</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs text-brand-muted uppercase tracking-wide mb-2">
                                    <Briefcase size={12} /> Por industria
                                  </div>
                                  <div className="space-y-1.5">
                                    {p.by_industry.map((c) => (
                                      <div key={c.name} className="flex justify-between text-xs">
                                        <span className="text-brand-muted">{c.name}</span>
                                        <span className="text-brand-white font-tech">${c.revenue_usd.toLocaleString()} · {c.quantity}u</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Historial / actividad reciente */}
      <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
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
