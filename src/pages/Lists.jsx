import { useEffect, useState } from 'react';
import { List, Users, ChevronLeft, Plus } from 'lucide-react';
import { api } from '../lib/api';
import ContactDetailPanel from '../components/ContactDetailPanel';

export default function Lists() {
  const [tags, setTags] = useState(null);
  const [openTagId, setOpenTagId] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const loadTags = () => api.get('/api/tags/with-contact-counts').then(setTags).catch((err) => setError(err.message));

  useEffect(() => { loadTags(); }, []);

  const openList = async (tag) => {
    setOpenTagId(tag.id);
    setContacts(null);
    try {
      const data = await api.get(`/api/tags/${tag.id}/contacts`);
      setContacts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const createList = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/api/tags', { name: newName.trim() });
      setNewName('');
      setCreating(false);
      loadTags();
    } catch (err) {
      setError(err.message);
    }
  };

  const openTag = tags?.find((t) => t.id === openTagId);

  if (openTagId) {
    return (
      <div>
        <button onClick={() => setOpenTagId(null)} className="flex items-center gap-1.5 text-brand-muted text-sm hover:text-brand-white mb-4 transition">
          <ChevronLeft size={14} /> Volver a Listas
        </button>
        <h1 className="font-headline text-xl font-semibold mb-1">{openTag?.name}</h1>
        <p className="text-brand-muted text-sm mb-6">{contacts ? contacts.length : '…'} contacto{contacts?.length === 1 ? '' : 's'} en esta lista</p>

        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Nombre</th>
                <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                <th className="px-4 py-3 font-manrope font-normal">Email</th>
                <th className="px-4 py-3 font-manrope font-normal">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {(contacts || []).map((c) => (
                <tr key={c.id} onClick={() => setSelectedContactId(c.id)} className="border-t border-brand-border row-hover cursor-pointer">
                  <td className="px-4 py-3">{c.first_name} {c.last_name}</td>
                  <td className="px-4 py-3 text-brand-muted">{c.companies?.name || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{c.position || '—'}</td>
                </tr>
              ))}
              {contacts && contacts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-brand-muted text-sm">Sin contactos en esta lista todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedContactId && (
          <ContactDetailPanel contactId={selectedContactId} onClose={() => setSelectedContactId(null)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Listas</h1>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-sm text-brand-ice hover:underline">
          <Plus size={14} /> Nueva lista
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">
        Agrupa contactos — por ejemplo "Apollo", "Lusha", o cualquier segmento propio. Las listas creadas al importar desde Prospección aparecen automáticamente aquí.
      </p>

      {creating && (
        <div className="flex items-center gap-2 mb-4">
          <input
            autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            placeholder="Nombre de la lista"
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
          />
          <button onClick={createList} className="px-3 py-2 rounded-lg bg-brand-violet text-sm font-medium">Crear</button>
          <button onClick={() => setCreating(false)} className="px-3 py-2 text-sm text-brand-muted hover:text-brand-white">Cancelar</button>
        </div>
      )}

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(tags || []).map((tag, i) => (
          <div
            key={tag.id}
            onClick={() => openList(tag)}
            className="card-elevated rounded-xl p-4 cursor-pointer stagger-item"
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
                <List size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-manrope font-medium truncate">{tag.name}</div>
                <div className="flex items-center gap-1.5 text-brand-muted text-xs mt-0.5">
                  <Users size={11} /> {tag.contact_count} contacto{tag.contact_count === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {tags && tags.length === 0 && !creating && (
          <div className="col-span-full text-brand-muted text-sm py-10 text-center">
            Todavía no hay listas. Créala aquí o importa contactos desde Prospección con un nombre de lista.
          </div>
        )}
      </div>
    </div>
  );
}
