import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import {
  ClipboardList, Plus, Copy, Trash2, Check, X, GripVertical,
  Type, Hash, Calendar, CheckSquare, List, ChevronUp, ChevronDown,
  Sparkles, Link2, Code2, Users2, Target, Eye,
} from 'lucide-react';
import { Inbox, ArrowRight, Radio } from 'lucide-react';
import { Drawer, Field, inputCls, selectCls, primaryBtn, ghostBtn } from '../components/Modal';
import { colorForName, initials } from '../lib/avatar';

const PUBLIC_APP_URL = 'https://crm.bitproximity.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

const TYPE_META = {
  text: { icon: Type, label: 'Texto' },
  number: { icon: Hash, label: 'Número' },
  date: { icon: Calendar, label: 'Fecha' },
  boolean: { icon: CheckSquare, label: 'Sí/No' },
  select: { icon: List, label: 'Lista' },
};

function slugify(label) {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// El código que se pega en el sitio externo — las preguntas personalizadas se mandan
// aparte como custom_answers: { field_id: valor }, porque así sabe el backend a qué
// campo personalizado corresponde cada respuesta.
export function embedSnippet(formId, fields) {
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
  <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />
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

// Editor de preguntas — crear una pregunta nueva, agregar una que ya existe, reordenar
// o quitar. Vive directo acá, sin mandar a nadie a Configuración.
function QuestionsEditor({ allFields, selectedIds, onChange, onFieldCreated }) {
  const [showNew, setShowNew] = useState(false);
  const [newQ, setNewQ] = useState({ label: '', field_type: 'text', options: '' });
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selected = selectedIds.map((id) => allFields.find((f) => f.id === id)).filter(Boolean);
  const available = allFields.filter((f) => !selectedIds.includes(f.id));

  const removeOne = (id) => onChange(selectedIds.filter((x) => x !== id));
  const move = (index, dir) => {
    const next = [...selectedIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const createQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const created = await api.post('/api/custom-fields', {
        entity_type: 'deal',
        key: slugify(newQ.label) || `pregunta_${Date.now()}`,
        label: newQ.label,
        field_type: newQ.field_type,
        options: newQ.field_type === 'select' ? newQ.options.split(',').map((o) => o.trim()).filter(Boolean) : null,
      });
      onFieldCreated(created);
      onChange([...selectedIds, created.id]);
      setNewQ({ label: '', field_type: 'text', options: '' });
      setShowNew(false);
    } catch (err) {
      setError(err.message || 'No se pudo crear la pregunta.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg/40 overflow-hidden">
      {selected.length > 0 && (
        <div className="divide-y divide-brand-border/60">
          {selected.map((f, i) => {
            const Icon = TYPE_META[f.field_type]?.icon || Type;
            return (
              <div key={f.id} className="flex items-center gap-2 px-3 py-2 group">
                <GripVertical size={13} className="text-brand-muted/40 flex-shrink-0" />
                <div className="w-7 h-7 rounded-lg bg-brand-violet/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-brand-ice" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{f.label}</div>
                  <div className="text-[10px] text-brand-muted font-tech uppercase">{TYPE_META[f.field_type]?.label}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-brand-muted hover:text-brand-white disabled:opacity-20"><ChevronUp size={13} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="p-1 text-brand-muted hover:text-brand-white disabled:opacity-20"><ChevronDown size={13} /></button>
                  <button type="button" onClick={() => removeOne(f.id)} className="p-1 text-brand-muted hover:text-red-400"><X size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.length === 0 && !showNew && (
        <div className="px-3 py-4 text-center text-xs text-brand-muted">Sin preguntas todavía — agrega una abajo.</div>
      )}

      <div className="p-2 flex flex-wrap gap-1.5 border-t border-brand-border/60 bg-brand-panel/40">
        {available.length > 0 && (
          <div className="relative">
            <button type="button" onClick={() => setShowAddExisting(!showAddExisting)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-brand-ice hover:bg-brand-bg transition">
              <Plus size={12} /> Usar una existente
            </button>
            {showAddExisting && (
              <div className="absolute z-20 top-full mt-1 left-0 w-56 max-h-48 overflow-y-auto bg-brand-panel border border-brand-border rounded-lg shadow-xl">
                {available.map((f) => (
                  <button
                    key={f.id} type="button"
                    onClick={() => { onChange([...selectedIds, f.id]); setShowAddExisting(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg transition truncate"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => setShowNew(!showNew)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-brand-ice hover:bg-brand-bg transition">
          <Sparkles size={12} /> Crear pregunta nueva
        </button>
      </div>

      {showNew && (
        <form onSubmit={createQuestion} className="p-3 border-t border-brand-border/60 bg-brand-panel/60 space-y-2">
          {error && <div className="text-xs text-red-300">{error}</div>}
          <input
            autoFocus required placeholder="¿Qué quieres preguntar? (ej. Presupuesto mensual)"
            value={newQ.label} onChange={(e) => setNewQ({ ...newQ, label: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(TYPE_META).map(([key, { icon: Icon, label }]) => (
              <button
                key={key} type="button" onClick={() => setNewQ({ ...newQ, field_type: key })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${newQ.field_type === key ? 'bg-brand-violet/20 border-brand-violet text-brand-white' : 'border-brand-border text-brand-muted hover:border-brand-muted'}`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
          {newQ.field_type === 'select' && (
            <input
              placeholder="Opciones separadas por coma (ej. Bajo, Medio, Alto)"
              value={newQ.options} onChange={(e) => setNewQ({ ...newQ, options: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
            />
          )}
          <div className="flex gap-2">
            <button disabled={creating} className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-xs font-medium disabled:opacity-50">
              {creating ? 'Creando...' : 'Agregar pregunta'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-brand-muted text-xs hover:text-brand-white">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

const previewInputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-[#080712] border border-[#211D34] text-[#FBFAFF] text-sm placeholder:text-[#5B5775] focus:border-[#8500FF] focus:outline-none transition';
const previewLabelClass = 'block text-xs text-[#8B87A3] mb-1.5';

// Exactamente lo que ve el visitante en /public/lead-forms/:id — mismos campos, mismo
// orden, mismo estilo — pero nada se manda a ningún lado al "enviar".
function LeadFormPreviewModal({ form, fields, onClose }) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [customAnswers, setCustomAnswers] = useState({});
  const [triedSubmit, setTriedSubmit] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overlay-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] max-h-[88vh] overflow-y-auto modal-in">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-brand-ice" />
            <span className="text-xs font-tech uppercase tracking-wide text-brand-ice">Vista previa — así lo ve quien lo llena</span>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-white transition"><X size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setTriedSubmit(true); }} className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>{form.name}</h1>

          {triedSubmit && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-brand-violet/10 border border-brand-violet/30 text-brand-ice text-sm">
              Esto es solo una vista previa — no se envía nada de verdad.
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className={previewLabelClass}>Nombre *</label>
              <input className={previewInputClass} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={previewLabelClass}>Correo</label>
                <input className={previewInputClass} value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
              </div>
              <div>
                <label className={previewLabelClass}>Teléfono</label>
                <input className={previewInputClass} value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={previewLabelClass}>Empresa</label>
              <input className={previewInputClass} value={values.company} onChange={(e) => setValues({ ...values, company: e.target.value })} />
            </div>

            {fields.length > 0 && (
              <div className="space-y-3.5" style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #211D34' }}>
                {fields.map((f) => (
                  <div key={f.id}>
                    <label className={previewLabelClass}>{f.label}</label>
                    {f.field_type === 'select' ? (
                      <select className={previewInputClass} style={{ colorScheme: 'dark' }} value={customAnswers[f.id] || ''} onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}>
                        <option value="">Elige...</option>
                        {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.field_type === 'boolean' ? (
                      <label className="flex items-center gap-2 text-sm text-white py-1 cursor-pointer">
                        <input type="checkbox" checked={customAnswers[f.id] === 'Sí'} onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.checked ? 'Sí' : 'No' })} className="w-4 h-4 accent-[#8500FF]" />
                        Sí
                      </label>
                    ) : (
                      <input className={previewInputClass} type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'} value={customAnswers[f.id] || ''} onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={previewLabelClass}>Mensaje (opcional)</label>
              <textarea className={`${previewInputClass} min-h-[80px] resize-y`} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#8500FF] to-[#E000FF] hover:opacity-90 transition text-white text-sm font-semibold">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone = 'text-brand-ice' }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl px-4 py-3.5 panel-depth flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand-violet/15 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-brand-ice" /></div>
      <div>
        <div className={`font-headline text-xl font-semibold leading-none ${tone}`}>{value}</div>
        <div className="text-[11px] text-brand-muted mt-1">{label}</div>
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${on ? 'bg-green-500' : 'bg-brand-border'}`}
    >
      <span className={`absolute left-0 top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
    </button>
  );
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
  const [previewFormId, setPreviewFormId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/api/lead-forms').then(setForms).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api.get('/api/pipelines').then(setPipelines).catch(() => setPipelines([]));
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
    api.get('/api/custom-fields?entity_type=deal').then(setDealFields).catch(() => setDealFields([]));
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === newForm.pipeline_id);
  const onFieldCreated = (field) => setDealFields((prev) => [...prev, field]);

  const create = async (e) => {
    e?.preventDefault();
    if (!newForm.name.trim() || !newForm.pipeline_id || !newForm.stage_id || creating) return;
    setError('');
    setCreating(true);
    try {
      await api.post('/api/lead-forms', newForm);
      setNewForm({ name: '', pipeline_id: '', stage_id: '', owner_id: '', field_ids: [] });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'No se pudo crear el formulario.');
    } finally {
      setCreating(false);
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

  const totalSubmissions = (forms || []).reduce((n, f) => n + (f.submissions_count || 0), 0);
  const activeCount = (forms || []).filter((f) => f.active).length;
  const canCreate = newForm.name.trim() && newForm.pipeline_id && newForm.stage_id;
  const stages = [...(selectedPipeline?.pipeline_stages || [])].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-semibold flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center"><ClipboardList size={18} className="text-white" /></span>
            Formularios de captura
          </h1>
          <p className="text-brand-muted text-sm mt-1.5 max-w-2xl">Cada envío crea (o reutiliza) contacto y empresa, y cae directo a un trato en el pipeline y etapa que elijas. Agrega tus propias preguntas para llevar mejor data.</p>
        </div>
        <button onClick={() => { setError(''); setShowForm(true); }} className="px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition rounded-xl text-sm font-medium flex items-center gap-1.5">
          <Plus size={15} /> Nuevo formulario
        </button>
      </div>

      {forms && forms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <StatTile icon={ClipboardList} label="Formularios" value={forms.length} />
          <StatTile icon={Radio} label="Recibiendo envíos" value={activeCount} tone="text-green-300" />
          <StatTile icon={Inbox} label="Envíos en total" value={totalSubmissions.toLocaleString('es')} />
        </div>
      )}

      {error && !showForm && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {forms === null && (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
      )}
      {forms?.length === 0 && (
        <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-violet/15 flex items-center justify-center"><ClipboardList size={22} className="text-brand-ice" /></div>
          <p className="text-brand-white font-medium">Sin formularios todavía</p>
          <p className="text-brand-muted text-sm mt-1">Crea uno para empezar a capturar leads desde tu web.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 rounded-xl border border-brand-border text-sm hover:border-brand-violet transition">Crear el primero</button>
        </div>
      )}

      <div className="space-y-3">
        {forms?.map((f, idx) => {
          const publicUrl = `${PUBLIC_APP_URL}/public/lead-forms/${f.id}`;
          const formFields = (f.field_ids || []).map((id) => dealFields.find((df) => df.id === id)).filter(Boolean);
          const ownerName = f.team_members?.full_name;
          return (
            <div key={f.id} className="relative bg-brand-panel border border-brand-border rounded-2xl panel-depth overflow-hidden stagger-item" style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${f.active ? 'bg-green-500' : 'bg-brand-border'}`} />
              <div className="p-5 pl-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-manrope font-semibold text-base truncate">{f.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-brand-muted mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-bg border border-brand-border/70">
                        <Target size={11} /> {f.pipelines?.name || 'Sin pipeline'} <ArrowRight size={10} className="opacity-60" /> {f.pipeline_stages?.name || 'Sin etapa'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {ownerName ? (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-tech font-bold text-white" style={{ background: colorForName(ownerName) }}>{initials(ownerName)}</span>
                        ) : <Users2 size={12} />}
                        {ownerName || 'Sin dueño'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-headline text-xl font-semibold leading-none text-brand-ice">{(f.submissions_count || 0).toLocaleString('es')}</div>
                      <div className="text-[10px] text-brand-muted mt-1">{f.submissions_count === 1 ? 'envío' : 'envíos'}</div>
                    </div>
                    <div className="flex items-center gap-2" title={f.active ? 'Recibiendo envíos' : 'Pausado: el link no recibe envíos'}>
                      <Switch on={!!f.active} onChange={() => toggleActive(f)} label={f.active ? `Pausar ${f.name}` : `Reactivar ${f.name}`} />
                      <span className={`text-[10px] font-tech uppercase w-12 ${f.active ? 'text-green-300' : 'text-brand-muted'}`}>{f.active ? 'Activo' : 'Pausado'}</span>
                    </div>
                    <button onClick={() => remove(f)} aria-label={`Borrar ${f.name}`} title="Borrar formulario" className="icon-btn p-2 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className="text-[10px] font-tech uppercase tracking-wide text-brand-muted mr-1">Preguntas</span>
                  {formFields.slice(0, 5).map((q) => {
                    const QIcon = TYPE_META[q.field_type]?.icon || Type;
                    return <span key={q.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-violet/10 text-brand-ice text-[11px]"><QIcon size={10} /> {q.label}</span>;
                  })}
                  {formFields.length > 5 && <span className="text-[11px] text-brand-muted">+{formFields.length - 5} más</span>}
                  {formFields.length === 0 && <span className="text-[11px] text-brand-muted">Solo los datos básicos (nombre, correo, teléfono, empresa, mensaje)</span>}
                  <button onClick={() => setEditingFieldsId(editingFieldsId === f.id ? null : f.id)} className="flex items-center gap-1 text-xs text-brand-ice hover:underline ml-1">
                    <Sparkles size={11} /> {editingFieldsId === f.id ? 'Cerrar editor' : formFields.length ? 'Editar preguntas' : 'Agregar preguntas'}
                  </button>
                </div>

                {editingFieldsId === f.id && (
                  <div className="mb-3">
                    <QuestionsEditor allFields={dealFields} selectedIds={f.field_ids || []} onChange={(ids) => saveFieldIds(f, ids)} onFieldCreated={onFieldCreated} />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border">
                    <Link2 size={13} className="text-brand-muted flex-shrink-0" />
                    <input readOnly aria-label="Link público" value={publicUrl} className="flex-1 min-w-0 bg-transparent text-xs font-tech text-brand-muted focus:outline-none focus-visible:outline-none focus:shadow-none" />
                  </div>
                  <button onClick={() => setPreviewFormId(f.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition">
                    <Eye size={13} /> Vista previa
                  </button>
                  <button onClick={() => copy(publicUrl, `link-${f.id}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition">
                    {copiedId === `link-${f.id}` ? <Check size={13} className="text-green-300" /> : <Copy size={13} />} {copiedId === `link-${f.id}` ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button onClick={() => copy(embedSnippet(f.id, formFields), `embed-${f.id}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border text-xs hover:border-brand-violet transition">
                    {copiedId === `embed-${f.id}` ? <Check size={13} className="text-green-300" /> : <Code2 size={13} />} {copiedId === `embed-${f.id}` ? 'Copiado' : 'Código para tu web'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Drawer
          title="Nuevo formulario"
          subtitle="Elige a dónde llegan los envíos y qué preguntas hace"
          icon={ClipboardList}
          width="max-w-lg"
          onClose={() => setShowForm(false)}
          footer={(
            <>
              <button type="button" onClick={create} disabled={!canCreate || creating} className={primaryBtn}>{creating ? 'Creando...' : 'Crear formulario'}</button>
              <button type="button" onClick={() => setShowForm(false)} className={ghostBtn}>Cancelar</button>
              <button type="button" onClick={() => setPreviewFormId('__new__')} className="ml-auto flex items-center gap-1 px-3 py-2 text-brand-ice text-sm hover:underline"><Eye size={13} /> Vista previa</button>
            </>
          )}
        >
          <form onSubmit={create} className="space-y-6">
            {error && <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
            <Field label="Nombre del formulario">
              <input autoFocus required placeholder="Ej. Web — Contacto" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className={inputCls} />
            </Field>

            <div>
              <div className="text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-2.5">¿A dónde llegan los envíos?</div>
              <div className="space-y-3 rounded-2xl border border-brand-border bg-brand-bg/40 p-3.5">
                <Field label="1 · Pipeline">
                  <select required value={newForm.pipeline_id} onChange={(e) => setNewForm({ ...newForm, pipeline_id: e.target.value, stage_id: '' })} className={selectCls} style={{ colorScheme: 'dark' }}>
                    <option value="">Elige un pipeline...</option>
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="2 · Etapa inicial">
                  <select required disabled={!selectedPipeline} value={newForm.stage_id} onChange={(e) => setNewForm({ ...newForm, stage_id: e.target.value })} className={`${selectCls} disabled:opacity-50`} style={{ colorScheme: 'dark' }}>
                    <option value="">{selectedPipeline ? 'Elige una etapa...' : 'Primero elige el pipeline'}</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="3 · Dueño del trato">
                  <select value={newForm.owner_id} onChange={(e) => setNewForm({ ...newForm, owner_id: e.target.value })} className={selectCls} style={{ colorScheme: 'dark' }}>
                    <option value="">Sin dueño</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-tech uppercase tracking-wide text-brand-muted mb-2.5"><Sparkles size={12} /> Preguntas de este formulario</div>
              <QuestionsEditor allFields={dealFields} selectedIds={newForm.field_ids} onChange={(ids) => setNewForm({ ...newForm, field_ids: ids })} onFieldCreated={onFieldCreated} />
            </div>
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        </Drawer>
      )}

      {(() => {
        if (!previewFormId) return null;
        const isNew = previewFormId === '__new__';
        const previewForm = isNew ? { name: newForm.name || 'Formulario sin nombre' } : forms?.find((f) => f.id === previewFormId);
        if (!previewForm) return null;
        const fieldIds = isNew ? newForm.field_ids : (previewForm.field_ids || []);
        const previewFields = fieldIds.map((id) => dealFields.find((df) => df.id === id)).filter(Boolean);
        return <LeadFormPreviewModal form={previewForm} fields={previewFields} onClose={() => setPreviewFormId(null)} />;
      })()}
    </div>
  );
}
