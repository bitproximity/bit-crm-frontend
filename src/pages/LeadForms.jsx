import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { ClipboardList, Plus, Copy, Trash2, Check, ListChecks, Settings2 } from 'lucide-react';

const PUBLIC_APP_URL = 'https://crm.bitproximity.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

// El código que se pega en el sitio externo — las preguntas personalizadas se mandan
// aparte como custom_answers: { field_id: valor }, no como campos sueltos, porque así
// es como el backend sabe a qué campo personalizado (de los que ya existen para "trato"
// en Configuración) corresponde cada respuesta.
function embedSnippet(formId, fields) {
  const customInputs = (fields || []).map((f) => {
    if (f.field_type === 'select') {
      const opts = (f.options || []).map((o) => `    <option value="${o}">${o}</option>`).join('\n');
      return `  <label>${f.label}</label>\n  <select data-custom="${f.id}">\n    <option value="">Elige...</option>\n${opts}\n  </select>`;
    }
    if (f.field_type === 'boolean') {
      return `  <label><input type="checkbox" data-custom="${f.id}" /> ${f.label}</label>`;
    }
    const inputType = f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text';
    return `  <input type="${inputType}" data-custom="${f.id}" placeholder="${f.label}" />`;
  }).join('\n');

  return `<form id="bit-lead-${formId}">
  <input name="name" placeholder="Nombre" required />
  <input name="email" type="email" placeholder="Correo" />
  <input name="phone" placeholder="Teléfono" />
  <input name="company" placeholder="Empresa" />
${customInputs ? customInputs + '\n' : ''}  <textarea name="message" placeholder="Mensaje"></textarea>
  <button type="submit">Enviar</button>
</form>
<script>
document.getElementById('bit-lead-${formId}').addEventListener('submit', function (e) {
  e.preventDefault();
  var form = e.target;
  var data = Object.fromEntries(new FormData(form));
  var custom_answers = {};
  form.querySelectorAll('[data-custom]').forEach(function (el) {
    custom_answers[el.getAttribute('data-custom')] = el.type === 'checkbox' ? (el.checked ? 'Sí' : 'No') : el.value;
  });
  data.custom_answers = custom_answers;
  fetch('${API_URL}/api/public/lead-forms/${formId}/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then(function (r) { return r.json(); }).then(function (res) {
    if (res.ok) form.innerHTML = '<p>¡Gracias! Te contactaremos pronto.</p>';
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
  const [dealFields, setDealFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', pipeline_id: '', stage_id: '', owner_id: '', field_ids: [] });
  const [editingFieldsId, setEditingFieldsId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/api/lead-forms').then(setForms).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api.get('/api/pipelines').then(setPipelines).catch(() => setPipelines([]));
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
    api.get('/api/custom-fields?entity_type=deal').then(setDealFields).catch(() => setDealFields([]));
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === newForm.pipeline_id);

  const toggleFieldId = (list, fieldId) => (list.includes(fieldId) ? list.filter((id) => id !== fieldId) : [...list, fieldId]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/lead-forms', newForm);
      setNewForm({ name: '', pipeline_id: '', stage_id: '', owner_id: '', field_ids: [] });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo crear el formulario.');
    }
  };

  const toggleActive = (form) => api.patch(`/api/lead-forms/${form.id}`, { active: !form.active }).then(load);

  const saveFieldIds = async (form, fieldIds) => {
    await api.patch(`/api/lead-forms/${form.id}`, { field_ids: fieldIds });
    load();
  };

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

  const fieldPicker = (selectedIds, onChange) => (
    <div className="space-y-1.5 max-h-40 overflow-y-auto bg-brand-bg border border-brand-border rounded-lg p-2.5">
      {dealFields.length === 0 ? (
        <p className="text-xs text-brand-muted">
          Todavía no tienes campos personalizados de trato. <Link to="/settings" className="text-brand-ice hover:underline">Crea uno en Configuración</Link> y aparecerá acá.
        </p>
      ) : (
        dealFields.map((f) => (
          <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => onChange(toggleFieldId(selectedIds, f.id))} className="accent-brand-violet" />
            {f.label} <span className="text-[10px] text-brand-muted font-tech">{f.field_type}</span>
          </label>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold flex items-center gap-2"><ClipboardList size={20} /> Formularios de captura</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus size={14} /> Nuevo formulario
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">Cada envío crea (o reutiliza) contacto y empresa, y cae directo a un trato en el pipeline y etapa que elijas — sin cargar nada a mano. Agrega preguntas propias para llevar mejor data.</p>

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
          <div>
            <label className="block text-xs text-brand-muted mb-1.5 flex items-center gap-1"><ListChecks size={12} /> Preguntas extra (opcional)</label>
            {fieldPicker(newForm.field_ids, (ids) => setNewForm({ ...newForm, field_ids: ids }))}
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
          const formFields = dealFields.filter((df) => (f.field_ids || []).includes(df.id));
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
                    {formFields.length > 0 && ` · ${formFields.length} pregunta(s) extra`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditingFieldsId(editingFieldsId === f.id ? null : f.id)} className="flex items-center gap-1 text-xs text-brand-ice hover:underline">
                    <Settings2 size={12} /> Preguntas
                  </button>
                  <button onClick={() => toggleActive(f)} className="text-xs text-brand-ice hover:underline">{f.active ? 'Pausar' : 'Reactivar'}</button>
                  <button onClick={() => remove(f)} className="text-brand-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>

              {editingFieldsId === f.id && (
                <div className="mb-3">
                  <p className="text-xs text-brand-muted mb-1.5">Se guarda solo — marca o desmarca y listo.</p>
                  {fieldPicker(f.field_ids || [], (ids) => saveFieldIds(f, ids))}
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <input readOnly value={publicUrl} className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs font-tech text-brand-muted" />
                <button onClick={() => copy(publicUrl, `link-${f.id}`)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition flex-shrink-0">
                  {copiedId === `link-${f.id}` ? <Check size={12} /> : <Copy size={12} />} Link
                </button>
                <button onClick={() => copy(embedSnippet(f.id, formFields), `embed-${f.id}`)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition flex-shrink-0">
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
