import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { ClipboardList, Plus, Copy, Trash2, Check, X } from 'lucide-react';

const PUBLIC_APP_URL = 'https://crm.bitproximity.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

function embedSnippet(formId) {
  return `<form id="bit-lead-${formId}">
  <input name="name" placeholder="Nombre" required />
  <input name="email" type="email" placeholder="Correo" />
  <input name="phone" placeholder="Teléfono" />
  <input name="company" placeholder="Empresa" />
  <textarea name="message" placeholder="Mensaje"></textarea>
  <button type="submit">Enviar</button>
</form>
<script>
document.getElementById('bit-lead-${formId}').addEventListener('submit', function (e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(e.target));
  fetch('${API_URL}/api/public/lead-forms/${formId}/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then(function (r) { return r.json(); }).then(function (res) {
    if (res.ok) e.target.innerHTML = '<p>¡Gracias! Te contactaremos pronto.</p>';
    else alert(res.error || 'No se pudo enviar.');
  });
});
</script>`;
}

export default function LeadForms() {
  const confirm = useConfirm();
  const [forms, setForms] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [team, setTeam] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', pipeline_id: '', stage_id: '', owner_id: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/api/lead-forms').then(setForms).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api.get('/api/pipelines').then(setPipelines).catch(() => setPipelines([]));
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === newForm.pipeline_id);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/lead-forms', newForm);
      setNewForm({ name: '', pipeline_id: '', stage_id: '', owner_id: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo crear el formulario.');
    }
  };

  const toggleActive = (form) => api.patch(`/api/lead-forms/${form.id}`, { active: !form.active }).then(load);

  const remove = async (form) => {
    const ok = await confirm({ title: 'Borrar formulario', message: `¿Borrar "${form.name}"? Los tratos que ya entraron por acá se quedan, pero el link deja de funcionar.`, confirmLabel: 'Borrar', danger: true });
    if (!ok) return;
    await api.delete(`/api/lead-forms/${form.id}`);
    load();
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold flex items-center gap-2"><ClipboardList size={20} /> Formularios de captura</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus size={14} /> Nuevo formulario
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">Cada envío crea (o reutiliza) contacto y empresa, y cae directo a un trato en el pipeline y etapa que elijas — sin cargar nada a mano.</p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={create} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3">
          <input
            autoFocus required placeholder="Nombre del formulario (ej. Web — Contacto)"
            value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <div className="grid grid-cols-3 gap-3">
            <select required value={newForm.pipeline_id} onChange={(e) => setNewForm({ ...newForm, pipeline_id: e.target.value, stage_id: '' })} className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" style={{ colorScheme: 'dark' }}>
              <option value="">Pipeline...</option>
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select required disabled={!selectedPipeline} value={newForm.stage_id} onChange={(e) => setNewForm({ ...newForm, stage_id: e.target.value })} className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm disabled:opacity-50" style={{ colorScheme: 'dark' }}>
              <option value="">Etapa...</option>
              {selectedPipeline?.pipeline_stages?.sort((a, b) => a.position - b.position).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={newForm.owner_id} onChange={(e) => setNewForm({ ...newForm, owner_id: e.target.value })} className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" style={{ colorScheme: 'dark' }}>
              <option value="">Sin dueño</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-brand-muted text-sm hover:text-brand-white">Cancelar</button>
          </div>
        </form>
      )}

      {forms === null && <div className="text-brand-muted text-sm">Cargando...</div>}
      {forms?.length === 0 && (
        <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
          Sin formularios todavía. Crea uno para empezar a capturar leads desde tu web.
        </div>
      )}

      <div className="space-y-3">
        {forms?.map((f) => {
          const publicUrl = `${PUBLIC_APP_URL}/public/lead-forms/${f.id}`;
          return (
            <div key={f.id} className="bg-brand-panel border border-brand-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-manrope font-medium flex items-center gap-2">
                    {f.name}
                    <span className={`text-[10px] font-tech uppercase px-1.5 py-0.5 rounded-full ${f.active ? 'bg-green-500/15 text-green-300' : 'bg-brand-muted/15 text-brand-muted'}`}>{f.active ? 'Activo' : 'Pausado'}</span>
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">
                    {f.pipelines?.name} · {f.pipeline_stages?.name} · {f.team_members?.full_name || 'Sin dueño'} · {f.submissions_count || 0} envío(s)
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(f)} className="text-xs text-brand-ice hover:underline">{f.active ? 'Pausar' : 'Reactivar'}</button>
                  <button onClick={() => remove(f)} className="text-brand-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input readOnly value={publicUrl} className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs font-tech text-brand-muted" />
                <button onClick={() => copy(publicUrl, `link-${f.id}`)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition flex-shrink-0">
                  {copiedId === `link-${f.id}` ? <Check size={12} /> : <Copy size={12} />} Link
                </button>
                <button onClick={() => copy(embedSnippet(f.id), `embed-${f.id}`)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition flex-shrink-0">
                  {copiedId === `embed-${f.id}` ? <Check size={12} /> : <Copy size={12} />} Código para tu web
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
