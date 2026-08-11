import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Mail, RefreshCw, Phone, Building2, X, Pencil, MapPin, Briefcase } from 'lucide-react';

export default function ContactDetailPanel({ contactId, onClose }) {
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

  const load = async () => {
    setLoading(true);
    const [contactData, gs] = await Promise.all([
      api.get(`/api/contacts/${contactId}`),
      api.get('/api/gmail/status'),
    ]);
    setContact(contactData);
    setGmailStatus(gs);
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

  if (!contactId) return null;

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-panel border-l border-brand-border h-full overflow-y-auto">
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
              <div>
                <h2 className="font-headline text-lg font-semibold">
                  {contact.first_name} {contact.last_name}
                </h2>
                {contact.position && (
                  <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                    <Briefcase size={13} /> {contact.position}
                  </div>
                )}
                {contact.companies?.name && (
                  <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                    <Building2 size={13} /> {contact.companies.name}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                    <Mail size={13} /> {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                    <Phone size={13} /> {contact.phone}
                  </div>
                )}
                {contact.country && (
                  <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                    <MapPin size={13} /> {contact.country}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={startEdit} className="text-brand-muted hover:text-brand-ice" title="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={onClose} className="text-brand-muted hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-manrope font-medium text-sm">Correos (Gmail)</div>
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
                {emails.map((e) => (
                  <div key={e.id} className="bg-brand-bg border border-brand-border rounded-lg p-3">
                    <div className="text-sm font-manrope mb-0.5">{e.subject || '(sin asunto)'}</div>
                    <div className="text-xs text-brand-muted mb-1">{e.snippet}</div>
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
