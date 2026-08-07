import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Mail, RefreshCw, Phone, Building2, X } from 'lucide-react';

export default function ContactDetailPanel({ contactId, onClose }) {
  const [contact, setContact] = useState(null);
  const [emails, setEmails] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

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
  }, [contactId]);

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-panel border-l border-brand-border h-full overflow-y-auto">
        {loading || !contact ? (
          <div className="p-6 text-brand-muted">Cargando...</div>
        ) : (
          <>
            <div className="sticky top-0 bg-brand-panel border-b border-brand-border p-5 flex items-start justify-between">
              <div>
                <h2 className="font-headline text-lg font-semibold">
                  {contact.first_name} {contact.last_name}
                </h2>
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
              </div>
              <button onClick={onClose} className="text-brand-muted hover:text-brand-white">
                <X size={18} />
              </button>
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
                  Conecta tu Gmail en Configuración para ver el historial de correos con este contacto.
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
