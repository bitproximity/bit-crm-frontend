import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { Zap, Plus, Trash2, ArrowRight } from 'lucide-react';

const TRIGGER_LABELS = { stage_changed: 'Trato cambia de etapa', status_changed: 'Trato ganado/perdido', deal_stale: 'Trato sin actividad' };
const ACTION_LABELS = { create_task: 'Crear tarea', notify: 'Notificar' };

const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm';
const selectStyle = { colorScheme: 'dark' };

export default function Automations() {
  const confirm = useConfirm();
  const [rules, setRules] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [team, setTeam] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('stage_changed');
  const [triggerPipelineId, setTriggerPipelineId] = useState('');
  const [triggerStageId, setTriggerStageId] = useState('');
  const [triggerStatus, setTriggerStatus] = useState('ganado');
  const [triggerDays, setTriggerDays] = useState(7);
  const [actionType, setActionType] = useState('create_task');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDaysOffset, setActionDaysOffset] = useState(1);
  const [actionMessage, setActionMessage] = useState('');
  const [actionWho, setActionWho] = useState('owner');

  const load = () => api.get('/api/automation-rules').then(setRules).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api.get('/api/pipelines').then(setPipelines).catch(() => setPipelines([]));
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
  }, []);

  const pipelineNames = Object.fromEntries(pipelines.map((p) => [p.id, p.name]));
  const stageNames = Object.fromEntries(pipelines.flatMap((p) => p.pipeline_stages || []).map((s) => [s.id, s.name]));
  const teamNames = Object.fromEntries(team.map((m) => [m.id, m.full_name]));
  const selectedPipeline = pipelines.find((p) => p.id === triggerPipelineId);

  const resetForm = () => {
    setName(''); setTriggerType('stage_changed'); setTriggerPipelineId(''); setTriggerStageId('');
    setTriggerStatus('ganado'); setTriggerDays(7); setActionType('create_task');
    setActionTitle(''); setActionDaysOffset(1); setActionMessage(''); setActionWho('owner');
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    const trigger_config =
      triggerType === 'stage_changed' ? { to_stage_id: triggerStageId } :
      triggerType === 'status_changed' ? { status: triggerStatus } :
      { days: Number(triggerDays), ...(triggerPipelineId ? { pipeline_id: triggerPipelineId } : {}) };
    const action_config =
      actionType === 'create_task' ? { title: actionTitle, days_offset: Number(actionDaysOffset), assignee: actionWho } :
      { message: actionMessage, recipient: actionWho };
    try {
      await api.post('/api/automation-rules', { name, trigger_type: triggerType, trigger_config, action_type: actionType, action_config });
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo crear la regla.');
    }
  };

  const toggleActive = (rule) => api.patch(`/api/automation-rules/${rule.id}`, { active: !rule.active }).then(load);

  const remove = async (rule) => {
    const ok = await confirm({ title: 'Borrar automatización', message: `¿Borrar la regla "${rule.name}"?`, confirmLabel: 'Borrar', danger: true });
    if (!ok) return;
    await api.delete(`/api/automation-rules/${rule.id}`);
    load();
  };

  const describeTrigger = (r) => {
    if (r.trigger_type === 'stage_changed') return `Cuando entra a "${stageNames[r.trigger_config?.to_stage_id] || '—'}"`;
    if (r.trigger_type === 'status_changed') return `Cuando se marca ${r.trigger_config?.status}`;
    return `Cuando lleva ${r.trigger_config?.days || 7} días sin actividad${r.trigger_config?.pipeline_id ? ` en ${pipelineNames[r.trigger_config.pipeline_id] || ''}` : ''}`;
  };
  const describeAction = (r) => {
    const who = r.action_config?.assignee || r.action_config?.recipient;
    const whoLabel = who === 'owner' ? 'al dueño del trato' : `a ${teamNames[who] || '—'}`;
    if (r.action_type === 'create_task') return `Crear tarea "${r.action_config?.title}" ${whoLabel}`;
    return `Notificar ${whoLabel}: "${r.action_config?.message}"`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold flex items-center gap-2"><Zap size={20} /> Automatizaciones</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus size={14} /> Nueva regla
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">Reglas "cuando pasa X, hace Y" — sin que nadie tenga que dispararlas a mano.</p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={create} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 space-y-4">
          <input autoFocus required placeholder="Nombre de la regla (ej. Follow up tras propuesta)" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

          <div>
            <label className="block text-xs text-brand-muted mb-1.5">Cuando...</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={`${inputClass} mb-2`} style={selectStyle}>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            {triggerType === 'stage_changed' && (
              <div className="grid grid-cols-2 gap-2">
                <select required value={triggerPipelineId} onChange={(e) => { setTriggerPipelineId(e.target.value); setTriggerStageId(''); }} className={inputClass} style={selectStyle}>
                  <option value="">Pipeline...</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select required disabled={!selectedPipeline} value={triggerStageId} onChange={(e) => setTriggerStageId(e.target.value)} className={`${inputClass} disabled:opacity-50`} style={selectStyle}>
                  <option value="">Etapa...</option>
                  {selectedPipeline?.pipeline_stages?.sort((a, b) => a.position - b.position).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {triggerType === 'status_changed' && (
              <select value={triggerStatus} onChange={(e) => setTriggerStatus(e.target.value)} className={inputClass} style={selectStyle}>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>
            )}
            {triggerType === 'deal_stale' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="1" value={triggerDays} onChange={(e) => setTriggerDays(e.target.value)} placeholder="Días" className={inputClass} />
                <select value={triggerPipelineId} onChange={(e) => setTriggerPipelineId(e.target.value)} className={inputClass} style={selectStyle}>
                  <option value="">Cualquier pipeline</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-center text-brand-muted"><ArrowRight size={16} /></div>

          <div>
            <label className="block text-xs text-brand-muted mb-1.5">Entonces...</label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={`${inputClass} mb-2`} style={selectStyle}>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            {actionType === 'create_task' && (
              <div className="space-y-2">
                <input required placeholder='Título de la tarea (podés usar {{trato}})' value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-brand-muted mb-1">Vence en (días)</label>
                    <input type="number" min="0" value={actionDaysOffset} onChange={(e) => setActionDaysOffset(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-muted mb-1">Asignar a</label>
                    <select value={actionWho} onChange={(e) => setActionWho(e.target.value)} className={inputClass} style={selectStyle}>
                      <option value="owner">Dueño del trato</option>
                      {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {actionType === 'notify' && (
              <div className="space-y-2">
                <input required placeholder='Mensaje (podés usar {{trato}})' value={actionMessage} onChange={(e) => setActionMessage(e.target.value)} className={inputClass} />
                <div>
                  <label className="block text-[11px] text-brand-muted mb-1">Notificar a</label>
                  <select value={actionWho} onChange={(e) => setActionWho(e.target.value)} className={inputClass} style={selectStyle}>
                    <option value="owner">Dueño del trato</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">Crear regla</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-brand-muted text-sm hover:text-brand-white">Cancelar</button>
          </div>
        </form>
      )}

      {rules === null && <div className="text-brand-muted text-sm">Cargando...</div>}
      {rules?.length === 0 && (
        <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
          Sin reglas todavía. Crea una para que el CRM empiece a actuar solo.
        </div>
      )}

      <div className="space-y-3">
        {rules?.map((r) => (
          <div key={r.id} className="bg-brand-panel border border-brand-border rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-manrope font-medium flex items-center gap-2">
                {r.name}
                <span className={`text-[10px] font-tech uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.active ? 'bg-green-500/15 text-green-300' : 'bg-brand-muted/15 text-brand-muted'}`}>{r.active ? 'Activa' : 'Pausada'}</span>
              </div>
              <div className="text-xs text-brand-muted mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{describeTrigger(r)}</span>
                <ArrowRight size={11} className="flex-shrink-0" />
                <span>{describeAction(r)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => toggleActive(r)} className="text-xs text-brand-ice hover:underline">{r.active ? 'Pausar' : 'Reactivar'}</button>
              <button onClick={() => remove(r)} className="text-brand-muted hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
