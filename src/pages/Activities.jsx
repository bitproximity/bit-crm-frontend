import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';
import { csvToActivities } from '../lib/csv';
import { useConfirm } from '../components/ConfirmModal';
import { Phone, Mail, Users, MessageCircle, StickyNote, CheckSquare, Plus, Check, Upload, X, Trash2 } from 'lucide-react';

const TYPE_ICONS = {
  llamada: Phone, email: Mail, reunion: Users, whatsapp: MessageCircle, nota: StickyNote, tarea: CheckSquare,
};
const TYPE_LABELS = {
  llamada: 'Llamada', email: 'Email', reunion: 'Reunión', whatsapp: 'WhatsApp', nota: 'Nota', tarea: 'Tarea',
};

export default function Activities() {
  const confirm = useConfirm();
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('pendiente'); // pendiente | vencida | completada
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'llamada', due_date: '', summary: '' });
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', type: 'llamada', due_date: '' });
  const [saving, setSaving] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const parsed = csvToActivities(text);

    if (parsed.length === 0) {
      setImportResult({ error: 'No se encontraron actividades válidas. Verifica que el CSV tenga una columna de asunto.' });
      e.target.value = '';
      return;
    }

    setImporting(true);
    const result = await api.post('/api/activities/import', { activities: parsed });
    setImporting(false);
    setImportResult(result);
    e.target.value = '';
    load();
  };

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

  const openEdit = (a) => {
    setEditingActivity(a);
    setEditForm({ title: a.title || a.summary || '', type: a.type, due_date: a.due_date || '' });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/activities/${editingActivity.id}`, {
        title: editForm.title,
        summary: editForm.title,
        type: editForm.type,
        due_date: editForm.due_date || null,
      });
      setEditingActivity(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async () => {
    const ok = await confirm({
      title: 'Eliminar actividad',
      message: `¿Eliminar "${editingActivity.title || editingActivity.summary}"? Si estaba sincronizada con Google Calendar, también se borra el evento.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await api.delete(`/api/activities/${editingActivity.id}`);
    setEditingActivity(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Actividades</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-brand-violet transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload size={14} /> {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> Nueva actividad
          </button>
        </div>
      </div>
      <p className="text-brand-muted text-sm mb-6">Llamadas, reuniones y tareas programadas</p>

      {importResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${importResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
          {importResult.error ? importResult.error : (
            <>
              {importResult.created} actividades importadas.
              {importResult.errors?.length > 0 && ` ${importResult.errors.length} filas con error.`}
            </>
          )}
          <button onClick={() => setImportResult(null)} className="ml-3 text-xs underline">Cerrar</button>
        </div>
      )}

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
          <DateTimePicker value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
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
                <tr key={a.id} className="border-t border-brand-border row-hover cursor-pointer" onClick={() => openEdit(a)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 overlay-in" onClick={() => setEditingActivity(null)} />
          <div className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <span className="font-headline text-base font-semibold">Editar actividad</span>
              <button onClick={() => setEditingActivity(null)} className="text-brand-muted hover:text-brand-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Asunto</label>
                <input
                  autoFocus value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Tipo</label>
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Fecha</label>
                <DateTimePicker value={editForm.due_date} onChange={(v) => setEditForm({ ...editForm, due_date: v })} className="w-full" />
              </div>
              {editingActivity.entity_label && (
                <div className="text-xs text-brand-muted">Relacionado: {editingActivity.entity_label}</div>
              )}
            </div>
            <div className="p-4 border-t border-brand-border flex justify-between items-center">
              <button onClick={deleteActivity} className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 transition">
                <Trash2 size={13} /> Eliminar
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingActivity(null)} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
                <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
