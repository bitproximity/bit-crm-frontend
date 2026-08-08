import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { InvoiceDetailModal } from './Invoicing';
import {
  ChevronLeft, MoreHorizontal, Tag, Calendar, Building2, User,
  Plus, X, Mail, Phone, Video, StickyNote, FileText as FileTextIcon, Paperclip,
} from 'lucide-react';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];
const ACTIVITY_TYPES = [
  { key: 'nota', label: 'Nota', icon: StickyNote },
  { key: 'llamada', label: 'Llamada', icon: Phone },
  { key: 'reunion', label: 'Reunión', icon: Video },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { key: 'tarea', label: 'Tarea', icon: FileTextIcon },
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// Suma cuántos días pasó el deal en cada etapa, a partir del historial de cambios.
function computeStageDays(deal) {
  if (!deal) return {};
  const history = [...(deal.history || [])].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
  const entries = [];
  if (history.length) {
    entries.push({ stage_id: history[0].from_stage_id || deal.stage_id, at: deal.created_at });
  } else {
    entries.push({ stage_id: deal.stage_id, at: deal.created_at });
  }
  history.forEach((h) => entries.push({ stage_id: h.to_stage_id, at: h.changed_at }));

  const totals = {};
  for (let i = 0; i < entries.length; i++) {
    const start = new Date(entries[i].at).getTime();
    const end = entries[i + 1] ? new Date(entries[i + 1].at).getTime() : Date.now();
    const days = Math.max(0, Math.round((end - start) / 86400000));
    totals[entries[i].stage_id] = (totals[entries[i].stage_id] || 0) + days;
  }
  return totals;
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deal, setDeal] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [products, setProducts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailMessages, setGmailMessages] = useState([]);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [calcomStatus, setCalcomStatus] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [dealInvoices, setDealInvoices] = useState([]);
  const [dealFiles, setDealFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dealDocs, setDealDocs] = useState([]);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: '', currency: 'USD', due_date: '', description: '', amount: '' });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [tab, setTab] = useState('notas');
  const [historyFilter, setHistoryFilter] = useState('todo');
  const [pipelinePopoverOpen, setPipelinePopoverOpen] = useState(false);
  const [pipelineSel, setPipelineSel] = useState(null);
  const [stageSel, setStageSel] = useState(null);
  const [savingPipeline, setSavingPipeline] = useState(false);

  const [noteText, setNoteText] = useState('');
  const [activityForm, setActivityForm] = useState({ type: 'llamada', title: '', due_date: '' });

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ product_id: '', quantity: 1, unit_price: '', currency: 'USD' });
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', type: 'producto', price: '' });

  const [probEditing, setProbEditing] = useState(false);
  const [probValue, setProbValue] = useState(0);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '' });
  const [showTaskForm, setShowTaskForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [dealData, items, acts, values, defs, prods, pls, tags] = await Promise.all([
      api.get(`/api/deals/${id}`),
      api.get(`/api/deals/${id}/line-items`),
      api.get(`/api/activities/for/deal/${id}`),
      api.get(`/api/custom-fields/values/${id}`),
      api.get('/api/custom-fields?entity_type=deal'),
      api.get('/api/products?active=true'),
      api.get('/api/pipelines'),
      api.get('/api/tags'),
    ]);
    setDeal(dealData);
    setLineItems(items);
    setActivities(acts);
    setCustomFields(defs.map((def) => {
      const existing = values.find((v) => v.field_id === def.id);
      return { field_id: def.id, custom_field_definitions: def, value: existing?.value || '' };
    }));
    setProducts(prods);
    setPipelines(pls);
    setAllTags(tags);
    setProbValue(dealData.probability || 0);
    setLoading(false);

    api.get('/api/gmail/status').then(setGmailStatus).catch(() => setGmailStatus({ connected: false }));
    api.get('/api/calcom/status').then(setCalcomStatus).catch(() => setCalcomStatus({ connected: false }));
    if (dealData.contact_id) {
      api.get(`/api/gmail/messages/deal/${id}`).then(setGmailMessages).catch(() => setGmailMessages([]));
    }
  };

  useEffect(() => { load().catch((err) => { setLoadError(err.message || 'No se pudo cargar el trato.'); setLoading(false); }); }, [id]);

  useEffect(() => {
    if (tab === 'reuniones' && calcomStatus?.connected) {
      api.get('/api/calcom/bookings').then((data) => {
        const email = deal?.contacts?.email;
        setBookings(email ? data.filter((b) => b.attendees?.includes(email)) : data);
      }).catch(() => setBookings([]));
    }
    if (tab === 'factura') {
      api.get(`/api/invoices?deal_id=${id}`).then(setDealInvoices).catch(() => setDealInvoices([]));
    }
    if (tab === 'archivos') {
      api.get(`/api/deal-files?deal_id=${id}`).then(setDealFiles).catch(() => setDealFiles([]));
    }
    if (tab === 'documentos') {
      api.get(`/api/documents/tree?deal_id=${id}`).then(setDealDocs).catch(() => setDealDocs([]));
    }
  }, [tab, calcomStatus, deal, id]);

  if (loadError) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{loadError}</div>;
  if (loading || !deal) return <div className="text-brand-muted">Cargando...</div>;

  const pipeline = pipelines.find((p) => p.id === deal.pipeline_id);
  const stages = pipeline ? [...pipeline.pipeline_stages].sort((a, b) => a.position - b.position) : [];
  const stageDays = computeStageDays(deal);
  const contactName = deal.contacts ? `${deal.contacts.first_name || ''} ${deal.contacts.last_name || ''}`.trim() : null;

  const changeStage = async (stageId) => {
    if (deal.status !== 'abierto' || stageId === deal.stage_id) return;
    await api.patch(`/api/deals/${id}/stage`, { stage_id: stageId });
    load();
  };

  const markWon = async () => { await api.post(`/api/deals/${id}/win`, {}); load(); };

  const openPipelinePopover = () => {
    setPipelineSel(deal.pipeline_id);
    const p = pipelines.find((pl) => pl.id === deal.pipeline_id);
    setStageSel(deal.stage_id);
    setPipelinePopoverOpen(true);
  };

  const savePipelineChange = async () => {
    setSavingPipeline(true);
    if (pipelineSel !== deal.pipeline_id) {
      await api.patch(`/api/deals/${id}`, { pipeline_id: pipelineSel });
    }
    if (stageSel !== deal.stage_id) {
      await api.patch(`/api/deals/${id}/stage`, { stage_id: stageSel });
    }
    setSavingPipeline(false);
    setPipelinePopoverOpen(false);
    load();
  };
  const markLost = async () => {
    const reason = window.prompt('Motivo de la pérdida (opcional):') || '';
    await api.post(`/api/deals/${id}/lose`, { reason });
    load();
  };

  const deleteDeal = async () => {
    if (!window.confirm(`¿Eliminar el trato "${deal.title}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/api/deals/${id}`);
    navigate('/deals');
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await api.post('/api/activities', { entity_type: 'deal', entity_id: id, type: 'nota', summary: noteText, title: noteText.slice(0, 60) });
    setNoteText('');
    load();
  };

  const addActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    await api.post('/api/activities', {
      entity_type: 'deal', entity_id: id,
      type: activityForm.type,
      title: activityForm.title,
      summary: activityForm.title,
      due_date: activityForm.due_date || null,
    });
    setActivityForm({ type: 'llamada', title: '', due_date: '' });
    load();
  };

  const syncGmail = async () => {
    if (!deal.contacts?.email) return;
    setGmailSyncing(true);
    try {
      await api.post(`/api/gmail/sync/deal/${id}`, { email: deal.contacts.email });
      const msgs = await api.get(`/api/gmail/messages/deal/${id}`);
      setGmailMessages(msgs);
    } catch (err) {
      alert(err.message);
    }
    setGmailSyncing(false);
  };

  const addProduct = async (e) => {
    e.preventDefault();
    await api.post(`/api/deals/${id}/line-items`, {
      product_id: productForm.product_id || null,
      quantity: Number(productForm.quantity),
      unit_price: Number(productForm.unit_price),
      currency: productForm.currency,
    });
    setProductForm({ product_id: '', quantity: 1, unit_price: '', currency: 'USD' });
    setShowAddProduct(false);
    load();
  };

  const createProduct = async (e) => {
    e.preventDefault();
    const newProduct = await api.post('/api/products', {
      name: newProductForm.name, type: newProductForm.type,
      price: Number(newProductForm.price) || 0, currency: 'USD',
    });
    setProductForm({ product_id: newProduct.id, quantity: 1, unit_price: newProduct.price, currency: newProduct.currency });
    setNewProductForm({ name: '', type: 'producto', price: '' });
    setShowNewProduct(false);
    setProducts(await api.get('/api/products?active=true'));
  };

  const removeProduct = async (itemId) => { await api.delete(`/api/deals/${id}/line-items/${itemId}`); load(); };

  const saveProbability = async () => {
    await api.patch(`/api/deals/${id}`, { probability: Number(probValue) || 0 });
    setProbEditing(false);
    load();
  };

  const saveExpectedDate = async (val) => {
    await api.patch(`/api/deals/${id}`, { expected_close_date: val || null });
    load();
  };

  const toggleTag = async (tag) => {
    const has = (deal.tags || []).some((t) => t.id === tag.id);
    if (has) await api.delete(`/api/tags/${tag.id}/detach`, { entity_type: 'deal', entity_id: id });
    else await api.post(`/api/tags/${tag.id}/attach`, { entity_type: 'deal', entity_id: id });
    load();
  };

  const createTagFromInput = async () => {
    const name = tagInput.trim();
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const tag = existing || await api.post('/api/tags', { name });
    if (!existing) setAllTags((p) => [...p, tag]);
    await api.post(`/api/tags/${tag.id}/attach`, { entity_type: 'deal', entity_id: id });
    setTagInput('');
    load();
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    await api.post('/api/tasks', { deal_id: id, title: taskForm.title, due_date: taskForm.due_date || null, status: 'pendiente' });
    setTaskForm({ title: '', due_date: '' });
    setShowTaskForm(false);
    load();
  };

  const toggleTaskDone = async (taskId, done) => {
    await api.patch(`/api/tasks/${taskId}`, { status: done ? 'completada' : 'pendiente' });
    load();
  };

  const createInvoiceForDeal = async (e) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      const amount = Number(invoiceForm.amount) || Number(deal.value) || 0;
      await api.post('/api/invoices', {
        invoice_number: invoiceForm.invoice_number || null,
        deal_id: id,
        company_id: deal.company_id || null,
        contact_id: deal.contact_id || null,
        currency: invoiceForm.currency,
        due_date: invoiceForm.due_date || null,
        line_items: [{ description: invoiceForm.description || deal.title, quantity: 1, unit_price: amount }],
      });
      setInvoiceForm({ invoice_number: '', currency: 'USD', due_date: '', description: '', amount: '' });
      setShowCreateInvoice(false);
      api.get(`/api/invoices?deal_id=${id}`).then(setDealInvoices);
    } catch (err) {
      alert(err.message);
    }
    setSavingInvoice(false);
  };

  const pendingTasks = (deal.tasks || []).filter((t) => t.status !== 'completada');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deal_id', id);
      await api.upload('/api/deal-files', formData);
      const files = await api.get(`/api/deal-files?deal_id=${id}`);
      setDealFiles(files);
    } catch (err) {
      alert(err.message || 'No se pudo subir el archivo.');
    }
    setUploadingFile(false);
    e.target.value = '';
  };

  const removeFile = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    await api.delete(`/api/deal-files/${fileId}`);
    setDealFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const createDealDoc = async () => {
    const created = await api.post('/api/documents', { title: `${deal.title} — nuevo documento`, content: '', deal_id: id });
    navigate(`/documents?open=${created.id}`);
  };

  // Línea de tiempo combinada: cambios de etapa + actividades
  const timeline = [
    ...(deal.history || []).map((h) => ({
      kind: 'cambio',
      date: h.changed_at,
      actor: h.team_members?.full_name,
      label: `Etapa: ${stages.find((s) => s.id === h.from_stage_id)?.name || '—'} → ${stages.find((s) => s.id === h.to_stage_id)?.name || '—'}`,
    })),
    ...activities.map((a) => ({
      kind: a.type === 'nota' ? 'nota' : 'actividad',
      date: a.occurred_at || a.created_at,
      actor: a.team_members?.full_name,
      label: a.summary || a.title,
      activityType: a.type,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredTimeline = historyFilter === 'todo' ? timeline : timeline.filter((t) => t.kind === historyFilter);

  const inputClass = 'px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';

  return (
    <div className="-m-6">
      {/* Header */}
      <div className="border-b border-brand-border px-6 pt-5 pb-0 bg-brand-panel/40">
        <Link to="/deals" className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-ice mb-3">
          <ChevronLeft size={14} /> Pipeline
        </Link>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-headline text-2xl font-semibold">{deal.title}</h1>
            <div className="relative inline-block mt-1">
              <button onClick={openPipelinePopover} className="text-xs text-brand-muted hover:text-brand-ice font-tech transition">
                {pipeline?.name} {deal.pipeline_stages?.name && <>→ {deal.pipeline_stages.name}</>}
              </button>
              {pipelinePopoverOpen && (
                <div className="absolute z-30 mt-2 w-72 bg-brand-panel border border-brand-border rounded-xl shadow-2xl p-4">
                  <label className="block text-xs text-brand-muted mb-1.5">Embudo</label>
                  <select
                    value={pipelineSel || ''}
                    onChange={(e) => {
                      const newPipeline = pipelines.find((p) => p.id === e.target.value);
                      setPipelineSel(e.target.value);
                      setStageSel(newPipeline?.pipeline_stages?.sort((a, b) => a.position - b.position)[0]?.id);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm mb-3"
                  >
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <label className="block text-xs text-brand-muted mb-1.5">Etapa del embudo</label>
                  <div className="flex rounded-lg overflow-hidden border border-brand-border mb-4">
                    {(pipelines.find((p) => p.id === pipelineSel)?.pipeline_stages || [])
                      .slice().sort((a, b) => a.position - b.position)
                      .map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStageSel(s.id)}
                          title={s.name}
                          className={`flex-1 h-6 transition ${stageSel === s.id ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'bg-brand-bg'} ${i > 0 ? 'border-l border-brand-border' : ''}`}
                        />
                      ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPipelinePopoverOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">
                      Cancelar
                    </button>
                    <button onClick={savePipelineChange} disabled={savingPipeline} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
                      {savingPipeline ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-[10px] font-tech">
                {initials(deal.team_members?.full_name)}
              </div>
              <div>
                <div className="text-brand-white leading-tight">{deal.team_members?.full_name || '—'}</div>
                <div className="text-brand-muted text-xs leading-tight">Propietario</div>
              </div>
            </div>
            {deal.status === 'abierto' ? (
              <>
                <button onClick={markWon} className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium hover:bg-green-500/30 transition">
                  Ganado
                </button>
                <button onClick={markLost} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition">
                  Perdido
                </button>
              </>
            ) : (
              <span className={`px-3 py-1.5 rounded-full text-xs font-tech ${deal.status === 'ganado' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                {deal.status === 'ganado' ? 'Ganado' : `Perdido${deal.lost_reason ? ` — ${deal.lost_reason}` : ''}`}
              </span>
            )}
            <div className="relative">
              <button onClick={() => setOptionsOpen(!optionsOpen)} className="w-9 h-9 rounded-lg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-white transition">
                <MoreHorizontal size={16} />
              </button>
              {optionsOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-brand-panel border border-brand-border rounded-xl shadow-xl z-20 overflow-hidden">
                  <button onClick={deleteDeal} className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-brand-bg transition">
                    Eliminar trato
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de etapas */}
        <div className="flex mb-0">
          {stages.map((s, i) => {
            const isPast = stages.findIndex((x) => x.id === deal.stage_id) > i || deal.status === 'ganado';
            const isCurrent = s.id === deal.stage_id && deal.status === 'abierto';
            return (
              <button
                key={s.id}
                onClick={() => changeStage(s.id)}
                disabled={deal.status !== 'abierto'}
                className={`flex-1 py-2.5 text-xs font-medium text-center transition relative ${
                  isPast || isCurrent
                    ? 'bg-gradient-to-r from-brand-violet to-brand-magenta text-white'
                    : 'bg-brand-bg text-brand-muted'
                } ${i > 0 ? 'ml-0.5' : ''} disabled:cursor-default`}
              >
                {stageDays[s.id] || 0}d · {s.name}
              </button>
            );
          })}
          {deal.status === 'ganado' && (
            <div className="flex-1 py-2.5 text-xs font-medium text-center bg-brand-bg text-brand-muted ml-0.5">Ganado</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0">
        {/* ── Sidebar izquierda ── */}
        <div className="border-r border-brand-border p-5 space-y-6">
          <div>
            <div className="text-xs font-tech uppercase tracking-wide text-brand-muted mb-3">Resumen</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-ice font-tech font-medium text-base">
                  {deal.currency} {Number(deal.value).toLocaleString()}
                </span>
                <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-xs text-brand-ice hover:underline">
                  {lineItems.length} producto{lineItems.length !== 1 ? 's' : ''}
                </button>
              </div>

              {probEditing ? (
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={probValue} onChange={(e) => setProbValue(e.target.value)} className={`${inputClass} w-16 font-tech`} autoFocus />
                  <span className="text-brand-muted text-xs">%</span>
                  <button onClick={saveProbability} className="text-xs text-brand-ice hover:underline">Guardar</button>
                </div>
              ) : (
                <button onClick={() => setProbEditing(true)} className="text-xs text-brand-ice hover:underline block">
                  Probabilidad: {deal.probability}%
                </button>
              )}

              <div className="flex items-center gap-2 text-brand-muted">
                <Building2 size={14} className="flex-shrink-0" />
                {deal.companies ? (
                  <Link to={`/companies/${deal.company_id}`} className="text-brand-ice hover:underline">{deal.companies.name}</Link>
                ) : (
                  <span className="text-brand-white">—</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-brand-muted">
                <User size={14} className="flex-shrink-0" />
                <span className="text-brand-white">{contactName || '—'}</span>
              </div>

              <div className="relative">
                <div className="flex items-start gap-2 text-brand-muted">
                  <Tag size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(deal.tags || []).map((t) => (
                      <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-ice text-xs">
                        {t.name}
                        <button onClick={() => toggleTag(t)} className="hover:text-white">×</button>
                      </span>
                    ))}
                    <button onClick={() => setTagMenuOpen(!tagMenuOpen)} className="text-xs text-brand-ice hover:underline">
                      + Añadir etiquetas
                    </button>
                  </div>
                </div>
                {tagMenuOpen && (
                  <div className="absolute z-10 mt-1 left-6 w-56 bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                    <input
                      autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createTagFromInput(); } }}
                      placeholder="Buscar o crear..."
                      className="w-full px-3 py-2 bg-transparent border-b border-brand-border text-sm focus:outline-none"
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {allTags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase())).map((t) => (
                        <button key={t.id} onClick={() => toggleTag(t)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center justify-between">
                          {t.name}
                          {(deal.tags || []).some((dt) => dt.id === t.id) && <span className="text-brand-violet">✓</span>}
                        </button>
                      ))}
                      {tagInput.trim() && !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                        <button onClick={createTagFromInput} className="w-full text-left px-3 py-2 text-sm text-brand-ice hover:bg-brand-panel transition flex items-center gap-1.5">
                          <Plus size={13} /> Crear "{tagInput.trim()}"
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-brand-muted">
                <Calendar size={14} className="flex-shrink-0" />
                <input
                  type="date"
                  defaultValue={deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : ''}
                  onBlur={(e) => saveExpectedDate(e.target.value)}
                  className="bg-transparent text-brand-white text-sm focus:outline-none font-tech"
                />
              </div>
            </div>

            {showAddProduct && (
              <div className="mt-3 bg-brand-bg border border-brand-border rounded-lg p-3 space-y-2">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span>{item.products?.name || item.description || 'Ítem'} <span className="text-brand-muted">x{item.quantity}</span></span>
                    <div className="flex items-center gap-2">
                      <span className="text-brand-ice font-tech">{item.currency} {Number(item.unit_price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeProduct(item.id)} className="text-brand-muted hover:text-red-400">×</button>
                    </div>
                  </div>
                ))}
                <form onSubmit={addProduct} className="flex flex-wrap gap-1.5 pt-2 border-t border-brand-border">
                  <select
                    value={productForm.product_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') { setShowNewProduct(true); return; }
                      const p = products.find((pr) => pr.id === e.target.value);
                      setProductForm({ ...productForm, product_id: e.target.value, unit_price: p?.price || '', currency: p?.currency || 'USD' });
                    }}
                    className="flex-1 min-w-[100px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                  >
                    <option value="">Personalizado</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="__new__">+ Crear producto...</option>
                  </select>
                  <input type="number" placeholder="Cant." value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} className="w-14 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                  <input type="number" placeholder="Precio" value={productForm.unit_price} onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })} className="w-16 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                  <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Agregar</button>
                </form>
                {showNewProduct && (
                  <form onSubmit={createProduct} className="flex flex-wrap gap-1.5 pt-2 border-t border-brand-border">
                    <input autoFocus placeholder="Nombre" value={newProductForm.name} onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} required className="flex-1 min-w-[100px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                    <input type="number" placeholder="Precio" value={newProductForm.price} onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })} className="w-16 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                    <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Crear</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {customFields.length > 0 && (
            <div>
              <div className="text-xs font-tech uppercase tracking-wide text-brand-muted mb-3">Detalles</div>
              <div className="space-y-2">
                {customFields.map((f) => (
                  <div key={f.field_id} className="flex justify-between items-center text-sm gap-3">
                    <span className="text-brand-muted flex-shrink-0">{f.custom_field_definitions?.label}</span>
                    <input
                      defaultValue={f.value || ''}
                      onBlur={async (e) => {
                        if (e.target.value === (f.value || '')) return;
                        await api.put(`/api/custom-fields/values/${id}`, { field_id: f.field_id, value: e.target.value });
                        load();
                      }}
                      className="flex-1 text-right bg-transparent border-b border-transparent hover:border-brand-border focus:border-brand-violet focus:outline-none px-1 py-0.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Columna principal ── */}
        <div className="p-5">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-brand-border pb-0">
            {[
              { key: 'notas', label: 'Notas' },
              { key: 'actividad', label: 'Actividad' },
              { key: 'reuniones', label: 'Planificador de reuniones' },
              { key: 'correo', label: 'Correo electrónico' },
              { key: 'archivos', label: 'Archivos' },
              { key: 'documentos', label: 'Documentos' },
              { key: 'factura', label: 'Factura' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm border-b-2 transition ${tab === t.key ? 'border-brand-violet text-brand-white' : 'border-transparent text-brand-muted hover:text-brand-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'notas' && (
            <div className="mb-6">
              <form onSubmit={addNote} className="flex gap-2 mb-4">
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Toma una nota..." className={`${inputClass} flex-1`} />
                <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">Agregar</button>
              </form>
              <div className="space-y-2">
                {activities.filter((a) => a.type === 'nota').map((a) => (
                  <div key={a.id} className="bg-brand-panel border border-brand-border rounded-lg p-3 text-sm">
                    <div>{a.summary}</div>
                    <div className="text-xs text-brand-muted font-tech mt-1">{a.team_members?.full_name} · {new Date(a.occurred_at || a.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {activities.filter((a) => a.type === 'nota').length === 0 && <div className="text-brand-muted text-sm">Sin notas todavía.</div>}
              </div>
            </div>
          )}

          {tab === 'actividad' && (
            <div className="mb-6">
              <form onSubmit={addActivity} className="flex flex-wrap gap-2 mb-4">
                <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} className={inputClass}>
                  {ACTIVITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <input value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="Descripción" className={`${inputClass} flex-1 min-w-[150px]`} />
                <input type="datetime-local" value={activityForm.due_date} onChange={(e) => setActivityForm({ ...activityForm, due_date: e.target.value })} className={`${inputClass} font-tech`} />
                <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">Registrar</button>
              </form>
              <div className="space-y-2">
                {activities.filter((a) => a.type !== 'nota').map((a) => (
                  <div key={a.id} className="bg-brand-panel border border-brand-border rounded-lg p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand-violet/15 text-brand-ice font-tech uppercase mr-2">{a.type}</span>
                      {a.summary || a.title}
                    </div>
                    <div className="text-xs text-brand-muted font-tech">{a.due_date ? new Date(a.due_date).toLocaleString() : ''}</div>
                  </div>
                ))}
                {activities.filter((a) => a.type !== 'nota').length === 0 && <div className="text-brand-muted text-sm">Sin actividades todavía.</div>}
              </div>
            </div>
          )}

          {tab === 'reuniones' && (
            <div className="mb-6">
              <a
                href={`https://cal.com/bitproximity/45min?name=${encodeURIComponent(contactName || '')}&email=${encodeURIComponent(deal.contacts?.email || '')}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium hover:opacity-90 transition"
              >
                Agendar reunión de 45 min
              </a>
              {!calcomStatus?.connected ? (
                <div className="text-sm text-brand-muted">
                  Conecta tu cuenta de Cal.com en <Link to="/settings" className="text-brand-ice hover:underline">Configuración</Link> para ver aquí las reuniones ya agendadas con este contacto.
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <div key={b.id} className="bg-brand-panel border border-brand-border rounded-lg p-3 text-sm">
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-brand-muted font-tech mt-1">
                        {new Date(b.start).toLocaleString()} · {b.status}
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <div className="text-brand-muted text-sm">Sin reuniones agendadas con este contacto todavía.</div>}
                </div>
              )}
            </div>
          )}

          {tab === 'correo' && (
            <div className="mb-6">
              {!gmailStatus?.connected ? (
                <div className="text-sm text-brand-muted">
                  No has conectado Gmail. <Link to="/settings" className="text-brand-ice hover:underline">Conéctalo en Configuración</Link> para sincronizar correos aquí.
                </div>
              ) : !deal.contacts?.email ? (
                <div className="text-sm text-brand-muted">Este trato no tiene un contacto con correo electrónico asociado.</div>
              ) : (
                <>
                  <button onClick={syncGmail} disabled={gmailSyncing} className="mb-4 px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition disabled:opacity-50">
                    {gmailSyncing ? 'Sincronizando...' : 'Sincronizar correos con ' + deal.contacts.email}
                  </button>
                  <div className="space-y-2">
                    {gmailMessages.map((m) => (
                      <div key={m.id} className="bg-brand-panel border border-brand-border rounded-lg p-3 text-sm">
                        <div className="font-medium">{m.subject || '(sin asunto)'}</div>
                        <div className="text-xs text-brand-muted mt-1">{m.snippet}</div>
                        <div className="text-xs text-brand-muted font-tech mt-1">{m.from_email} · {m.sent_at ? new Date(m.sent_at).toLocaleString() : ''}</div>
                      </div>
                    ))}
                    {gmailMessages.length === 0 && <div className="text-brand-muted text-sm">Sin correos sincronizados todavía.</div>}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'factura' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-brand-muted">{dealInvoices.length} factura{dealInvoices.length !== 1 ? 's' : ''} de este trato</span>
                <button onClick={() => setShowCreateInvoice(true)} className="text-xs text-brand-ice hover:underline">+ Nueva factura</button>
              </div>
              <div className="space-y-2">
                {dealInvoices.map((inv) => (
                  <div key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)} className="flex items-center justify-between bg-brand-panel border border-brand-border rounded-lg p-3 text-sm cursor-pointer hover:border-brand-violet/40 transition">
                    <span>{inv.invoice_number || `#${inv.id.slice(0, 8)}`}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-brand-ice font-tech">{inv.currency} {Number(inv.total).toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${inv.overdue ? 'bg-red-500/15 text-red-300' : inv.status === 'pagada' ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-300'}`}>
                        {inv.overdue ? 'Vencida' : inv.status}
                      </span>
                    </div>
                  </div>
                ))}
                {dealInvoices.length === 0 && <div className="text-brand-muted text-sm">Sin facturas todavía.</div>}
              </div>
            </div>
          )}

          {tab === 'archivos' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-brand-muted">{dealFiles.length} archivo{dealFiles.length !== 1 ? 's' : ''}</span>
                <label className="text-xs text-brand-ice hover:underline cursor-pointer">
                  {uploadingFile ? 'Subiendo...' : '+ Subir archivo'}
                  <input type="file" className="hidden" disabled={uploadingFile} onChange={handleFileUpload} />
                </label>
              </div>
              <div className="space-y-2">
                {dealFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-brand-panel border border-brand-border rounded-lg p-3 text-sm">
                    <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-ice hover:underline truncate">
                      <Paperclip size={13} className="flex-shrink-0" /> {f.file_name}
                    </a>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-brand-muted font-tech">{(f.file_size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => removeFile(f.id)} className="text-brand-muted hover:text-red-400 text-xs">×</button>
                    </div>
                  </div>
                ))}
                {dealFiles.length === 0 && <div className="text-brand-muted text-sm">Sin archivos todavía.</div>}
              </div>
            </div>
          )}

          {tab === 'documentos' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-brand-muted">{dealDocs.length} documento{dealDocs.length !== 1 ? 's' : ''}</span>
                <button onClick={createDealDoc} className="text-xs text-brand-ice hover:underline">+ Nuevo documento</button>
              </div>
              <div className="space-y-2">
                {dealDocs.map((d) => (
                  <Link key={d.id} to={`/documents?open=${d.id}`} className="flex items-center gap-2 bg-brand-panel border border-brand-border rounded-lg p-3 text-sm hover:border-brand-violet/40 transition">
                    <FileTextIcon size={14} className="text-brand-muted flex-shrink-0" />
                    {d.title || 'Sin título'}
                  </Link>
                ))}
                {dealDocs.length === 0 && <div className="text-brand-muted text-sm">Sin documentos vinculados todavía.</div>}
              </div>
            </div>
          )}

          {/* Enfoque */}
          <div className="mb-6 pt-4 border-t border-brand-border">
            <div className="flex items-center justify-between mb-3">
              <div className="font-manrope font-medium text-sm">Enfoque</div>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="text-xs text-brand-ice hover:underline">+ Programar una actividad</button>
            </div>
            {showTaskForm && (
              <form onSubmit={createTask} className="flex flex-wrap gap-2 mb-3 bg-brand-bg border border-brand-border rounded-lg p-3">
                <input autoFocus value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Título de la tarea" required className="flex-1 min-w-[140px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} className="px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Crear</button>
              </form>
            )}
            {pendingTasks.length === 0 ? (
              <div className="text-brand-muted text-sm">Aún no existen elementos de atención.</div>
            ) : (
              <div className="space-y-1.5">
                {pendingTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm bg-brand-panel border border-brand-border rounded-lg px-3 py-2 cursor-pointer">
                    <input type="checkbox" onChange={(e) => toggleTaskDone(t.id, e.target.checked)} className="accent-brand-violet" />
                    <span className="flex-1">{t.title}</span>
                    {t.due_date && <span className="text-xs text-brand-muted font-tech">{new Date(t.due_date).toLocaleDateString()}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="pt-4 border-t border-brand-border">
            <div className="font-manrope font-medium text-sm mb-3">Historial</div>
            <div className="flex gap-1 mb-3">
              {[
                { key: 'todo', label: 'Todo' },
                { key: 'nota', label: 'Notas' },
                { key: 'actividad', label: 'Actividades' },
                { key: 'cambio', label: 'Registro de cambios' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setHistoryFilter(f.key)}
                  className={`px-2.5 py-1 rounded-full text-xs transition ${historyFilter === f.key ? 'bg-brand-violet/20 text-brand-ice' : 'text-brand-muted hover:text-brand-white'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredTimeline.map((item, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-violet mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div>
                      {item.actor && <span className="text-brand-white">{item.actor}</span>}{' '}
                      <span className="text-brand-muted">{item.label}</span>
                    </div>
                    <div className="text-xs text-brand-muted font-tech">{new Date(item.date).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {filteredTimeline.length === 0 && <div className="text-brand-muted text-xs">Sin actividad todavía.</div>}
            </div>
          </div>
        </div>
      </div>

      {showCreateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateInvoice(false)} />
          <div className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl p-6">
            <h2 className="font-headline text-lg font-semibold mb-4">Nueva factura para "{deal.title}"</h2>
            <form onSubmit={createInvoiceForDeal} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="N° de factura (opcional)" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} className={inputClass} />
                <select value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })} className={`${inputClass} font-tech`}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input placeholder={`Descripción (por defecto: ${deal.title})`} value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={`Monto (por defecto: ${deal.value})`} value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} className={`${inputClass} font-tech`} />
                <input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} className={`${inputClass} font-tech`} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateInvoice(false)} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
                <button disabled={savingInvoice} className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
                  {savingInvoice ? 'Guardando...' : 'Crear factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onChanged={() => api.get(`/api/invoices?deal_id=${id}`).then(setDealInvoices)}
        />
      )}
    </div>
  );
}
