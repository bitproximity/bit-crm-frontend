// Metas de reuniones por persona (Bit Prospect). Cada persona del equipo tiene una meta por mes y se ve
// su avance real: reuniones AGENDADAS (fecha programada en el mes) o REALIZADAS (fecha realizada en el mes).
// El admin asigna las metas de todo el equipo de una vez en una ventana («Asignar metas»); el resto solo las ve.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, ChevronLeft, ChevronRight, Users, AlertTriangle, Copy, Eraser } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';
import { colorForName, initials } from '../lib/avatar';

export const localMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return localMonth(new Date(y, m - 1 + delta, 1));
}
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

export const upperFirst = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// Cuántas por semana hacen falta para llegar a la meta en lo que queda del mes (solo mes en curso).
export function paceHint({ target, actual, month, today = new Date() }) {
  if (!target) return '';
  const remaining = Math.max(0, target - actual);
  if (remaining === 0) return '¡Meta cumplida!';
  const current = localMonth(today);
  if (month < current) return `Quedó en ${Math.round((actual / target) * 100)}% de la meta`;
  if (month > current) return '';
  const [y, m] = month.split('-').map(Number);
  const daysLeft = new Date(y, m, 0).getDate() - today.getDate() + 1;
  const perWeek = Math.ceil(remaining / Math.max(1, Math.ceil(daysLeft / 7)));
  return `Faltan ${remaining} · unas ${perWeek} por semana`;
}

function Avatar({ name }) {
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-tech font-bold text-white flex-shrink-0" style={{ background: colorForName(name) }}>
      {initials(name)}
    </span>
  );
}

