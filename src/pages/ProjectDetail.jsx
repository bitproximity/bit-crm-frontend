import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Flag, Trash2, FileText, Upload, Share2, Users, TrendingUp, Percent, CalendarCheck } from 'lucide-react';
import { STATUSES, PRIORITY_COLORS, Avatar, dueBadge, InlineAddRow, TaskDetailModal } from './Tasks';

const PROJECT_STATUSES = ['activo', 'pausado', 'completado', 'cancelado'];
const B2B_STATUSES = [
  { key: 'contactado', label: 'Contactado' },
  { key: 'reunion_agendada', label: 'Reunión agendada' },
  { key: 'reunion_realizada', label: 'Reunión realizada' },
  { key: 'no_interesado', label: 'No interesado' },
];

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const out = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ''; });
    return obj;
  });
}

const B2B_FIELD_MAP = {
  empresa: 'target_company', target_company: 'target_company', compañia: 'target_company', marca: 'target_company',
  contacto: 'target_contact', target_contact: 'target_contact', nombre: 'target_contact',
  industria: 'industry', industry: 'industry', sector: 'industry',
  pais: 'country', país: 'country', country: 'country',
  fecha: 'contacted_at', contacted_at: 'contacted_at', fecha_contacto: 'contacted_at',
  fecha_reunion: 'meeting_date', meeting_date: 'meeting_date', fecha_reunión: 'meeting_date',
  notas: 'notes', notes: 'notes',
};

