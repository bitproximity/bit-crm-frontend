import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Boxes, ChevronRight, ChevronDown, FolderKanban, Plus } from 'lucide-react';

const COLORS = ['#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444'];

export default function Spaces() {
  const navigate = useNavigate();
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
    if (!window.confirm('¿Eliminar este espacio? Los proyectos que contiene quedarán sin espacio asignado.')) return;
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
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm flex items-center gap-1.5"
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
        {spaces.map((s) => (
          <div key={s.id} className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
            <div
              onClick={() => toggleExpand(s.id)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-brand-bg/40 transition"
            >
              <div className="flex items-center gap-2.5">
                {expanded[s.id] ? <ChevronDown size={15} className="text-brand-muted" /> : <ChevronRight size={15} className="text-brand-muted" />}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}25` }}>
                  <Boxes size={14} style={{ color: s.color }} />
                </div>
                <span className="font-manrope font-medium">{s.name}</span>
                <span className="text-xs text-brand-muted font-tech">{s.project_count} proyectos</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSpace(s.id); }}
                className="text-brand-muted hover:text-red-400 text-xs px-2"
              >
                Eliminar
              </button>
            </div>

            {expanded[s.id] && (
              <div className="border-t border-brand-border p-3 space-y-1.5">
                {(projectsBySpace[s.id] || []).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-brand-bg cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderKanban size={14} className="text-brand-muted" />
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta" style={{ width: `${p.progress_pct}%` }} />
                      </div>
                      <span className="text-xs text-brand-muted font-tech w-8 text-right">{p.progress_pct}%</span>
                    </div>
                  </div>
                ))}
                {(projectsBySpace[s.id] || []).length === 0 && (
                  <div className="text-brand-muted text-xs px-3 py-2">Sin proyectos en este espacio todavía.</div>
                )}

                {newProjectFor === s.id ? (
                  <form onSubmit={(e) => createProject(e, s.id)} className="flex gap-2 px-3 pt-2">
                    <input
                      autoFocus placeholder="Nombre del proyecto" required
                      value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs"
                    />
                    <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Crear</button>
                    <button type="button" onClick={() => setNewProjectFor(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                  </form>
                ) : (
                  <button
                    onClick={() => setNewProjectFor(s.id)}
                    className="flex items-center gap-1.5 text-xs text-brand-ice hover:underline px-3 pt-1"
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
