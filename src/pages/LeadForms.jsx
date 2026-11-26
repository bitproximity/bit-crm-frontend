import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import {
  ClipboardList, Plus, Copy, Trash2, Check, X, GripVertical,
  Type, Hash, Calendar, CheckSquare, List, ChevronUp, ChevronDown,
  Sparkles, Link2, Code2, Users2, Target, Eye,
} from 'lucide-react';
import { Inbox, ArrowRight, Radio, BarChart3, Palette, UserRoundCheck, MoreHorizontal, ExternalLink, ListChecks } from 'lucide-react';
import LeadFormInbox from '../components/LeadFormInbox';
import { ResponsesDrawer, DesignDrawer, LeadFormPreview, toViewForm, iframeSnippet, DealLinkModal, publicUrlOf } from '../components/LeadFormPanels';
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

// Plantillas listas para crear con un clic (las define el backend: /api/lead-forms/templates/:key).
const TEMPLATES = [
  { key: 'bitmusic', name: 'Bit Music · Perfil musical de la marca', label: 'Bit Music', logo: '/brands/bitmusic-logo.png' },
  { key: 'bitwifi', name: 'Bitwifi · Brief WiFi Marketing', label: 'Bitwifi', logo: '/brands/bitwifi-logo.png' },
  { key: 'bitsignage', name: 'Bit Signage · Brief Cartelería Digital', label: 'Bit Signage', logo: '/brands/bitsignage-logo.png' },
];

function ActionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Más acciones" className="icon-btn w-9 h-9 rounded-xl flex items-center justify-center text-brand-muted hover:text-white hover:bg-white/5 transition">
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1.5 w-56 bg-brand-panel border border-brand-border rounded-xl shadow-2xl shadow-black/40 z-30 py-1.5 overlay-in">
          {items.filter(Boolean).map((it) => (it === '-' ? <div key={Math.random()} className="my-1.5 h-px bg-brand-border" /> : (
            <button key={it.label} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick(); }} className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition ${it.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-brand-white hover:bg-white/5'}`}>
              <it.icon size={14} className={it.danger ? '' : 'text-brand-muted'} /> {it.label}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}

function FormCard({ f, idx, formFields, copiedId, editingFields, onToggleFields, questionsEditor, onToggleActive, onRemove, onCopy, onResponses, onDealLink, onDesign, onPreview }) {
  const theme = { primary: '#8500FF', secondary: '#E000FF', background: '#080712', ...(f.settings?.theme || {}) };
  const publicUrl = publicUrlOf(f);
  const shortUrl = publicUrl.replace(/^https?:\/\//, '');
  const ownerName = f.team_members?.full_name;
  const count = f.submissions_count || 0;
  const linkCopied = copiedId === `link-${f.id}`;
  const embed = () => onCopy(f.settings?.theme?.logo_url || f.settings?.title ? iframeSnippet(publicUrl, f.settings?.title || f.name) : embedSnippet(f.id, formFields), `embed-${f.id}`);
  return (
    <article
      className={`group relative bg-brand-panel border border-brand-border rounded-2xl panel-depth stagger-item transition hover:border-brand-violet/40 ${f.active ? '' : 'opacity-75 hover:opacity-100'}`}
      style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
      aria-label={f.name}
    >
      {/* Franja con los colores de la marca del formulario */}
      <div className="h-1 rounded-t-2xl" style={{ background: f.active ? `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` : 'rgba(255,255,255,.08)' }} />
      <div className="p-5 sm:p-6">
        <div className="grid gap-x-4 gap-y-3 grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-start">
          <div className="row-start-1 col-start-1 w-[104px] h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/5 overflow-hidden" style={{ background: theme.background }}>
            {theme.logo_url
              ? <img src={theme.logo_url} alt={theme.brand_name || ''} className="max-w-[84px] max-h-9 object-contain" />
              : <ClipboardList size={20} className="text-brand-ice" />}
          </div>

          <div className="min-w-0 col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <h3 className="font-headline font-semibold text-[17px] leading-tight sm:truncate">{f.name}</h3>
                <div className="flex items-center gap-x-3 gap-y-1.5 text-xs text-brand-muted mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><Target size={12} /> {f.pipelines?.name || 'Sin pipeline'} <ArrowRight size={10} className="opacity-50" /> {f.pipeline_stages?.name || 'Sin etapa'}</span>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-brand-border" aria-hidden="true" />
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {ownerName ? <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-tech font-bold text-white" style={{ background: colorForName(ownerName) }}>{initials(ownerName)}</span> : <Users2 size={12} />}
                    {ownerName || 'Sin dueño'}
                  </span>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-brand-border" aria-hidden="true" />
                  <button type="button" onClick={onToggleFields} aria-expanded={editingFields} className="flex items-center gap-1 whitespace-nowrap hover:text-brand-ice transition">
                    <ListChecks size={12} /> {formFields.length ? `${formFields.length} pregunta${formFields.length === 1 ? '' : 's'}` : 'Solo datos básicos'}
                    <ChevronDown size={11} className={`transition-transform ${editingFields ? 'rotate-180' : ''}`} />
                  </button>
                </div>
          </div>

              <div className="row-start-1 col-start-2 sm:col-start-3 justify-self-end flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button" role="switch" aria-checked={!!f.active} onClick={onToggleActive}
                  aria-label={f.active ? `Pausar ${f.name}` : `Reactivar ${f.name}`}
                  title={f.active ? 'Recibiendo respuestas — clic para pausar' : 'Pausado: el link no recibe respuestas — clic para activar'}
                  className={`flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full border text-[11px] font-medium transition ${f.active ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/15' : 'border-brand-border bg-brand-bg text-brand-muted hover:text-white'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.active ? 'bg-green-400 shadow-[0_0_8px] shadow-green-400' : 'bg-brand-muted'}`} />
                  {f.active ? 'Activo' : 'Pausado'}
                  <span className={`relative w-7 h-4 rounded-full transition-colors ${f.active ? 'bg-green-500' : 'bg-brand-border'}`}>
                    <span className={`absolute left-0 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${f.active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </span>
                </button>
                <ActionsMenu items={[
                  { label: 'Vista previa', icon: Eye, onClick: onPreview },
                  { label: 'Abrir formulario', icon: ExternalLink, onClick: () => window.open(publicUrl, '_blank', 'noopener') },
                  { label: editingFields ? 'Cerrar preguntas' : 'Editar preguntas', icon: Sparkles, onClick: onToggleFields },
                  { label: 'Copiar código para tu web', icon: Code2, onClick: embed },
                  '-',
                  { label: 'Borrar formulario', icon: Trash2, onClick: onRemove, danger: true },
                ]} />
              </div>
        </div>

        {editingFields && (
          <div className="mt-5 pt-5 border-t border-brand-border">{questionsEditor}</div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto,1fr] items-stretch">
          <button type="button" onClick={onResponses} className="flex items-center gap-3 pl-3.5 pr-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border hover:border-brand-violet/60 transition text-left" title="Ver respuestas y métricas">
            <span className="font-headline text-2xl font-semibold leading-none text-brand-ice tabular-nums">{count.toLocaleString('es')}</span>
            <span className="text-[11px] leading-tight text-brand-muted">{count === 1 ? 'respuesta' : 'respuestas'}<br /><span className="text-brand-ice/80">ver métricas</span></span>
          </button>

          <div className="flex items-center gap-2 min-w-0 rounded-xl bg-brand-bg border border-brand-border pl-3.5 pr-1.5 py-1.5">
            <Link2 size={14} className="text-brand-muted flex-shrink-0" />
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-xs font-tech text-brand-white/90 hover:text-brand-ice" title={publicUrl}>{shortUrl}</a>
            <button type="button" onClick={() => onCopy(publicUrl, `link-${f.id}`)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${linkCopied ? 'bg-green-500/15 text-green-300' : 'bg-white/5 text-brand-white hover:bg-white/10'}`}>
              {linkCopied ? <Check size={13} /> : <Copy size={13} />} {linkCopied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onResponses} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition shadow-lg shadow-brand-violet/20">
            <BarChart3 size={14} /> Respuestas y métricas
          </button>
          <button type="button" onClick={onDealLink} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs bg-brand-bg border border-brand-border hover:border-brand-violet transition">
            <UserRoundCheck size={14} className="text-brand-ice" /> Link para un trato
          </button>
          <button type="button" onClick={onDesign} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs bg-brand-bg border border-brand-border hover:border-brand-violet transition">
            <Palette size={14} className="text-brand-ice" /> Diseño y textos
          </button>
          <button type="button" onClick={onPreview} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs text-brand-muted hover:text-white transition">
            <Eye size={14} /> Vista previa
          </button>
          {copiedId === `embed-${f.id}` && <span className="text-[11px] text-green-300 flex items-center gap-1"><Check size={12} /> Código copiado</span>}
        </div>
      </div>
    </article>
  );
}

export default function LeadForms() {
  const confirm = useConfirm();
  const [forms, setForms] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [team, setTeam] = useState([]);
  const [dealFields, setDealFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // Pestaña: «Formularios» o «Respuestas» (bandeja para asignar cada respuesta a su trato). ?vista=respuestas abre la bandeja.
  const [view, setView] = useState(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('vista') === 'respuestas' ? 'respuestas' : 'formularios'));
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => { api.get('/api/lead-forms/inbox?status=pending').then((d) => setPendingCount(d?.counts?.pending || 0)).catch(() => {}); }, [view]);
  const [newForm, setNewForm] = useState({ name: '', pipeline_id: '', stage_id: '', owner_id: '', field_ids: [] });
  const [editingFieldsId, setEditingFieldsId] = useState(null);
  const [previewFormId, setPreviewFormId] = useState(null);
  const [responsesFor, setResponsesFor] = useState(null);
  const [designFor, setDesignFor] = useState(null);
  const [dealLinkFor, setDealLinkFor] = useState(null);
  const [usingTemplate, setUsingTemplate] = useState(null);
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

  const applyTemplate = async (key) => {
    setError(''); setUsingTemplate(key);
    try {
      const created = await api.post(`/api/lead-forms/templates/${key}`);
      await Promise.all([load(), api.get('/api/custom-fields?entity_type=deal').then(setDealFields).catch(() => {})]);
      if (created?.already_existed) setError('Ese formulario ya existía: lo tienes en la lista.');
    } catch (err) {
      setError(err.message || 'No se pudo crear desde la plantilla.');
    } finally {
      setUsingTemplate(null);
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
        <div className="flex items-center gap-2 flex-wrap">
          {TEMPLATES.filter((t) => !(forms || []).some((f) => f.name === t.name)).map((t) => (
            <button key={t.key} onClick={() => applyTemplate(t.key)} disabled={!!usingTemplate} className="px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-panel hover:border-brand-violet transition text-sm flex items-center gap-2 disabled:opacity-50">
              <img src={t.logo} alt="" className="h-4 w-auto" />
              {usingTemplate === t.key ? 'Creando…' : `Plantilla ${t.label}`}
            </button>
          ))}
          <button onClick={() => { setError(''); setShowForm(true); }} className="px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition rounded-xl text-sm font-medium flex items-center gap-1.5">
            <Plus size={15} /> Nuevo formulario
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-brand-border mb-5" role="tablist" aria-label="Vista">
        {[['formularios', 'Formularios', ClipboardList], ['respuestas', 'Respuestas', Inbox]].map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${view === k ? 'border-brand-magenta text-white' : 'border-transparent text-brand-muted hover:text-white'}`}>
            <Icon size={15} /> {label}
            {k === 'respuestas' && pendingCount > 0 && <span className="text-[10px] font-tech px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300" title="Por asignar">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {view === 'respuestas' ? <LeadFormInbox /> : (
        <>
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
  
        <div className="space-y-4">
          {forms?.map((f, idx) => (
            <FormCard
              key={f.id}
              f={f}
              idx={idx}
              formFields={(f.field_ids || []).map((id) => dealFields.find((df) => df.id === id)).filter(Boolean)}
              copiedId={copiedId}
              editingFields={editingFieldsId === f.id}
              onToggleFields={() => setEditingFieldsId(editingFieldsId === f.id ? null : f.id)}
              questionsEditor={<QuestionsEditor allFields={dealFields} selectedIds={f.field_ids || []} onChange={(ids) => saveFieldIds(f, ids)} onFieldCreated={onFieldCreated} />}
              onToggleActive={() => toggleActive(f)}
              onRemove={() => remove(f)}
              onCopy={copy}
              onResponses={() => setResponsesFor(f)}
              onDealLink={() => setDealLinkFor(f)}
              onDesign={() => setDesignFor(f)}
              onPreview={() => setPreviewFormId(f.id)}
            />
          ))}
        </div>
        </>
      )}

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
        return <LeadFormPreview form={toViewForm(previewForm, previewFields)} onClose={() => setPreviewFormId(null)} />;
      })()}

      {dealLinkFor && <DealLinkModal form={dealLinkFor} onClose={() => setDealLinkFor(null)} />}
      {responsesFor && <ResponsesDrawer form={responsesFor} onClose={() => setResponsesFor(null)} />}
      {designFor && (
        <DesignDrawer
          form={designFor}
          pipelines={pipelines}
          fields={(designFor.field_ids || []).map((id) => dealFields.find((df) => df.id === id)).filter(Boolean)}
          onClose={() => setDesignFor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