function mapB2bRows(rows) {
  return rows.map((row) => {
    const mapped = {};
    Object.entries(row).forEach(([key, val]) => {
      const target = B2B_FIELD_MAP[key];
      if (target && val) mapped[target] = val;
    });
    return mapped;
  }).filter((r) => r.target_company);
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [docs, setDocs] = useState([]);
  const [b2bRecords, setB2bRecords] = useState([]);
  const [b2bDashboard, setB2bDashboard] = useState(null);
  const [b2bImportResult, setB2bImportResult] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const contactedInputRef = useRef(null);
  const meetingsInputRef = useRef(null);

  const load = () => {
    setError('');
    api.get(`/api/projects/${id}`).then((p) => { setProject(p); setNameValue(p.name); }).catch((err) => setError(err.message || 'No se pudo cargar el proyecto.'));
  };

  useEffect(() => {
    load();
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
    api.get(`/api/documents/tree?project_id=${id}`).then(setDocs).catch(() => setDocs([]));
    api.get(`/api/b2b/records?project_id=${id}`).then(setB2bRecords).catch(() => setB2bRecords([]));
    api.get(`/api/b2b/dashboard?project_id=${id}`).then(setB2bDashboard).catch(() => setB2bDashboard(null));
  }, [id]);

  const createDoc = async () => {
    const created = await api.post('/api/documents', { title: `${project.name} — nuevo documento`, content: '', project_id: id });
    navigate(`/documents?open=${created.id}`);
  };

  const reloadB2b = () => {
    api.get(`/api/b2b/records?project_id=${id}`).then(setB2bRecords);
    api.get(`/api/b2b/dashboard?project_id=${id}`).then(setB2bDashboard);
  };

  const handleB2bImport = async (e, mode) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = mapB2bRows(parseCsv(text));
    if (rows.length === 0) {
      setB2bImportResult({ error: 'No se encontraron filas válidas. Verifica que el CSV tenga una columna de empresa/marca.' });
      e.target.value = '';
      return;
    }
    try {
      const result = await api.post('/api/b2b/import', { project_id: id, client_company_id: project.company_id, mode, records: rows });
      setB2bImportResult(result);
      reloadB2b();
    } catch (err) {
      setB2bImportResult({ error: err.message });
    }
    e.target.value = '';
  };

  const updateB2bStatus = async (recordId, status) => {
    setB2bRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, status } : r)));
    await api.patch(`/api/b2b/records/${recordId}/status`, { status });
    reloadB2b();
  };

  const getShareLink = async () => {
    const { token } = await api.post(`/api/b2b/projects/${id}/share-link`, {});
    const url = `${window.location.origin}/public/b2b/${token}`;
    setShareLink(url);
    navigator.clipboard?.writeText(url).catch(() => {});
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
    if (!window.confirm(`¿Eliminar el proyecto "${project.name}" y todas sus tareas? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/api/projects/${id}`);
    navigate('/projects');
  };

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (!project) return <div className="text-brand-muted">Cargando...</div>;

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
          <select
            value={project.status}
            onChange={(e) => changeProjectStatus(e.target.value)}
            className="text-xs px-2 py-1 rounded-full bg-brand-violet/20 text-brand-ice font-tech uppercase border-none focus:outline-none cursor-pointer"
          >
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
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
                  className="bg-brand-bg border border-brand-border rounded-lg p-2.5 cursor-pointer hover:border-brand-violet transition"
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
          <span className="font-manrope font-medium text-sm">Base de datos B2B</span>
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs cursor-pointer hover:border-brand-violet transition flex items-center gap-1.5">
              <Upload size={12} /> Importar contactados
              <input ref={contactedInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleB2bImport(e, 'contactados')} />
            </label>
            <label className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs cursor-pointer hover:border-brand-violet transition flex items-center gap-1.5">
              <CalendarCheck size={12} /> Importar reuniones
              <input ref={meetingsInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleB2bImport(e, 'reuniones')} />
            </label>
            <button onClick={getShareLink} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-xs flex items-center gap-1.5">
              <Share2 size={12} /> Compartir con cliente
            </button>
          </div>
        </div>

        {shareLink && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-brand-violet/10 border border-brand-violet/30 text-sm flex items-center justify-between gap-2">
            <span className="text-brand-ice truncate">{shareLink}</span>
            <span className="text-xs text-brand-muted flex-shrink-0">Copiado ✓</span>
          </div>
        )}
        {b2bImportResult && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${b2bImportResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
            {b2bImportResult.error || `Importado: ${b2bImportResult.inserted} nuevos${b2bImportResult.updated ? `, ${b2bImportResult.updated} actualizados` : ''}.`}
          </div>
        )}

        {b2bDashboard && b2bDashboard.total_contacted > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-brand-panel border border-brand-border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Users size={11} /> Contactados</div>
              <div className="text-lg font-headline font-semibold">{b2bDashboard.total_contacted}</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-brand-ice text-xs mb-1"><CalendarCheck size={11} /> Reuniones</div>
              <div className="text-lg font-headline font-semibold text-brand-ice">{b2bDashboard.total_meetings}</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><Percent size={11} /> Conversión</div>
              <div className="text-lg font-headline font-semibold text-green-300">{b2bDashboard.conversion_rate}%</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={11} /> Este mes</div>
              <div className="text-lg font-headline font-semibold text-yellow-300">{b2bDashboard.meetings_this_month}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {B2B_STATUSES.map((status) => (
            <div
              key={status.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => updateB2bStatus(e.dataTransfer.getData('recordId'), status.key)}
              className="bg-brand-panel/60 border border-brand-border rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-manrope font-medium">{status.label}</span>
                <span className="text-brand-muted font-tech text-xs bg-brand-bg px-1.5 py-0.5 rounded-full">
                  {b2bRecords.filter((r) => r.status === status.key).length}
                </span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {b2bRecords.filter((r) => r.status === status.key).map((r) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('recordId', r.id)}
                    className="bg-brand-bg border border-brand-border rounded-lg p-2 cursor-move hover:border-brand-violet transition"
                  >
                    <div className="text-xs font-medium">{r.target_company}</div>
                    {r.target_contact && <div className="text-[10px] text-brand-muted">{r.target_contact}</div>}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-brand-muted">
                      {r.industry && <span>{r.industry}</span>}
                      {r.country && <span>· {r.country}</span>}
                    </div>
                    {r.meeting_date && <div className="text-[10px] text-brand-ice font-tech mt-0.5">{new Date(r.meeting_date).toLocaleDateString()}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
