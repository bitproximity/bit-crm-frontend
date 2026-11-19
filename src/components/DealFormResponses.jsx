import { useState } from 'react';
import { ClipboardCheck, ChevronDown, Mail, Phone, Building2, User } from 'lucide-react';

// Pestaña «Respuestas» del trato: todo lo que el cliente respondió en los formularios, completo,
// con la última respuesta primero. Una tarjeta por envío, con el logo del formulario.
const fmt = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Submission({ s, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const c = s.contact || {};
  return (
    <article className="rounded-2xl border border-brand-border bg-brand-bg/40 overflow-hidden" aria-label={`Respuesta de ${s.form.name}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[.02] transition">
        <span className="w-16 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5" style={{ background: s.form.background || '#080712' }}>
          {s.form.logo_url ? <img src={s.form.logo_url} alt={s.form.brand_name || ''} className="max-w-[52px] max-h-6 object-contain" /> : <ClipboardCheck size={15} className="text-brand-ice" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-brand-white truncate">{s.form.name}</span>
          <span className="block text-[11px] text-brand-muted">{fmt(s.created_at)} · {s.answers.length} respuesta{s.answers.length === 1 ? '' : 's'}</span>
        </span>
        <ChevronDown size={15} className={`text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-brand-muted pb-3 mb-3 border-b border-brand-border/70">
            {c.name && <span className="flex items-center gap-1.5"><User size={12} /> {c.name}</span>}
            {c.company && <span className="flex items-center gap-1.5"><Building2 size={12} /> {c.company}</span>}
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-brand-ice"><Mail size={12} /> {c.email}</a>}
            {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-brand-ice"><Phone size={12} /> {c.phone}</a>}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {s.answers.map((a) => (
              <div key={a.field_id} className={`rounded-xl bg-brand-panel border border-brand-border/70 px-3.5 py-2.5 ${a.value.length > 60 ? 'sm:col-span-2' : ''}`}>
                <dt className="text-[11px] text-brand-muted leading-snug">{a.label}</dt>
                <dd className="text-sm text-brand-white mt-1 whitespace-pre-wrap break-words">{a.value}</dd>
              </div>
            ))}
            {s.message && (
              <div className="rounded-xl bg-brand-panel border border-brand-border/70 px-3.5 py-2.5 sm:col-span-2">
                <dt className="text-[11px] text-brand-muted">Mensaje</dt>
                <dd className="text-sm text-brand-white mt-1 whitespace-pre-wrap">{s.message}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </article>
  );
}

export default function DealFormResponses({ submissions }) {
  if (!submissions?.length) {
    return <p className="text-sm text-brand-muted py-8 text-center border border-dashed border-brand-border rounded-2xl">Este cliente todavía no respondió ningún formulario. Mándale su link desde Formularios → «Link para un trato».</p>;
  }
  return <div className="space-y-3">{submissions.map((s, i) => <Submission key={s.id} s={s} defaultOpen={i === 0} />)}</div>;
}
