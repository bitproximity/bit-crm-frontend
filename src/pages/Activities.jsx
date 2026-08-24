import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';
import { csvToActivities } from '../lib/csv';
import { useConfirm } from '../components/ConfirmModal';
import { Phone, Mail, Users, MessageCircle, StickyNote, CheckSquare, Plus, Check, Upload, X, Trash2, LayoutGrid, List } from 'lucide-react';

const TYPE_ICONS = {
  llamada: Phone, email: Mail, reunion: Users, whatsapp: MessageCircle, nota: StickyNote, tarea: CheckSquare,
};
const TYPE_LABELS = {
  llamada: 'Llamada', email: 'Email', reunion: 'Reunión', whatsapp: 'WhatsApp', nota: 'Nota', tarea: 'Tarea',
};
const COLUMNS = [
  { key: 'pendiente', label: 'Pendientes', color: '#6B7280', dot: 'bg-gray-400' },
  { key: 'vencida', label: 'Vencidas', color: '#EF4444', dot: 'bg-red-500' },
  { key: 'completada', label: 'Completadas', color: '#22C55E', dot: 'bg-green-500' },
];

function activityStatus(a) {
  if (a.done) return 'completada';
  if (a.due_date && new Date(a.due_date) < new Date()) return 'vencida';
  return 'pendiente';
}

export default function Activities() {
  const confirm = useConfirm();
  const [view, setView] = useState('tablero'); // tablero | lista
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('pendiente'); // solo para la vista Lista
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'llamada', due_date: '', summary: '' });
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', type: 'llamada', due_date: '', done: false });
  const [saving, setSaving] = useState(false);
  const [dealQuery, setDealQuery] = useState('');
  const [dealResults, setDealResults] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const dragActivityId = useRef(null);

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

  const load = () => {
    const query = view === 'tablero' ? '' : `?status=${tab}`;
    return api.get(`/api/activities${query}`).then(setActivities).catch(console.error);
  };

  useEffect(() => {
    load();
  }, [tab, view]);

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

  // Arrastrar una tarjeta a otra columna del tablero — a Completadas marca done=true;
  // a Pendientes/Vencidas marca done=false (la fecha decide sola en cuál de esas dos cae).
  const onColumnDrop = async (columnKey, activityId) => {
    if (!activityId) return;
    const done = columnKey === 'completada';
    setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, done } : a)));
    await api.patch(`/api/activities/${activityId}`, { done });
  };


  const openEdit = (a) => {
    setEditingActivity(a);
    setEditForm({ title: a.title || a.summary || '', type: a.type, due_date: a.due_date || '', done: !!a.done });
    setSelectedDeal(a.entity_type === 'deal' ? { id: a.entity_id, title: a.entity_label } : null);
    setDealQuery(a.entity_type === 'deal' ? (a.entity_label || '') : '');
    setDealResults([]);
  };

  useEffect(() => {
    if (!dealQuery.trim() || selectedDeal?.title === dealQuery) { setDealResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/deals?search=${encodeURIComponent(dealQuery.trim())}&limit=8`)
        .then((res) => setDealResults(Array.isArray(res) ? res : res.data || []))
        .catch(() => setDealResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dealQuery]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        summary: editForm.title,
        type: editForm.type,
        due_date: editForm.due_date || null,
        done: editForm.done,
      };
      if (selectedDeal && selectedDeal.id !== editingActivity.entity_id) {
        payload.entity_type = 'deal';
        payload.entity_id = selectedDeal.id;
      }
      await api.patch(`/api/activities/${editingActivity.id}`, payload);
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

      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1 w-fit">
          <button
            onClick={() => setView('tablero')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-tech transition ${view === 'tablero' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <LayoutGrid size={13} /> Tablero
          </button>
          <button
            onClick={() => setView('lista')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-tech transition ${view === 'lista' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <List size={13} /> Lista
          </button>
        </div>
        {view === 'lista' && (
          <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1 w-fit">
            {COLUMNS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-tech transition ${tab === t.key ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
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

      {view === 'tablero' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col, colIndex) => {
            const colActivities = activities.filter((a) => activityStatus(a) === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onColumnDrop(col.key, e.dataTransfer.getData('activityId'))}
                className="bg-brand-panel/60 border border-brand-border rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${col.color}, ${col.color}55)` }} />
                <div className="p-3 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-manrope font-semibold text-brand-white">
                    <span className={`w-2 h-2 rounded-full ${col.dot} flex-shrink-0`} />
                    {col.label}
                  </span>
                  <span className="text-brand-muted font-tech text-xs bg-brand-bg px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    {colActivities.length}
                  </span>
                </div>
                <div className="px-3 pb-3 flex-1 space-y-2">
                  {colActivities.map((a, i) => {
                    const Icon = TYPE_ICONS[a.type] || StickyNote;
                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('activityId', a.id)}
                        onClick={() => openEdit(a)}
                        className="card-elevated rounded-lg p-3 cursor-pointer stagger-item"
                        style={{ animationDelay: `${Math.min(i, 15) * 25 + colIndex * 40}ms` }}
                      >
                        <div className="flex items-start gap-1.5 mb-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded bg-brand-violet/10 flex-shrink-0 mt-0.5">
                            <Icon size={11} className="text-brand-ice" />
                          </span>
                          <span className={`text-sm leading-snug ${a.done ? 'line-through text-brand-muted' : 'text-brand-white'}`}>
                            {a.title || a.summary}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {a.entity_label ? (
                            <span className="text-[11px] text-brand-muted truncate bg-brand-bg/60 px-1.5 py-0.5 rounded-md">
                              {a.entity_label}
                            </span>
                          ) : <span />}
                          {a.due_date && (
                            <span className={`text-[11px] font-tech flex-shrink-0 ${col.key === 'vencida' ? 'text-red-400' : 'text-brand-muted'}`}>
                              {new Date(a.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colActivities.length === 0 && (
                    <div className="text-center py-6 text-brand-muted text-xs border border-dashed border-brand-border rounded-lg">
                      Sin actividades
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
      )}

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
              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border cursor-pointer">
                <span className="text-sm">
                  {editForm.done ? 'Completada' : (editForm.due_date && new Date(editForm.due_date) < new Date() ? 'Vencida' : 'Pendiente')}
                </span>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, done: !editForm.done })}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${editForm.done ? 'bg-green-500' : 'bg-brand-border'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editForm.done ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <div className="relative">
                <label className="block text-xs text-brand-muted mb-1.5">Relacionado con (trato)</label>
                <input
                  value={dealQuery}
                  onChange={(e) => { setDealQuery(e.target.value); setSelectedDeal(null); }}
                  placeholder="Buscar trato..."
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
                />
                {dealResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl dropdown-in max-h-40 overflow-y-auto">
                    {dealResults.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => { setSelectedDeal(d); setDealQuery(d.title); setDealResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition truncate"
                      >
                        {d.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
