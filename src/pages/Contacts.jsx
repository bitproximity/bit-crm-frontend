import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUS_COLORS = {
  nuevo: 'bg-blue-500/20 text-blue-300',
  contactado: 'bg-yellow-500/20 text-yellow-300',
  calificado: 'bg-purple-500/20 text-purple-300',
  descartado: 'bg-neutral-600/30 text-brand-muted',
  cliente: 'bg-green-500/20 text-green-300',
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const load = () =>
    api.get(`/api/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then((r) => setContacts(r.data))
      .catch(console.error);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const createContact = async (e) => {
    e.preventDefault();
    await api.post('/api/contacts', form);
    setForm({ first_name: '', last_name: '', email: '', phone: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Contactos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm"
        >
          + Nuevo contacto
        </button>
      </div>

      {showForm && (
        <form onSubmit={createContact} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 grid grid-cols-4 gap-3">
          <input placeholder="Nombre" required value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <input placeholder="Apellido" value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <input placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <input placeholder="Teléfono" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <button className="col-span-4 px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm">
            Crear
          </button>
        </form>
      )}

      <input
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm"
      />

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Dueño</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-brand-border hover:bg-brand-bg/50">
                <td className="px-4 py-3">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-brand-muted">{c.companies?.name || '—'}</td>
                <td className="px-4 py-3 text-brand-muted">{c.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[c.status]}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-brand-muted">
                  {c.team_members?.full_name || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
