import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Phone, Mail, Users, MessageCircle, StickyNote, CheckSquare, Plus, Check } from 'lucide-react';

const TYPE_ICONS = {
  llamada: Phone, email: Mail, reunion: Users, whatsapp: MessageCircle, nota: StickyNote, tarea: CheckSquare,
};
const TYPE_LABELS = {
  llamada: 'Llamada', email: 'Email', reunion: 'Reunión', whatsapp: 'WhatsApp', nota: 'Nota', tarea: 'Tarea',
};

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('pendiente'); // pendiente | vencida | completada
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'llamada', due_date: '', summary: '' });

  const load = () => api.get(`/api/activities?status=${tab}`).then(setActivities).catch(console.error);

  useEffect(() => {
    load();
  }, [tab]);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/api/activities', {
      title: form.title,
      type: form.type,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      summary: form.summary || form.title,
      occurred_at: form.due_date ? new Date(form.due_date).toISOString() : new Date().toISOString(),
    });
    setForm({ title: '', type: 'llamada', due_date: '', summary: '' });
    setShowForm(false);
    load();
  };

  const markDone = async (id) => {
    await api.patch(`/api/activities/${id}`, { done: true });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Actividades</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={14} /> Nueva actividad
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">Llamadas, reuniones y tareas programadas</p>

      <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'pendiente', label: 'Pendientes' },
          { key: 'vencida', label: 'Vencidas' },
          { key: 'completada', label: 'Completadas' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-tech transition ${tab === t.key ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 flex flex-wrap gap-3">
          <input
            placeholder="Asunto (ej. Follow up: Juan Pérez)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
          >
            {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input
            type="datetime-local"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Relacionado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => {
              const Icon = TYPE_ICONS[a.type] || StickyNote;
              const isOverdue = tab === 'vencida';
              return (
                <tr key={a.id} className="border-t border-brand-border hover:bg-brand-bg/50 transition">
                  <td className="px-4 py-3">
                    {a.done ? (
                      <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">
                        <Check size={11} className="text-green-300" />
                      </div>
                    ) : (
                      <button
                        onClick={() => markDone(a.id)}
                        className="w-4 h-4 rounded border border-brand-border hover:border-brand-violet transition"
                        title="Marcar completada"
                      />
                    )}
                  </td>
                  <td className={`px-4 py-3 ${a.done ? 'line-through text-brand-muted' : ''}`}>
                    {a.title || a.summary}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-brand-muted font-tech">
                      <Icon size={12} /> {TYPE_LABELS[a.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{a.entity_label || '—'}</td>
                  <td className={`px-4 py-3 text-xs font-tech ${isOverdue ? 'text-red-400' : 'text-brand-muted'}`}>
                    {a.due_date ? new Date(a.due_date).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{a.team_members?.full_name || '—'}</td>
                </tr>
              );
            })}
            {activities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-brand-muted text-sm">
                  Sin actividades {tab === 'pendiente' ? 'pendientes' : tab === 'vencida' ? 'vencidas' : 'completadas'}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
