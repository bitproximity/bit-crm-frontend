import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, Palette, Eye, X, ExternalLink, ChevronDown, ChevronRight, Inbox, Sparkles, Link2, Trophy, CalendarDays, Search, Copy, Check, ArrowRightLeft, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { Drawer, Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';
import { useConfirm } from './ConfirmModal';
import LeadFormView, { DEFAULT_THEME, themeOf } from './LeadFormView';

// Lo que necesita LeadFormView a partir de un formulario guardado + sus preguntas.
export function toViewForm(form, fields, settings = form.settings || {}) {
  const long = settings.long_field_ids || []; const req = settings.required_field_ids || []; const hints = settings.hints || {};
  return {
    name: form.name, settings,
    custom_fields: (fields || []).map((f) => ({ ...f, long: long.includes(f.id), required: req.includes(f.id), hint: hints[f.id] || '' })),
  };
}

export function LeadFormPreview({ form, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 overlay-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[680px] max-h-[92vh] flex flex-col modal-in" role="dialog" aria-modal="true" aria-label="Vista previa del formulario">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-brand-ice" />
            <span className="text-xs font-tech uppercase tracking-wide text-brand-ice">Vista previa — así lo ve quien lo llena</span>
          </div>
          <button onClick={onClose} aria-label="Cerrar vista previa" className="text-brand-muted hover:text-white transition"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto rounded-2xl border border-brand-border">
          <LeadFormView form={form} preview onSubmit={async () => {}} />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Respuestas y métricas ─────────────────────────

const STATUS = { abierto: ['Abierto', 'text-brand-ice bg-brand-violet/15'], ganado: ['Ganado', 'text-green-300 bg-green-500/15'], perdido: ['Perdido', 'text-red-300 bg-red-500/10'] };

export const PUBLIC_APP_URL = 'https://crm.bitproximity.com';
export const publicUrlOf = (f) => `${PUBLIC_APP_URL}/public/${f.slug || `lead-forms/${f.id}`}`;

// Buscador de tratos (por título), por defecto dentro del pipeline del formulario.
export function DealPicker({ pipelineId, onPick, excludeId }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [list, setList] = useState(null);
  useEffect(() => {
    const h = setTimeout(() => {
      const params = new URLSearchParams({ limit: '15' });
      if (q.trim()) params.set('search', q.trim());
      if (pipelineId && !all) params.set('pipeline_id', pipelineId);
      api.get(`/api/deals?${params}`).then((d) => setList(Array.isArray(d) ? d : d?.data || [])).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q, all, pipelineId]);
  const items = (list || []).filter((d) => d.id !== excludeId);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca el trato por nombre…" aria-label="Buscar trato" className={`${inputCls} pl-9`} />
      </div>
      {pipelineId && (
        <label className="flex items-center gap-1.5 text-[11px] text-brand-muted"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[#8500FF]" /> Buscar en todos los pipelines</label>
      )}
      <div className="max-h-72 overflow-y-auto space-y-1">
        {list === null && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-brand-muted" /></div>}
        {list !== null && items.length === 0 && <p className="text-xs text-brand-muted py-3 text-center">Sin resultados.</p>}
        {items.map((d) => (
          <button key={d.id} type="button" onClick={() => onPick(d)} className="w-full text-left px-3 py-2 rounded-xl border border-transparent hover:border-brand-violet hover:bg-brand-violet/10 transition">
            <div className="text-sm text-brand-white truncate">{d.title}</div>
            <div className="text-[11px] text-brand-muted truncate">{[d.companies?.name, d.pipelines?.name, d.pipeline_stages?.name, STATUS[d.status]?.[0]].filter(Boolean).join(' · ')}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Link personalizado de un trato: el cliente lo abre con sus datos ya puestos y lo que responda va a ese trato.
export function DealLinkModal({ form, onClose }) {
  const [deal, setDeal] = useState(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pick = async (d) => {
    setDeal(d); setUrl(''); setError(''); setCopied(false);
    try { const r = await api.get(`/api/lead-forms/${form.id}/deal-link?deal_id=${d.id}`); setUrl(r.url); } catch (e) { setError(e.message || 'No se pudo generar el link.'); }
  };
  const copy = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <Modal title="Link para un trato" subtitle={form.name} icon={Link2} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-brand-muted">Elige el trato y copia su link. El cliente verá el formulario con su nombre, correo y marca ya llenos, y lo que responda se guarda en ese trato.</p>
        {!deal ? <DealPicker pipelineId={form.pipeline_id} onPick={pick} /> : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border">
              <span className="text-sm text-brand-white truncate">{deal.title}</span>
              <button type="button" onClick={() => { setDeal(null); setUrl(''); }} className="text-[11px] text-brand-ice hover:underline whitespace-nowrap">Cambiar trato</button>
            </div>
            {error && <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
            {url && (
              <div className="flex items-center gap-2">
                <input readOnly value={url} aria-label="Link del trato" className={`${inputCls} text-xs font-tech`} onFocus={(e) => e.target.select()} />
                <button type="button" onClick={copy} className={primaryBtn}><span className="flex items-center gap-1.5 whitespace-nowrap">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}</span></button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function responsesCsv(data) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const L = data.form.settings?.labels || {};
  const head = ['Fecha', L.name || 'Nombre', L.email || 'Correo', L.phone || 'Teléfono', L.company || 'Empresa', ...data.fields.map((f) => f.label), 'Mensaje', 'Trato', 'Estado del trato', 'Asociado a trato existente'];
  const lines = data.rows.map((r) => [
    new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 16), r.name, r.email, r.phone, r.company,
    ...data.fields.map((f) => r.custom?.[f.id] ?? ''), r.message, r.deal?.title || '', STATUS[r.deal?.status]?.[0] || '', r.matched_existing ? 'Sí' : 'No',
  ]);
  return '﻿' + [head, ...lines].map((row) => row.map(q).join(',')).join('\r\n');
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-brand-bg/60 border border-brand-border rounded-xl px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-tech uppercase tracking-wide text-brand-muted"><Icon size={11} /> {label}</div>
      <div className="font-headline text-xl font-semibold text-brand-ice mt-1 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-brand-muted mt-1">{sub}</div>}
    </div>
  );
}

function QuestionSummary({ q }) {
  return (
    <div className="py-3 border-b border-brand-border/60 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-brand-white">{q.label}</div>
        <div className="text-[11px] text-brand-muted whitespace-nowrap">{q.answered_pct}% respondió</div>
      </div>
      {q.distribution && (
        <div className="mt-2 space-y-1.5">
          {q.distribution.map((d) => (
            <div key={d.value} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate text-brand-muted">{d.value}</span>
              <div className="flex-1 h-2 rounded-full bg-brand-bg overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta" style={{ width: `${d.pct}%` }} /></div>
              <span className="w-16 text-right text-brand-ice">{d.count} · {d.pct}%</span>
            </div>
          ))}
        </div>
      )}
      {q.stats && (
        <div className="mt-2 flex gap-4 text-xs text-brand-muted flex-wrap">
          <span>Total <b className="text-brand-ice">{q.stats.sum.toLocaleString('es')}</b></span>
          <span>Promedio <b className="text-brand-ice">{q.stats.avg.toLocaleString('es')}</b></span>
          <span>Mín. <b className="text-brand-ice">{q.stats.min.toLocaleString('es')}</b></span>
          <span>Máx. <b className="text-brand-ice">{q.stats.max.toLocaleString('es')}</b></span>
        </div>
      )}
    </div>
  );
}

function ResponseRow({ r, fields, labels, onAssign }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[r.deal?.status];
  return (
    <div className="border border-brand-border rounded-xl bg-brand-bg/40">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        {open ? <ChevronDown size={14} className="text-brand-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-brand-muted flex-shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm text-brand-white truncate">{r.company || r.name}</div>
          <div className="text-[11px] text-brand-muted truncate">{r.name}{r.email ? ` · ${r.email}` : ''}</div>
        </div>
        {r.matched_existing && <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-md bg-brand-bg border border-brand-border text-brand-muted" title="Las respuestas se guardaron en un trato que ya existía">Trato existente</span>}
        {st && <span className={`text-[10px] px-2 py-0.5 rounded-md ${st[1]}`}>{st[0]}</span>}
        <span className="text-[11px] text-brand-muted whitespace-nowrap">{fmtDateTime(r.created_at)}</span>
      </button>
      {open && (
        <div className="px-4 pb-3.5 pt-1 space-y-2.5 text-sm">
          {r.phone && <div><div className="text-[11px] text-brand-muted">{labels.phone || 'Teléfono'}</div><div className="text-brand-white">{r.phone}</div></div>}
          {fields.map((f) => (r.custom?.[f.id] ? (
            <div key={f.id}><div className="text-[11px] text-brand-muted">{f.label}</div><div className="text-brand-white whitespace-pre-wrap">{r.custom[f.id]}</div></div>
          ) : null))}
          {r.message && <div><div className="text-[11px] text-brand-muted">Mensaje</div><div className="text-brand-white whitespace-pre-wrap">{r.message}</div></div>}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            {r.deal && <Link to={`/deals/${r.deal.id}`} className="inline-flex items-center gap-1 text-xs text-brand-ice hover:underline"><ExternalLink size={12} /> {r.deal.title}{r.deal.stage ? ` · ${r.deal.stage}` : ''}</Link>}
            {onAssign && <button type="button" onClick={() => onAssign(r)} className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-ice"><ArrowRightLeft size={12} /> {r.deal ? 'Asignar a otro trato' : 'Asignar a un trato'}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResponsesDrawer({ form, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [notice, setNotice] = useState(null);
  const confirm = useConfirm();
  const load = () => api.get(`/api/lead-forms/${form.id}/responses`).then(setData).catch((e) => setError(e.message || 'No se pudieron cargar las respuestas.'));
  useEffect(() => { load(); }, [form.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const assign = async (deal) => {
    const sub = assigning; setAssigning(null); setError('');
    try {
      const r = await api.post(`/api/lead-forms/submissions/${sub.id}/assign`, { deal_id: deal.id });
      setNotice({ text: `La respuesta de ${sub.company || sub.name} quedó en «${deal.title}».`, autoDealId: r.previous_was_auto_created ? r.previous_deal_id : null, autoDealTitle: sub.deal?.title });
      load();
    } catch (e) { setError(e.message || 'No se pudo asignar.'); }
  };
  const deleteAutoDeal = async () => {
    const ok = await confirm({ title: 'Borrar trato duplicado', message: `¿Borrar «${notice.autoDealTitle}»? Lo creó el formulario automáticamente y ya no tiene esta respuesta.`, confirmLabel: 'Borrar', danger: true });
    if (!ok) return;
    try { await api.delete(`/api/deals/${notice.autoDealId}`); setNotice({ text: 'Listo: el trato duplicado se borró.' }); load(); } catch (e) { setError(e.message || 'No se pudo borrar el trato.'); }
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    if (!t) return data.rows;
    return data.rows.filter((r) => [r.name, r.email, r.company, r.phone, ...Object.values(r.custom || {})].some((v) => String(v || '').toLowerCase().includes(t)));
  }, [data, q]);

  const download = () => {
    const blob = new Blob([responsesCsv(data)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${form.name.replace(/[^\w\- ]+/g, '').trim() || 'respuestas'}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const m = data?.metrics;
  const maxWeek = m ? Math.max(1, ...m.weeks.map((w) => w.count)) : 1;
  return (
    <Drawer title="Respuestas y métricas" subtitle={form.name} icon={BarChart3} width="max-w-2xl" onClose={onClose}
      footer={data && data.rows.length > 0 ? <button type="button" onClick={download} className={primaryBtn}><span className="flex items-center gap-1.5"><Download size={14} /> Descargar CSV (Excel)</span></button> : null}>
      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
      {notice && (
        <div role="status" className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 text-sm flex items-center gap-3 flex-wrap">
          <span className="flex-1">{notice.text}</span>
          {notice.autoDealId && <button type="button" onClick={deleteAutoDeal} className="text-xs px-2.5 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10">Borrar el trato que se había creado</button>}
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-green-200/70 hover:text-white"><X size={14} /></button>
        </div>
      )}
      {assigning && (
        <div className="mb-5 rounded-2xl border border-brand-violet/50 bg-brand-violet/5 p-4" role="region" aria-label="Asignar a un trato">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm text-brand-white"><ArrowRightLeft size={14} className="text-brand-ice" /> Asignar la respuesta de <b>{assigning.company || assigning.name}</b> a un trato</div>
            <button type="button" onClick={() => setAssigning(null)} className="text-xs text-brand-muted hover:text-white">Cancelar</button>
          </div>
          <p className="text-[11px] text-brand-muted mb-3">Las respuestas se copian al trato que elijas, con una nota.</p>
          <DealPicker pipelineId={data?.form?.pipeline_id} excludeId={assigning.deal?.id} onPick={assign} />
        </div>
      )}
      {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Kpi icon={Inbox} label="Respuestas" value={m.total.toLocaleString('es')} sub={`${m.clients} cliente${m.clients === 1 ? '' : 's'}`} />
            <Kpi icon={CalendarDays} label="Últimos 30 días" value={m.last_30_days} sub={`${m.last_7_days} en 7 días`} />
            <Kpi icon={Sparkles} label="Tratos nuevos" value={m.new_deals} sub={`${m.attached_to_existing} a tratos existentes`} />
            <Kpi icon={Trophy} label="Ganados" value={m.deals.ganado} sub={m.deals.win_rate_pct != null ? `${m.deals.win_rate_pct}% de los cerrados` : `${m.deals.abierto} abiertos`} />
          </div>

          <div>
            <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-2">Respuestas por semana · últimas 12</div>
            <div className="flex items-end gap-1.5 h-24 px-1" role="img" aria-label={`Respuestas por semana: ${m.weeks.map((w) => w.count).join(', ')}`}>
              {m.weeks.map((w) => (
                <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`Semana del ${fmtDate(w.week)}: ${w.count}`}>
                  {w.count > 0 && <span className="text-[10px] text-brand-ice">{w.count}</span>}
                  <div className={`w-full rounded-t-md ${w.count ? 'bg-gradient-to-t from-brand-violet to-brand-magenta' : 'bg-brand-border/50'}`} style={{ height: `${Math.max(4, (w.count / maxWeek) * 76)}px` }} />
                </div>
              ))}
            </div>
          </div>

          {m.questions.length > 0 && (
            <div>
              <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-1">Por pregunta <span className="normal-case tracking-normal">(última respuesta de cada cliente)</span></div>
              <div className="rounded-xl border border-brand-border px-4">{m.questions.map((qq) => <QuestionSummary key={qq.id} q={qq} />)}</div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Cada respuesta</div>
              {data.rows.length > 5 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca, nombre, respuesta…" aria-label="Buscar en las respuestas" className={`${inputCls} max-w-[240px] py-1.5 text-xs`} />}
            </div>
            {data.rows.length === 0 ? (
              <p className="text-sm text-brand-muted py-6 text-center border border-dashed border-brand-border rounded-xl">Todavía no hay respuestas. Comparte el link y aparecerán acá al instante.</p>
            ) : (
              <div className="space-y-2">{rows.map((r) => <ResponseRow key={r.id} r={r} fields={data.fields} labels={data.form.settings?.labels || {}} onAssign={(r) => { setAssigning(r); document.querySelector('[role=dialog] .overflow-y-auto')?.scrollTo?.({ top: 0, behavior: 'smooth' }); }} />)}</div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ───────────────────────── Diseño y textos ─────────────────────────

function Toggle({ on, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#8500FF]" />
      <span><span className="text-sm text-brand-white">{label}</span>{hint && <span className="block text-[11px] text-brand-muted">{hint}</span>}</span>
    </label>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-brand-muted">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border border-brand-border cursor-pointer" aria-label={label} />
      <span><span className="block text-brand-white">{label}</span><span className="font-tech">{value.toUpperCase()}</span></span>
    </label>
  );
}

export function DesignDrawer({ form, fields, onClose, onSaved }) {
  const init = form.settings || {};
  const [s, setS] = useState({
    ...init,
    labels: { ...(init.labels || {}) }, required: { ...(init.required || {}) }, hints: { ...(init.hints || {}) },
    theme: { ...(init.theme || {}) }, long_field_ids: [...(init.long_field_ids || [])], required_field_ids: [...(init.required_field_ids || [])],
    match_existing: init.match_existing !== false,
  });
  const [slug, setSlug] = useState(form.slug || '');
  const [notifyText, setNotifyText] = useState((init.notify_emails || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const t = themeOf(s);
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setIn = (k, kk, v) => setS((p) => ({ ...p, [k]: { ...p[k], [kk]: v } }));
  const toggleId = (k, id, on) => setS((p) => ({ ...p, [k]: on ? [...new Set([...p[k], id])] : p[k].filter((x) => x !== id) }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const body = { settings: s };
      if ((slug || '') !== (form.slug || '')) body.slug = slug.trim() || null;
      await api.patch(`/api/lead-forms/${form.id}`, body);
      onSaved?.(); onClose();
    } catch (e) {
      const m = e.message || '';
      setError(/slug/.test(m) && /column|schema/i.test(m) ? 'Falta correr el script 067 en Supabase para el link corto.' : /settings/.test(m) ? 'Falta correr el script 066 en Supabase para guardar el diseño.' : (m || 'No se pudo guardar.'));
    } finally { setSaving(false); }
  };

  return (
    <Drawer title="Diseño y textos" subtitle={form.name} icon={Palette} width="max-w-lg" onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={save} disabled={saving} className={primaryBtn}>{saving ? 'Guardando…' : 'Guardar'}</button>
          <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
          <button type="button" onClick={() => setPreview(true)} className="ml-auto flex items-center gap-1 px-3 py-2 text-brand-ice text-sm hover:underline"><Eye size={13} /> Vista previa</button>
        </>
      )}>
      <div className="space-y-6">
        {error && <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

        <section className="space-y-2">
          <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Link</div>
          <div className="flex items-center rounded-xl border border-brand-border bg-brand-bg overflow-hidden focus-within:border-brand-violet">
            <span className="pl-3 pr-1 text-xs font-tech text-brand-muted whitespace-nowrap">crm.bitproximity.com/public/</span>
            <input aria-label="Link corto" value={slug} placeholder="bitmusic" onChange={(e) => setSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} className="flex-1 min-w-0 bg-transparent py-2.5 pr-3 text-sm text-brand-white font-tech focus:outline-none" />
          </div>
          <p className="text-[11px] text-brand-muted">Letras, números y guiones. El link anterior deja de funcionar si lo cambias.</p>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Textos</div>
          <Field label="Título"><input className={inputCls} value={s.title || ''} placeholder={form.name} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Descripción"><textarea rows={2} className={inputCls} value={s.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Mensaje al enviar"><textarea rows={2} className={inputCls} value={s.thank_you || ''} placeholder="Recibimos tu información y te vamos a contactar pronto." onChange={(e) => set('thank_you', e.target.value)} /></Field>
          <Field label="Texto del botón"><input className={inputCls} value={s.submit_label || ''} placeholder="Enviar" onChange={(e) => set('submit_label', e.target.value)} /></Field>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Marca</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre de la marca"><input className={inputCls} value={t.brand_name || ''} onChange={(e) => setIn('theme', 'brand_name', e.target.value)} /></Field>
            <Field label="Logo (URL)"><input className={inputCls} value={t.logo_url || ''} placeholder="https://…/logo.png o /brands/…" onChange={(e) => setIn('theme', 'logo_url', e.target.value)} /></Field>
          </div>
          {t.logo_url && /^(https:\/\/|\/[^/])/.test(t.logo_url) && <div className="rounded-xl p-3 flex justify-center" style={{ background: t.background }}><img src={t.logo_url} alt="Logo" className="h-8 w-auto" /></div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ColorInput label="Principal" value={t.primary} onChange={(v) => setIn('theme', 'primary', v)} />
            <ColorInput label="Secundario" value={t.secondary} onChange={(v) => setIn('theme', 'secondary', v)} />
            <ColorInput label="Acento" value={t.accent} onChange={(v) => setIn('theme', 'accent', v)} />
            <ColorInput label="Fondo" value={t.background} onChange={(v) => setIn('theme', 'background', v)} />
            <ColorInput label="Tarjeta" value={t.card} onChange={(v) => setIn('theme', 'card', v)} />
          </div>
          <button type="button" onClick={() => set('theme', { brand_name: t.brand_name, logo_url: t.logo_url, ...DEFAULT_THEME })} className="text-[11px] text-brand-muted hover:text-brand-ice">Volver a los colores de Bit Proximity</button>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Datos de contacto</div>
          {[['name', 'Nombre'], ['email', 'Correo'], ['phone', 'Teléfono'], ['company', 'Empresa']].map(([k, def]) => (
            <div key={k} className="flex items-center gap-3">
              <input className={`${inputCls} flex-1`} aria-label={`Pregunta para ${def}`} value={s.labels[k] || ''} placeholder={def} onChange={(e) => setIn('labels', k, e.target.value)} />
              {k === 'name'
                ? <span className="text-[11px] text-brand-muted w-24">Siempre obligatorio</span>
                : <label className="flex items-center gap-1.5 text-[11px] text-brand-muted w-24"><input type="checkbox" checked={!!s.required[k]} onChange={(e) => setIn('required', k, e.target.checked)} className="accent-[#8500FF]" /> Obligatorio</label>}
            </div>
          ))}
          <Toggle on={s.hide_message} onChange={(v) => set('hide_message', v)} label="Ocultar el campo «Mensaje»" />
        </section>

        {fields.length > 0 && (
          <section className="space-y-2">
            <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted">Preguntas</div>
            {fields.map((f) => (
              <div key={f.id} className="rounded-xl border border-brand-border p-3 space-y-2">
                <div className="text-sm text-brand-white">{f.label}</div>
                <div className="flex gap-4 flex-wrap text-[11px] text-brand-muted">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={s.required_field_ids.includes(f.id)} onChange={(e) => toggleId('required_field_ids', f.id, e.target.checked)} className="accent-[#8500FF]" /> Obligatoria</label>
                  {f.field_type === 'text' && <label className="flex items-center gap-1.5"><input type="checkbox" checked={s.long_field_ids.includes(f.id)} onChange={(e) => toggleId('long_field_ids', f.id, e.target.checked)} className="accent-[#8500FF]" /> Respuesta larga</label>}
                </div>
                <input className={`${inputCls} text-xs py-1.5`} aria-label={`Ayuda para ${f.label}`} value={s.hints[f.id] || ''} placeholder="Texto de ayuda (opcional), ej. «Ejemplo: energía, diversión»" onChange={(e) => setIn('hints', f.id, e.target.value)} />
              </div>
            ))}
          </section>
        )}

        <section className="space-y-1">
          <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-1">Al recibir una respuesta</div>
          <Field label="Avisar por correo a">
            <input
              className={inputCls}
              aria-label="Avisar por correo a"
              value={notifyText}
              placeholder="mario@bitproximity.com, ventas@bitproximity.com"
              onChange={(e) => { setNotifyText(e.target.value); set('notify_emails', e.target.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)); }}
            />
          </Field>
          <p className="text-[11px] text-brand-muted pb-2">Separa varios correos con comas. Al responsable del trato también le llega siempre. Déjalo vacío para no avisar a nadie más.</p>
          <Toggle on={s.match_existing} onChange={(v) => set('match_existing', v)} label="Si el cliente ya tiene un trato en este pipeline, guardar ahí las respuestas"
            hint="Busca por correo y por empresa. Usa el trato abierto o, si no hay, el último ganado; si no tiene, crea uno nuevo." />
        </section>
      </div>
      {preview && <LeadFormPreview form={toViewForm(form, fields, s)} onClose={() => setPreview(false)} />}
    </Drawer>
  );
}

export function iframeSnippet(publicUrl, title) {
  return `<iframe src="${publicUrl}" title="${String(title || 'Formulario').replace(/"/g, '&quot;')}" style="width:100%;max-width:680px;height:1600px;border:0;border-radius:24px" loading="lazy"></iframe>`;
}

