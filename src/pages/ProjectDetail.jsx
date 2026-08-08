import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'bloqueada', label: 'Bloqueada' },
  { key: 'completada', label: 'Completada' },
];

function SubtaskRow({ task, onStatusChange }) {
  return (
    <div className="flex items-center gap-2 pl-6 py-1 text-xs text-brand-muted">
      <input
        type="checkbox"
        checked={task.status === 'completada'}
        onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completada' : 'pendiente')}
        className="accent-brand-violet w-3 h-3"
      />
      <span className={task.status === 'completada' ? 'line-through' : ''}>{task.title}</span>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(null); // status key donde se abre el form
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'media' });

  const load = () => {
    setError('');
    api.get(`/api/projects/${id}`).then(setProject).catch((err) => setError(err.message || 'No se pudo cargar el proyecto.'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (taskId, status) => {
    await api.patch(`/api/tasks/${taskId}`, { status });
    load();
  };

  const createTask = async (e, statusKey) => {
    e.preventDefault();
    await api.post('/api/tasks', {
      project_id: id,
      title: form.title,
      due_date: form.due_date || null,
      priority: form.priority,
      status: statusKey,
    });
    setForm({ title: '', due_date: '', priority: 'media' });
    setShowForm(null);
    load();
  };

  const toggleExpand = (taskId) => setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (!project) return <div className="text-brand-muted">Cargando...</div>;

  const tasksByStatus = (statusKey) => project.tasks.filter((t) => t.status === statusKey);

  return (
    <div>
      <Link to="/projects" className="text-xs text-brand-muted hover:text-brand-ice mb-3 inline-block">
        ← Proyectos
      </Link>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-headline text-xl font-semibold">{project.name}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-brand-violet/20 text-brand-ice font-tech uppercase">
          {project.status}
        </span>
      </div>
      <p className="text-brand-muted text-sm mb-6">{project.description || project.companies?.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <div key={status.key} className="bg-brand-panel/60 border border-brand-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-manrope font-medium">{status.label}</span>
              <button
                onClick={() => setShowForm(showForm === status.key ? null : status.key)}
                className="text-brand-muted hover:text-brand-ice text-sm"
              >
                +
              </button>
            </div>

            {showForm === status.key && (
              <form onSubmit={(e) => createTask(e, status.key)} className="mb-3 bg-brand-bg border border-brand-border rounded-lg p-2 space-y-2">
                <input
                  autoFocus
                  placeholder="Título"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                />
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                  />
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <button className="w-full py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">
                  Agregar
                </button>
              </form>
            )}

            <div className="space-y-2">
              {tasksByStatus(status.key).map((task) => (
                <div key={task.id} className="bg-brand-bg border border-brand-border rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    {task.subtasks?.length > 0 && (
                      <button onClick={() => toggleExpand(task.id)} className="text-brand-muted text-xs w-3">
                        {expanded[task.id] ? '▾' : '▸'}
                      </button>
                    )}
                    <input
                      type="checkbox"
                      checked={task.status === 'completada'}
                      onChange={(e) => updateStatus(task.id, e.target.checked ? 'completada' : 'pendiente')}
                      className="accent-brand-violet"
                    />
                    <span className={`text-sm flex-1 ${task.status === 'completada' ? 'line-through text-brand-muted' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.due_date && (
                    <div className="text-xs text-brand-muted font-tech mt-1 ml-5">
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {expanded[task.id] && (
                    <div className="mt-1 border-t border-brand-border/50 pt-1">
                      {task.subtasks.map((sub) => (
                        <SubtaskRow key={sub.id} task={sub} onStatusChange={updateStatus} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {tasksByStatus(status.key).length === 0 && !showForm && (
                <div className="text-brand-muted text-xs text-center py-3">Sin tareas</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
