import { useEffect, useState } from 'react';
import { List, Users, ChevronLeft, Plus, X, Sparkles, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import ContactDetailPanel from '../components/ContactDetailPanel';

const STATUS_COLORS = {
  nuevo: 'bg-blue-500/20 text-blue-300',
  contactado: 'bg-yellow-500/20 text-yellow-300',
  calificado: 'bg-purple-500/20 text-purple-300',
  descartado: 'bg-neutral-600/30 text-brand-muted',
  cliente: 'bg-green-500/20 text-green-300',
};

const LIST_COLORS = ['#8500FF', '#E000FF', '#D9F6FF', '#22C55E', '#F59E0B', '#EF4444'];
const QUICK_SUGGESTIONS = ['Apollo', 'Lusha', 'Prioritarios', 'Fríos'];

export default function Lists() {
  const confirm = useConfirm();
  const [tags, setTags] = useState(null);
  const [openTagId, setOpenTagId] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [editingTag, setEditingTag] = useState(null); // null = cerrado, {} = crear, {id,...} = editar
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(LIST_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

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

  const openCreateModal = () => { setEditingTag({}); setFormName(''); setFormColor(LIST_COLORS[0]); };
  const openEditModal = (tag) => { setEditingTag(tag); setFormName(tag.name); setFormColor(tag.color || LIST_COLORS[0]); setMenuOpenId(null); };
  const closeModal = () => { setEditingTag(null); setSaving(false); };

  const saveList = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingTag.id) {
        await api.patch(`/api/tags/${editingTag.id}`, { name: formName.trim(), color: formColor });
      } else {
        await api.post('/api/tags', { name: formName.trim(), color: formColor });
      }
      closeModal();
      loadTags();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const deleteList = async (tag) => {
    setMenuOpenId(null);
    const ok = await confirm({
      title: 'Eliminar lista',
      message: `¿Eliminar la lista "${tag.name}"? Los ${tag.contact_count} contacto(s) no se borran, solo pierden esta etiqueta.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await api.delete(`/api/tags/${tag.id}`);
    if (openTagId === tag.id) setOpenTagId(null);
    loadTags();
  };

  const openTag = tags?.find((t) => t.id === openTagId);

  if (openTagId) {
    return (
      <div>
        <button onClick={() => setOpenTagId(null)} className="flex items-center gap-1.5 text-brand-muted text-sm hover:text-brand-white mb-4 transition">
          <ChevronLeft size={14} /> Volver a Listas
        </button>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headline text-xl font-semibold">{openTag?.name}</h1>
          {openTag && (
            <div className="flex items-center gap-3">
              <button onClick={() => openEditModal(openTag)} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-ice transition">
                <Pencil size={12} /> Editar
              </button>
              <button onClick={() => deleteList(openTag)} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-red-300 transition">
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          )}
        </div>
        <p className="text-brand-muted text-sm mb-6">{contacts ? contacts.length : '…'} contacto{contacts?.length === 1 ? '' : 's'} en esta lista</p>

        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Nombre</th>
                <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                <th className="px-4 py-3 font-manrope font-normal">Email</th>
                <th className="px-4 py-3 font-manrope font-normal">Cargo</th>
                <th className="px-4 py-3 font-manrope font-normal">Estado</th>
                <th className="px-4 py-3 font-manrope font-normal">Dueño</th>
              </tr>
            </thead>
            <tbody>
              {(contacts || []).map((c, i) => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                const initials = fullName.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className="border-t border-brand-border row-hover cursor-pointer stagger-item"
                    style={{ animationDelay: `${Math.min(i, 25) * 15}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center text-[10px] font-tech font-semibold flex-shrink-0">
                          {initials || '?'}
                        </div>
                        {fullName || 'Sin nombre'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-muted">{c.companies?.name || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{c.position || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${STATUS_COLORS[c.status] || 'bg-neutral-600/30 text-brand-muted'}`}>
                        {c.status || 'nuevo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-muted">{c.team_members?.full_name || '—'}</td>
                  </tr>
                );
              })}
              {contacts && contacts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-muted text-sm">Sin contactos en esta lista todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedContactId && (
          <ContactDetailPanel contactId={selectedContactId} onClose={() => setSelectedContactId(null)} onDeleted={() => { setSelectedContactId(null); openList(openTag); loadTags(); }} />
        )}
        {editingTag && (
          <ListFormModal
            editingTag={editingTag} formName={formName} setFormName={setFormName}
            formColor={formColor} setFormColor={setFormColor} saving={saving}
            onClose={closeModal} onSave={saveList}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Listas</h1>
        <button onClick={openCreateModal} className="flex items-center gap-1.5 text-sm text-brand-ice hover:underline">
          <Plus size={14} /> Nueva lista
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">
        Agrupa contactos — por ejemplo "Apollo", "Lusha", o cualquier segmento propio. Las listas creadas al importar desde Prospección aparecen automáticamente aquí.
      </p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(tags || []).map((tag, i) => (
          <div
            key={tag.id}
            onClick={() => openList(tag)}
            className="relative card-elevated rounded-xl p-4 cursor-pointer stagger-item group"
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${tag.color || '#8500FF'}, ${tag.color || '#E000FF'}99)` }}
              >
                <List size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-manrope font-medium truncate">{tag.name}</div>
                <div className="flex items-center gap-1.5 text-brand-muted text-xs mt-0.5">
                  <Users size={11} /> {tag.contact_count} contacto{tag.contact_count === 1 ? '' : 's'}
                </div>
              </div>

              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === tag.id ? null : tag.id)}
                  className="icon-btn p-1 rounded-md text-brand-muted opacity-0 group-hover:opacity-100 hover:text-brand-white hover:bg-brand-bg transition"
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpenId === tag.id && (
                  <div className="absolute right-0 mt-1 w-36 bg-brand-panel border border-brand-border rounded-lg shadow-xl z-20 overflow-hidden dropdown-in">
                    <button onClick={() => openEditModal(tag)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-white hover:bg-brand-bg transition">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => deleteList(tag)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-brand-bg transition">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {tags && tags.length === 0 && !editingTag && (
          <div className="col-span-full text-brand-muted text-sm py-10 text-center">
            Todavía no hay listas. Créala aquí o importa contactos desde Prospección con un nombre de lista.
          </div>
        )}
      </div>

      {editingTag && (
        <ListFormModal
          editingTag={editingTag} formName={formName} setFormName={setFormName}
          formColor={formColor} setFormColor={setFormColor} saving={saving}
          onClose={closeModal} onSave={saveList}
        />
      )}
    </div>
  );
}

function ListFormModal({ editingTag, formName, setFormName, formColor, setFormColor, saving, onClose, onSave }) {
  const isEditing = !!editingTag.id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 overlay-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
        <div className="p-5 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <span className="font-headline text-base font-semibold">{isEditing ? 'Editar lista' : 'Nueva lista'}</span>
          </div>
          <button onClick={onClose} className="icon-btn text-brand-muted hover:text-brand-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-brand-muted mb-1.5">Nombre</label>
            <input
              autoFocus value={formName} onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSave()}
              placeholder="Ej. Apollo, Lusha, Prioritarios..."
              className="w-full px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet transition"
            />
            {!isEditing && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_SUGGESTIONS.filter((s) => s.toLowerCase() !== formName.trim().toLowerCase()).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFormName(s)}
                    className="px-2.5 py-1 rounded-full text-xs text-brand-muted bg-brand-bg border border-brand-border hover:border-brand-violet hover:text-brand-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-brand-muted mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  className="w-7 h-7 rounded-full icon-btn"
                  style={{ backgroundColor: c, outline: formColor === c ? '2px solid white' : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!formName.trim() || saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear lista'}
          </button>
        </div>
      </div>
    </div>
  );
}
