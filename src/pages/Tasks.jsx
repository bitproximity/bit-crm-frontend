import { useEffect, useState, useRef } from 'react';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import DateTimePicker from '../components/DateTimePicker';
import { LayoutGrid, List, Plus, Flag, Calendar, ChevronRight, ChevronDown, X, Send, Trash2, FolderKanban, CheckCircle2, Circle } from 'lucide-react';
import { Video, CalendarCheck, MessageSquare, User, ListChecks, ChevronDown as Chevron } from 'lucide-react';
import MeetingLinkField from '../components/MeetingLinkField';

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
  const [projectQuery, setProjectQuery] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const projectBoxRef = useRef(null);
  useOutsideClick(projectBoxRef, () => { setProjectOpen(false); setProjectQuery(''); }, projectOpen);
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
    setProjectQuery('');
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
            <div className="flex-1 min-w-[180px] relative" ref={projectBoxRef}>
              <label className="block text-xs text-brand-muted mb-1">Proyecto</label>
              <input
                value={projectOpen ? projectQuery : (projects.find((p) => p.id === form.project_id)?.name || '')}
                onChange={(e) => { setProjectQuery(e.target.value); setProjectOpen(true); }}
                onFocus={() => { setProjectOpen(true); setProjectQuery(''); }}
                placeholder="Sin proyecto"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              />
              {projectOpen && (() => {
                const filtered = projects.filter((p) => p.name.toLowerCase().includes(projectQuery.toLowerCase()));
                return (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-brand-bg border border-brand-border rounded-lg shadow-xl">
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, project_id: '' }); setProjectOpen(false); setProjectQuery(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-brand-muted hover:bg-brand-panel transition"
                    >
                      Sin proyecto
                    </button>
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setForm({ ...form, project_id: p.id }); setProjectOpen(false); setProjectQuery(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition truncate"
                      >
                        {p.name}
                      </button>
                    ))}
                    {projectQuery && filtered.length === 0 && (
                      <div className="px-3 py-2 text-xs text-brand-muted">Sin resultados para "{projectQuery}".</div>
                    )}
                  </div>
                );
              })()}
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

