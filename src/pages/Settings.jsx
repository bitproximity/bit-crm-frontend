import { SkeletonLine } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const MCP_URL = `${import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app'}/mcp`;

export default function Settings() {
  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Configuración</h1>
      <TeamAdmin />
      <CustomFieldsAdmin />
      <PipelinesAdmin />
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
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const position = (pipeline?.pipeline_stages?.length || 0) + 1;
    await api.post(`/api/pipelines/${pipelineId}/stages`, { name: stageName, position });
    setStageName('');
    load();
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

  const deletePipeline = async (pipelineId) => {
    if (!window.confirm('¿Borrar este pipeline? Solo se puede si no tiene deals asociados.')) return;
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

  const deleteStage = async (stageId) => {
    if (!window.confirm('¿Borrar esta etapa? Solo se puede si no tiene deals en ella.')) return;
    setError('');
    try {
      await api.delete(`/api/pipelines/stages/${stageId}`);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo borrar la etapa');
    }
  };

  const moveStage = async (pipelineId, stageId, direction) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const sorted = [...(pipeline?.pipeline_stages || [])].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((s) => s.id === stageId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const swapWith = sorted[swapIndex];

    // Actualiza el estado local al toque para que se sienta instantáneo, y confirma con el backend
    setPipelines((prev) => prev.map((p) => {
      if (p.id !== pipelineId) return p;
      return {
        ...p,
        pipeline_stages: p.pipeline_stages.map((s) => {
          if (s.id === current.id) return { ...s, position: swapWith.position };
          if (s.id === swapWith.id) return { ...s, position: current.position };
          return s;
        }),
      };
    }));

    await Promise.all([
      api.patch(`/api/pipelines/stages/${current.id}`, { position: swapWith.position }),
      api.patch(`/api/pipelines/stages/${swapWith.id}`, { position: current.position }),
    ]);
    load();
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth mt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-manrope font-medium">Pipelines</div>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-ice hover:underline">
          + Nuevo pipeline
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-4">
        Crea un pipeline distinto por marca, país, o vertical — cada uno con sus propias etapas.
        Click en un pipeline para editar sus etapas.
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

      <div className="space-y-1.5">
        {pipelines.map((p) => (
          <div key={p.id} className="bg-brand-bg rounded-lg px-3 py-2">
            <div className="flex justify-between items-center text-sm">
              {editingPipelineId === p.id ? (
                <div className="flex gap-2 flex-1">
                  <input
                    value={editPipelineName}
                    onChange={(e) => setEditPipelineName(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded bg-brand-panel border border-brand-border text-sm"
                  />
                  <button onClick={() => saveEditPipeline(p.id)} className="text-xs text-brand-ice hover:underline">
                    Guardar
                  </button>
                  <button onClick={() => setEditingPipelineId(null)} className="text-xs text-brand-muted hover:underline">
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="cursor-pointer flex-1"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    {p.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-brand-muted text-xs font-tech">{p.pipeline_stages?.length || 0} etapas</span>
                    <button onClick={() => startEditPipeline(p)} className="text-xs text-brand-muted hover:text-brand-ice">
                      Editar
                    </button>
                    <button onClick={() => deletePipeline(p.id)} className="text-xs text-brand-muted hover:text-red-400">
                      Borrar
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="text-brand-muted text-xs"
                    >
                      {expandedId === p.id ? '▾' : '▸'}
                    </button>
                  </div>
                </>
              )}
            </div>
            {expandedId === p.id && (
              <div className="mt-2 pt-2 border-t border-brand-border/50">
                <div className="space-y-1 mb-2">
                  {(p.pipeline_stages || []).sort((a, b) => a.position - b.position).map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-brand-panel rounded px-2 py-1.5">
                      {editingStageId === s.id ? (
                        <div className="flex gap-2 flex-1 items-center">
                          <input
                            value={editStageName}
                            onChange={(e) => setEditStageName(e.target.value)}
                            autoFocus
                            className="flex-1 px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs"
                          />
                          <button onClick={() => saveEditStage(s.id)} className="text-xs text-brand-ice hover:underline">
                            Guardar
                          </button>
                          <button onClick={() => setEditingStageId(null)} className="text-xs text-brand-muted hover:underline">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-brand-muted font-tech">{s.position}. {s.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => moveStage(p.id, s.id, 'up')} className="text-xs text-brand-muted hover:text-brand-ice disabled:opacity-20" disabled={s === (p.pipeline_stages || []).slice().sort((a, b) => a.position - b.position)[0]}>
                              ↑
                            </button>
                            <button onClick={() => moveStage(p.id, s.id, 'down')} className="text-xs text-brand-muted hover:text-brand-ice disabled:opacity-20" disabled={s === (p.pipeline_stages || []).slice().sort((a, b) => a.position - b.position).slice(-1)[0]}>
                              ↓
                            </button>
                            <button onClick={() => startEditStage(s)} className="text-xs text-brand-muted hover:text-brand-ice">
                              Editar
                            </button>
                            <button onClick={() => deleteStage(s.id)} className="text-xs text-brand-muted hover:text-red-400">
                              Borrar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => addStage(e, p.id)} className="flex gap-2">
                  <input
                    placeholder="Nombre de la nueva etapa"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    required
                    className="flex-1 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                  />
                  <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">
                    Agregar etapa
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function TeamAdmin() {
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
    if (!window.confirm(`¿Quitar el acceso de ${name}? Ya no va a poder iniciar sesión en el CRM.`)) return;
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
    if (!window.confirm('¿Revocar esta API key? Cualquier integración que la use dejará de funcionar.')) return;
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
