// Crear una tarea. Reemplaza el formulario en línea: título grande, proyecto con buscador, fechas
// rápidas, prioridad, responsable en chips y link de la reunión (va al evento de Google Calendar).
// «Crear y añadir otra» deja abierta la ventana con proyecto, responsable y prioridad ya puestos.
import { useRef, useState } from 'react';
import { CheckSquare, Search, X, FolderKanban, Flag, Video, UserRound, Calendar, Info } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';
import DateTimePicker from './DateTimePicker';
import MeetingLinkField from './MeetingLinkField';
import { quickDates } from './NewActivityModal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { colorForName, initials } from '../lib/avatar';

const PRIORITIES = [
  { key: 'baja', label: 'Baja', color: 'text-brand-muted' },
  { key: 'media', label: 'Media', color: 'text-brand-ice' },
  { key: 'alta', label: 'Alta', color: 'text-yellow-400' },
  { key: 'urgente', label: 'Urgente', color: 'text-red-400' },
];

function Dot({ name }) {
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-tech font-bold text-white flex-shrink-0" style={{ background: colorForName(name) }}>
      {initials(name)}
    </span>
  );
}

export default function NewTaskModal({ projects = [], team = [], presetProjectId = '', onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(presetProjectId || '');
  const [projectQuery, setProjectQuery] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [quickKey, setQuickKey] = useState('');
  const [priority, setPriority] = useState('media');
  const [assigneeId, setAssigneeId] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const projectBoxRef = useRef(null);
  const titleRef = useRef(null);
  useOutsideClick(projectBoxRef, () => { setProjectOpen(false); setProjectQuery(''); }, projectOpen);
  const quick = useRef(quickDates()).current;

  const project = projects.find((p) => p.id === projectId);
  const assignee = team.find((m) => m.id === assigneeId);
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(projectQuery.toLowerCase()));

  const save = async (another) => {
    if (!title.trim() || saving) return;
    setError('');
    setSaving(true);
    try {
      const due = dueDate ? new Date(dueDate) : null;
      const payload = {
        title: title.trim(),
        due_date: due && !Number.isNaN(due.getTime()) ? due.toISOString() : null,
        assignee_id: assigneeId || null,
        project_id: projectId || null,
        priority,
      };
      if (meetingUrl) payload.meeting_url = meetingUrl;
      const created = await api.post('/api/tasks', payload);
      onCreated?.(created, { another });
      if (another) {
        // Se queda abierta: se limpia lo propio de cada tarea y se conserva proyecto, responsable y prioridad.
        setTitle(''); setDueDate(''); setQuickKey(''); setMeetingUrl('');
        setCreatedCount((n) => n + 1);
        setSaving(false);
        setTimeout(() => titleRef.current?.focus(), 0);
      }
    } catch (err) {
      setError(err.message || 'No se pudo crear la tarea.');
      setSaving(false);
    }
  };

  const submit = (e) => { e.preventDefault(); save(false); };

  return (
    <Modal
      title="Nueva tarea"
      subtitle={createdCount > 0 ? `${createdCount} ${createdCount === 1 ? 'creada' : 'creadas'} en esta sesión` : 'Asigna, prioriza y ponle fecha'}
      icon={CheckSquare}
      onClose={onClose}
      width="max-w-xl"
      footer={(
        <>
          <button type="button" onClick={() => save(false)} disabled={!title.trim() || saving} className={primaryBtn}>{saving ? 'Creando...' : 'Crear tarea'}</button>
          <button type="button" onClick={() => save(true)} disabled={!title.trim() || saving} className="whitespace-nowrap px-4 py-2.5 rounded-xl text-sm border border-brand-border hover:border-brand-violet text-brand-ice disabled:opacity-40 transition">Crear y añadir otra</button>
          <button type="button" onClick={onClose} className={`${ghostBtn} ml-auto`}>{createdCount > 0 ? 'Listo' : 'Cancelar'}</button>
          {error && <span className="text-xs text-red-300 ml-1">{error}</span>}
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="¿Qué hay que hacer?">
          <input
            ref={titleRef} autoFocus required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Enviar propuesta a Grupo Ramos"
            className={`${inputCls} text-base py-3`}
          />
        </Field>

        <div className="relative" ref={projectBoxRef}>
          <Field label="Proyecto">
            {project && !projectOpen ? (
              <button type="button" onClick={() => { setProjectOpen(true); setProjectQuery(''); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm hover:border-brand-violet transition text-left">
                <FolderKanban size={15} className="text-brand-ice flex-shrink-0" />
                <span className="flex-1 truncate">{project.name}</span>
                <span role="button" tabIndex={0} aria-label="Quitar proyecto" onClick={(e) => { e.stopPropagation(); setProjectId(''); }} className="p-0.5 text-brand-muted hover:text-brand-white"><X size={14} /></span>
              </button>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  value={projectQuery}
                  onChange={(e) => { setProjectQuery(e.target.value); setProjectOpen(true); }}
                  onFocus={() => setProjectOpen(true)}
                  placeholder="Sin proyecto — busca uno para vincularla"
                  autoComplete="off"
                  className={`${inputCls} pl-10`}
                />
              </div>
            )}
          </Field>
          {projectOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in">
              <button type="button" onClick={() => { setProjectId(''); setProjectOpen(false); setProjectQuery(''); }} className="w-full text-left px-3.5 py-2.5 text-sm text-brand-muted hover:bg-brand-panel transition">Sin proyecto</button>
              {filteredProjects.map((p) => (
                <button key={p.id} type="button" onClick={() => { setProjectId(p.id); setProjectOpen(false); setProjectQuery(''); }} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition truncate">{p.name}</button>
              ))}
              {projectQuery && filteredProjects.length === 0 && <div className="px-3.5 py-2.5 text-xs text-brand-muted">Sin resultados para «{projectQuery}».</div>}
            </div>
          )}
        </div>

        <Field label={<span className="inline-flex items-center gap-1.5"><Calendar size={12} /> Fecha y hora límite</span>}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quick.map((q) => {
              const Icon = q.icon;
              const active = quickKey === q.key;
              return (
                <button key={q.key} type="button" onClick={() => { setQuickKey(q.key); setDueDate(q.date.toISOString()); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition ${active ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}>
                  <Icon size={12} /> {q.label} <span className="font-tech text-[10px] opacity-70">{q.hint}</span>
                </button>
              );
            })}
          </div>
          <DateTimePicker value={dueDate} onChange={(v) => { setDueDate(v); setQuickKey(''); }} className="w-full" />
        </Field>

        <Field label={<span className="inline-flex items-center gap-1.5"><Flag size={12} /> Prioridad</span>}>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Prioridad">
            {PRIORITIES.map((p) => (
              <button key={p.key} type="button" role="radio" aria-checked={priority === p.key} onClick={() => setPriority(p.key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs transition ${priority === p.key ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}>
                <Flag size={12} className={p.color} /> {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={<span className="inline-flex items-center gap-1.5"><UserRound size={12} /> Responsable</span>}>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Responsable">
            <button type="button" role="radio" aria-checked={!assigneeId} onClick={() => setAssigneeId('')}
              className={`px-3 py-1.5 rounded-full border text-xs transition ${!assigneeId ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}>
              Sin asignar
            </button>
            {team.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={assigneeId === m.id} onClick={() => setAssigneeId(m.id)}
                className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border text-xs transition ${assigneeId === m.id ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-white'}`}>
                <Dot name={m.full_name} /> {m.full_name}
              </button>
            ))}
          </div>
          {assignee && dueDate && (
            <p className="flex items-start gap-1.5 text-[11px] text-brand-muted mt-2"><Info size={12} className="mt-0.5 flex-shrink-0" /> Con fecha y responsable, la tarea aparece en el Google Calendar de {assignee.full_name} si tiene Google conectado.</p>
          )}
        </Field>

        <Field label={<span className="inline-flex items-center gap-1.5"><Video size={12} /> Link de la reunión <span className="normal-case text-brand-muted/70">(opcional)</span></span>}>
          <MeetingLinkField key={createdCount} value={meetingUrl} onDraft={setMeetingUrl} onSave={setMeetingUrl} />
        </Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