export function TaskDetailModal({ taskId, team = [], onClose, onChanged }) {
  const confirm = useConfirm();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');
  const [calSyncResult, setCalSyncResult] = useState(null);
  const [calSyncing, setCalSyncing] = useState(false);
  const [error, setError] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // null = cerrado, '' o texto = filtro activo

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

  const load = () => api.get(`/api/tasks/${taskId}`).then(setTask).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [taskId]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = async (fields) => {
    setError('');
    try {
      await api.patch(`/api/tasks/${taskId}`, fields);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el cambio.');
    }
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
    const beforeMention = comment.replace(/@([a-zA-ZÀ-ÿ]*)$/, '');
    setComment(`${beforeMention}@${member.full_name} `);
    setMentionQuery(null);
  };

  const mentionResults = mentionQuery !== null
    ? (team || []).filter((m) => m.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];
  const mentionBoxRef = useRef(null);
  useOutsideClick(mentionBoxRef, () => setMentionQuery(null), mentionResults.length > 0);

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

  const status = STATUSES.find((s) => s.key === task.status) || STATUSES[0];
  const priority = task.priority || 'media';
  const selectCls = 'w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet cursor-pointer appearance-none';
  const sectionTitle = 'flex items-center gap-1.5 text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-2.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Detalle de la tarea">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] overlay-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden modal-in">
        {/* Cabecera: estado + título editable */}
        <div className="px-6 pt-5 pb-4 border-b border-brand-border">
          <div className="flex items-center justify-between mb-3">
            <label className="relative inline-flex items-center">
              <span className="absolute left-3 w-2 h-2 rounded-full pointer-events-none" style={{ background: status.color }} />
              <select
                aria-label="Estado"
                value={task.status}
                onChange={(e) => update({ status: e.target.value })}
                className="pl-7 pr-3 py-1.5 rounded-full bg-brand-bg border border-brand-border text-xs font-tech uppercase tracking-wide focus:outline-none focus:border-brand-violet cursor-pointer appearance-none"
                style={{ colorScheme: 'dark' }}
              >
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button onClick={deleteTask} aria-label="Eliminar tarea" title="Eliminar tarea" className="icon-btn p-2 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 size={16} /></button>
              <button onClick={onClose} aria-label="Cerrar" className="icon-btn p-2 rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg transition"><X size={18} /></button>
            </div>
          </div>
          <input
            defaultValue={task.title}
            key={task.id}
            aria-label="Título de la tarea"
            onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && update({ title: e.target.value })}
            className="w-full font-headline text-xl font-semibold bg-transparent focus:outline-none placeholder:text-brand-muted"
            placeholder="Título de la tarea"
          />
          {task.projects?.name && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-1.5"><FolderKanban size={12} /> {task.projects.name}</div>
          )}
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          {/* Propiedades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className={sectionTitle}>Responsable</div>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                <select aria-label="Responsable" value={task.assignee_id || ''} onChange={(e) => update({ assignee_id: e.target.value || null })} className={selectCls} style={{ colorScheme: 'dark' }}>
                  <option value="">Sin asignar</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
                <Chevron size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <div className={sectionTitle}>Prioridad</div>
              <div className="relative">
                <Flag size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${PRIORITY_COLORS[priority]}`} />
                <select aria-label="Prioridad" value={priority} onChange={(e) => update({ priority: e.target.value })} className={selectCls} style={{ colorScheme: 'dark' }}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
                <Chevron size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className={sectionTitle}><Calendar size={12} /> Fecha y hora límite</div>
              <DateTimePicker value={task.due_date || ''} onChange={(v) => update({ due_date: v || null })} className="w-full" />
            </div>
          </div>

          {/* Reunión + calendario — va ANTES de los comentarios */}
          <div className="rounded-2xl border border-brand-border bg-brand-bg/50 p-4">
            <div className={sectionTitle}><Video size={13} /> Reunión</div>
            <MeetingLinkField value={task.meeting_url || ''} onSave={(v) => update({ meeting_url: v || null })} />
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-border/70 flex-wrap">
              <span className={`flex items-center gap-1.5 text-xs ${task.google_event_id ? 'text-green-300' : 'text-brand-muted'}`}>
                <CalendarCheck size={13} /> {task.google_event_id ? 'Está en tu Google Calendar' : 'Aún no está en Google Calendar'}
              </span>
              <button
                onClick={syncCalendar}
                disabled={calSyncing}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-brand-border hover:border-brand-violet text-brand-ice transition disabled:opacity-50"
              >
                {calSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
            {calSyncResult && (
              <div className={`mt-2.5 px-3 py-2 rounded-lg text-xs ${calSyncResult.ok ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'}`}>
                {calSyncResult.ok ? (
                  <>
                    Sincronizada con <span className="font-tech">{calSyncResult.connectedEmail}</span>, con recordatorio.{' '}
                    {calSyncResult.eventLink && (
                      <a href={calSyncResult.eventLink} target="_blank" rel="noreferrer" className="underline">Ver el evento directo en Google Calendar →</a>
                    )}
                  </>
                ) : calSyncResult.reason}
              </div>
            )}
          </div>

          {task.subtasks?.length > 0 && (
            <div>
              <div className={sectionTitle}><ListChecks size={13} /> Subtareas</div>
              <div className="space-y-1">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 text-sm bg-brand-bg rounded-xl px-3 py-2">
                    {s.status === 'completada' ? <CheckCircle2 size={15} className="text-green-400" /> : <Circle size={15} className="text-brand-muted" />}
                    <span className={s.status === 'completada' ? 'line-through text-brand-muted' : ''}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <div className={sectionTitle}><MessageSquare size={13} /> Comentarios <span className="font-tech normal-case text-brand-muted/70">{(task.comments || []).length}</span></div>
            <div className="space-y-3 mb-3">
              {(task.comments || []).map((c) => (
                <div key={c.id} className="flex gap-2.5 text-sm">
                  <Avatar name={c.team_members?.full_name} size="w-7 h-7 text-[10px]" />
                  <div className="flex-1 bg-brand-bg rounded-2xl rounded-tl-md px-3.5 py-2.5">
                    <div className="text-xs mb-0.5"><span className="font-medium text-brand-white">{c.team_members?.full_name}</span> <span className="text-brand-muted">· {new Date(c.created_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                    <div className="text-brand-white/90 whitespace-pre-wrap">{c.body}</div>
                  </div>
                </div>
              ))}
              {(task.comments || []).length === 0 && <div className="text-brand-muted text-xs py-1">Sin comentarios todavía.</div>}
            </div>
            <form onSubmit={addComment} className="relative flex gap-2" ref={mentionBoxRef}>
              {mentionResults.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 w-56 bg-brand-bg border border-brand-border rounded-xl shadow-xl overflow-hidden z-10">
                  {mentionResults.map((m) => (
                    <button type="button" key={m.id} onClick={() => insertMention(m)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center gap-2">
                      <Avatar name={m.full_name} />
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={comment} onChange={onCommentChange}
                placeholder="Escribe un comentario... usa @ para mencionar"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition"
              />
              <button aria-label="Enviar comentario" className="px-3.5 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-xl hover:opacity-90 transition"><Send size={15} /></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
