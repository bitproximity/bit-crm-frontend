import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  Users, Plus, Upload, Building2, TrendingUp, Percent, CalendarCheck, CalendarClock, History,
  Link2, Check, Pencil, Trash2, GripVertical, X, ListPlus, CheckCircle2, ChevronDown, MoreHorizontal, Download, RefreshCcw,
} from 'lucide-react';
import B2bRecordModal, { INDUSTRY_OPTIONS, COUNTRY_OPTIONS } from '../components/B2bRecordModal';
import MeetingsByMonthChart from '../components/MeetingsByMonthChart';
import DateTimePicker from '../components/DateTimePicker';
import { useConfirm } from '../components/ConfirmModal';

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const out = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ''; });
    return obj;
  });
}

const FIELD_MAP = {
  empresa: 'target_company', target_company: 'target_company', compañia: 'target_company', marca: 'target_company',
  contacto: 'target_contact', target_contact: 'target_contact', nombre: 'target_contact', cliente: 'target_contact',
  posicion: 'target_position', posición: 'target_position', cargo: 'target_position', puesto: 'target_position',
  correo: 'target_email', email: 'target_email', mail: 'target_email',
  numero: 'target_phone', número: 'target_phone', telefono: 'target_phone', teléfono: 'target_phone', celular: 'target_phone',
  ejecutivo: 'executive', executive: 'executive', responsable: 'executive', vendedor: 'executive',
  comercial: 'commercial',
  industria: 'industry', industry: 'industry', sector: 'industry',
  pais: 'country', país: 'country', country: 'country',
  ciudad: 'city', city: 'city',
  fecha: 'contacted_at', contacted_at: 'contacted_at', fecha_contacto: 'contacted_at',
  fecha_reunion: 'meeting_date', meeting_date: 'meeting_date', fecha_reunión: 'meeting_date',
  fecha_programada: 'meeting_date', fecha_realizada: 'realized_date', realized_date: 'realized_date',
  notas: 'notes', notes: 'notes',
};

function mapRows(rows) {
  return rows.map((row) => {
    const mapped = {};
    Object.entries(row).forEach(([key, val]) => {
      const target = FIELD_MAP[key];
      if (target && val) mapped[target] = val;
    });
    return mapped;
  }).filter((r) => r.target_company);
}