function Bar({ pct }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-brand-bg overflow-hidden min-w-[60px]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-400' : 'bg-gradient-to-r from-brand-violet to-brand-magenta'}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function AssignGoalsModal({ month, rows, onClose, onSaved }) {
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((r) => [r.team_member_id, r.target ?? ''])));
  const [sameValue, setSameValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const hasPrevious = rows.some((r) => r.previous_target);
  const set = (id, v) => setValues((cur) => ({ ...cur, [id]: v }));

  const save = async () => {
    for (const r of rows) {
      const v = values[r.team_member_id];
      if (v === '' || v === null || v === undefined) continue;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 999) { setError(`La meta de ${r.full_name} debe ser un número entero entre 1 y 999 (déjala vacía para quitarla).`); return; }
    }
    setSaving(true); setError('');
    try {
      await api.post('/api/quotas/bulk', { month, goals: rows.map((r) => ({ team_member_id: r.team_member_id, target_meetings: values[r.team_member_id] === '' ? null : Number(values[r.team_member_id]) })) });
      onSaved();
    } catch (e) {
      setError(e.message || 'No se pudieron guardar las metas.'); setSaving(false);
    }
  };

  return (
    <Modal
      title={`Asignar metas — ${monthLabel(month)}`}
      subtitle="Reuniones por persona en el mes. Vacío = sin meta."
      icon={Target}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={save} disabled={saving} className={primaryBtn}>{saving ? 'Guardando…' : 'Guardar metas'}</button>
          <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
          {error && <span role="alert" className="text-xs text-red-300 basis-full">{error}</span>}
        </>
      )}
    >
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Field label="Misma meta para todos" className="w-40">
          <input type="number" min="0" max="999" value={sameValue} onChange={(e) => setSameValue(e.target.value)} placeholder="Ej. 20" aria-label="Misma meta para todos" className={inputCls} />
        </Field>
        <button type="button" disabled={sameValue === ''} onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.team_member_id, sameValue])))} className={`${ghostBtn} border border-brand-border disabled:opacity-40`}>Aplicar a todos</button>
        <button type="button" disabled={!hasPrevious} onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.team_member_id, r.previous_target ?? ''])))} className={`${ghostBtn} border border-brand-border disabled:opacity-40 flex items-center gap-1.5`}><Copy size={13} /> Copiar del mes anterior</button>
        <button type="button" onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.team_member_id, ''])))} className={`${ghostBtn} flex items-center gap-1.5`}><Eraser size={13} /> Quitar todas</button>
      </div>
      <div className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
        {rows.map((r) => (
          <div key={r.team_member_id} className="flex items-center gap-3 px-4 py-2.5 bg-brand-bg/40">
            <Avatar name={r.full_name} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{r.full_name}</div>
              {r.previous_target ? <div className="text-[11px] text-brand-muted">Mes anterior: {r.previous_target}</div> : null}
            </div>
            <input
              type="number" min="0" max="999" inputMode="numeric"
              value={values[r.team_member_id]} onChange={(e) => set(r.team_member_id, e.target.value)}
              aria-label={`Meta de ${r.full_name}`} placeholder="—"
              className="w-24 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm text-right font-tech focus:outline-none focus:border-brand-violet"
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function MeetingGoalsPanel({ isAdmin = false }) {
  const [month, setMonth] = useState(() => localMonth());
  const [metric, setMetric] = useState('scheduled'); // 'scheduled' | 'realized'
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.get(`/api/quotas?month=${month}`)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || 'No se pudieron cargar las metas.'); });
    return () => { alive = false; };
  }, [month, reload]);

  const isCurrent = month === localMonth();
  const rows = data?.rows || [];
  const actualOf = (r) => (metric === 'realized' ? r.realized : r.scheduled);
  const totals = useMemo(() => ({
    target: rows.reduce((n, r) => n + (r.target || 0), 0),
    actual: rows.reduce((n, r) => n + (r.target ? actualOf(r) : 0), 0), // el total del equipo solo suma a quien tiene meta
  }), [rows, metric]); // eslint-disable-line react-hooks/exhaustive-deps
  const teamPct = totals.target ? Math.round((totals.actual / totals.target) * 100) : null;

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-brand-border flex flex-wrap items-center gap-3">
        <Target size={15} className="text-brand-ice flex-shrink-0" />
        <div className="min-w-0 mr-auto">
          <div className="text-sm font-manrope font-medium">Metas de reuniones por persona</div>
          <div className="text-[11px] text-brand-muted">Reuniones del mes frente a la meta de cada persona del equipo.</div>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Mes">
          <button type="button" aria-label="Mes anterior" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-1.5 rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium min-w-[8.5rem] text-center">{upperFirst(monthLabel(month))}</span>
          <button type="button" aria-label="Mes siguiente" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-1.5 rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg"><ChevronRight size={16} /></button>
        </div>
        <div className="flex rounded-lg bg-brand-bg border border-brand-border p-0.5" role="group" aria-label="Qué se mide">
          {[['scheduled', 'Agendadas'], ['realized', 'Realizadas']].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)} className={`px-3 py-1 rounded-md text-xs font-medium transition ${metric === key ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>{label}</button>
          ))}
        </div>
        {isAdmin && <button type="button" disabled={!data} onClick={() => setModalOpen(true)} className={`${primaryBtn} !px-4 !py-2 text-xs disabled:opacity-50`}>Asignar metas</button>}
      </div>

      {error && (
        <div role="alert" className="px-5 py-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/30 flex items-center gap-3">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="text-xs text-brand-ice hover:underline">Reintentar</button>
        </div>
      )}
      {!data && !error && <div className="px-5 py-4 text-brand-muted text-sm">Cargando…</div>}

      {data && (
        <>
          {data.unmatched?.length > 0 && (
            <div className="px-5 py-3 text-xs bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-100 flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-yellow-300 mt-0.5 flex-shrink-0" />
              <div>
                Hay reuniones de {data.unmatched.map((u) => `«${u.name}» (${u.scheduled} agendada${u.scheduled === 1 ? '' : 's'}, ${u.realized} realizada${u.realized === 1 ? '' : 's'})`).join(', ')} que no coinciden con ningún usuario activo del CRM, así que no cuentan en ninguna meta.
                {' '}Si son de tu equipo, crea su usuario en <Link to="/settings?seccion=equipo" className="underline text-brand-ice">Configuración → Equipo</Link> o corrige el nombre en «Ejecutivo».
              </div>
            </div>
          )}

          {totals.target > 0 && (
            <div className="px-5 py-3 border-b border-brand-border flex items-center gap-3 sm:gap-4 bg-brand-bg/30">
              <div className="sm:w-44 flex-shrink-0 text-sm flex items-center gap-1.5"><Users size={13} className="text-brand-muted" /> Equipo</div>
              <Bar pct={teamPct} />
              <div className="flex-shrink-0 min-w-[4rem] text-xs font-tech text-right"><span className="text-brand-ice">{totals.actual}</span><span className="text-brand-muted"> / {totals.target}</span><div className="text-[10px] text-brand-muted">{teamPct}%</div></div>
            </div>
          )}

          <div className="divide-y divide-brand-border">
            {rows.map((r) => {
              const actual = actualOf(r);
              const pct = r.target ? Math.round((actual / r.target) * 100) : null;
              const hint = paceHint({ target: r.target, actual, month });
              return (
                <div key={r.team_member_id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="w-full sm:w-44 flex-shrink-0 flex items-center gap-2.5 min-w-0"><Avatar name={r.full_name} /><span className="text-sm truncate">{r.full_name}</span></div>
                  {r.target ? (
                    <div className="flex-1 min-w-0 basis-[55%] flex items-center gap-3">
                      <Bar pct={pct} />
                      <div className="flex-shrink-0 min-w-[4rem] text-xs font-tech text-right">
                        <span className={pct >= 100 ? 'text-green-300' : 'text-brand-ice'}>{actual}</span><span className="text-brand-muted"> / {r.target}</span>
                        <div className="text-[10px] text-brand-muted">{pct}%</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-xs text-brand-muted">
                      Sin meta{isAdmin ? <> — <button type="button" onClick={() => setModalOpen(true)} className="text-brand-ice hover:underline">asignar</button></> : ''}
                    </div>
                  )}
                  <div className="basis-full sm:basis-auto sm:w-60 text-[11px] text-brand-muted sm:text-right">
                    {hint && <div className={hint.startsWith('¡') ? 'text-green-300' : ''}>{hint}</div>}
                    <div>Agendadas {r.scheduled} · Realizadas {r.realized}</div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <div className="px-5 py-4 text-brand-muted text-sm">No hay personas activas en el equipo de Bit Prospect todavía.</div>}
          </div>
          {!isCurrent && <div className="px-5 py-2.5 text-[11px] text-brand-muted border-t border-brand-border">Estás viendo un mes distinto al actual.</div>}
        </>
      )}

      {modalOpen && data && (
        <AssignGoalsModal month={month} rows={rows} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); setReload((n) => n + 1); }} />
      )}
    </div>
  );
}
