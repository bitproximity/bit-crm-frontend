import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'bloqueada', label: 'Bloqueada' },
  { key: 'completada', label: 'Completada' },
];

const PRIORITY_COLORS = {
  baja: 'text-brand-muted',
  media: 'text-brand-ice',
  alta: 'text-yellow-400',
  urgente: 'text-red-400',
};

function dueBadge(dueDate, status) {
  if (!dueDate || status === 'completada') return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((due - now) / 86400000);
  let color = 'text-brand-muted';
  if (diffDays < 0) color = 'text-red-400';
  else if (diffDays === 0) color = 'text-yellow-400';
  return <span className={`text-xs font-tech ${color}`}>{due.toLocaleDateString()}</span>;
}

function TaskRow({ task, onToggleExpand, expanded, onStatusChange, indent = false }) {
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? 'pl-8' : ''} border-b border-brand-border/50`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {task.subtasks?.length > 0 && (
          <button onClick={() => onToggleExpand(task.id)} className="text-brand-muted w-4 text-xs">
            {expanded ? '▾' : '▸'}
          </button>
        )}
        <input
          type="checkbox"
          checked={task.status === 'completada'}
          onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completada' : 'pendiente')}
          className="accent-brand-violet"
        />
        <span className={`text-sm truncate ${task.status === 'completada' ? 'line-through text-brand-muted' : ''}`}>
          {task.title}
        </span>
        {task.priority && task.priority !== 'media' && (
          <span className={`text-xs font-tech uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        {task.projects?.name && <span className="text-xs text-brand-muted hidden md:inline">{task.projects.name}</span>}
        {dueBadge(task.due_date, task.status)}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('board'); // 'board' | 'list'
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '' });
  const [expanded, setExpanded] = useState({});

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
    await api.post('/api/tasks', { title: form.title, due_date: form.due_date || null });
    setForm({ title: '', due_date: '' });
    setShowForm(false);
    load();
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Para la vista de lista: agrupa subtareas bajo su tarea padre
  const rootTasks = tasks.filter((t) => !t.parent_task_id);
  const subtasksByParent = {};
  tasks.filter((t) => t.parent_task_id).forEach((t) => {
    subtasksByParent[t.parent_task_id] = subtasksByParent[t.parent_task_id] || [];
    subtasksByParent[t.parent_task_id].push(t);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-xl font-semibold">Tareas</h1>
          <div className="flex bg-brand-panel border border-brand-border rounded-lg p-0.5">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1 rounded text-xs font-tech ${view === 'board' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted'}`}
            >
              Tablero
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded text-xs font-tech ${view === 'list' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted'}`}
            >
              Lista
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium"
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
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <div
              key={status.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => updateStatus(e.dataTransfer.getData('taskId'), status.key)}
              className="bg-brand-panel/60 border border-brand-border rounded-xl p-3"
            >
              <div className="text-sm font-manrope font-medium text-brand-white mb-3 flex justify-between">
                <span>{status.label}</span>
                <span className="text-brand-muted font-tech text-xs">
                  {tasks.filter((t) => t.status === status.key).length}
                </span>
              </div>
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
                      <div className="flex justify-between items-center mt-1.5">
                        <div className="flex items-center gap-2">
                          {task.projects?.name && <span className="text-xs text-brand-muted">{task.projects.name}</span>}
                          {task.priority && task.priority !== 'media' && (
                            <span className={`text-xs font-tech uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                          )}
                        </div>
                        {dueBadge(task.due_date, task.status)}
                      </div>
                    </div>
                  ))}
                {tasks.filter((t) => t.status === status.key).length === 0 && (
                  <div className="text-brand-muted text-xs text-center py-4">Sin tareas</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-panel border border-brand-border rounded-xl px-4">
          {rootTasks.map((task) => (
            <div key={task.id}>
              <TaskRow
                task={{ ...task, subtasks: subtasksByParent[task.id] }}
                onToggleExpand={toggleExpand}
                expanded={expanded[task.id]}
                onStatusChange={updateStatus}
              />
              {expanded[task.id] &&
                (subtasksByParent[task.id] || []).map((sub) => (
                  <TaskRow key={sub.id} task={sub} onStatusChange={updateStatus} indent />
                ))}
            </div>
          ))}
          {rootTasks.length === 0 && <div className="text-brand-muted text-sm py-6 text-center">Sin tareas todavía.</div>}
        </div>
      )}
    </div>
  );
}
