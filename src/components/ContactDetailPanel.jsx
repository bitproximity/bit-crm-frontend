import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Mail, RefreshCw, Phone, X, Pencil, MapPin, Tag as TagIcon, Trash2 } from 'lucide-react';
import EnrichButtons from './EnrichButtons';
import { useConfirm } from './ConfirmModal';

export default function ContactDetailPanel({ contactId, onClose, onDeleted }) {
  const confirm = useConfirm();
  const [contact, setContact] = useState(null);
  const [emails, setEmails] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [contactTags, setContactTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [contactData, gs, tags, allTagsList] = await Promise.all([
      api.get(`/api/contacts/${contactId}`),
      api.get('/api/gmail/status'),
      api.get(`/api/tags/for/contact/${contactId}`),
      api.get('/api/tags'),
    ]);
    setContact(contactData);
    setGmailStatus(gs);
    setContactTags(tags);
    setAllTags(allTagsList);
    const msgs = await api.get(`/api/gmail/messages/contact/${contactId}`).catch(() => []);
    setEmails(msgs);
    setLoading(false);
  };

  useEffect(() => {
    if (contactId) load().catch(console.error);
    setEditing(false);
  }, [contactId]);

  useEffect(() => {
    if (!companyQuery.trim()) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companyQuery.trim())}&limit=5`)
        .then((res) => setCompanyResults(res.data || []))
        .catch(() => setCompanyResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [companyQuery]);

  const startEdit = () => {
    setForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      country: contact.country || '',
      position: contact.position || '',
      company_id: contact.company_id || '',
    });
    setCompanyQuery(contact.companies?.name || '');
    setSaveError('');
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const updated = await api.patch(`/api/contacts/${contactId}`, form);
      setContact({ ...contact, ...updated });
      setEditing(false);
      load();
    } catch (err) {
      setSaveError(err.message || 'No se pudo guardar.');
    }
    setSaving(false);
  };

  const syncEmails = async () => {
    if (!contact?.email) return;
    setSyncing(true);
    try {
      await api.post(`/api/gmail/sync/contact/${contactId}`, { email: contact.email });
      const msgs = await api.get(`/api/gmail/messages/contact/${contactId}`);
      setEmails(msgs);
    } catch (err) {
      alert(err.message || 'Error sincronizando correos');
    }
    setSyncing(false);
  };

  const deleteContact = async () => {
    const name = `${contact.first_name} ${contact.last_name || ''}`.trim();
    const ok = await confirm({
      title: 'Eliminar contacto',
      message: `¿Eliminar a "${name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/contacts/${contactId}`);
      (onDeleted || onClose)();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el contacto (puede tener tratos vinculados).');
    }
  };

  const toggleTag = async (tag) => {
    const has = contactTags.some((t) => t.id === tag.id);
    if (has) {
      await api.delete(`/api/tags/${tag.id}/detach`, { entity_type: 'contact', entity_id: contactId });
      setContactTags((prev) => prev.filter((t) => t.id !== tag.id));
    } else {
      await api.post(`/api/tags/${tag.id}/attach`, { entity_type: 'contact', entity_id: contactId });
      setContactTags((prev) => [...prev, tag]);
    }
  };

  const createAndAttachTag = async (name) => {
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const tag = existing || await api.post('/api/tags', { name });
    if (!existing) setAllTags((prev) => [...prev, tag]);
    await api.post(`/api/tags/${tag.id}/attach`, { entity_type: 'contact', entity_id: contactId });
    setContactTags((prev) => [...prev, tag]);
    setTagInput('');
    setTagPickerOpen(false);
  };

  if (!contactId) return null;

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1';
  const fullName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : '';
  const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 overlay-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-panel border-l border-brand-border h-full overflow-y-auto" style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {loading || !contact ? (
          <div className="p-6 text-brand-muted">Cargando...</div>
        ) : editing ? (
          <form onSubmit={save} className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline text-lg font-semibold">Editar contacto</h2>
              <button type="button" onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={18} /></button>
            </div>
            {saveError && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{saveError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nombre</label>
                <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Apellido</label>
                <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Correo</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div className="relative">
              <label className={labelClass}>Empresa</label>
              <input
                value={companyQuery}
                onChange={(e) => { setCompanyQuery(e.target.value); setForm({ ...form, company_id: '' }); }}
                placeholder="Buscar empresa..."
                className={inputClass}
              />
              {companyResults.length > 0 && !form.company_id && (
                <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                  {companyResults.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => { setForm({ ...form, company_id: c.id }); setCompanyQuery(c.name); setCompanyResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cargo</label>
                <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>País</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
              <button disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="sticky top-0 bg-brand-panel border-b border-brand-border p-5 flex items-start justify-between">
              <div className="flex gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center text-sm font-tech font-semibold flex-shrink-0">
                  {initials || '?'}
                </div>
                <div className="min-w-0">
                  <h2 className="font-headline text-lg font-semibold truncate">{fullName || 'Sin nombre'}</h2>
                  {(contact.position || contact.companies?.name) && (
                    <div className="text-sm text-brand-muted truncate">
                      {contact.position}{contact.position && contact.companies?.name && ' · '}{contact.companies?.name}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-ice transition">
                        <Mail size={12} /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-ice transition">
                        <Phone size={12} /> {contact.phone}
                      </a>
                    )}
                    {contact.country && (
                      <span className="flex items-center gap-1.5 text-xs text-brand-muted">
                        <MapPin size={12} /> {contact.country}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <EnrichButtons entityType="contacts" entityId={contact.id} onEnriched={(updated) => setContact((c) => ({ ...c, ...updated }))} />
                  </div>
                  <div className="mt-3 relative">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {contactTags.map((tag) => (
                        <span key={tag.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-violet/15 text-brand-ice">
                          <TagIcon size={10} /> {tag.name}
                        </span>
                      ))}
                      <button onClick={() => setTagPickerOpen((v) => !v)} className="text-xs text-brand-muted hover:text-brand-ice transition">
                        + Añadir a lista
                      </button>
                    </div>
                    {tagPickerOpen && (
                      <div className="absolute z-20 mt-1.5 w-56 bg-brand-bg border border-brand-border rounded-lg shadow-xl dropdown-in overflow-hidden">
                        <input
                          autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) createAndAttachTag(tagInput.trim()); }}
                          placeholder="Buscar o crear lista..."
                          className="w-full px-3 py-2 text-sm bg-transparent border-b border-brand-border focus:outline-none"
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {allTags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase())).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => toggleTag(t)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center justify-between"
                            >
                              {t.name}
                              {contactTags.some((ct) => ct.id === t.id) && <span className="text-brand-violet">✓</span>}
                            </button>
                          ))}
                          {tagInput.trim() && !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                            <button
                              onClick={() => createAndAttachTag(tagInput.trim())}
                              className="w-full text-left px-3 py-2 text-sm text-brand-ice hover:bg-brand-panel transition border-t border-brand-border"
                            >
                              + Crear lista "{tagInput.trim()}"
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={startEdit} className="icon-btn text-brand-muted hover:text-brand-ice" title="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={deleteContact} className="icon-btn text-brand-muted hover:text-red-300" title="Eliminar">
                  <Trash2 size={16} />
                </button>
                <button onClick={onClose} className="text-brand-muted hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-manrope font-medium text-sm">
                  <Mail size={14} className="text-brand-muted" /> Correos (Gmail)
                </div>
                {gmailStatus?.connected && contact.email && (
                  <button
                    onClick={syncEmails}
                    disabled={syncing}
                    className="flex items-center gap-1.5 text-xs text-brand-ice hover:underline disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                )}
              </div>

              {!gmailStatus?.connected && (
                <div className="text-xs text-brand-muted bg-brand-bg border border-brand-border rounded-lg p-3">
                  Conecta tu Gmail en Mi Perfil para ver el historial de correos con este contacto.
                </div>
              )}

              {gmailStatus?.connected && !contact.email && (
                <div className="text-xs text-brand-muted bg-brand-bg border border-brand-border rounded-lg p-3">
                  Este contacto no tiene email registrado — no se puede sincronizar.
                </div>
              )}

              <div className="space-y-2 mt-2">
                {emails.map((e, i) => (
                  <div key={e.id} className="bg-brand-bg border border-brand-border rounded-lg p-3 stagger-item hover:border-brand-violet/40 transition" style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}>
                    <div className="text-sm font-manrope mb-0.5 text-brand-white">{e.subject || '(sin asunto)'}</div>
                    <div className="text-xs text-brand-muted mb-1.5 line-clamp-2">{e.snippet}</div>
                    <div className="text-xs text-brand-muted font-tech">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
                {gmailStatus?.connected && contact.email && emails.length === 0 && (
                  <div className="text-brand-muted text-xs">Sin correos sincronizados todavía. Dale a "Sincronizar".</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
