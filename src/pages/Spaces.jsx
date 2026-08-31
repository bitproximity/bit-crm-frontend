import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { Boxes, ChevronRight, ChevronDown, FolderKanban, Plus, Trash2 } from 'lucide-react';

const COLORS = ['#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444'];

export default function Spaces() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [spaces, setSpaces] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [projectsBySpace, setProjectsBySpace] = useState({});
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [spaceForm, setSpaceForm] = useState({ name: '', color: COLORS[0] });
  const [newProjectFor, setNewProjectFor] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', type: 'onboarding_cliente' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setError('');
    return api.get('/api/spaces')
      .then((data) => { setSpaces(data); setLoading(false); })
      .catch((err) => { setError(err.message || 'No se pudieron cargar los espacios.'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (spaceId) => {
    const isOpen = expanded[spaceId];
    setExpanded((prev) => ({ ...prev, [spaceId]: !isOpen }));
    if (!isOpen && !projectsBySpace[spaceId]) {
      try {
        const data = await api.get(`/api/spaces/${spaceId}`);
        setProjectsBySpace((prev) => ({ ...prev, [spaceId]: data.projects }));
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los proyectos de este espacio.');
      }
    }
  };

  const createSpace = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/spaces', spaceForm);
      setSpaceForm({ name: '', color: COLORS[0] });
      setShowNewSpace(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo crear el espacio.');
    }
  };

  const deleteSpace = async (spaceId) => {
    const ok = await confirm({
      title: 'Eliminar espacio',
      message: '¿Eliminar este espacio? Los proyectos que contiene quedarán sin espacio asignado.',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await api.delete(`/api/spaces/${spaceId}`);
    load();
  };

  const createProject = async (e, spaceId) => {
    e.preventDefault();
    await api.post('/api/projects', {
      name: projectForm.name,
      type: projectForm.type,
      space_id: spaceId,
      start_date: new Date().toISOString().slice(0, 10),
    });
    setProjectForm({ name: '', type: 'onboarding_cliente' });
    setNewProjectFor(null);
    const data = await api.get(`/api/spaces/${spaceId}`);
    setProjectsBySpace((prev) => ({ ...prev, [spaceId]: data.projects }));
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, project_count: s.project_count + 1 } : s)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Espacios</h1>
        <button
          onClick={() => setShowNewSpace(!showNewSpace)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={14} /> Nuevo espacio
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">{spaces.length} espacios · agrupan tus proyectos por marca, país o equipo</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {showNewSpace && (
        <form onSubmit={createSpace} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <input
            autoFocus placeholder="Nombre del espacio (ej. Bit Colombia)" required
            value={spaceForm.name} onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => setSpaceForm({ ...spaceForm, color: c })}
                className={`w-6 h-6 rounded-full ${spaceForm.color === c ? 'ring-2 ring-offset-2 ring-offset-brand-panel ring-brand-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">Crear</button>
        </form>
      )}

      <div className="space-y-2">
        {spaces.map((s, i) => (
          <div
            key={s.id}
            className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden panel-depth stagger-item"
            style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
          >
            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}22)` }} />
            <div
              onClick={() => toggleExpand(s.id)}
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer row-hover group"
            >
              <div className="flex items-center gap-3">
                <span className="text-brand-muted transition-transform" style={{ transform: expanded[s.id] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                  <ChevronDown size={15} />
                </span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}99)`, boxShadow: `0 4px 12px ${s.color}30` }}>
                  <Boxes size={16} className="text-white" />
                </div>
                <div>
                  <div className="font-manrope font-medium">{s.name}</div>
                  <span className="text-xs text-brand-muted font-tech">{s.project_count} proyecto{s.project_count === 1 ? '' : 's'}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSpace(s.id); }}
                className="icon-btn p-1.5 rounded-lg text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Eliminar espacio"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {expanded[s.id] && (
              <div className="border-t border-brand-border p-3 space-y-1.5 dropdown-in">
                {(projectsBySpace[s.id] || []).map((p, pi) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer row-hover stagger-item"
                    style={{ animationDelay: `${Math.min(pi, 15) * 20}ms` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-brand-bg flex items-center justify-center flex-shrink-0">
                        <FolderKanban size={12} className="text-brand-muted" />
                      </span>
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <ChevronRight size={13} className="text-brand-muted" />
                  </div>
                ))}
                {(projectsBySpace[s.id] || []).length === 0 && (
                  <div className="text-brand-muted text-xs px-3 py-3 text-center border border-dashed border-brand-border rounded-lg">
                    Sin proyectos en este espacio todavía.
                  </div>
                )}

                {newProjectFor === s.id ? (
                  <form onSubmit={(e) => createProject(e, s.id)} className="flex gap-2 px-1 pt-2">
                    <input
                      autoFocus placeholder="Nombre del proyecto" required
                      value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet"
                    />
                    <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-xs font-medium">Crear</button>
                    <button type="button" onClick={() => setNewProjectFor(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                  </form>
                ) : (
                  <button
                    onClick={() => setNewProjectFor(s.id)}
                    className="flex items-center gap-1.5 text-xs text-brand-ice hover:underline px-1 pt-1"
                  >
                    <Plus size={12} /> Añadir proyecto
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {spaces.length === 0 && (
          <div className="text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
            Sin espacios todavía. Crea uno para agrupar tus proyectos por marca o país.
          </div>
        )}
      </div>
    </div>
  );
}
