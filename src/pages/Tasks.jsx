import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import DateTimePicker from '../components/DateTimePicker';
import { LayoutGrid, List, Plus, Flag, Calendar, ChevronRight, ChevronDown, X, Send, Trash2, FolderKanban, CheckCircle2, Circle } from 'lucide-react';

export const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#6B7280', dot: 'bg-gray-400' },
  { key: 'en_progreso', label: 'En progreso', color: '#8500FF', dot: 'bg-brand-violet' },
  { key: 'bloqueada', label: 'Bloqueada', color: '#EF4444', dot: 'bg-red-500' },
  { key: 'completada', label: 'Completada', color: '#22C55E', dot: 'bg-green-500' },
];

export const PRIORITY_COLORS = {
  baja: 'text-brand-muted',
  media: 'text-brand-ice',
  alta: 'text-yellow-400',
  urgente: 'text-red-400',
};

function initials(name) {
  if (!name) return null;
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function Avatar({ name, size = 'w-5 h-5 text-[9px]' }) {
  if (!name) return <div className={`${size} rounded-full border border-dashed border-brand-border flex-shrink-0`} />;
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center font-tech font-bold flex-shrink-0`} title={name}>
      {initials(name)}
    </div>
  );
}

export function dueBadge(dueDate, status) {
  if (!dueDate || status === 'completada') return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((due - now) / 86400000);
  let color = 'text-brand-muted bg-brand-bg/60';
  if (diffDays < 0) color = 'text-red-400 bg-red-500/10';
  else if (diffDays === 0) color = 'text-yellow-400 bg-yellow-500/10';
  return (
    <span className={`flex items-center gap-1 text-xs font-tech px-1.5 py-0.5 rounded-md ${color}`}>
      <Calendar size={11} /> {due.toLocaleDateString()}
    </span>
  );
}

export function InlineAddRow({ onSubmit, placeholder = 'Nombre de la tarea' }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit(title.trim());
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-ice py-2 w-full">
        <Plus size={12} /> Agregar Tarea
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="flex gap-1.5 py-1">
      <input
        autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (!title.trim()) setOpen(false); }}
        placeholder={placeholder}
        className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet"
      />
      <button className="px-2 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Crear</button>
    </form>
  );
}

function TaskRow({ task, onToggleExpand, expanded, onStatusChange, onOpen, indent = false }) {
  const done = task.status === 'completada';
  return (
    <div className={`flex items-center justify-between py-2.5 ${indent ? 'pl-8' : ''} border-b border-brand-border/50`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {task.subtasks?.length > 0 ? (
          <button onClick={() => onToggleExpand(task.id)} className="icon-btn p-0.5 rounded text-brand-muted hover:text-brand-white hover:bg-brand-bg w-5 flex-shrink-0">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <button
          onClick={() => onStatusChange(task.id, done ? 'pendiente' : 'completada')}
          className="icon-btn flex-shrink-0"
          title={done ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {done ? <CheckCircle2 size={17} className="text-green-400" /> : <Circle size={17} className="text-brand-muted hover:text-brand-ice transition" />}
        </button>
        {task.priority && task.priority !== 'media' && (
          <span className={`flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 ${
            task.priority === 'urgente' ? 'bg-red-500/15' : task.priority === 'alta' ? 'bg-yellow-500/15' : 'bg-brand-bg'
          }`}>
            <Flag size={10} className={PRIORITY_COLORS[task.priority]} fill="currentColor" />
          </span>
        )}
        <span onClick={() => onOpen(task.id)} className={`text-sm truncate cursor-pointer hover:text-brand-ice transition ${done ? 'line-through text-brand-muted' : 'text-brand-white'}`}>
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
        {task.projects?.name && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-brand-muted bg-brand-bg/60 px-1.5 py-0.5 rounded-md">
            <FolderKanban size={10} className="flex-shrink-0" /> {task.projects.name}
          </span>
        )}
        {dueBadge(task.due_date, task.status)}
        <Avatar name={task.team_members?.full_name} />
      </div>
    </div>
  );
}

export default function Tasks() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [view, setView] = useState('tablero');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '', assignee_id: '', project_id: '' });
  const [expanded, setExpanded] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = () => api.get('/api/tasks').then(setTasks).catch((err) => setLoadError(err.message || 'No se pudieron cargar las tareas.'));

  useEffect(() => {
    load();
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
    api.get('/api/projects').then(setProjects).catch(() => setProjects([]));
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
      assignee_id: form.assignee_id || null,
      project_id: form.project_id || null,
    });
    setForm({ title: '', due_date: '', assignee_id: '', project_id: '' });
    setShowForm(false);
    load();
  };

  const quickCreate = async (title, status, projectId) => {
    await api.post('/api/tasks', { title, status: status || 'pendiente', project_id: projectId || null });
    load();
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const rootTasks = tasks.filter((t) => !t.parent_task_id);
  const subtasksByParent = {};
  tasks.filter((t) => t.parent_task_id).forEach((t) => {
    subtasksByParent[t.parent_task_id] = subtasksByParent[t.parent_task_id] || [];
    subtasksByParent[t.parent_task_id].push(t);
  });

  // Agrupa por proyecto: cada proyecto que tenga al menos 1 tarea, más un grupo "Sin proyecto".
  const tasksByProject = {};
  rootTasks.forEach((t) => {
    const key = t.project_id || 'none';
    tasksByProject[key] = tasksByProject[key] || [];
    tasksByProject[key].push(t);
  });
  const projectGroups = Object.entries(tasksByProject)
    .map(([key, groupTasks]) => ({
      key,
      project: key === 'none' ? null : projects.find((p) => p.id === key),
      tasks: groupTasks,
      pending: groupTasks.filter((t) => t.status !== 'completada').length,
    }))
    .filter((g) => g.key === 'none' || g.project) // por si el proyecto fue borrado
    .sort((a, b) => b.pending - a.pending);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Tareas</h1>
      </div>
      <p className="text-brand-muted text-sm mb-6">{tasks.filter((t) => t.status !== 'completada').length} tareas pendientes, agrupadas por proyecto</p>

      {loadError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{loadError}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1">
          <button
            onClick={() => setView('proyecto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-tech flex items-center gap-1.5 transition ${view === 'proyecto' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <FolderKanban size={13} /> Por proyecto
          </button>
          <button
            onClick={() => setView('tablero')}
            className={`px-3 py-1.5 rounded-lg text-xs font-tech flex items-center gap-1.5 transition ${view === 'tablero' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <LayoutGrid size={13} /> Tablero
          </button>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={14} /> Nueva tarea
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3">
          <input
            placeholder="Título de la tarea"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
          />
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-brand-muted mb-1">Proyecto</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-brand-muted mb-1">Fecha y hora límite</label>
              <DateTimePicker value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} className="w-full" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-brand-muted mb-1">Responsable</label>
              <select
                value={form.assignee_id}
                onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              >
                <option value="">Sin asignar</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
              Crear tarea
            </button>
          </div>
        </form>
      )}

      {view === 'proyecto' ? (
        <div className="space-y-3">
          {projectGroups.map((g) => {
            const isCollapsed = collapsedGroups[g.key];
            const doneCount = g.tasks.length - g.pending;
            return (
              <div key={g.key} className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(g.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-brand-bg/40 hover:bg-brand-bg/60 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCollapsed ? <ChevronRight size={14} className="text-brand-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-brand-muted flex-shrink-0" />}
                    {g.project ? (
                      <Link to={`/projects/${g.project.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-manrope font-medium hover:text-brand-ice truncate">
                        {g.project.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-manrope font-medium text-brand-muted">Sin proyecto</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs font-tech text-brand-muted">
                    <span>{doneCount}/{g.tasks.length} completadas</span>
                    {g.pending > 0 && <span className="bg-brand-violet/20 text-brand-ice px-2 py-0.5 rounded-full">{g.pending} pendientes</span>}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="px-4">
                    {g.tasks.map((task) => (
                      <div key={task.id}>
                        <TaskRow
                          task={{ ...task, subtasks: subtasksByParent[task.id] }}
                          onToggleExpand={toggleExpand}
                          expanded={expanded[task.id]}
                          onStatusChange={updateStatus}
                          onOpen={setSelectedTaskId}
                        />
                        {expanded[task.id] &&
                          (subtasksByParent[task.id] || []).map((sub) => (
                            <TaskRow key={sub.id} task={sub} onStatusChange={updateStatus} onOpen={setSelectedTaskId} indent />
                          ))}
                      </div>
                    ))}
                    <InlineAddRow onSubmit={(title) => quickCreate(title, 'pendiente', g.key === 'none' ? null : g.key)} />
                  </div>
                )}
              </div>
            );
          })}
          {projectGroups.length === 0 && (
            <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
              Sin tareas todavía. Crea una arriba.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STATUSES.map((status, colIndex) => {
            const colTasks = tasks.filter((t) => t.status === status.key);
            return (
              <div
                key={status.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => updateStatus(e.dataTransfer.getData('taskId'), status.key)}
                className="bg-brand-panel/60 border border-brand-border rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${status.color}, ${status.color}55)` }} />
                <div className="p-3 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-manrope font-semibold text-brand-white">
                    <span className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0`} />
                    {status.label}
                  </span>
                  <span className="text-brand-muted font-tech text-xs bg-brand-bg px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    {colTasks.length}
                  </span>
                </div>
                <div className="px-3 pb-3 flex-1">
                  <div className="space-y-2">
                    {colTasks.map((task, i) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="card-elevated rounded-lg p-3 cursor-pointer stagger-item"
                        style={{ animationDelay: `${Math.min(i, 15) * 25 + colIndex * 40}ms` }}
                      >
                        <div className="text-sm mb-2 flex items-start gap-1.5 leading-snug">
                          {task.priority && task.priority !== 'media' && (
                            <span className={`flex items-center justify-center w-4 h-4 rounded flex-shrink-0 mt-0.5 ${
                              task.priority === 'urgente' ? 'bg-red-500/15' : 'bg-yellow-500/15'
                            }`}>
                              <Flag size={9} className={PRIORITY_COLORS[task.priority]} fill="currentColor" />
                            </span>
                          )}
                          <span className="text-brand-white">{task.title}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            {task.projects?.name && (
                              <span className="flex items-center gap-1 text-[11px] text-brand-muted truncate bg-brand-bg/60 px-1.5 py-0.5 rounded-md">
                                <FolderKanban size={10} className="flex-shrink-0" />
                                {task.projects.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {dueBadge(task.due_date, task.status)}
                            <Avatar name={task.team_members?.full_name} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-brand-muted text-xs border border-dashed border-brand-border rounded-lg">
                        Sin tareas
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <InlineAddRow onSubmit={(title) => quickCreate(title, status.key)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          team={team}
          onClose={() => setSelectedTaskId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

export function TaskDetailModal({ taskId, team, onClose, onChanged }) {
  const confirm = useConfirm();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');
  const [calSyncResult, setCalSyncResult] = useState(null);
  const [calSyncing, setCalSyncing] = useState(false);

  const syncCalendar = async () => {
    setCalSyncing(true);
    setCalSyncResult(null);
    try {
      const result = await api.post(`/api/tasks/${taskId}/sync-calendar`, {});
      setCalSyncResult(result);
    } catch (err) {
      setCalSyncResult({ ok: false, reason: err.message });
    }
    setCalSyncing(false);
  };

  const [error, setError] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // null = cerrado, '' o texto = filtro activo

  const load = () => api.get(`/api/tasks/${taskId}`).then(setTask).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [taskId]);

  const update = async (fields) => {
    await api.patch(`/api/tasks/${taskId}`, fields);
    load();
    onChanged?.();
  };

  const onCommentChange = (e) => {
    const value = e.target.value;
    setComment(value);
    const cursor = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([a-zA-ZÀ-ÿ]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (member) => {
    const cursor = comment.length; // aproximación simple: siempre al final del texto escrito hasta ahora
    const beforeMention = comment.replace(/@([a-zA-ZÀ-ÿ]*)$/, '');
    setComment(`${beforeMention}@${member.full_name} `);
    setMentionQuery(null);
  };

  const mentionResults = mentionQuery !== null
    ? (team || []).filter((m) => m.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/api/tasks/${taskId}/comments`, { body: comment.trim() });
    setComment('');
    load();
  };

  const deleteTask = async () => {
    const ok = await confirm({ title: 'Eliminar tarea', message: '¿Eliminar esta tarea?', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await api.delete(`/api/tasks/${taskId}`);
    onChanged?.();
    onClose();
  };

  if (!task) return null;

  const selectClass = 'px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <input
            defaultValue={task.title}
            onBlur={(e) => e.target.value !== task.title && update({ title: e.target.value })}
            className="font-headline text-lg font-semibold bg-transparent focus:outline-none flex-1"
          />
          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            <button onClick={deleteTask} className="text-brand-muted hover:text-red-400"><Trash2 size={16} /></button>
            <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <select value={task.status} onChange={(e) => update({ status: e.target.value })} className={selectClass}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={task.priority || 'media'} onChange={(e) => update({ priority: e.target.value })} className={selectClass}>
              <option value="baja">Prioridad baja</option>
              <option value="media">Prioridad media</option>
              <option value="alta">Prioridad alta</option>
              <option value="urgente">Prioridad urgente</option>
            </select>
            <select value={task.assignee_id || ''} onChange={(e) => update({ assignee_id: e.target.value || null })} className={selectClass}>
              <option value="">Sin asignar</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <DateTimePicker
              value={task.due_date || ''}
              onChange={(v) => update({ due_date: v || null })}
            />
          </div>

          <div>
            <button
              onClick={syncCalendar}
              disabled={calSyncing}
              className="text-xs text-brand-ice hover:underline disabled:opacity-50"
            >
              {calSyncing ? 'Sincronizando...' : '📅 Sincronizar con Google Calendar ahora'}
            </button>
            {calSyncResult && (
              <div className={`mt-1.5 px-3 py-2 rounded-lg text-xs ${calSyncResult.ok ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'}`}>
                {calSyncResult.ok ? (
                  <>
                    Sincronizada con <span className="font-tech">{calSyncResult.connectedEmail}</span>, con recordatorio.{' '}
                    {calSyncResult.eventLink && (
                      <a href={calSyncResult.eventLink} target="_blank" rel="noreferrer" className="underline">
                        Ver el evento directo en Google Calendar →
                      </a>
                    )}
                  </>
                ) : calSyncResult.reason}
              </div>
            )}
          </div>

          {task.projects?.name && (
            <div className="text-xs text-brand-muted">Proyecto: <span className="text-brand-white">{task.projects.name}</span></div>
          )}

          {task.subtasks?.length > 0 && (
            <div>
              <div className="text-xs text-brand-muted uppercase mb-2">Subtareas</div>
              <div className="space-y-1">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm bg-brand-bg rounded-lg px-3 py-1.5">
                    <input type="checkbox" checked={s.status === 'completada'} readOnly className="accent-brand-violet" />
                    <span className={s.status === 'completada' ? 'line-through text-brand-muted' : ''}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-brand-muted uppercase mb-2">Comentarios</div>
            <div className="space-y-2 mb-3">
              {(task.comments || []).map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <Avatar name={c.team_members?.full_name} size="w-6 h-6 text-[10px]" />
                  <div className="flex-1 bg-brand-bg rounded-lg px-3 py-2">
                    <div className="text-xs text-brand-muted mb-0.5">{c.team_members?.full_name} · {new Date(c.created_at).toLocaleString()}</div>
                    <div>{c.body}</div>
                  </div>
                </div>
              ))}
              {(task.comments || []).length === 0 && <div className="text-brand-muted text-xs">Sin comentarios todavía.</div>}
            </div>
            <form onSubmit={addComment} className="relative flex gap-2">
              {mentionResults.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 w-56 bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden z-10">
                  {mentionResults.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => insertMention(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center gap-2"
                    >
                      <Avatar name={m.full_name} />
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={comment} onChange={onCommentChange}
                placeholder="Escribe un comentario... usa @ para mencionar"
                className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              />
              <button className="px-3 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg"><Send size={14} /></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
