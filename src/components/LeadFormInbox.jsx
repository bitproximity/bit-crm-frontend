import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle2, ArrowRightLeft, ExternalLink, Sparkles, ChevronDown, Mail, Phone, Building2, User, X, Check, Loader2, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useConfirm } from './ConfirmModal';
import { DealPicker } from './LeadFormPanels';

// Bandeja de respuestas: todas las respuestas de los formularios, separadas por formulario, para
// revisarlas una por una y dejarlas en el trato que corresponde. Para las que están por asignar,
// el CRM sugiere los otros tratos de la misma empresa (en cualquier pipeline).

const STATUS = { abierto: ['Abierto', 'text-brand-ice bg-brand-violet/15'], ganado: ['Ganado', 'text-green-300 bg-green-500/15'], perdido: ['Perdido', 'text-red-300 bg-red-500/10'] };
const fmt = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const money = (d) => (d.value ? `${d.currency || 'USD'} ${Number(d.value).toLocaleString('es')}` : null);
const dealLine = (d) => [d.pipeline, d.stage, money(d)].filter(Boolean).join(' · ');

function Logo({ form, size = 'md' }) {
  const box = size === 'sm' ? 'w-12 h-7' : 'w-16 h-10';
  return (
    <span className={`${box} rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5`} style={{ background: form.background || '#080712' }}>
      {form.logo_url ? <img src={form.logo_url} alt="" className="max-w-[80%] max-h-[60%] object-contain" /> : <Inbox size={14} className="text-brand-ice" />}
    </span>
  );
}

