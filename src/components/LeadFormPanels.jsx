import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, Palette, Eye, X, ExternalLink, ChevronDown, ChevronRight, Inbox, Sparkles, Link2, Trophy, CalendarDays } from 'lucide-react';
import { api } from '../lib/api';
import { Drawer, Field, inputCls, primaryBtn, ghostBtn } from './Modal';
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

function ResponseRow({ r, fields, labels }) {
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
          {r.deal && <Link to={`/deals/${r.deal.id}`} className="inline-flex items-center gap-1 text-xs text-brand-ice hover:underline"><ExternalLink size={12} /> {r.deal.title}{r.deal.stage ? ` · ${r.deal.stage}` : ''}</Link>}
        </div>
      )}
    </div>
  );
}

export function ResponsesDrawer({ form, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { api.get(`/api/lead-forms/${form.id}/responses`).then(setData).catch((e) => setError(e.message || 'No se pudieron cargar las respuestas.')); }, [form.id]);

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
      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
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
              <div className="space-y-2">{rows.map((r) => <ResponseRow key={r.id} r={r} fields={data.fields} labels={data.form.settings?.labels || {}} />)}</div>
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
      await api.patch(`/api/lead-forms/${form.id}`, { settings: s });
      onSaved?.(); onClose();
    } catch (e) {
      setError(/settings/.test(e.message || '') ? 'Falta correr el script 066 en Supabase para guardar el diseño.' : (e.message || 'No se pudo guardar.'));
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
            <Field label="Logo (URL https)"><input className={inputCls} value={t.logo_url || ''} placeholder="https://…/logo.png" onChange={(e) => setIn('theme', 'logo_url', e.target.value)} /></Field>
          </div>
          {t.logo_url && /^https:\/\//.test(t.logo_url) && <div className="rounded-xl p-3 flex justify-center" style={{ background: t.background }}><img src={t.logo_url} alt="Logo" className="h-8 w-auto" /></div>}
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

