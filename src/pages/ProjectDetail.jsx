import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { Flag, Trash2, FileText, ChevronDown } from 'lucide-react';
import { STATUSES, PRIORITY_COLORS, Avatar, dueBadge, InlineAddRow, TaskDetailModal } from './Tasks';

const PROJECT_STATUSES = ['activo', 'pausado', 'completado', 'cancelado'];
const STATUS_STYLES = {
  activo: 'bg-green-500/20 text-green-300',
  pausado: 'bg-yellow-500/20 text-yellow-300',
  completado: 'bg-blue-500/20 text-blue-300',
  cancelado: 'bg-red-500/20 text-red-300',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [statusEditing, setStatusEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [docs, setDocs] = useState([]);

  const load = () => {
    setError('');
    api.get(`/api/projects/${id}`).then((p) => { setProject(p); setNameValue(p.name); }).catch((err) => setError(err.message || 'No se pudo cargar el proyecto.'));
  };

  useEffect(() => {
    load();
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
    api.get(`/api/documents/tree?project_id=${id}`).then(setDocs).catch(() => setDocs([]));
  }, [id]);

  const createDoc = async () => {
    const created = await api.post('/api/documents', { title: `${project.name} — nuevo documento`, content: '', project_id: id });
    navigate(`/documents?open=${created.id}`);
  };

  const updateStatus = async (taskId, status) => {
    setProject((prev) => ({ ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }));
    await api.patch(`/api/tasks/${taskId}`, { status });
    load();
  };

  const quickCreate = async (title, status) => {
    await api.post('/api/tasks', { project_id: id, title, status: status || 'pendiente' });
    load();
  };

  const toggleExpand = (taskId) => setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

  const saveName = async () => {
    if (nameValue.trim() && nameValue !== project.name) {
      await api.patch(`/api/projects/${id}`, { name: nameValue.trim() });
      load();
    }
    setNameEditing(false);
  };

  const changeProjectStatus = async (status) => {
    await api.patch(`/api/projects/${id}`, { status });
    load();
  };

  const deleteProject = async () => {
    const ok = await confirm({
      title: 'Eliminar proyecto',
      message: `¿Eliminar el proyecto "${project.name}" y todas sus tareas? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await api.delete(`/api/projects/${id}`);
    navigate('/projects');
  };

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (!project) return <SkeletonPage />;

  const tasksByStatus = (statusKey) => (project.tasks || []).filter((t) => !t.parent_task_id && t.status === statusKey);
  const subtasksByParent = {};
  (project.tasks || []).filter((t) => t.parent_task_id).forEach((t) => {
    subtasksByParent[t.parent_task_id] = subtasksByParent[t.parent_task_id] || [];
    subtasksByParent[t.parent_task_id].push(t);
  });

  return (
    <div>
      <Link to="/projects" className="text-xs text-brand-muted hover:text-brand-ice mb-3 inline-block">
        ← Proyectos
      </Link>

      <div className="flex items-center justify-between mb-2">
        {nameEditing ? (
          <input
            autoFocus value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(project.name); setNameEditing(false); } }}
            className="font-headline text-xl font-semibold bg-transparent border-b border-brand-violet focus:outline-none"
          />
        ) : (
          <h1 onClick={() => setNameEditing(true)} className="font-headline text-xl font-semibold cursor-text hover:text-brand-ice transition">
            {project.name}
          </h1>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setStatusEditing((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-tech uppercase cursor-pointer transition hover:opacity-80 ${STATUS_STYLES[project.status] || 'bg-brand-bg text-brand-muted'}`}
            >
              {project.status}
              <ChevronDown size={11} />
            </button>
            {statusEditing && (
              <div className="absolute left-0 mt-1.5 w-40 bg-brand-bg border border-brand-border rounded-lg shadow-xl dropdown-in z-20 overflow-hidden">
                {PROJECT_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { changeProjectStatus(s); setStatusEditing(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase font-tech hover:bg-brand-panel transition"
                  >
                    <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[s]}`}>{s}</span>
                    {s === project.status && <span className="text-brand-violet">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={deleteProject} className="text-brand-muted hover:text-red-400" title="Eliminar proyecto">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <p className="text-brand-muted text-sm mb-6">{project.description || project.companies?.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <div
            key={status.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => updateStatus(e.dataTransfer.getData('taskId'), status.key)}
            className="bg-brand-panel/60 border border-brand-border rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-manrope font-medium">{status.label}</span>
              <span className="text-brand-muted font-tech text-xs bg-brand-bg px-2 py-0.5 rounded-full">
                {tasksByStatus(status.key).length}
              </span>
            </div>

            <div className="space-y-2">
              {tasksByStatus(status.key).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                  className="card-elevated rounded-lg p-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2" onClick={() => setSelectedTaskId(task.id)}>
                    {subtasksByParent[task.id]?.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }} className="text-brand-muted text-xs w-3">
                        {expanded[task.id] ? '▾' : '▸'}
                      </button>
                    )}
                    {task.priority && task.priority !== 'media' && (
                      <Flag size={11} className={`flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} fill="currentColor" />
                    )}
                    <span className={`text-sm flex-1 ${task.status === 'completada' ? 'line-through text-brand-muted' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 ml-1">
                    {dueBadge(task.due_date, task.status)}
                    <Avatar name={task.team_members?.full_name} />
                  </div>
                  {expanded[task.id] && (
                    <div className="mt-1.5 border-t border-brand-border/50 pt-1.5 space-y-1">
                      {subtasksByParent[task.id].map((sub) => (
                        <div key={sub.id} onClick={() => setSelectedTaskId(sub.id)} className="flex items-center gap-2 pl-4 text-xs text-brand-muted hover:text-brand-white">
                          <input type="checkbox" checked={sub.status === 'completada'} onChange={(e) => { e.stopPropagation(); updateStatus(sub.id, e.target.checked ? 'completada' : 'pendiente'); }} onClick={(e) => e.stopPropagation()} className="accent-brand-violet w-3 h-3" />
                          <span className={sub.status === 'completada' ? 'line-through' : ''}>{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {tasksByStatus(status.key).length === 0 && (
                <div className="text-brand-muted text-xs text-center py-3">Sin tareas</div>
              )}
            </div>
            <div className="mt-1 px-1">
              <InlineAddRow onSubmit={(title) => quickCreate(title, status.key)} />
            </div>
          </div>
        ))}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          team={team}
          onClose={() => setSelectedTaskId(null)}
          onChanged={load}
        />
      )}

      <div className="mt-8 pt-5 border-t border-brand-border">
        <div className="flex items-center justify-between mb-3">
          <span className="font-manrope font-medium text-sm">Documentos</span>
          <button onClick={createDoc} className="text-xs text-brand-ice hover:underline">+ Nuevo documento</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {docs.map((d) => (
            <Link key={d.id} to={`/documents?open=${d.id}`} className="flex items-center gap-2 bg-brand-panel border border-brand-border rounded-lg p-3 text-sm hover:border-brand-violet/40 transition">
              <FileText size={14} className="text-brand-muted flex-shrink-0" />
              {d.title || 'Sin título'}
            </Link>
          ))}
          {docs.length === 0 && <div className="text-brand-muted text-sm">Sin documentos vinculados todavía.</div>}
        </div>
      </div>
    </div>
  );
}