function ResponseCard({ r, onAssign, onReview, busy }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const c = r.contact;
  const st = r.deal && STATUS[r.deal.status];
  const shown = open ? r.answers : r.answers.slice(0, 3);
  return (
    <article className={`bg-brand-panel border rounded-2xl panel-depth transition ${r.reviewed ? 'border-brand-border' : 'border-brand-violet/40'}`} aria-label={`Respuesta de ${c.company || c.name}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Logo form={r.form} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline font-semibold text-[15px] truncate">{c.company || c.name}</h3>
              {!r.reviewed
                ? <span className="text-[10px] font-tech uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Por asignar</span>
                : <span className="text-[10px] font-tech uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 flex items-center gap-1"><Check size={10} /> Asignada</span>}
            </div>
            <div className="text-[11px] text-brand-muted mt-0.5">{r.form.name} · {fmt(r.created_at)}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted mt-2">
              {c.name && <span className="flex items-center gap-1.5"><User size={11} /> {c.name}</span>}
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-brand-ice"><Mail size={11} /> {c.email}</a>}
              {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-brand-ice"><Phone size={11} /> {c.phone}</a>}
            </div>
          </div>
        </div>

        {r.answers.length > 0 && (
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {shown.map((a) => (
              <div key={a.field_id} className={`rounded-xl bg-brand-bg/60 border border-brand-border/70 px-3 py-2 ${a.value.length > 70 ? 'sm:col-span-2' : ''}`}>
                <dt className="text-[11px] text-brand-muted leading-snug">{a.label}</dt>
                <dd className={`text-sm text-brand-white mt-0.5 whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-2'}`}>{a.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {r.answers.length > 3 && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-xs text-brand-ice hover:underline flex items-center gap-1">
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} /> {open ? 'Ver menos' : `Ver las ${r.answers.length} respuestas`}
          </button>
        )}

        {/* Trato actual */}
        <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg/40 px-3.5 py-3">
          <div className="text-[10px] font-tech uppercase tracking-wide text-brand-muted mb-1.5">{r.reviewed ? 'Está en el trato' : r.matched_existing ? 'Se asoció a' : 'El formulario creó el trato'}</div>
          {r.deal ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/deals/${r.deal.id}?tab=respuestas`} className="text-sm text-brand-white hover:text-brand-ice font-medium flex items-center gap-1.5"><ExternalLink size={13} /> {r.deal.title}</Link>
              {st && <span className={`text-[10px] px-2 py-0.5 rounded-md ${st[1]}`}>{st[0]}</span>}
              <span className="text-[11px] text-brand-muted">{dealLine(r.deal)}</span>
            </div>
          ) : <span className="text-sm text-brand-muted">Sin trato</span>}
        </div>

        {/* Sugerencias: otros tratos de la misma empresa */}
        {!r.reviewed && r.suggestions.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-brand-ice mb-2"><Sparkles size={12} /> {r.contact.company || 'Esta empresa'} ya tiene {r.suggestions.length === 1 ? 'otro trato' : `${r.suggestions.length} tratos`}. ¿Va en alguno de estos?</div>
            <div className="space-y-1.5">
              {r.suggestions.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-brand-violet/30 bg-brand-violet/5 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-brand-white truncate">{d.title}</div>
                    <div className="text-[11px] text-brand-muted truncate">{[dealLine(d), STATUS[d.status]?.[0]].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => onAssign(r, d)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 disabled:opacity-50">
                    <ArrowRightLeft size={12} /> Asignar aquí
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {picking && (
          <div className="mt-3 rounded-xl border border-brand-violet/40 bg-brand-violet/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-brand-white">Busca el trato al que va esta respuesta</span>
              <button type="button" onClick={() => setPicking(false)} aria-label="Cancelar" className="text-brand-muted hover:text-white"><X size={14} /></button>
            </div>
            <DealPicker pipelineId={null} excludeId={r.deal?.id} onPick={(d) => { setPicking(false); onAssign(r, d); }} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {!picking && (
            <button type="button" disabled={busy} onClick={() => setPicking(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs bg-brand-bg border border-brand-border hover:border-brand-violet transition disabled:opacity-50">
              <ArrowRightLeft size={13} className="text-brand-ice" /> {r.reviewed ? 'Mover a otro trato' : 'Asignar a otro trato'}
            </button>
          )}
          {!r.reviewed ? (
            <button type="button" disabled={busy} onClick={() => onReview(r, true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs bg-brand-bg border border-brand-border hover:border-green-500/50 transition disabled:opacity-50">
              <CheckCircle2 size={13} className="text-green-400" /> {r.matched_existing ? 'Está bien así' : 'Dejar como trato nuevo'}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => onReview(r, false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-brand-muted hover:text-white transition disabled:opacity-50">
              <RotateCcw size={12} /> Volver a «Por asignar»
            </button>
          )}
          {busy && <Loader2 size={14} className="animate-spin text-brand-muted" />}
        </div>
      </div>
    </article>
  );
}

export default function LeadFormInbox() {
  const [formId, setFormId] = useState('');
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const confirm = useConfirm();

  const load = () => {
    const qs = new URLSearchParams({ status });
    if (formId) qs.set('form_id', formId);
    return api.get(`/api/lead-forms/inbox?${qs}`).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message || 'No se pudo cargar la bandeja.'));
  };
  useEffect(() => { load(); }, [formId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const assign = async (r, deal) => {
    setBusyId(r.id); setError('');
    try {
      const res = await api.post(`/api/lead-forms/submissions/${r.id}/assign`, { deal_id: deal.id });
      setNotice({ text: `La respuesta de ${r.contact.company || r.contact.name} quedó en «${deal.title}».`, autoDealId: res.previous_was_auto_created ? res.previous_deal_id : null, autoDealTitle: r.deal?.title });
      await load();
    } catch (e) { setError(e.message || 'No se pudo asignar.'); }
    finally { setBusyId(null); }
  };
  const review = async (r, reviewed) => {
    setBusyId(r.id); setError('');
    try {
      await api.post(`/api/lead-forms/submissions/${r.id}/review`, { reviewed });
      setNotice({ text: reviewed ? `Listo: la respuesta de ${r.contact.company || r.contact.name} queda en «${r.deal?.title || 'su trato'}».` : 'Volvió a «Por asignar».' });
      await load();
    } catch (e) { setError(e.message || 'No se pudo guardar.'); }
    finally { setBusyId(null); }
  };
  const deleteAutoDeal = async () => {
    const ok = await confirm({ title: 'Borrar trato duplicado', message: `¿Borrar «${notice.autoDealTitle}»? Lo creó el formulario y ya no tiene la respuesta. El contacto y la empresa no se tocan.`, confirmLabel: 'Borrar', danger: true });
    if (!ok) return;
    try { await api.delete(`/api/deals/${notice.autoDealId}`); setNotice({ text: 'Listo: el trato duplicado se borró.' }); } catch (e) { setError(e.message || 'No se pudo borrar el trato.'); }
  };

  const counts = data?.counts || { pending: 0, total: 0 };
  const forms = data?.forms || [];
  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Formulario">
        <button type="button" role="tab" aria-selected={!formId} onClick={() => setFormId('')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm whitespace-nowrap transition ${!formId ? 'border-brand-violet bg-brand-violet/15 text-white' : 'border-brand-border bg-brand-panel text-brand-muted hover:text-white'}`}>
          <Inbox size={14} /> Todos {counts.pending > 0 && <span className="text-[10px] font-tech px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">{counts.pending}</span>}
        </button>
        {forms.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={formId === f.id} onClick={() => setFormId(f.id)}
            className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-xl border text-sm whitespace-nowrap transition ${formId === f.id ? 'border-brand-violet bg-brand-violet/15 text-white' : 'border-brand-border bg-brand-panel text-brand-muted hover:text-white'}`}>
            <Logo form={f} size="sm" />
            <span className="max-w-[200px] truncate">{f.name}</span>
            <span className="text-[10px] font-tech text-brand-muted">{f.total}</span>
            {f.pending > 0 && <span className="text-[10px] font-tech px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">{f.pending}</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-brand-panel border border-brand-border rounded-lg p-1 w-fit" role="group" aria-label="Estado">
        {[['pending', 'Por asignar'], ['done', 'Asignadas'], ['all', 'Todas']].map(([k, label]) => (
          <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${status === k ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>{label}</button>
        ))}
      </div>

      {data && data.review_supported === false && (
        <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs">Para poder marcar respuestas como revisadas, corre el script 068 en Supabase. Mientras tanto, «Por asignar» muestra las que crearon un trato nuevo.</div>
      )}
      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
      {notice && (
        <div role="status" className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 text-sm flex items-center gap-3 flex-wrap">
          <span className="flex-1">{notice.text}</span>
          {notice.autoDealId && <button type="button" onClick={deleteAutoDeal} className="text-xs px-2.5 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10">Borrar el trato que se había creado</button>}
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-green-200/70 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {!data && !error && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>}
      {data && data.rows.length === 0 && (
        <div className="text-center py-14 border border-dashed border-brand-border rounded-2xl">
          <CheckCircle2 size={26} className="mx-auto text-green-400 mb-2" />
          <p className="text-sm text-brand-white">{status === 'pending' ? 'Nada por asignar.' : 'Sin respuestas.'}</p>
          <p className="text-xs text-brand-muted mt-1">{status === 'pending' ? 'Cada respuesta nueva aparece aquí hasta que la dejes en su trato.' : 'Cuando un cliente responda, aparece aquí.'}</p>
        </div>
      )}
      {data && data.rows.length > 0 && (
        <div className="space-y-3">{data.rows.map((r) => <ResponseCard key={r.id} r={r} busy={busyId === r.id} onAssign={assign} onReview={review} />)}</div>
      )}
    </div>
  );
}
