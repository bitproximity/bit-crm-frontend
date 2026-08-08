import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { User, Building2, X, Plus } from 'lucide-react';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

export default function AddDealModal({ open, onClose, pipelines, pipelineId, onCreated, onImportClick }) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [pipelineIdSel, setPipelineIdSel] = useState(pipelineId);
  const [stageId, setStageId] = useState('');
  const [probability, setProbability] = useState(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [industry, setIndustry] = useState('');

  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagMenuOpen, setTagMenuOpen] = useState(false);

  const [customDefs, setCustomDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});

  const [products, setProducts] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productForm, setProductForm] = useState({ product_id: '', name: '', quantity: 1, unit_price: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  const pipeline = pipelines.find((p) => p.id === pipelineIdSel) || pipelines[0];
  const stages = pipeline ? [...pipeline.pipeline_stages].sort((a, b) => a.position - b.position) : [];

  // Reset del formulario cada vez que se abre
  useEffect(() => {
    if (!open) return;
    setTitle(''); setValue(''); setCurrency('USD');
    setPipelineIdSel(pipelineId);
    setProbability(50); setExpectedCloseDate('');
    setContactQuery(''); setContactResults([]); setSelectedContact(null);
    setContactPhone(''); setContactEmail('');
    setCompanyQuery(''); setCompanyResults([]); setSelectedCompany(null);
    setIndustry('');
    setSelectedTagIds([]); setTagInput(''); setTagMenuOpen(false);
    setCustomValues({});
    setLineItems([]); setShowProductPicker(false);
    setError('');

    Promise.all([
      api.get('/api/tags').catch(() => []),
      api.get('/api/custom-fields?entity_type=deal').catch(() => []),
      api.get('/api/products?active=true').catch(() => []),
    ]).then(([tags, defs, prods]) => {
      setAllTags(tags);
      setCustomDefs(defs);
      setProducts(prods);
    });

    setTimeout(() => titleRef.current?.focus(), 50);
  }, [open, pipelineId]);

  // Etapa por defecto al elegir/cambiar embudo
  useEffect(() => {
    if (pipeline && stages.length && !stages.some((s) => s.id === stageId)) {
      setStageId(stages[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineIdSel, pipeline]);

  // Búsqueda de contactos (debounced)
  useEffect(() => {
    if (!open || selectedContact || !contactQuery.trim()) { setContactResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/contacts?search=${encodeURIComponent(contactQuery.trim())}&limit=5`)
        .then((res) => setContactResults(res.data || []))
        .catch(() => setContactResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [contactQuery, selectedContact, open]);

  // Búsqueda de empresas (debounced)
  useEffect(() => {
    if (!open || selectedCompany || !companyQuery.trim()) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companyQuery.trim())}&limit=5`)
        .then((res) => setCompanyResults(res.data || []))
        .catch(() => setCompanyResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [companyQuery, selectedCompany, open]);

  if (!open) return null;

  const pickContact = (c) => {
    setSelectedContact(c);
    setContactQuery(`${c.first_name || ''} ${c.last_name || ''}`.trim());
    setContactPhone(c.phone || '');
    setContactEmail(c.email || '');
    setContactResults([]);
    if (c.companies?.name && !selectedCompany) setCompanyQuery(c.companies.name);
  };

  const pickCompany = (c) => {
    setSelectedCompany(c);
    setCompanyQuery(c.name);
    setIndustry(c.industry || '');
    setCompanyResults([]);
  };

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const createTagFromInput = async () => {
    const name = tagInput.trim();
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) setSelectedTagIds((p) => [...p, existing.id]);
    } else {
      const created = await api.post('/api/tags', { name });
      setAllTags((p) => [...p, created]);
      setSelectedTagIds((p) => [...p, created.id]);
    }
    setTagInput('');
  };

  const addLineItem = () => {
    if (productForm.product_id) {
      const p = products.find((pr) => pr.id === productForm.product_id);
      setLineItems((prev) => [...prev, {
        product_id: p.id,
        name: p.name,
        quantity: Number(productForm.quantity) || 1,
        unit_price: Number(productForm.unit_price || p.price) || 0,
        currency: p.currency || 'USD',
      }]);
    } else if (productForm.name.trim()) {
      setLineItems((prev) => [...prev, {
        product_id: null,
        description: productForm.name.trim(),
        name: productForm.name.trim(),
        quantity: Number(productForm.quantity) || 1,
        unit_price: Number(productForm.unit_price) || 0,
        currency,
      }]);
    }
    setProductForm({ product_id: '', name: '', quantity: 1, unit_price: '' });
    setShowProductPicker(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !pipeline || !stageId) return;
    setSaving(true);
    setError('');
    try {
      // 1. Contacto
      let contactId = selectedContact?.id || null;
      if (contactId) {
        if (contactPhone !== (selectedContact.phone || '') || contactEmail !== (selectedContact.email || '')) {
          await api.patch(`/api/contacts/${contactId}`, { phone: contactPhone || null, email: contactEmail || null });
        }
      } else if (contactQuery.trim()) {
        const parts = contactQuery.trim().split(/\s+/);
        const created = await api.post('/api/contacts', {
          first_name: parts[0],
          last_name: parts.slice(1).join(' ') || null,
          phone: contactPhone || null,
          email: contactEmail || null,
        });
        contactId = created.id;
      }

      // 2. Organización
      let companyId = selectedCompany?.id || null;
      if (companyId) {
        if (industry !== (selectedCompany.industry || '')) {
          await api.patch(`/api/companies/${companyId}`, { industry: industry || null });
        }
      } else if (companyQuery.trim()) {
        const created = await api.post('/api/companies', { name: companyQuery.trim(), industry: industry || null });
        companyId = created.id;
      }

      if (contactId && companyId && selectedContact?.company_id !== companyId) {
        await api.patch(`/api/contacts/${contactId}`, { company_id: companyId });
      }

      // 3. Trato
      const deal = await api.post('/api/deals', {
        title: title.trim(),
        value: Number(value) || 0,
        currency,
        probability: Number(probability) || 0,
        pipeline_id: pipeline.id,
        stage_id: stageId,
        contact_id: contactId,
        company_id: companyId,
        expected_close_date: expectedCloseDate || null,
      });

      // 4. Etiquetas
      for (const tagId of selectedTagIds) {
        await api.post(`/api/tags/${tagId}/attach`, { entity_type: 'deal', entity_id: deal.id });
      }

      // 5. Productos
      for (const item of lineItems) {
        const { name, ...payload } = item;
        await api.post(`/api/deals/${deal.id}/line-items`, payload);
      }

      // 6. Campos personalizados
      for (const [fieldId, val] of Object.entries(customValues)) {
        if (val === '' || val == null) continue;
        await api.put(`/api/custom-fields/values/${deal.id}`, { field_id: fieldId, value: val });
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo crear el trato.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full pl-9 pr-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet transition';
  const plainInputClass = 'w-full px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet transition';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-headline text-lg font-semibold">Añadir trato</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 px-6 py-5">
            {/* ── Columna izquierda: datos del trato ── */}
            <div className="space-y-4">
              <div className="relative">
                <label className={labelClass}>Persona de contacto</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    value={contactQuery}
                    onChange={(e) => { setContactQuery(e.target.value); setSelectedContact(null); }}
                    placeholder="Nombre del contacto"
                    className={inputClass}
                  />
                </div>
                {contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                    {contactResults.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => pickContact(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex flex-col"
                      >
                        <span>{c.first_name} {c.last_name}</span>
                        {c.companies?.name && <span className="text-xs text-brand-muted">{c.companies.name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className={labelClass}>Organización</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    value={companyQuery}
                    onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }}
                    placeholder="Nombre de la organización"
                    className={inputClass}
                  />
                </div>
                {companyResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                    {companyResults.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => pickCompany(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Título</label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. Bit Proximity — Suscripción anual"
                  required
                  className={plainInputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Valor</label>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className={`${plainInputClass} flex-1 font-tech`}
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductPicker(!showProductPicker)}
                  className="mt-1.5 text-xs text-brand-ice hover:underline"
                >
                  Añadir productos
                </button>

                {showProductPicker && (
                  <div className="mt-2 bg-brand-bg border border-brand-border rounded-lg p-3 flex flex-wrap gap-2">
                    <select
                      value={productForm.product_id}
                      onChange={(e) => {
                        const p = products.find((pr) => pr.id === e.target.value);
                        setProductForm({ ...productForm, product_id: e.target.value, unit_price: p?.price || '' });
                      }}
                      className="flex-1 min-w-[120px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                    >
                      <option value="">Personalizado...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {!productForm.product_id && (
                      <input
                        placeholder="Nombre"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="flex-1 min-w-[100px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                      />
                    )}
                    <input
                      type="number" placeholder="Cant." value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="w-16 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                    />
                    <input
                      type="number" placeholder="Precio" value={productForm.unit_price}
                      onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })}
                      className="w-20 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                    />
                    <button type="button" onClick={addLineItem} className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">
                      Agregar
                    </button>
                  </div>
                )}
                {lineItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {lineItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-brand-bg rounded-lg px-3 py-1.5">
                        <span>{item.name} <span className="text-brand-muted">x{item.quantity}</span></span>
                        <div className="flex items-center gap-2">
                          <span className="text-brand-ice font-tech">{item.currency} {(item.unit_price * item.quantity).toLocaleString()}</span>
                          <button type="button" onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-brand-muted hover:text-red-400">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Embudo</label>
                <select
                  value={pipelineIdSel || ''}
                  onChange={(e) => setPipelineIdSel(e.target.value)}
                  className={plainInputClass}
                >
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Etapa del pipeline</label>
                <div className="flex rounded-lg overflow-hidden border border-brand-border">
                  {stages.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setStageId(s.id)}
                      className={`flex-1 py-2 text-xs font-medium transition ${
                        stageId === s.id
                          ? 'bg-gradient-to-r from-brand-violet to-brand-magenta text-white'
                          : 'bg-brand-bg text-brand-muted hover:text-brand-white'
                      } ${s.id !== stages[0]?.id ? 'border-l border-brand-border' : ''}`}
                      title={s.name}
                    >
                      <span className="block truncate px-1">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <label className={labelClass}>Etiqueta</label>
                <div
                  onClick={() => setTagMenuOpen(true)}
                  className={`${plainInputClass} min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text`}
                >
                  {selectedTagIds.map((id) => {
                    const t = allTags.find((tg) => tg.id === id);
                    if (!t) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-ice text-xs">
                        {t.name}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleTag(id); }} className="hover:text-white">×</button>
                      </span>
                    );
                  })}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onFocus={() => setTagMenuOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createTagFromInput(); } }}
                    placeholder={selectedTagIds.length ? '' : 'Añadir etiquetas'}
                    className="flex-1 min-w-[80px] bg-transparent focus:outline-none text-sm"
                  />
                </div>
                {tagMenuOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                    {allTags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase())).map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center justify-between"
                      >
                        {t.name}
                        {selectedTagIds.includes(t.id) && <span className="text-brand-violet">✓</span>}
                      </button>
                    ))}
                    {tagInput.trim() && !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={createTagFromInput}
                        className="w-full text-left px-3 py-2 text-sm text-brand-ice hover:bg-brand-panel transition flex items-center gap-1.5"
                      >
                        <Plus size={13} /> Crear etiqueta "{tagInput.trim()}"
                      </button>
                    )}
                    <button type="button" onClick={() => setTagMenuOpen(false)} className="w-full text-center px-3 py-1.5 text-xs text-brand-muted hover:bg-brand-panel border-t border-brand-border">
                      Cerrar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Probabilidad</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className={`${plainInputClass} font-tech pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">%</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Fecha prevista de cierre</label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className={`${plainInputClass} font-tech`}
                />
              </div>

              {customDefs.map((def) => (
                <div key={def.id}>
                  <label className={labelClass}>{def.label}</label>
                  {def.field_type === 'select' ? (
                    <select
                      value={customValues[def.id] || ''}
                      onChange={(e) => setCustomValues({ ...customValues, [def.id]: e.target.value })}
                      className={plainInputClass}
                    >
                      <option value="">—</option>
                      {(def.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={def.field_type === 'number' ? 'number' : def.field_type === 'date' ? 'date' : 'text'}
                      value={customValues[def.id] || ''}
                      onChange={(e) => setCustomValues({ ...customValues, [def.id]: e.target.value })}
                      className={plainInputClass}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* ── Columna derecha: persona / organización ── */}
            <div className="space-y-5">
              <div>
                <div className="text-xs font-tech tracking-wide text-brand-muted uppercase mb-3 pb-2 border-b border-brand-border">
                  Persona
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className={`${plainInputClass} font-tech`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Correo electrónico</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="nombre@empresa.com"
                      className={plainInputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-tech tracking-wide text-brand-muted uppercase mb-3 pb-2 border-b border-brand-border">
                  Organización
                </div>
                <div>
                  <label className={labelClass}>Industria</label>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="ej. Restaurantes, Retail, Hotelería"
                    className={plainInputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-border flex-shrink-0">
          <button
            type="button"
            onClick={onImportClick}
            className="px-3 py-2 rounded-full bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition"
          >
            Importar CSV
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
