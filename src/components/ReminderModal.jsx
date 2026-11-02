// Recordatorio de pago para una factura vencida: borrador listo (español / inglés), editable,
// para copiar o abrir directo en el correo.
import { useEffect, useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';

export default function ReminderModal({ invoice, onClose }) {
  const [lang, setLang] = useState(invoice.source_account === 'BitProximity LLC' ? 'en' : 'es');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/invoices/${invoice.id}/reminder?lang=${lang}`)
      .then((r) => { setTo((cur) => cur || r.to || ''); setSubject(r.subject); setBody(r.body); setError(''); })
      .catch((e) => setError(e.message || 'No se pudo preparar el recordatorio.'))
      .finally(() => setLoading(false));
  }, [invoice.id, lang]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sin portapapeles */ }
  };
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Modal title="Recordatorio de pago" subtitle={`Factura ${invoice.invoice_number || ''} · ${invoice.client_name || invoice.companies?.name || ''}`} icon={Mail} onClose={onClose} width="max-w-xl">
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {[['es', 'Español'], ['en', 'English']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setLang(k)} className={`px-3 py-1 rounded-full text-xs ${lang === k ? 'bg-brand-violet/20 text-brand-ice' : 'text-brand-muted border border-brand-border'}`}>{label}</button>
          ))}
        </div>
        {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
        <Field label="Para">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="correo@cliente.com" className={inputCls} />
        </Field>
        <Field label="Asunto">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} disabled={loading} />
        </Field>
        <Field label="Mensaje">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${inputCls} font-manrope`} disabled={loading} />
        </Field>
        {!to && !loading && <p className="text-xs text-yellow-300">No encontré el correo del cliente: escríbelo o cópialo desde su ficha.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={copy} className={`${ghostBtn} flex items-center gap-1.5`} disabled={loading}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar texto'}
          </button>
          <a href={mailto} onClick={onClose} className={`${primaryBtn} flex items-center gap-1.5 ${!to || loading ? 'pointer-events-none opacity-50' : ''}`}>
            <Mail size={14} /> Abrir en mi correo
          </a>
        </div>
      </div>
    </Modal>
  );
}