const STATUS_STYLE = {
  contactado: 'bg-brand-bg text-brand-muted',
  reunion_agendada: 'bg-brand-violet/15 text-brand-ice',
  reunion_realizada: 'bg-green-500/15 text-green-300',
  no_interesado: 'bg-red-500/10 text-red-300',
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function monthLabel(key) {
  const [, m] = key.split('-');
  return MONTH_NAMES[Number(m) - 1] || key.slice(5);
}

const STATUS_LABEL = {
  contactado: 'Contactado', reunion_agendada: 'Reunión agendada',
  reunion_realizada: 'Reunión realizada', no_interesado: 'No interesado',
};

export default function B2bMeetings() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('client'); // client | team
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [records, setRecords] = useState([]);
  const EMPTY_FILTERS = { search: '', status: '', country: '', city: '', executive: '', industry: '', dateFrom: '', dateTo: '' };
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadClients = () => api.get('/api/b2b/clients').then((list) => {
    setClients(list);
    if (!clientId && list.length) setClientId(list[0].id);
  }).catch((err) => setError(err.message));

  useEffect(() => { loadClients(); }, []);

  // Cierra cualquier menú desplegable abierto (marca, importar, acciones) al hacer
  // clic fuera de él.
  useEffect(() => {
    const closeAll = () => { setClientMenuOpen(false); setImportMenuOpen(false); setActionsMenuOpen(false); };
    document.addEventListener('click', closeAll);
    return () => document.removeEventListener('click', closeAll);
  }, []);

  useEffect(() => {
    if (tab !== 'team') return;
    api.get('/api/b2b/leaderboard').then(setLeaderboard).catch((err) => setError(err.message));
  }, [tab]);

  const loadClientData = () => {
    if (!clientId) return;
    api.get(`/api/b2b/dashboard?client_company_id=${clientId}`).then(setDashboard).catch((err) => setError(err.message));
    api.get(`/api/b2b/records?client_company_id=${clientId}`).then(setRecords).catch(() => setRecords([]));
  };

  useEffect(() => { loadClientData(); setCopiedLink(false); }, [clientId]);

  useEffect(() => {
    if (!companySearch.trim()) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companySearch.trim())}&limit=5`)
        .then((res) => setCompanyResults(res.data || []))
        .catch(() => setCompanyResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [companySearch]);

  const [addClientError, setAddClientError] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editClientForm, setEditClientForm] = useState({ name: '', industry: '', country: '' });
  const [savingClient, setSavingClient] = useState(false);
  const [editClientError, setEditClientError] = useState('');

  const openEditClient = (c) => {
    setEditingClient(c);
    setEditClientForm({ name: c.name || '', industry: c.industry || '', country: c.country || '' });
    setEditClientError('');
    setClientMenuOpen(false);
  };

  const saveEditClient = async () => {
    if (!editClientForm.name.trim()) { setEditClientError('El nombre no puede quedar vacío.'); return; }
    setSavingClient(true);
    setEditClientError('');
    try {
      await api.patch(`/api/companies/${editingClient.id}`, editClientForm);
      const list = await api.get('/api/b2b/clients');
      setClients(list);
      setEditingClient(null);
    } catch (err) {
      setEditClientError(err.message || 'No se pudo guardar.');
    }
    setSavingClient(false);
  };

  const addClient = async (companyId) => {
    setAddClientError('');
    try {
      await api.post('/api/b2b/clients', { company_id: companyId });
      setShowAddClient(false);
      setCompanySearch('');
      setCompanyResults([]);
      const list = await api.get('/api/b2b/clients');
      setClients(list);
      setClientId(companyId);
    } catch (err) {
      setAddClientError(err.message || 'No se pudo agregar la marca.');
    }
  };

  // La marca todavía no existe como Empresa en el CRM — se crea al vuelo y de una se
  // agrega como cliente de Bit Prospect, en vez de obligar a ir primero a Empresas.
  const createAndAddClient = async () => {
    const name = companySearch.trim();
    if (!name) return;
    setCreatingCompany(true);
    setAddClientError('');
    try {
      const company = await api.post('/api/companies', { name });
      await addClient(company.id);
    } catch (err) {
      setAddClientError(err.message || 'No se pudo crear la empresa.');
    }
    setCreatingCompany(false);
  };

  const [mergeByCompany, setMergeByCompany] = useState(true);

  const handleImport = async (e, mode) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;
    const text = await file.text();
    const rows = mapRows(parseCsv(text));
    if (rows.length === 0) {
      setImportResult({ error: 'No se encontraron filas válidas. Verifica que el CSV tenga una columna de empresa/marca.' });
      e.target.value = '';
      return;
    }
    try {
      const result = await api.post('/api/b2b/import', { client_company_id: clientId, mode, records: rows, mergeByCompany });
      setImportResult(result);
      loadClientData();
    } catch (err) {
      setImportResult({ error: err.message });
    }
    e.target.value = '';
  };

  const copyShareLink = async () => {
    const { token } = await api.post(`/api/b2b/clients/${clientId}/share-link`, {});
    const url = `${window.location.origin}/public/b2b/${token}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const openExportPdf = async () => {
    const { token } = await api.post(`/api/b2b/clients/${clientId}/share-link`, {});
    window.open(`${window.location.origin}/public/b2b/${token}`, '_blank');
  };

  const clearClientRecords = async () => {
    const clientName = client?.name || 'esta marca';
    const ok = await confirm({
      title: 'Borrar todo',
      message: `¿Borrar TODOS los registros de "${clientName}" (${records.length} en total)? Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar todo',
    });
    if (!ok) return;
    await api.delete(`/api/b2b/clients/${clientId}/records`);
    loadClientData();
  };

  const exportToContacts = async () => {
    setExporting(true);
    try {
      const result = await api.post(`/api/b2b/clients/${clientId}/export-to-contacts`, {});
      setImportResult({ inserted: result.created, updated: 0, list_name: result.list_name, exported: true });
    } catch (err) {
      setImportResult({ error: err.message });
    }
    setExporting(false);
  };

  const markAllRealizada = async () => {
    const ok = await confirm({
      title: 'Marcar todo como realizada',
      message: `¿Marcar los ${records.length} registro(s) de "${client?.name}" como "Reunión realizada"?`,
      confirmLabel: 'Marcar todo',
      danger: false,
    });
    if (!ok) return;
    const { updated } = await api.patch(`/api/b2b/clients/${clientId}/mark-all-realizada`, {});
    setImportResult({ inserted: updated, updated: 0, list_name: null, exported: false, marked: true });
    loadClientData();
  };

  const openEdit = (record) => { setEditingRecord(record); setModalOpen(true); };
  const openAdd = () => { setEditingRecord(null); setModalOpen(true); };
  const onSaved = () => { setModalOpen(false); loadClientData(); };

  const client = clients.find((c) => c.id === clientId);

  const normalizeCountry = (c) => (c || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const distinctExecutives = [...new Set(records.map((r) => r.executive).filter(Boolean))].sort();
  const distinctCities = [...new Set(records.map((r) => r.city).filter(Boolean))].sort();
  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const filteredRecords = records.filter((r) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!r.target_company?.toLowerCase().includes(q) && !r.target_contact?.toLowerCase().includes(q)) return false;
    }
    if (filters.status && r.status !== filters.status) return false;
    if (filters.country && normalizeCountry(r.country) !== normalizeCountry(filters.country)) return false;
    if (filters.city && normalizeCountry(r.city) !== normalizeCountry(filters.city)) return false;
    if (filters.executive && r.executive !== filters.executive) return false;
    if (filters.industry && r.industry !== filters.industry) return false;
    if (filters.dateFrom && (!r.meeting_date || r.meeting_date < filters.dateFrom)) return false;
    if (filters.dateTo && (!r.meeting_date || r.meeting_date > filters.dateTo)) return false;
    return true;
  });
  const COLORS = ['#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444'];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Bit Prospect</h1>
      </div>
      <p className="text-brand-muted text-sm mb-4">Panel por marca/cliente: base de datos, reuniones y reporte compartible</p>

      <div className="flex gap-1 mb-6 bg-brand-panel border border-brand-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('client')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${tab === 'client' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}
        >
          Por marca/cliente
        </button>
        <button
          onClick={() => setTab('team')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${tab === 'team' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}
        >
          Equipo (todos los clientes)
        </button>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {tab === 'team' && (
        <>
          <p className="text-brand-muted text-xs mb-4">
            Cruza todo lo que cada persona ha cargado en cualquier marca — cada base o reunión que importás o agregás
            queda atribuida automáticamente a tu usuario logueado.
          </p>
          {!leaderboard ? (
            <div className="text-brand-muted text-sm">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
                  <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Users size={12} /> Contactados (total)</div>
                  <div className="text-2xl font-headline font-semibold">{leaderboard.total_contacted}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
                  <div className="flex items-center gap-1.5 text-brand-ice text-xs mb-1"><CalendarCheck size={12} /> Reuniones (total)</div>
                  <div className="text-2xl font-headline font-semibold text-brand-ice">{leaderboard.total_meetings}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
                  <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><Percent size={12} /> Conversión general</div>
                  <div className="text-2xl font-headline font-semibold text-green-300">{leaderboard.conversion_rate}%</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
                  <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={12} /> Este mes</div>
                  <div className="text-2xl font-headline font-semibold text-yellow-300">{leaderboard.meetings_this_month}</div>
                </div>
              </div>

              <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-brand-border flex items-center gap-2">
                  <Users size={15} className="text-brand-ice" />
                  <div className="text-sm font-manrope font-medium">Ranking del equipo — todos los clientes</div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-brand-panel/80 text-brand-muted text-left">
                    <tr>
                      <th className="px-5 py-2.5 font-manrope font-normal">Quién</th>
                      <th className="px-5 py-2.5 font-manrope font-normal">Contactados</th>
                      <th className="px-5 py-2.5 font-manrope font-normal">Reuniones</th>
                      <th className="px-5 py-2.5 font-manrope font-normal">Conversión</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leaderboard.by_person || []).map((p, i) => {
                      const detail = (leaderboard.by_person_by_client || []).find((d) => d.name === p.name);
                      const isOpen = expandedPerson === p.name;
                      return (
                        <>
                          <tr
                            key={i}
                            onClick={() => setExpandedPerson(isOpen ? null : p.name)}
                            className="border-t border-brand-border cursor-pointer row-hover"
                          >
                            <td className="px-5 py-2.5 flex items-center gap-2">
                              {i === 0 && p.meetings > 0 && <span className="text-yellow-400">🏆</span>}
                              {p.name}
                            </td>
                            <td className="px-5 py-2.5 text-brand-muted font-tech">{p.contacted}</td>
                            <td className="px-5 py-2.5 text-brand-ice font-tech">{p.meetings}</td>
                            <td className="px-5 py-2.5 text-green-300 font-tech">{p.conversion}%</td>
                            <td className="px-5 py-2.5 text-brand-muted text-xs">{isOpen ? '▲' : '▼'} por cliente</td>
                          </tr>
                          {isOpen && detail && (
                            <tr key={`${i}-detail`} className="bg-brand-bg/40">
                              <td colSpan={5} className="px-5 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {(detail.clients || []).map((c) => (
                                    <div key={c.client} className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs">
                                      <span className="text-brand-white">{c.client}</span>
                                      <span className="text-brand-muted ml-2">{c.contacted} contactados · {c.meetings} reuniones</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {(leaderboard.by_person || []).length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-brand-muted text-sm">Sin datos cargados todavía por nadie del equipo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'client' && (
      <>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setClientMenuOpen((v) => !v); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm font-tech min-w-[200px] hover:border-brand-violet transition"
          >
            <Building2 size={14} className="text-brand-muted flex-shrink-0" />
            <span className="flex-1 text-left truncate">{client?.name || 'Elige una marca'}</span>
            <ChevronDown size={13} className={`text-brand-muted transition-transform flex-shrink-0 ${clientMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {clientMenuOpen && (
            <div onClick={(e) => e.stopPropagation()} className="absolute z-20 mt-1.5 w-64 bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in overflow-hidden">
              <div className="max-h-64 overflow-y-auto py-1">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between px-3 py-2 text-sm hover:bg-brand-panel transition ${c.id === clientId ? 'text-brand-ice' : ''}`}
                  >
                    <button onClick={() => { setClientId(c.id); setClientMenuOpen(false); }} className="flex-1 text-left truncate flex items-center gap-2">
                      <span className="truncate">{c.name}</span>
                      {c.id === clientId && <Check size={13} className="text-brand-violet flex-shrink-0" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditClient(c); }}
                      className="icon-btn p-1 rounded text-brand-muted opacity-0 group-hover:opacity-100 hover:text-brand-ice transition flex-shrink-0"
                      title="Editar marca"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                ))}
                {clients.length === 0 && <div className="px-3 py-3 text-xs text-brand-muted">Sin marcas todavía.</div>}
              </div>
              <div className="border-t border-brand-border">
                <button
                  onClick={() => { setShowAddClient(!showAddClient); setClientMenuOpen(false); setAddClientError(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand-ice hover:bg-brand-panel transition"
                >
                  <Plus size={14} /> Agregar marca
                </button>
                {clients.length > 1 && (
                  <button
                    onClick={() => { setReordering(true); setClientMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand-muted hover:text-brand-ice hover:bg-brand-panel transition"
                  >
                    <GripVertical size={14} /> Reordenar marcas
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {reordering && (
        <ReorderClientsModal
          clients={clients}
          onClose={() => setReordering(false)}
          onSaved={(ordered) => { setClients(ordered); setReordering(false); }}
        />
      )}

      {showAddClient && (
        <div className="relative mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 max-w-md">
          <label className="block text-xs text-brand-muted mb-1.5">Buscar empresa existente en tu CRM</label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Nombre de la marca..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
            />
          </div>
          {addClientError && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {addClientError}
            </div>
          )}
          {companyResults.length > 0 && (
            <div className="mt-1 bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
              {companyResults.map((c) => (
                <button key={c.id} onClick={() => addClient(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition">
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {companySearch.trim() && companyResults.length === 0 && (
            <button
              onClick={createAndAddClient}
              disabled={creatingCompany}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-bg border border-dashed border-brand-border hover:border-brand-violet text-sm text-brand-ice transition disabled:opacity-50"
            >
              <Plus size={14} /> {creatingCompany ? 'Creando...' : `Crear "${companySearch.trim()}" como empresa nueva`}
            </button>
          )}
        </div>
      )}

      {!clientId ? (
        <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
          Agrega una marca para empezar a cargar su base y reuniones.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="font-manrope font-medium text-lg">{client?.name}</div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition flex items-center gap-1.5">
                <Plus size={13} /> Agregar manual
              </button>

              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setImportMenuOpen((v) => !v); }} className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition flex items-center gap-1.5">
                  <Upload size={13} /> Importar <ChevronDown size={11} className={`transition-transform ${importMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {importMenuOpen && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 z-20 mt-1.5 w-56 bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in overflow-hidden">
                    <label className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-brand-panel transition">
                      <Upload size={13} className="text-brand-muted flex-shrink-0" /> Base contactada
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { setImportMenuOpen(false); handleImport(e, 'contactados'); }} />
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-brand-panel transition border-t border-brand-border">
                      <CalendarCheck size={13} className="text-brand-muted flex-shrink-0" /> Reuniones
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { setImportMenuOpen(false); handleImport(e, 'reuniones'); }} />
                    </label>
                  </div>
                )}
              </div>

              <button onClick={copyShareLink} className="px-3 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-xs hover:opacity-90 transition flex items-center gap-1.5">
                {copiedLink ? <Check size={13} /> : <Link2 size={13} />}
                {copiedLink ? 'Link copiado' : 'Compartir'}
              </button>

              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setActionsMenuOpen((v) => !v); }} className="icon-btn p-2 rounded-lg bg-brand-panel border border-brand-border text-brand-muted hover:text-brand-ice hover:border-brand-violet transition">
                  <MoreHorizontal size={15} />
                </button>
                {actionsMenuOpen && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 z-20 mt-1.5 w-56 bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in overflow-hidden">
                    <button
                      onClick={() => { setActionsMenuOpen(false); openExportPdf(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-brand-panel transition"
                    >
                      <Download size={14} className="text-brand-muted flex-shrink-0" /> Exportar PDF
                    </button>
                    <button
                      onClick={() => { setActionsMenuOpen(false); exportToContacts(); }}
                      disabled={exporting}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-brand-panel transition disabled:opacity-50 border-t border-brand-border"
                    >
                      <ListPlus size={14} className="text-brand-muted flex-shrink-0" /> {exporting ? 'Enviando...' : 'Ver en Listas'}
                    </button>
                    <button
                      onClick={() => { setActionsMenuOpen(false); markAllRealizada(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-300 hover:bg-brand-panel transition border-t border-brand-border"
                    >
                      <CheckCircle2 size={14} className="flex-shrink-0" /> Marcar todo realizada
                    </button>
                    <button
                      onClick={() => { setActionsMenuOpen(false); clearClientRecords(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-300 hover:bg-brand-panel transition border-t border-brand-border"
                    >
                      <Trash2 size={14} className="flex-shrink-0" /> Borrar todo de {client?.name}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-brand-muted mb-4 -mt-2 cursor-pointer w-fit">
            <input type="checkbox" checked={mergeByCompany} onChange={(e) => setMergeByCompany(e.target.checked)} className="accent-brand-violet" />
            Fusionar por empresa al importar reuniones (desactívalo si la misma empresa puede tener varias reuniones distintas en el archivo)
          </label>

          {importResult && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${importResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
              {importResult.error || (importResult.marked
                ? `${importResult.inserted} registro(s) marcados como "Reunión realizada".`
                : importResult.exported
                ? `${importResult.inserted} contacto(s) en la lista "${importResult.list_name}".`
                : `Importado: ${importResult.inserted} nuevos${importResult.updated ? `, ${importResult.updated} actualizados a "reunión agendada"` : ''}.`)}
            </div>
          )}

          {dashboard && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 mb-6">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Users size={12} /> Contactados</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold truncate">{dashboard.total_contacted}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-brand-ice text-xs mb-1"><CalendarClock size={12} /> Programadas</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold text-brand-ice truncate">{dashboard.total_scheduled}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><CalendarCheck size={12} /> Realizadas</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold text-green-300 truncate">{dashboard.total_realized}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-orange-300 text-xs mb-1"><RefreshCcw size={12} /> Reactivadas</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold text-orange-300 truncate">{dashboard.total_reactivations}</div>
                </div>
                <div
                  onClick={() => document.getElementById('reuniones-por-mes')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0 cursor-pointer hover:border-brand-violet/50 transition"
                  title="Ver el detalle completo"
                >
                  <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><History size={12} /> Histórico</div>
                  {(dashboard.by_month || []).length > 0 ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-headline font-semibold truncate">
                          {(dashboard.by_month || []).reduce((sum, r) => sum + r.count, 0)}
                        </span>
                        {(dashboard.by_month || []).length >= 2 && (() => {
                          const last = (dashboard.by_month || [])[(dashboard.by_month || []).length - 1].count;
                          const prev = (dashboard.by_month || [])[(dashboard.by_month || []).length - 2].count;
                          if (prev === 0) return null;
                          const diff = Math.round(((last - prev) / prev) * 100);
                          return (
                            <span className={`text-[10px] font-tech flex-shrink-0 ${diff >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                              {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-end gap-[2px] h-6 mt-1.5">
                        {(dashboard.by_month || []).slice(-12).map((row) => {
                          const max = Math.max(...(dashboard.by_month || []).map((r) => r.count), 1);
                          return <div key={row.month} title={`${row.month}: ${row.count}`} className="flex-1 bg-gradient-to-t from-brand-violet to-brand-magenta rounded-sm" style={{ height: `${Math.max((row.count / max) * 100, 6)}%` }} />;
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xl sm:text-2xl font-headline font-semibold text-brand-muted">—</div>
                  )}
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={12} /> Este mes</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold text-yellow-300 truncate">{dashboard.meetings_this_month}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por industria</div>
                  <div className="space-y-2">
                    {(dashboard.by_industry || []).map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {(dashboard.by_industry || []).length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por país</div>
                  <div className="space-y-2">
                    {(dashboard.by_country || []).map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {(dashboard.by_country || []).length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por ciudad</div>
                  <div className="space-y-2">
                    {(dashboard.by_city || []).map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {(dashboard.by_city || []).length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por cargo</div>
                  <div className="space-y-2">
                    {(dashboard.by_position || []).map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {(dashboard.by_position || []).length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por comercial</div>
                  <div className="space-y-2">
                    {(dashboard.by_commercial || []).map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {(dashboard.by_commercial || []).length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>
              </div>

              <div id="reuniones-por-mes" className="mb-6">
                <MeetingsByMonthChart
                  scheduled={dashboard.by_month_scheduled || []}
                  realized={dashboard.by_month_realized || []}
                  reactivated={dashboard.by_month_reactivations || []}
                />
              </div>

              {dashboard.by_person && (dashboard.by_person || []).length > 0 && (
                <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-brand-border flex items-center gap-2">
                    <Users size={15} className="text-brand-ice" />
                    <div className="text-sm font-manrope font-medium">Rendimiento por persona</div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-brand-panel/80 text-brand-muted text-left">
                      <tr>
                        <th className="px-5 py-2.5 font-manrope font-normal">Quién</th>
                        <th className="px-5 py-2.5 font-manrope font-normal">Contactados</th>
                        <th className="px-5 py-2.5 font-manrope font-normal">Reuniones</th>
                        <th className="px-5 py-2.5 font-manrope font-normal">Conversión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboard.by_person || []).map((p, i) => (
                        <tr key={i} className="border-t border-brand-border">
                          <td className="px-5 py-2.5">{p.name}</td>
                          <td className="px-5 py-2.5 text-brand-muted font-tech">{p.contacted}</td>
                          <td className="px-5 py-2.5 text-brand-ice font-tech">{p.meetings}</td>
                          <td className="px-5 py-2.5 text-green-300 font-tech">{p.conversion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-end gap-2 mb-3 bg-brand-panel border border-brand-border rounded-xl p-3">
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Buscar</label>
              <input
                value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Empresa o contacto..."
                className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet w-40"
              />
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Estado</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">País</label>
              <select value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
                <option value="">Todos</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Ciudad</label>
              <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
                <option value="">Todas</option>
                {distinctCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Industria</label>
              <select value={filters.industry} onChange={(e) => setFilters({ ...filters, industry: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
                <option value="">Todas</option>
                {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Ejecutivo</label>
              <select value={filters.executive} onChange={(e) => setFilters({ ...filters, executive: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet">
                <option value="">Todos</option>
                {distinctExecutives.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Reunión desde</label>
              <DateTimePicker dateOnly value={filters.dateFrom} onChange={(v) => setFilters({ ...filters, dateFrom: v })} placeholder="Sin límite" className="text-xs py-1.5" />
            </div>
            <div>
              <label className="block text-[10px] text-brand-muted mb-1">Reunión hasta</label>
              <DateTimePicker dateOnly value={filters.dateTo} onChange={(v) => setFilters({ ...filters, dateTo: v })} placeholder="Sin límite" className="text-xs py-1.5" />
            </div>
            {hasActiveFilters && (
              <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-brand-muted hover:text-red-300 transition pb-1.5">
                Limpiar filtros
              </button>
            )}
            <div className="text-xs text-brand-muted pb-1.5 ml-auto">{filteredRecords.length} de {records.length}</div>
          </div>

          <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-panel/80 text-brand-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                  <th className="px-4 py-3 font-manrope font-normal">Contacto</th>
                  <th className="px-4 py-3 font-manrope font-normal">Ejecutivo</th>
                  <th className="px-4 py-3 font-manrope font-normal">Comercial</th>
                  <th className="px-4 py-3 font-manrope font-normal">F. reactivada</th>
                  <th className="px-4 py-3 font-manrope font-normal">Industria</th>
                  <th className="px-4 py-3 font-manrope font-normal">País</th>
                  <th className="px-4 py-3 font-manrope font-normal">Ciudad</th>
                  <th className="px-4 py-3 font-manrope font-normal">Fecha reunión</th>
                  <th className="px-4 py-3 font-manrope font-normal">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="border-t border-brand-border row-hover cursor-pointer" onClick={() => openEdit(r)}>
                    <td className="px-4 py-3">{r.target_company}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.target_contact || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.executive || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.commercial || '—'}</td>
                    <td className="px-4 py-3 text-orange-300 font-tech text-xs">{r.reactivated_date ? new Date(r.reactivated_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.industry || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.country || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.city || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted font-tech text-xs">{r.meeting_date ? new Date(r.meeting_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${STATUS_STYLE[r.status] || 'bg-brand-bg text-brand-muted'}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><Pencil size={13} className="text-brand-muted inline" /></td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-brand-muted text-sm">{records.length === 0 ? 'Sin registros todavía. Importa una base o agrega uno manual para empezar.' : 'Ningún registro coincide con estos filtros.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      </>
      )}

      {modalOpen && (
        <B2bRecordModal
          clientId={clientId}
          record={editingRecord}
          onClose={() => setModalOpen(false)}
          onSaved={onSaved}
        />
      )}

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 overlay-in" onClick={() => setEditingClient(null)} />
          <div className="relative w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <span className="font-headline text-base font-semibold">Editar marca</span>
              <button onClick={() => setEditingClient(null)} className="text-brand-muted hover:text-brand-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {editClientError && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {editClientError}
                </div>
              )}
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Nombre</label>
                <input
                  autoFocus value={editClientForm.name}
                  onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Industria</label>
                <select
                  value={editClientForm.industry}
                  onChange={(e) => setEditClientForm({ ...editClientForm, industry: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
                >
                  <option value="">Sin especificar</option>
                  {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">País</label>
                <select
                  value={editClientForm.country}
                  onChange={(e) => setEditClientForm({ ...editClientForm, country: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
                >
                  <option value="">Sin especificar</option>
                  {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-brand-border flex justify-end gap-2">
              <button onClick={() => setEditingClient(null)} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
              <button
                onClick={saveEditClient}
                disabled={savingClient}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50"
              >
                {savingClient ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReorderClientsModal({ clients, onClose, onSaved }) {
  const [order, setOrder] = useState(clients);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef(null);

  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === i) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(i, 0, moved);
    dragIndex.current = i;
    setOrder(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/api/b2b/clients/reorder', { ordered_ids: order.map((c) => c.id) });
      onSaved(order);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 overlay-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden modal-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <span className="font-headline text-base font-semibold">Reordenar marcas</span>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={18} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {order.map((c, i) => (
            <div
              key={c.id}
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={(e) => handleDragOver(e, i)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm cursor-grab active:cursor-grabbing hover:bg-brand-bg transition"
            >
              <GripVertical size={14} className="text-brand-muted flex-shrink-0" />
              {c.name}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-brand-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
