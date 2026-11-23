import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, TrendingUp, Trophy, Download, X, Building2, Factory, Globe2, AlertTriangle, Users } from 'lucide-react';
import { api } from '../lib/api';

// Resumen GLOBAL de Bit Prospect: todas las marcas juntas. Reuniones de cada ejecutivo por mes
// (mes de la fecha programada) y su reparto por marca, industria y país.

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthShort = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS_ES[Number(m) - 1]} ${y.slice(2)}`; };
const monthLong = (ym) => { const [y, m] = ym.split('-'); return `${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(m) - 1]} ${y}`; };

const PERIODS = [
  { key: '6', label: '6 meses' },
  { key: '12', label: '12 meses' },
  { key: 'year', label: 'Este año' },
  { key: 'all', label: 'Todo' },
];
function periodParams(key, today = new Date()) {
  const y = today.getFullYear(); const m = today.getMonth() + 1;
  const to = `${y}-${String(m).padStart(2, '0')}`;
  if (key === 'all') return { from: 'all', to };
  if (key === 'year') return { from: `${y}-01`, to };
  const n = Number(key);
  const d = new Date(y, m - n, 1);
  return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, to };
}

export function summaryCsv(data) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const months = data.period.months;
  const head = ['Ejecutivo', ...months.map(monthLong), 'Total', 'Realizadas', 'Promedio por mes', 'Marcas', 'Agendadas sin fecha'];
  const rows = data.executives.map((e) => [e.name, ...months.map((mo) => e.by_month[mo]), e.total, e.realized, e.avg_per_month, e.brands, e.undated]);
  const total = ['Total equipo', ...months.map((mo) => data.month_totals[mo]), data.totals.meetings, data.totals.realized, '', '', data.totals.undated];
  return '﻿' + [head, ...rows, total].map((r) => r.map(q).join(',')).join('\r\n');
}

function Kpi({ icon: Icon, label, value, sub, tone = 'text-brand-ice' }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
      <div className={`flex items-center gap-1.5 text-xs mb-1 ${tone}`}><Icon size={12} /> {label}</div>
      <div className={`text-2xl font-headline font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-brand-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Breakdown({ icon: Icon, title, items, emptyText }) {
  const max = Math.max(1, ...(items || []).map((i) => i.count));
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
      <div className="flex items-center gap-2 text-sm font-manrope font-medium mb-4"><Icon size={15} className="text-brand-ice" /> {title}</div>
      {!items?.length ? <p className="text-xs text-brand-muted">{emptyText}</p> : (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.name}>
              <div className="flex items-center justify-between gap-2 text-xs mb-1">
                <span className={`truncate ${it.name === 'Sin especificar' || it.name === 'Otros' ? 'text-brand-muted italic' : 'text-brand-white'}`} title={it.name}>{it.name}</span>
                <span className="font-tech text-brand-ice whitespace-nowrap">{it.count} <span className="text-brand-muted">· {it.pct}%</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta" style={{ width: `${(it.count / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function B2bGlobalSummary() {
  const [period, setPeriod] = useState('12');
  const [focus, setFocus] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = periodParams(period);
    const qs = new URLSearchParams({ from: p.from, to: p.to });
    if (focus) qs.set('executive', focus);
    setError('');
    api.get(`/api/b2b/global-summary?${qs}`).then(setData).catch((e) => setError(e.message || 'No se pudo cargar el resumen.'));
  }, [period, focus]);

  const maxCell = useMemo(() => (data ? Math.max(1, ...data.executives.flatMap((e) => Object.values(e.by_month))) : 1), [data]);

  const download = () => {
    const blob = new Blob([summaryCsv(data)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `bit-prospect-reuniones-${data.period.from}_${data.period.to}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (error) return <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>;
  if (!data) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>;

  const t = data.totals;
  const months = data.period.months;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-brand-muted text-xs max-w-xl">Todas las marcas juntas (Spoonity, Fiweex, Periferia…). Cada reunión cuenta en el mes de su fecha programada y para el ejecutivo que la agendó.</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-brand-panel border border-brand-border rounded-lg p-1" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPeriod(p.key)} aria-pressed={period === p.key}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${period === p.key ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>{p.label}</button>
            ))}
          </div>
          <button type="button" onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-panel text-xs hover:border-brand-violet transition"><Download size={13} /> CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarCheck} label="Reuniones agendadas" value={t.meetings.toLocaleString('es')} sub={`${monthShort(data.period.from)} – ${monthShort(data.period.to)}`} />
        <Kpi icon={CheckCircle2} label="Realizadas" value={t.realized.toLocaleString('es')} sub={t.meetings ? `${Math.round((100 * t.realized) / t.meetings)}% de las agendadas` : '—'} tone="text-green-300" />
        <Kpi icon={TrendingUp} label="Este mes" value={t.this_month.toLocaleString('es')} sub={`${t.executives_with_meetings} ejecutivo${t.executives_with_meetings === 1 ? '' : 's'} con reuniones en el período`} tone="text-yellow-300" />
        <Kpi icon={Trophy} label="Mejor mes" value={t.best_month ? t.best_month.count : '—'} sub={t.best_month ? monthLong(t.best_month.month) : 'Sin reuniones'} tone="text-brand-magenta" />
      </div>

      {t.undated > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{t.undated} reunion{t.undated === 1 ? '' : 'es'} marcada{t.undated === 1 ? '' : 's'} como agendada{t.undated === 1 ? '' : 's'} no tiene{t.undated === 1 ? '' : 'n'} fecha y no entra{t.undated === 1 ? '' : 'n'} en los meses. La columna «Sin fecha» dice de quién son.</span>
        </div>
      )}

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden panel-depth">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-manrope font-medium"><Users size={15} className="text-brand-ice" /> Reuniones por ejecutivo y mes</div>
          <span className="text-[11px] text-brand-muted">Toca un ejecutivo para ver sus marcas, industrias y países</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-brand-muted text-[11px] font-tech uppercase tracking-wide">
                <th className="sticky left-0 z-10 bg-brand-panel text-left font-normal px-5 py-2.5 min-w-[180px]">Ejecutivo</th>
                {months.map((mo) => <th key={mo} className="font-normal px-2 py-2.5 text-center whitespace-nowrap">{monthShort(mo)}</th>)}
                <th className="font-normal px-3 py-2.5 text-center text-brand-ice">Total</th>
                <th className="font-normal px-3 py-2.5 text-center whitespace-nowrap">Prom./mes</th>
                {t.undated > 0 && <th className="font-normal px-3 py-2.5 text-center whitespace-nowrap">Sin fecha</th>}
              </tr>
            </thead>
            <tbody>
              {data.executives.map((e, i) => {
                const on = focus && data.focus === e.name;
                return (
                  <tr key={e.key} onClick={() => setFocus(on ? null : e.name)} aria-selected={!!on}
                    className={`border-t border-brand-border cursor-pointer transition ${on ? 'bg-brand-violet/10' : 'row-hover'}`}>
                    <td className={`sticky left-0 z-10 px-5 py-2.5 whitespace-nowrap ${on ? 'bg-[#1a1330]' : 'bg-brand-panel'}`}>
                      <span className="flex items-center gap-2">
                        {i === 0 && e.total > 0 && <Trophy size={13} className="text-yellow-400" aria-label="Primero" />}
                        <span className={on ? 'text-white font-medium' : ''}>{e.name}</span>
                        {e.brands > 0 && <span className="text-[10px] text-brand-muted">{e.brands} marca{e.brands === 1 ? '' : 's'}</span>}
                      </span>
                    </td>
                    {months.map((mo) => {
                      const v = e.by_month[mo];
                      return (
                        <td key={mo} className="px-1 py-1 text-center">
                          <span className="block rounded-md py-1.5 font-tech text-xs" title={`${e.name} · ${monthLong(mo)}: ${v}`}
                            style={v ? { background: `rgba(133,0,255,${0.12 + 0.6 * (v / maxCell)})`, color: '#fff' } : { color: 'rgba(170,165,186,.35)' }}>
                            {v || '·'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-tech font-semibold text-brand-ice">{e.total}</td>
                    <td className="px-3 py-2.5 text-center font-tech text-brand-muted">{e.avg_per_month}</td>
                    {t.undated > 0 && <td className="px-3 py-2.5 text-center font-tech text-yellow-300">{e.undated || ''}</td>}
                  </tr>
                );
              })}
              {data.executives.length === 0 && (
                <tr><td colSpan={months.length + 3} className="px-5 py-10 text-center text-brand-muted text-sm">Sin reuniones en este período.</td></tr>
              )}
            </tbody>
            {data.executives.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-brand-border text-xs">
                  <td className="sticky left-0 z-10 bg-brand-panel px-5 py-2.5 font-medium text-brand-muted">Total equipo</td>
                  {months.map((mo) => <td key={mo} className="px-1 py-2.5 text-center font-tech text-brand-white">{data.month_totals[mo] || '·'}</td>)}
                  <td className="px-3 py-2.5 text-center font-tech font-semibold text-brand-magenta">{t.meetings}</td>
                  <td className="px-3 py-2.5" />
                  {t.undated > 0 && <td className="px-3 py-2.5 text-center font-tech text-yellow-300">{t.undated}</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="text-sm font-manrope font-medium">Reparto {data.focus ? 'de' : 'de todo el equipo'}</div>
          {data.focus && (
            <button type="button" onClick={() => setFocus(null)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-violet/15 border border-brand-violet/40 text-xs text-brand-ice hover:bg-brand-violet/25">
              {data.focus} <X size={12} aria-label="Quitar filtro" />
            </button>
          )}
          <span className="text-[11px] text-brand-muted">· {data.focus_total} reuniones</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Breakdown icon={Building2} title="Por marca" items={data.by_brand} emptyText="Sin reuniones." />
          <Breakdown icon={Factory} title="Por industria" items={data.by_industry} emptyText="Sin reuniones." />
          <Breakdown icon={Globe2} title="Por país" items={data.by_country} emptyText="Sin reuniones." />
        </div>
      </div>
    </div>
  );
}
