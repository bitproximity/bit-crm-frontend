import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { csvToContacts } from '../lib/csv';
import AddContactModal from '../components/AddContactModal';
import { Upload, Plus, Search, Mail, ChevronLeft, ChevronRight, Download, MapPin, Phone } from 'lucide-react';
import ContactDetailPanel from '../components/ContactDetailPanel';
import RowActionButtons from '../components/RowActionButtons';
import { useConfirm } from '../components/ConfirmModal';
import { colorForName, initials as nameInitials } from '../lib/avatar';
import { COUNTRY_OPTIONS, POSITION_OPTIONS, INDUSTRY_OPTIONS } from '../components/B2bRecordModal';

const STATUS_COLORS = {
  nuevo: 'bg-blue-500/20 text-blue-300',
  contactado: 'bg-yellow-500/20 text-yellow-300',
  calificado: 'bg-purple-500/20 text-purple-300',
  descartado: 'bg-neutral-600/30 text-brand-muted',
  cliente: 'bg-green-500/20 text-green-300',
};

export default function Contacts() {
  const confirm = useConfirm();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [editContactId, setEditContactId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [countryFilter, setCountryFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [team, setTeam] = useState([]);
  const PAGE_SIZE = 50;
  const fileInputRef = useRef(null);

  const activeFilterCount = [countryFilter, positionFilter, industryFilter, statusFilter, ownerFilter].filter(Boolean).length;

  const load = () => {
    const qs = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (search) qs.set('search', search);
    if (countryFilter) qs.set('country', countryFilter);
    if (positionFilter) qs.set('position', positionFilter);
    if (industryFilter) qs.set('industry', industryFilter);
    if (statusFilter) qs.set('status', statusFilter);
    if (ownerFilter) qs.set('owner_id', ownerFilter);
    return api.get(`/api/contacts?${qs.toString()}`)
      .then((r) => { setContacts(r.data); setTotal(r.count || 0); })
      .catch(console.error);
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, page, countryFilter, positionFilter, industryFilter, statusFilter, ownerFilter]);

  useEffect(() => { setPage(1); }, [search, countryFilter, positionFilter, industryFilter, statusFilter, ownerFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    api.get('/api/gmail/status').then((s) => setGmailConnected(s.connected)).catch(() => {});
    api.get('/api/team').then(setTeam).catch(() => setTeam([]));
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

  const exportCsv = async () => {    setExporting(true);
    try {
      const { data: all } = await api.get('/api/contacts?limit=10000');
      const headers = ['first_name', 'last_name', 'email', 'phone', 'position', 'country', 'company'];
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [headers.join(',')];
      all.forEach((c) => {
        lines.push([c.first_name, c.last_name, c.email, c.phone, c.position, c.country, c.companies?.name].map(escape).join(','));
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contactos_bitcrm_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportResult({ error: err.message || 'Error exportando contactos' });
    }
    setExporting(false);
  };

  const deleteContact = async (c) => {
    const name = `${c.first_name} ${c.last_name || ''}`.trim();
    const ok = await confirm({
      title: 'Eliminar contacto',
      message: `¿Eliminar a "${name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/contacts/${c.id}`);
      load();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el contacto (puede tener tratos vinculados).');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
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
            onClick={exportCsv}
            disabled={exporting}
            className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-brand-violet transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Download size={14} />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo contacto
          </button>
        </div>
      </div>

      <p className="text-brand-muted text-sm mb-6">{total.toLocaleString()} contactos registrados</p>

      {!gmailConnected && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-brand-panel border border-brand-border text-brand-muted">
          Conecta tu Gmail en <a href="/profile" className="text-brand-ice hover:underline">Mi Perfil</a> para poder importar tus contactos de Google directamente.
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
        <AddContactModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
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

      {/* Filtros por columna — País, Cargo, Industria (de la empresa), Estado y Dueño.
          Antes solo se podía buscar por nombre/email; con 50+ contactos por página
          encontrar "los de Colombia que son Gerente de Marketing" era ir fila por fila. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
          <option value="">País: todos</option>
          {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
          <option value="">Cargo: todos</option>
          {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
          <option value="">Industria: todas</option>
          {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
          <option value="">Estado: todos</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
          <option value="">Dueño: todos</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setCountryFilter(''); setPositionFilter(''); setIndustryFilter(''); setStatusFilter(''); setOwnerFilter(''); }}
            className="text-xs text-brand-muted hover:text-brand-ice transition px-1"
          >
            Limpiar filtros ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 font-manrope font-normal">Contacto</th>
              <th className="px-4 py-3 font-manrope font-normal">Empresa / Cargo</th>
              <th className="px-4 py-3 font-manrope font-normal">País</th>
              <th className="px-4 py-3 font-manrope font-normal">Teléfono</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
              <th className="px-4 py-3 font-manrope font-normal">Dueño</th>
              <th className="px-4 py-3 font-manrope font-normal">Registro</th>
              <th className="px-4 py-3 font-manrope font-normal text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => {
              const fullName = `${c.first_name} ${c.last_name || ''}`.trim();
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className="border-t border-brand-border row-hover cursor-pointer stagger-item"
                  style={{ animationDelay: `${Math.min(i, 25) * 15}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-tech font-bold flex-shrink-0 text-white"
                        style={{ background: `linear-gradient(135deg, ${colorForName(fullName)}, ${colorForName(fullName)}99)` }}
                      >
                        {nameInitials(fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate">{fullName}</div>
                        {c.email && <div className="text-xs text-brand-muted truncate">{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">
                    <div className="truncate">{c.companies?.name || '—'}</div>
                    {c.position && <div className="text-xs text-brand-muted/70 truncate">{c.position}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.country ? (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
                        <MapPin size={11} /> {c.country}
                      </span>
                    ) : <span className="text-brand-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} /> {c.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${STATUS_COLORS[c.status] || 'bg-neutral-600/30 text-brand-muted'}`}>
                      {c.status || 'sin estado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.team_members?.full_name
                      ? <span className="text-brand-muted">{c.team_members.full_name}</span>
                      : <span className="text-brand-muted/50 italic">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RowActionButtons
                      onEdit={() => setEditContactId(c.id)}
                      onCopy={() => c.email}
                      copyLabel="Copiar email"
                      onDelete={() => deleteContact(c)}
                    />
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-brand-muted text-sm">
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

      <ContactDetailPanel
        contactId={selectedContactId || editContactId}
        startInEdit={!!editContactId}
        onClose={() => { setSelectedContactId(null); setEditContactId(null); }}
        onDeleted={() => { setSelectedContactId(null); setEditContactId(null); load(); }}
        onSaved={load}
      />
    </div>
  );
}
