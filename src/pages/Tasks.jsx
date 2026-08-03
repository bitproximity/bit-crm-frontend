import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'bloqueada', label: 'Bloqueada' },
  { key: 'completada', label: 'Completada' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '' });

  const load = () => api.get('/api/tasks').then(setTasks).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (taskId, status) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await api.patch(`/api/tasks/${taskId}`, { status });
  };

  const createTask = async (e) => {
    e.preventDefault();
    await api.post('/api/tasks', {
      title: form.title,
      due_date: form.due_date || null,
    });
    setForm({ title: '', due_date: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Tareas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm"
        >
          + Nueva tarea
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 flex gap-3">
          <input
            placeholder="Título de la tarea"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm">
            Crear
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <div
            key={status.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => updateStatus(e.dataTransfer.getData('taskId'), status.key)}
            className="bg-brand-panel/60 border border-brand-border rounded-xl p-3"
          >
            <div className="text-sm font-medium text-brand-white mb-3">{status.label}</div>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === status.key)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                    className="bg-brand-bg border border-brand-border rounded-lg p-3 cursor-move hover:border-brand-violet transition"
                  >
                    <div className="text-sm">{task.title}</div>
                    <div className="flex justify-between mt-1">
                      {task.projects?.name && (
                        <span className="text-xs text-brand-muted">{task.projects.name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-brand-muted">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
