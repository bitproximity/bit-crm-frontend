import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [gmail, setGmail] = useState(null);
  const [params] = useSearchParams();
  const gmailFlag = params.get('gmail');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const load = () => api.get('/api/gmail/status').then(setGmail).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    const { url } = await api.get('/api/gmail/connect');
    window.location.href = url;
  };

  const disconnect = async () => {
    await api.delete('/api/gmail/disconnect');
    load();
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden');
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) setPwError('No se pudo actualizar la contraseña.');
    else {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Configuración</h1>

      {gmailFlag === 'connected' && (
        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300">
          Gmail conectado correctamente.
        </div>
      )}
      {gmailFlag === 'error' && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          Hubo un error conectando Gmail. Intenta de nuevo.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-1">Cambiar contraseña</div>
          <p className="text-brand-muted text-sm mb-4">
            Define una contraseña nueva para tu cuenta.
          </p>
          <form onSubmit={changePassword}>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
            />
            {pwError && <p className="text-red-400 text-sm mb-3">{pwError}</p>}
            {pwSuccess && <p className="text-green-300 text-sm mb-3">Contraseña actualizada.</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {pwLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="font-manrope font-medium mb-1">Gmail</div>
          <p className="text-brand-muted text-sm mb-4">
            Conecta tu cuenta para ver y sincronizar el historial de correos con
            cada contacto directamente desde su ficha.
          </p>

          {gmail === null ? (
            <div className="text-brand-muted text-sm">Cargando...</div>
          ) : gmail.connected ? (
            <div>
              <div className="text-sm text-brand-ice font-tech mb-3">{gmail.email}</div>
              <button
                onClick={disconnect}
                className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-red-500 hover:text-red-400 transition"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium"
            >
              Conectar Gmail
            </button>
          )}
        </div>
      </div>

      <CustomFieldsAdmin />
      <PipelinesAdmin />
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
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mt-4">
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

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-manrope font-medium">Pipelines</div>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-ice hover:underline">
          + Nuevo pipeline
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-4">
        Crea un pipeline distinto por marca, país, o vertical — cada uno con sus propias etapas.
      </p>

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
            <div
              className="flex justify-between items-center text-sm cursor-pointer"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <span>{p.name}</span>
              <span className="text-brand-muted text-xs font-tech">{p.pipeline_stages?.length || 0} etapas ▾</span>
            </div>
            {expandedId === p.id && (
              <div className="mt-2 pt-2 border-t border-brand-border/50">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(p.pipeline_stages || []).sort((a, b) => a.position - b.position).map((s) => (
                    <span key={s.id} className="text-xs px-2 py-1 rounded-full bg-brand-panel text-brand-muted font-tech">
                      {s.position}. {s.name}
                    </span>
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
