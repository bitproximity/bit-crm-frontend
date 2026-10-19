// Crear una actividad (llamada, reunión, email…). Reemplaza la barra de una sola línea: tipo con
// íconos, fechas rápidas, link de la reunión (va al evento de Google Calendar), trato relacionado y notas.
import { useEffect, useRef, useState } from 'react';
import { Phone, Mail, Users, MessageCircle, StickyNote, CheckSquare, RefreshCcw, CalendarPlus, Search, X, Sun, Sunrise, CalendarClock, Video } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';
import DateTimePicker from './DateTimePicker';
import MeetingLinkField from './MeetingLinkField';
import { useOutsideClick } from '../hooks/useOutsideClick';

export const ACTIVITY_TYPES = [
  { key: 'llamada', label: 'Llamada', icon: Phone, ph: 'Ej. Llamar a Juan Pérez' },
  { key: 'reunion', label: 'Reunión', icon: Users, ph: 'Ej. Demo con Grupo Ramos' },
  { key: 'email', label: 'Email', icon: Mail, ph: 'Ej. Enviar propuesta a Ana' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, ph: 'Ej. Escribir a Carlos por WhatsApp' },
  { key: 'followup', label: 'Follow up', icon: RefreshCcw, ph: 'Ej. Follow up: Juan Pérez' },
  { key: 'tarea', label: 'Tarea', icon: CheckSquare, ph: 'Ej. Preparar contrato' },
  { key: 'nota', label: 'Nota', icon: StickyNote, ph: 'Ej. Resumen de la llamada' },
];
const WITH_LINK = new Set(['reunion', 'llamada', 'followup']);

// Fechas rápidas, calculadas al abrir. Siempre en hora local de quien las usa.
export function quickDates(now = new Date()) {
  const at = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  const list = [];
  const later = new Date(now); later.setMinutes(0, 0, 0); later.setHours(later.getHours() + 2);
  if (later.getDate() === now.getDate()) list.push({ key: 'hoy', label: 'Hoy', hint: later.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }), icon: Sun, date: later });
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  list.push({ key: 'manana', label: 'Mañana', hint: '9:00', icon: Sunrise, date: at(tomorrow, 9) });
  const monday = new Date(now); monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
  list.push({ key: 'lunes', label: 'Lunes', hint: '9:00', icon: CalendarClock, date: at(monday, 9) });
  const week = new Date(now); week.setDate(week.getDate() + 7);
  list.push({ key: 'semana', label: 'En 1 semana', hint: '9:00', icon: CalendarClock, date: at(week, 9) });
  return list;
}

export default function NewActivityModal({ onClose, onCreated, presetDeal = null }) {
  const [type, setType] = useState('llamada');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [quickKey, setQuickKey] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dealQuery, setDealQuery] = useState(presetDeal?.title || '');
  const [dealResults, setDealResults] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(presetDeal);
  const dealBoxRef = useRef(null);
  useOutsideClick(dealBoxRef, () => setDealResults([]), dealResults.length > 0);
  const quick = useRef(quickDates()).current;
  const meta = ACTIVITY_TYPES.find((t) => t.key === type);

  useEffect(() => {
    if (!dealQuery.trim() || selectedDeal?.title === dealQuery) { setDealResults([]); return undefined; }
    const t = setTimeout(() => {
      api.get(`/api/deals?search=${encodeURIComponent(dealQuery.trim())}&limit=6`)
        .then((res) => setDealResults(Array.isArray(res) ? res : res.data || []))
        .catch(() => setDealResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dealQuery]);

  const pickQuick = (q) => { setQuickKey(q.key); setDueDate(q.date.toISOString()); };

  const submit = async (e) => {
    e?.preventDefault();
    if (!title.trim() || saving) return;
    setError('');
    setSaving(true);
    try {
      const due = dueDate ? new Date(dueDate).toISOString() : null;
      const payload = {
        title: title.trim(),
        type,
        due_date: due,
        summary: notes.trim() || title.trim(),
        occurred_at: due || new Date().toISOString(),
      };
      if (WITH_LINK.has(type) && meetingUrl) payload.meeting_url = meetingUrl;
      if (selectedDeal?.id) { payload.entity_type = 'deal'; payload.entity_id = selectedDeal.id; }
      const created = await api.post('/api/activities', payload);
      onCreated?.(created);
    } catch (err) {
      setError(err.message || 'No se pudo crear la actividad.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nueva actividad"
      subtitle="Programa una llamada, reunión o tarea y llévala a tu calendario"
      icon={CalendarPlus}
      onClose={onClose}
      width="max-w-xl"
      footer={(
        <>
          <button type="button" onClick={submit} disabled={!title.trim() || saving} className={primaryBtn}>{saving ? 'Creando...' : 'Crear actividad'}</button>
          <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
          {error && <span className="text-xs text-red-300 ml-2">{error}</span>}
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tipo">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5" role="radiogroup" aria-label="Tipo de actividad">
            {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key} type="button" role="radio" aria-checked={type === key}
                onClick={() => setType(key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] transition ${type === key ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}
              >
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Asunto">
          <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.ph} className={inputCls} />
        </Field>

        <Field label="Cuándo">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quick.map((q) => {
              const Icon = q.icon;
              const active = quickKey === q.key;
              return (
                <button key={q.key} type="button" onClick={() => pickQuick(q)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition ${active ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}>
                  <Icon size={12} /> {q.label} <span className="font-tech text-[10px] opacity-70">{q.hint}</span>
                </button>
              );
            })}
          </div>
          <DateTimePicker value={dueDate} onChange={(v) => { setDueDate(v); setQuickKey(''); }} className="w-full" />
        </Field>

        {WITH_LINK.has(type) && (
          <Field label={<span className="inline-flex items-center gap-1.5"><Video size={12} /> Link de la reunión <span className="normal-case text-brand-muted/70">(opcional)</span></span>}>
            <MeetingLinkField value={meetingUrl} onDraft={setMeetingUrl} onSave={setMeetingUrl} />
          </Field>
        )}

        <div className="relative" ref={dealBoxRef}>
          <Field label="Relacionado con (trato)">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                value={dealQuery}
                onChange={(e) => { setDealQuery(e.target.value); setSelectedDeal(null); }}
                placeholder="Buscar trato..."
                className={`${inputCls} pl-10 ${selectedDeal ? 'pr-9' : ''}`}
              />
              {selectedDeal && (
                <button type="button" aria-label="Quitar trato" onClick={() => { setSelectedDeal(null); setDealQuery(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-white"><X size={14} /></button>
              )}
            </div>
          </Field>
          {dealResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in max-h-44 overflow-y-auto">
              {dealResults.map((d) => (
                <button key={d.id} type="button" onClick={() => { setSelectedDeal(d); setDealQuery(d.title); setDealResults([]); }} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition truncate">
                  {d.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <Field label="Notas (opcional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contexto, temas a tratar, lo que hay que llevar…" className={`${inputCls} resize-y min-h-[76px]`} />
        </Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
