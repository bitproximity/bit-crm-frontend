import { SkeletonLine } from '../components/Skeleton';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { ChevronDown as ChevronDownIcon, Pencil as PencilIcon, Trash2 as Trash2Icon, GripVertical as GripVerticalIcon, X as XIcon } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';

const MCP_URL = `${import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app'}/mcp`;

export default function Settings() {
  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Configuración</h1>
      <TeamAdmin />
      <CustomFieldsAdmin />
      <PipelinesAdmin />
      <ExchangeRatesAdmin />
      <McpKeysAdmin />
    </div>
  );
}

const ENTITY_TYPES = [
  { key: 'deal', label: 'Deals' },
  { key: 'contact', label: 'Contactos' },
  { key: 'company', label: 'Empresas' },
  { key: 'task', label: 'Tareas' },
  { key: 'project', label: 'Proyectos' },
];

function CustomFieldsAdmin() {
  const [entityType, setEntityType] = useState('deal');
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ key: '', label: '', field_type: 'text', options: '' });

  const load = (type) => api.get(`/api/custom-fields?entity_type=${type}`).then(setFields).catch(console.error);

  useEffect(() => {
    load(entityType);
  }, [entityType]);

  const create = async (e) => {
    e.preventDefault();
    const payload = {
      entity_type: entityType,
      key: form.key || form.label.toLowerCase().replace(/\s+/g, '_'),
      label: form.label,
      field_type: form.field_type,
      options: form.field_type === 'select' ? form.options.split(',').map((o) => o.trim()) : null,
    };
    await api.post('/api/custom-fields', payload);
    setForm({ key: '', label: '', field_type: 'text', options: '' });
    load(entityType);
  };

  const remove = async (id) => {
    await api.delete(`/api/custom-fields/${id}`);
    load(entityType);
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mt-4">
      <div className="font-manrope font-medium mb-1">Campos personalizados</div>
      <p className="text-brand-muted text-sm mb-4">
        Define campos extra para cada tipo de registro. Se editan desde el panel de detalle correspondiente.
      </p>

      <div className="flex gap-1.5 mb-4">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setEntityType(t.key)}
            className={`px-3 py-1 rounded-lg text-xs font-tech ${entityType === t.key ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'bg-brand-bg text-brand-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 mb-4">
        {fields.map((f) => (
          <div key={f.id} className="flex justify-between items-center text-sm bg-brand-bg rounded-lg px-3 py-2">
            <span>{f.label} <span className="text-brand-muted text-xs font-tech ml-2">{f.field_type}</span></span>
            <button onClick={() => remove(f.id)} className="text-brand-muted hover:text-red-400 text-xs">Eliminar</button>
          </div>
        ))}
        {fields.length === 0 && <div className="text-brand-muted text-xs">Sin campos personalizados para {ENTITY_TYPES.find((t) => t.key === entityType)?.label}.</div>}
      </div>

      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input
          placeholder="Nombre del campo (ej. Número de sucursales)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
        />
        <select
          value={form.field_type}
          onChange={(e) => setForm({ ...form, field_type: e.target.value })}
          className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
        >
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="date">Fecha</option>
          <option value="boolean">Sí/No</option>
          <option value="select">Lista de opciones</option>
        </select>
        {form.field_type === 'select' && (
          <input
            placeholder="Opciones separadas por coma"
            value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
        )}
        <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
          Agregar campo
        </button>
      </form>
    </div>
  );
}

function PipelinesAdmin() {
  const confirm = useConfirm();
  const [pipelines, setPipelines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [stageName, setStageName] = useState('');
  const [editingPipelineId, setEditingPipelineId] = useState(null);
  const [editPipelineName, setEditPipelineName] = useState('');
  const [editingStageId, setEditingStageId] = useState(null);
  const [editStageName, setEditStageName] = useState('');
  const [error, setError] = useState('');
  const dragIndex = useRef(null);
  const [dragOverPipelineId, setDragOverPipelineId] = useState(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [cloneTargetIds, setCloneTargetIds] = useState([]);
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [cloneReplace, setCloneReplace] = useState(true);

  const load = () => api.get('/api/pipelines').then(setPipelines).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/api/pipelines', { name });
    setName('');
    setShowForm(false);
    load();
  };

  const addStage = async (e, pipelineId) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/pipelines/${pipelineId}/stages`, { name: stageName });
      setStageName('');
      load();
    } catch (err) {
      setError(err.message || 'No se pudo agregar la etapa.');
    }
  };

  const startEditPipeline = (p) => {
    setEditingPipelineId(p.id);
    setEditPipelineName(p.name);
  };

  const saveEditPipeline = async (pipelineId) => {
    await api.patch(`/api/pipelines/${pipelineId}`, { name: editPipelineName });
    setEditingPipelineId(null);
    load();
  };

  const deletePipeline = async (pipelineId, pipelineName) => {
    const ok = await confirm({
      title: 'Borrar pipeline',
      message: `¿Borrar "${pipelineName}"? Solo se puede si no tiene deals asociados.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/api/pipelines/${pipelineId}`);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo borrar el pipeline');
    }
  };

  const startEditStage = (s) => {
    setEditingStageId(s.id);
    setEditStageName(s.name);
  };

  const saveEditStage = async (stageId) => {
    await api.patch(`/api/pipelines/stages/${stageId}`, { name: editStageName });
    setEditingStageId(null);
    load();
  };

  const deleteStage = async (stageId, stageName) => {
    const ok = await confirm({
      title: 'Borrar etapa',
      message: `¿Borrar "${stageName}"? Solo se puede si no tiene deals en ella.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/api/pipelines/stages/${stageId}`);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo borrar la etapa');
    }
  };

  // Drag & drop para reordenar etapas dentro de un pipeline — reemplaza las flechas ↑↓ de antes.
  const handleStageDragOver = (pipelineId, overIndex) => {
    if (dragIndex.current === null || dragOverPipelineId !== pipelineId) return;
    if (dragIndex.current === overIndex) return;
    setPipelines((prev) => prev.map((p) => {
      if (p.id !== pipelineId) return p;
      const sorted = [...p.pipeline_stages].sort((a, b) => a.position - b.position);
      const [moved] = sorted.splice(dragIndex.current, 1);
      sorted.splice(overIndex, 0, moved);
      dragIndex.current = overIndex;
      return { ...p, pipeline_stages: sorted.map((s, i) => ({ ...s, position: i })) };
    }));
  };

  const saveStageOrder = async (pipelineId) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const sorted = [...pipeline.pipeline_stages].sort((a, b) => a.position - b.position);
    setDragOverPipelineId(null);
    dragIndex.current = null;
    try {
      await api.patch(`/api/pipelines/${pipelineId}/stages/reorder`, { ordered_ids: sorted.map((s) => s.id) });
      load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el orden.');
      load();
    }
  };

  const toggleCloneTarget = (id) => {
    setCloneTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runCloneStages = async () => {
    if (!cloneSourceId || cloneTargetIds.length === 0) return;
    setCloning(true);
    setCloneResult(null);
    try {
      const result = await api.post('/api/pipelines/clone-stages', { source_pipeline_id: cloneSourceId, target_pipeline_ids: cloneTargetIds, replace: cloneReplace });
      setCloneResult(result.summary);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo clonar.');
    }
    setCloning(false);
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-manrope font-medium">Pipelines</div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCloneModal(true)} className="text-xs text-brand-ice hover:underline">
            Clonar etapas entre pipelines
          </button>
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-ice hover:underline">
            + Nuevo pipeline
          </button>
        </div>
      </div>
      <p className="text-brand-muted text-sm mb-4">
        Crea un pipeline distinto por marca, país, o vertical — cada uno con sus propias etapas.
        Click en un pipeline para editar sus etapas: arrastra para reordenar, o usa Editar/Borrar.
      </p>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="mb-4 flex gap-2">
          <input
            placeholder="Nombre del pipeline (ej. Ventas — Bit Music)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      <div className="space-y-2">
        {pipelines.map((p, i) => {
          const sortedStages = [...(p.pipeline_stages || [])].sort((a, b) => a.position - b.position);
          const isExpanded = expandedId === p.id;
          return (
            <div
              key={p.id}
              className={`bg-brand-bg rounded-lg overflow-hidden border stagger-item transition ${isExpanded ? 'border-brand-violet/40' : 'border-transparent'}`}
              style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
            >
              <div className="flex justify-between items-center text-sm px-3 py-2.5">
                {editingPipelineId === p.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      value={editPipelineName}
                      onChange={(e) => setEditPipelineName(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 rounded bg-brand-panel border border-brand-border text-sm"
                    />
                    <button onClick={() => saveEditPipeline(p.id)} className="text-xs text-brand-ice hover:underline">Guardar</button>
                    <button onClick={() => setEditingPipelineId(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      <ChevronDownIcon size={14} className={`text-brand-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      <span className="font-medium">{p.name}</span>
                    </button>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-brand-muted text-xs font-tech bg-brand-panel px-2 py-0.5 rounded-full">{sortedStages.length} etapas</span>
                      <button onClick={() => startEditPipeline(p)} className="icon-btn text-brand-muted hover:text-brand-ice" title="Renombrar">
                        <PencilIcon size={13} />
                      </button>
                      <button onClick={() => deletePipeline(p.id, p.name)} className="icon-btn text-brand-muted hover:text-red-400" title="Borrar pipeline">
                        <Trash2Icon size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-brand-border/50 dropdown-in">
                  <div className="space-y-1 mb-2">
                    {sortedStages.map((s, stageIdx) => (
                      editingStageId === s.id ? (
                        <div key={s.id} className="flex items-center gap-2 bg-brand-panel rounded-lg px-2.5 py-2">
                          <input
                            value={editStageName}
                            onChange={(e) => setEditStageName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveEditStage(s.id)}
                            className="flex-1 px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs"
                          />
                          <button onClick={() => saveEditStage(s.id)} className="text-xs text-brand-ice hover:underline whitespace-nowrap">Guardar</button>
                          <button onClick={() => setEditingStageId(null)} className="text-xs text-brand-muted hover:underline whitespace-nowrap">Cancelar</button>
                        </div>
                      ) : (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={() => { dragIndex.current = stageIdx; setDragOverPipelineId(p.id); }}
                          onDragOver={(e) => { e.preventDefault(); handleStageDragOver(p.id, stageIdx); }}
                          onDragEnd={() => saveStageOrder(p.id)}
                          className="flex items-center justify-between gap-2 bg-brand-panel rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-brand-panel/70 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVerticalIcon size={13} className="text-brand-muted flex-shrink-0" />
                            <span className="text-xs text-brand-white truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                            <button onClick={() => startEditStage(s)} className="icon-btn p-1 text-brand-muted hover:text-brand-ice" title="Renombrar">
                              <PencilIcon size={12} />
                            </button>
                            <button onClick={() => deleteStage(s.id, s.name)} className="icon-btn p-1 text-brand-muted hover:text-red-400" title="Borrar">
                              <Trash2Icon size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                    {sortedStages.length === 0 && (
                      <div className="text-brand-muted text-xs text-center py-3 border border-dashed border-brand-border rounded-lg">
                        Sin etapas todavía.
                      </div>
                    )}
                  </div>
                  <form onSubmit={(e) => addStage(e, p.id)} className="flex gap-2">
                    <input
                      placeholder="Nombre de la nueva etapa"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      required
                      className="flex-1 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                    />
                    <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium whitespace-nowrap">
                      Agregar etapa
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 overlay-in" onClick={() => setShowCloneModal(false)} />
          <div className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <span className="font-headline text-base font-semibold">Clonar etapas entre pipelines</span>
              <button onClick={() => setShowCloneModal(false)} className="text-brand-muted hover:text-brand-white"><XIcon size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border cursor-pointer">
                <input type="checkbox" checked={cloneReplace} onChange={(e) => setCloneReplace(e.target.checked)} className="accent-brand-violet mt-0.5" />
                <div>
                  <div className="text-sm text-brand-white">Reemplazar (recomendado)</div>
                  <div className="text-xs text-brand-muted mt-0.5">
                    {cloneReplace
                      ? 'Borra las etapas del destino que NO estén en el origen. Si tenían tratos, se mueven automáticamente a la primera etapa del set nuevo — no se pierden.'
                      : 'Solo agrega las etapas que falten, deja intactas todas las demás (puede quedar con etapas repetidas de más).'}
                  </div>
                </div>
              </label>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Pipeline de origen (de dónde copiar)</label>
                <select value={cloneSourceId} onChange={(e) => setCloneSourceId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm">
                  <option value="">Elige uno</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Pipelines destino</label>
                <div className="space-y-1 max-h-52 overflow-y-auto border border-brand-border rounded-lg p-2">
                  {pipelines.filter((p) => p.id !== cloneSourceId).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-brand-bg cursor-pointer text-sm">
                      <input type="checkbox" checked={cloneTargetIds.includes(p.id)} onChange={() => toggleCloneTarget(p.id)} className="accent-brand-violet" />
                      {p.name}
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setCloneTargetIds(pipelines.filter((p) => p.id !== cloneSourceId).map((p) => p.id))}
                  className="text-xs text-brand-ice hover:underline mt-1"
                >
                  Seleccionar todos
                </button>
              </div>

              {cloneResult && (
                <div className="space-y-1.5 text-xs">
                  {cloneResult.map((r) => {
                    const p = pipelines.find((x) => x.id === r.pipeline_id);
                    return (
                      <div key={r.pipeline_id} className={`px-2.5 py-2 rounded-lg ${r.error ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>
                        <strong>{p?.name}</strong>
                        {r.error ? `: ${r.error}` : (
                          <div className="mt-1 space-y-0.5">
                            {r.added?.length > 0 && <div>+ Agregadas: {r.added.join(', ')}</div>}
                            {r.removed?.length > 0 && <div>− Borradas: {r.removed.join(', ')}</div>}
                            {r.moved_deals > 0 && <div>↷ {r.moved_deals} trato(s) reubicados a la primera etapa</div>}
                            {!r.added?.length && !r.removed?.length && <div>Ya estaba igual al origen.</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-brand-border flex justify-end gap-2">
              <button onClick={() => { setShowCloneModal(false); setCloneResult(null); }} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cerrar</button>
              <button
                onClick={runCloneStages}
                disabled={!cloneSourceId || cloneTargetIds.length === 0 || cloning}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50"
              >
                {cloning ? 'Clonando...' : 'Clonar etapas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ExchangeRatesAdmin() {
  const ALL_CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];
  const [rates, setRates] = useState(null);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/api/exchange-rates').then(setRates).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const startEdit = (currency, current) => {
    setEditingCurrency(currency);
    setEditValue(current != null ? String(current) : '');
  };

  const save = async (currency) => {
    const value = Number(editValue);
    if (!value || value <= 0) { setError('El tipo de cambio tiene que ser un número mayor a 0.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/exchange-rates', { currency, rate_to_usd: value });
      setEditingCurrency(null);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    }
    setSaving(false);
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mt-4">
      <div className="font-manrope font-medium mb-1">Tipos de cambio</div>
      <p className="text-brand-muted text-sm mb-4">
        A cuánto equivale 1 unidad de cada moneda en USD — se usa para sumar tratos de distintas
        monedas en el pipeline (Total por etapa, Vista Valor) sin mezclarlos sin convertir.
      </p>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        {ALL_CURRENCIES.map((currency) => {
          const row = rates?.find((r) => r.currency === currency);
          const isUsd = currency === 'USD';
          return (
            <div key={currency} className="flex items-center justify-between bg-brand-bg rounded-lg px-3 py-2.5">
              <span className="font-tech text-sm">{currency}</span>
              {editingCurrency === currency ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-muted">1 {currency} =</span>
                  <input
                    autoFocus type="number" step="any" value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save(currency)}
                    className="w-28 px-2 py-1 rounded bg-brand-panel border border-brand-border text-sm font-tech"
                  />
                  <span className="text-xs text-brand-muted">USD</span>
                  <button onClick={() => save(currency)} disabled={saving} className="text-xs text-brand-ice hover:underline disabled:opacity-50">Guardar</button>
                  <button onClick={() => setEditingCurrency(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                </div>
              ) : (
                <button
                  onClick={() => !isUsd && startEdit(currency, row?.rate_to_usd)}
                  disabled={isUsd}
                  className={`text-sm font-tech ${isUsd ? 'text-brand-muted cursor-default' : row ? 'text-brand-ice hover:underline' : 'text-yellow-300 hover:underline'}`}
                >
                  {isUsd ? '1 USD (fijo)' : row ? `1 ${currency} = ${row.rate_to_usd} USD` : 'Sin configurar — click para agregar'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamAdmin() {
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'operaciones' });
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = () => api.get('/api/team').then(setMembers).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    try {
      await api.post('/api/team/invite', form);
      setForm({ full_name: '', email: '', role: 'operaciones' });
      setShowInvite(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo invitar al usuario.');
    }
    setInviting(false);
  };

  const changeRole = async (id, role) => {
    setError('');
    try {
      await api.patch(`/api/team/${id}`, { role });
      load();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el rol.');
    }
  };

  const deactivate = async (id, name) => {
    const ok = await confirm({
      title: 'Quitar acceso',
      message: `¿Quitar el acceso de ${name}? Ya no va a poder iniciar sesión en el CRM.`,
      confirmLabel: 'Quitar acceso',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/api/team/${id}`);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo quitar el acceso.');
    }
  };

  const reactivate = async (id) => {
    setError('');
    try {
      await api.patch(`/api/team/${id}`, { active: true });
      load();
    } catch (err) {
      setError(err.message || 'No se pudo reactivar el acceso.');
    }
  };

  const [resendingId, setResendingId] = useState(null);
  const [resentId, setResentId] = useState(null);

  const resendAccess = async (id) => {
    setResendingId(id);
    setError('');
    try {
      await api.post(`/api/team/${id}/resend-access`, {});
      setResentId(id);
      setTimeout(() => setResentId(null), 3000);
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el acceso.');
    }
    setResendingId(null);
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="font-manrope font-medium">Equipo y permisos</div>
        <button onClick={() => setShowInvite(!showInvite)} className="text-xs text-brand-ice hover:underline">
          + Invitar persona
        </button>
      </div>
      <p className="text-brand-muted text-xs mb-4">
        Da acceso a tu equipo al CRM. Cada invitación envía un correo real para que la persona cree su contraseña.
      </p>

      {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

      {showInvite && (
        <form onSubmit={invite} className="mb-4 bg-brand-bg border border-brand-border rounded-lg p-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-brand-muted mb-1">Nombre</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-brand-muted mb-1">Correo</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm" />
          </div>
          <div>
            <label className="block text-xs text-brand-muted mb-1">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm">
              <option value="admin">Admin</option>
              <option value="outbound">Outbound</option>
              <option value="operaciones">Operaciones</option>
            </select>
          </div>
          <button disabled={inviting} className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium disabled:opacity-50">
            {inviting ? 'Enviando...' : 'Invitar'}
          </button>
        </form>
      )}

      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${m.active ? 'bg-brand-bg' : 'bg-brand-bg/40'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center text-[10px] font-tech font-bold flex-shrink-0">
                {(m.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className={`text-sm truncate ${!m.active ? 'text-brand-muted line-through' : ''}`}>{m.full_name}</div>
                <div className="text-xs text-brand-muted truncate">{m.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={m.role || ''}
                onChange={(e) => changeRole(m.id, e.target.value)}
                disabled={!m.active}
                className="px-2 py-1 rounded bg-brand-panel border border-brand-border text-xs disabled:opacity-50"
              >
                <option value="admin">Admin</option>
                <option value="outbound">Outbound</option>
                <option value="operaciones">Operaciones</option>
              </select>
              {m.active ? (
                <>
                  <button onClick={() => resendAccess(m.id)} disabled={resendingId === m.id} className="text-xs text-brand-ice hover:underline disabled:opacity-50">
                    {resendingId === m.id ? 'Enviando...' : resentId === m.id ? 'Enviado ✓' : 'Reenviar acceso'}
                  </button>
                  <button onClick={() => deactivate(m.id, m.full_name)} className="text-xs text-brand-muted hover:text-red-400">Quitar acceso</button>
                </>
              ) : (
                <button onClick={() => reactivate(m.id)} className="text-xs text-brand-ice hover:underline">Reactivar</button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && <div className="text-brand-muted text-xs">Sin miembros todavía.</div>}
      </div>
    </div>
  );
}

function McpKeysAdmin() {
  const confirm = useConfirm();
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState(null); // se muestra una sola vez tras crearla
  const [label, setLabel] = useState('Claude Desktop');
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/api/mcp-keys').then(setKeys).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    const result = await api.post('/api/mcp-keys', { label });
    setNewKey(result.key);
    setLabel('Claude Desktop');
    setShowForm(false);
    load();
  };

  const revoke = async (id) => {
    const ok = await confirm({
      title: 'Revocar API key',
      message: '¿Revocar esta API key? Cualquier integración que la use dejará de funcionar.',
      confirmLabel: 'Revocar',
    });
    if (!ok) return;
    await api.delete(`/api/mcp-keys/${id}`);
    load();
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-manrope font-medium">Claude / MCP</div>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-ice hover:underline">
          + Generar API key
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-4">
        Conecta este CRM a Claude Desktop o la API de Claude para consultar y
        modificar datos en lenguaje natural. Ver el README del servidor MCP para
        la instalación completa.
      </p>

      <div className="mb-4 px-4 py-3 bg-brand-bg border border-brand-border rounded-lg">
        <div className="text-xs text-brand-muted mb-1">URL del servidor MCP:</div>
        <div className="font-tech text-sm text-brand-ice break-all select-all">{MCP_URL}</div>
      </div>

      {newKey && (
        <div className="mb-4 px-4 py-3 bg-brand-violet/10 border border-brand-violet/30 rounded-lg">
          <div className="text-xs text-brand-muted mb-1">
            Copiala ahora — no se vuelve a mostrar completa:
          </div>
          <div className="font-tech text-sm text-brand-ice break-all select-all">{newKey}</div>
          <button onClick={() => setNewKey(null)} className="text-xs text-brand-muted hover:text-brand-white mt-2">
            Ya la copié, cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={generate} className="mb-4 flex gap-2">
          <input
            placeholder="Nombre (ej. Claude Desktop, laptop trabajo)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Generar
          </button>
        </form>
      )}

      <div className="space-y-1.5">
        {activeKeys.map((k) => (
          <div key={k.id} className="flex justify-between items-center text-sm bg-brand-bg rounded-lg px-3 py-2">
            <div>
              <span>{k.label}</span>
              <span className="text-brand-muted text-xs font-tech ml-2">····{k.key_preview}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-brand-muted text-xs">
                {k.last_used_at ? `usado ${new Date(k.last_used_at).toLocaleDateString()}` : 'nunca usado'}
              </span>
              <button onClick={() => revoke(k.id)} className="text-brand-muted hover:text-red-400 text-xs">
                Revocar
              </button>
            </div>
          </div>
        ))}
        {activeKeys.length === 0 && <div className="text-brand-muted text-xs">Sin API keys generadas todavía.</div>}
      </div>
    </div>
  );
}
