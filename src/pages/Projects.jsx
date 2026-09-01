import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { FolderKanban, Calendar, Plus, X, Building2, DollarSign, LayoutGrid, List } from 'lucide-react';
import { colorForName, initials } from '../lib/avatar';

const PROJECT_TYPES = [
  { key: 'onboarding_cliente', label: 'Onboarding de cliente' },
  { key: 'instalacion', label: 'Instalación' },
  { key: 'implementacion', label: 'Implementación' },
  { key: 'soporte', label: 'Soporte' },
  { key: 'otro', label: 'Otro' },
];

function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('onboarding_cliente');
  const [dueDate, setDueDate] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dealQuery, setDealQuery] = useState('');
  const [dealResults, setDealResults] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyQuery.trim() || selectedCompany?.name === companyQuery) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companyQuery.trim())}&limit=6`).then(setCompanyResults).catch(() => setCompanyResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [companyQuery, selectedCompany]);

  useEffect(() => {
    if (!dealQuery.trim() || selectedDeal?.title === dealQuery) { setDealResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/deals?search=${encodeURIComponent(dealQuery.trim())}&limit=6`).then((res) => setDealResults(Array.isArray(res) ? res : res.data || [])).catch(() => setDealResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dealQuery, selectedDeal]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const project = await api.post('/api/projects', {
        name: name.trim(),
        type,
        company_id: selectedCompany?.id || null,
        deal_id: selectedDeal?.id || null,
        due_date: dueDate || null,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'activo',
      });
      onCreated(project);
    } catch (err) {
      setError(err.message || 'No se pudo crear el proyecto.');
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 overlay-in" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <span className="font-headline text-base font-semibold">Nuevo proyecto</span>
          <button type="button" onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
          <div>
            <label className={labelClass}>Nombre</label>
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Onboarding — Rokys" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {PROJECT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className={labelClass}>Empresa</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                value={companyQuery}
                onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }}
                placeholder="Buscar empresa..."
                className={`${inputClass} pl-8`}
              />
            </div>
            {companyResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl dropdown-in max-h-40 overflow-y-auto">
                {companyResults.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setSelectedCompany(c); setCompanyQuery(c.name); setCompanyResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition truncate">
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className={labelClass}>Trato relacionado (opcional — ej. el trato que ganaste)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                value={dealQuery}
                onChange={(e) => { setDealQuery(e.target.value); setSelectedDeal(null); }}
                placeholder="Buscar trato..."
                className={`${inputClass} pl-8`}
              />
            </div>
            {dealResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl dropdown-in max-h-40 overflow-y-auto">
                {dealResults.map((d) => (
                  <button key={d.id} type="button" onClick={() => { setSelectedDeal(d); setDealQuery(d.title); setDealResults([]); if (!selectedCompany && d.companies?.name) setCompanyQuery(d.companies.name); }} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition truncate">
                    {d.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Fecha de vencimiento (opcional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="p-4 border-t border-brand-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
          <button disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </div>
  );
}

const typeLabel = (key) => PROJECT_TYPES.find((t) => t.key === key)?.label || key;

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState('lista');

  const load = () => api.get('/api/projects').then(setProjects).catch(console.error);

  useEffect(() => { load(); }, []);

  const statusColor = {
    activo: 'bg-green-500/15 text-green-300',
    pausado: 'bg-yellow-500/15 text-yellow-300',
    completado: 'bg-blue-500/15 text-blue-300',
    archivado: 'bg-brand-border text-brand-muted',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Proyectos</h1>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium">
          <Plus size={14} /> Nuevo proyecto
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">{projects.length} proyectos</p>

      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1">
          <button
            onClick={() => setView('lista')}
            className={`px-3 py-1.5 rounded-lg text-xs font-tech flex items-center gap-1.5 transition ${view === 'lista' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <List size={13} /> Lista
          </button>
          <button
            onClick={() => setView('tarjetas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-tech flex items-center gap-1.5 transition ${view === 'tarjetas' ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
          >
            <LayoutGrid size={13} /> Tarjetas
          </button>
        </div>
      </div>

      {view === 'lista' && (
        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Nombre</th>
                <th className="px-4 py-3 font-manrope font-normal">Empresa / Tipo</th>
                <th className="px-4 py-3 font-manrope font-normal">Estado</th>
                <th className="px-4 py-3 font-manrope font-normal">Tareas</th>
                <th className="px-4 py-3 font-manrope font-normal">Vence</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="border-t border-brand-border row-hover cursor-pointer stagger-item"
                  style={{ animationDelay: `${Math.min(i, 25) * 15}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-tech font-semibold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${colorForName(p.name)}, ${colorForName(p.name)}99)` }}
                      >
                        {initials(p.name) || <FolderKanban size={12} />}
                      </div>
                      <span className="truncate max-w-xs">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted truncate max-w-xs">{p.companies?.name || typeLabel(p.type)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted font-tech">{p.total_tasks}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-brand-muted text-sm">Sin proyectos aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'tarjetas' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((p, i) => (
          <Link
            to={`/projects/${p.id}`}
            key={p.id}
            className="card-elevated rounded-xl p-4 block stagger-item"
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-headline font-semibold text-sm text-white"
                style={{ background: `linear-gradient(135deg, ${colorForName(p.name)}, ${colorForName(p.name)}99)` }}
              >
                {initials(p.name) || <FolderKanban size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-manrope font-medium truncate">{p.name}</div>
                <div className="text-xs text-brand-muted truncate">{p.companies?.name || typeLabel(p.type)}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-tech flex-shrink-0 ${statusColor[p.status]}`}>
                {p.status}
              </span>
            </div>

            <div className="text-xs text-brand-muted font-tech text-right">
              {p.total_tasks} tareas
            </div>

            {p.due_date && (
              <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-3">
                <Calendar size={12} /> Vence: {new Date(p.due_date).toLocaleDateString()}
              </div>
            )}
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-3 text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
            Sin proyectos aún. Se crean automáticamente al ganar un deal con plantilla de onboarding, o dale a "+ Nuevo proyecto" para crear uno manual.
          </div>
        )}
      </div>
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
