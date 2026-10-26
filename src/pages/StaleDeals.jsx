// Tratos estáticos: abiertos y sin movimiento real (actividad o cambio de etapa) en N días, ordenados por dinero en juego.
// El objetivo es reactivarlos: se seleccionan y se crea un recordatorio «Reactivar: …» para cada responsable.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseCircle, BellPlus, Search, CheckCircle2, AlertTriangle, ListChecks } from 'lucide-react';
import { api } from '../lib/api';
import { fmtUsd, fmtNative } from '../lib/money';
import { formatDay } from '../lib/dateOnly';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import LiveStatus from '../components/LiveStatus';
import { useConfirm } from '../components/ConfirmModal';

const THRESHOLDS = [14, 30, 60, 90];
const PRIORITY = { alta: 'bg-red-500/15 text-red-300', media: 'bg-yellow-500/15 text-yellow-300', baja: 'bg-brand-border text-brand-muted' };
const BUCKETS = [['14_29', '14–29 días'], ['30_59', '30–59 días'], ['60_89', '60–89 días'], ['90_mas', '90+ días']];
const PAGE = 100;
const REMIND_CHUNK = 150; // el servicio admite hasta 200 por petición

export default function StaleDeals() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [days, setDays] = useState(14);
  const [owner, setOwner] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ days: String(days) });
    if (owner) qs.set('owner_id', owner);
    return api.get(`/api/stale-deals?${qs}`)
      .then((d) => { setData(d); setError(''); setLastUpdated(Date.now()); })
      .catch((e) => setError(e.message || 'No se pudo cargar la lista.'));
  }, [days, owner]);
  useEffect(() => { setData(null); setSelected(new Set()); setShown(PAGE); load(); }, [load]);
  const refresh = useAutoRefresh(load, { intervalMs: 60000 });
  const refreshNow = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const deals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.deals || []).filter((d) => !q || `${d.title} ${d.company || ''} ${d.owner || ''}`.toLowerCase().includes(q));
  }, [data, query]);

  const toggle = (id) => setSelected((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const selectPending = () => setSelected(new Set(deals.filter((d) => !d.has_reminder).map((d) => d.id)));
  const allVisibleSelected = deals.length > 0 && deals.slice(0, shown).every((d) => selected.has(d.id));

  const createReminders = async () => {
    const ids = [...selected];
    const byId = new Map((data?.deals || []).map((d) => [d.id, d]));
    const unowned = ids.filter((id) => !byId.get(id)?.owner_id).length;
    // Con cientos de tratos sin movimiento, un clic podría llenar de tareas a alguien: se pide confirmar, con las cuentas claras.
    const ok = await confirm({
      title: 'Crear recordatorios',
      message: `Se crearán ${ids.length} tarea${ids.length === 1 ? '' : 's'} «Reactivar: …» para mañana a las 9:00, una por trato, para su responsable.${unowned ? ` ${unowned} no tiene${unowned === 1 ? '' : 'n'} responsable y se te asignará${unowned === 1 ? '' : 'n'} a ti.` : ''}${ids.length > 50 ? ' Son muchas: la lista ya va de mayor a menor valor, por si prefieres empezar por los primeros.' : ''}`,
      confirmLabel: `Crear ${ids.length}`,
    });
    if (!ok) return;
    setBusy(true); setMsg('');
    try {
      let created = 0; let already = 0;
      for (let i = 0; i < ids.length; i += REMIND_CHUNK) {
        const r = await api.post('/api/stale-deals/remind', { deal_ids: ids.slice(i, i + REMIND_CHUNK), due_in_days: 1 });
        created += r.created || 0; already += r.already_had_reminder || 0;
      }
      setMsg(`${created} recordatorio${created === 1 ? '' : 's'} creado${created === 1 ? '' : 's'} para mañana a las 9:00${already ? ` · ${already} ya tenía${already === 1 ? '' : 'n'} uno` : ''}. Cada responsable lo verá en sus Tareas.`);
      setSelected(new Set());
      await load();
    } catch (e) { setMsg(e.message || 'No se pudieron crear los recordatorios.'); }
    setBusy(false);
  };

  if (error && !data) return <div role="alert" className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error} <button type="button" onClick={load} className="underline ml-2">Reintentar</button></div>;
  const s = data?.summary;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-headline text-xl font-semibold flex items-center gap-2"><PauseCircle size={18} className="text-brand-ice" /> Tratos estáticos</h1>
        <LiveStatus lastUpdated={lastUpdated} onRefresh={refreshNow} refreshing={refreshing} />
      </div>
      <p className="text-brand-muted text-sm mb-5">Tratos abiertos sin una actividad ni un cambio de etapa en los últimos {days} días, ordenados por el dinero que tienen en juego (USD). Reactívalos antes de que se enfríen.</p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex rounded-lg bg-brand-bg border border-brand-border p-0.5" role="group" aria-label="Días sin movimiento">
          {THRESHOLDS.map((t) => <button key={t} type="button" aria-pressed={days === t} onClick={() => setDays(t)} className={`px-3 py-1 rounded-md text-xs font-medium ${days === t ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>{t}+ días</button>)}
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Responsable" style={{ colorScheme: 'dark' }} className="px-2.5 py-1.5 rounded-lg text-xs bg-brand-panel border border-brand-border text-brand-muted">
          <option value="">Todos los responsables</option>
          {(s?.by_owner || []).filter((o) => o.owner_id).map((o) => <option key={o.owner_id} value={o.owner_id}>{o.owner} ({o.count})</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar trato, empresa o responsable…" aria-label="Buscar" className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-sm focus:outline-none focus:border-brand-violet" />
        </div>
      </div>

      {data?.missing_rates?.length > 0 && <div role="alert" className="mb-4 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2"><AlertTriangle size={13} /> Falta la tasa de cambio de {data.missing_rates.join(', ')}: esos tratos aparecen con USD 0. Agrégala en Configuración → Tipos de cambio.</div>}
      {msg && <div role="status" className="mb-4 px-4 py-2.5 rounded-lg bg-brand-violet/10 border border-brand-violet/30 text-brand-ice text-xs">{msg}</div>}

      {!data ? <div className="text-brand-muted text-sm py-12 text-center">Buscando tratos sin movimiento…</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth"><div className="text-xs text-brand-muted mb-1">Tratos estáticos</div><div className="text-xl font-headline font-semibold">{s.count}</div></div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth"><div className="text-xs text-brand-muted mb-1">Dinero en juego</div><div className="text-xl font-headline font-semibold text-yellow-300">{fmtUsd(s.value_usd)}</div></div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth"><div className="text-xs text-brand-muted mb-1">Sin siguiente paso</div><div className="text-xl font-headline font-semibold text-red-300">{s.without_next_step}</div><div className="text-[11px] text-brand-muted">ni una tarea abierta</div></div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth"><div className="text-xs text-brand-muted mb-1">Con recordatorio</div><div className="text-xl font-headline font-semibold text-green-300">{s.with_reminder}</div></div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {BUCKETS.map(([k, label]) => <span key={k} className="px-3 py-1 rounded-full text-[11px] bg-brand-panel border border-brand-border text-brand-muted">{label}: <b className="text-brand-white font-medium">{s.buckets[k].count}</b> · {fmtUsd(s.buckets[k].value_usd)}</span>)}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button type="button" onClick={selectPending} className="px-3 py-1.5 rounded-lg border border-brand-border text-xs hover:border-brand-violet flex items-center gap-1.5"><ListChecks size={13} /> Seleccionar los que no tienen recordatorio</button>
            {selected.size > 0 && <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-brand-muted hover:text-brand-white underline">Quitar selección</button>}
            <button type="button" disabled={selected.size === 0 || busy} onClick={createReminders} className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-sm flex items-center gap-1.5 disabled:opacity-40">
              <BellPlus size={14} /> {busy ? 'Creando…' : `Crear recordatorios${selected.size ? ` (${selected.size})` : ''}`}
            </button>
          </div>

          <div className="bg-brand-panel border border-brand-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-brand-panel/80 text-brand-muted text-left">
                <tr>
                  <th className="px-3 py-3 w-10"><input type="checkbox" aria-label="Seleccionar todos los visibles" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(deals.slice(0, shown).map((d) => d.id)))} /></th>
                  <th className="px-3 py-3 font-manrope font-normal">Trato</th>
                  <th className="px-3 py-3 font-manrope font-normal">Responsable</th>
                  <th className="px-3 py-3 font-manrope font-normal text-right">Valor (USD)</th>
                  <th className="px-3 py-3 font-manrope font-normal">Sin movimiento</th>
                  <th className="px-3 py-3 font-manrope font-normal">Última actividad</th>
                  <th className="px-3 py-3 font-manrope font-normal">Estado</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, shown).map((d) => (
                  <tr key={d.id} onClick={() => navigate(`/deals/${d.id}`)} className="border-t border-brand-border row-hover cursor-pointer align-top">
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Seleccionar ${d.title}`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} /></td>
                    <td className="px-3 py-3 min-w-[16rem]"><div className="font-medium">{d.title}</div><div className="text-[11px] text-brand-muted">{d.company || 'Sin empresa'}{d.stage ? ` · ${d.stage}` : ''}{d.pipeline ? ` · ${d.pipeline}` : ''}</div></td>
                    <td className="px-3 py-3 text-brand-muted whitespace-nowrap">{d.owner || <span className="italic">Sin responsable</span>}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap"><div className="font-tech text-brand-ice">{fmtUsd(d.value_usd)}</div>{d.currency !== 'USD' && <div className="text-[10px] text-brand-muted font-tech">{fmtNative(d.value, d.currency)}</div>}<span className={`inline-block mt-1 px-1.5 rounded text-[10px] ${PRIORITY[d.priority]}`}>prioridad {d.priority}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><div className="font-tech">{d.days_idle} días</div><div className="text-[10px] text-brand-muted">desde {d.last_touch_kind} · {formatDay(d.last_touch.slice(0, 10))}</div></td>
                    <td className="px-3 py-3 text-xs text-brand-muted max-w-[16rem]">{d.last_activity ? <><span className="capitalize">{d.last_activity.type}</span>: <span className="line-clamp-2">{d.last_activity.summary || '—'}</span></> : <span className="italic">Sin actividades registradas</span>}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {d.has_reminder ? <span className="inline-flex items-center gap-1 text-green-300"><CheckCircle2 size={12} /> Recordatorio creado</span>
                        : d.open_tasks === 0 ? <span className="text-red-300">Sin siguiente paso</span>
                          : <span className="text-brand-muted">{d.open_tasks} tarea{d.open_tasks === 1 ? '' : 's'} abierta{d.open_tasks === 1 ? '' : 's'}</span>}
                    </td>
                  </tr>
                ))}
                {deals.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-brand-muted text-sm">{data.deals.length === 0 ? `Ningún trato lleva ${days}+ días sin movimiento 🎉` : 'Ningún trato coincide con la búsqueda.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {deals.length > shown && <div className="text-center mt-4"><button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2 rounded-lg border border-brand-border text-sm hover:border-brand-violet">Mostrar {Math.min(PAGE, deals.length - shown)} más ({deals.length - shown} restantes)</button></div>}
        </>
      )}
    </div>
  );
}
