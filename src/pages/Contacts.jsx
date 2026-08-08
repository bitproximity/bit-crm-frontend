import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { csvToContacts } from '../lib/csv';
import { Upload, Plus, Search, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import ContactDetailPanel from '../components/ContactDetailPanel';

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
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 50;
  const fileInputRef = useRef(null);

  const load = () =>
    api.get(`/api/contacts?page=${page}&limit=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      .then((r) => { setContacts(r.data); setTotal(r.count || 0); })
      .catch(console.error);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    api.get('/api/gmail/status').then((s) => setGmailConnected(s.connected)).catch(() => {});
  }, []);

  const createContact = async (e) => {
    e.preventDefault();
    await api.post('/api/contacts', form);
    setForm({ first_name: '', last_name: '', email: '', phone: '' });
    setShowForm(false);
    load();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const parsedContacts = csvToContacts(text);

    if (parsedContacts.length === 0) {
      setImportResult({ error: 'No se encontraron contactos válidos. Verifica que el CSV tenga una columna de nombre.' });
      e.target.value = '';
      return;
    }

    setImporting(true);
    const result = await api.post('/api/contacts/import', { contacts: parsedContacts });
    setImporting(false);
    setImportResult(result);
    e.target.value = '';
    load();
  };

  const importFromGoogle = async () => {
    setImporting(true);
    try {
      const googleContacts = await api.get('/api/gmail/contacts');
      const result = await api.post('/api/contacts/import', { contacts: googleContacts });
      setImportResult(result);
      load();
    } catch (err) {
      setImportResult({ error: err.message || 'Error importando desde Google' });
    }
    setImporting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Contactos</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          {gmailConnected && (
            <button
              onClick={importFromGoogle}
              disabled={importing}
              className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-brand-violet transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Mail size={14} />
              {importing ? 'Importando...' : 'Importar de Google'}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-brand-violet transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload size={14} />
            {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo contacto
          </button>
        </div>
      </div>

      {!gmailConnected && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-brand-panel border border-brand-border text-brand-muted">
          Conecta tu Gmail en <a href="/settings" className="text-brand-ice hover:underline">Configuración</a> para poder importar tus contactos de Google directamente.
        </div>
      )}

      {importResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${importResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
          {importResult.error ? (
            importResult.error
          ) : (
            <>
              {importResult.created} contactos importados.
              {importResult.errors?.length > 0 && ` ${importResult.errors.length} filas con error.`}
            </>
          )}
          <button onClick={() => setImportResult(null)} className="ml-3 text-xs underline">Cerrar</button>
        </div>
      )}

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

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
        />
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 font-manrope font-normal">Nombre</th>
              <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
              <th className="px-4 py-3 font-manrope font-normal">Email</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
              <th className="px-4 py-3 font-manrope font-normal">Dueño</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const fullName = `${c.first_name} ${c.last_name || ''}`.trim();
              const initials = fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className="border-t border-brand-border hover:bg-brand-bg/50 transition cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta flex items-center justify-center text-[10px] font-tech font-bold flex-shrink-0">
                        {initials}
                      </div>
                      {fullName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{c.companies?.name || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">
                    {c.team_members?.full_name || '—'}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-brand-muted text-sm">
                  Sin contactos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-brand-muted">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString()} contactos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-panel border border-brand-border disabled:opacity-30 hover:border-brand-violet transition"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-brand-muted font-tech text-xs px-2">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-panel border border-brand-border disabled:opacity-30 hover:border-brand-violet transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <ContactDetailPanel contactId={selectedContactId} onClose={() => setSelectedContactId(null)} />
    </div>
  );
}
