import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  Users, Plus, Upload, Building2, TrendingUp, Percent, CalendarCheck, History,
  Link2, Check, Pencil, Trash2, GripVertical, X, ListPlus, CheckCircle2,
} from 'lucide-react';
import B2bRecordModal, { INDUSTRY_OPTIONS, COUNTRY_OPTIONS } from '../components/B2bRecordModal';
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
  industria: 'industry', industry: 'industry', sector: 'industry',
  pais: 'country', país: 'country', country: 'country',
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
  const EMPTY_FILTERS = { search: '', status: '', country: '', executive: '', industry: '', dateFrom: '', dateTo: '' };
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
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

  const addClient = async (companyId) => {
    await api.post('/api/b2b/clients', { company_id: companyId });
    setShowAddClient(false);
    setCompanySearch('');
    setCompanyResults([]);
    const list = await api.get('/api/b2b/clients');
    setClients(list);
    setClientId(companyId);
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
  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const filteredRecords = records.filter((r) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!r.target_company?.toLowerCase().includes(q) && !r.target_contact?.toLowerCase().includes(q)) return false;
    }
    if (filters.status && r.status !== filters.status) return false;
    if (filters.country && normalizeCountry(r.country) !== normalizeCountry(filters.country)) return false;
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
                    {leaderboard.by_person.map((p, i) => {
                      const detail = leaderboard.by_person_by_client.find((d) => d.name === p.name);
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
                                  {detail.clients.map((c) => (
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
                    {leaderboard.by_person.length === 0 && (
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
        <select
          value={clientId || ''}
          onChange={(e) => setClientId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm font-tech min-w-[200px]"
        >
          <option value="" disabled>Elige una marca</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowAddClient(!showAddClient)} className="text-xs text-brand-ice hover:underline flex items-center gap-1">
          <Plus size={13} /> Agregar marca
        </button>
        {clients.length > 1 && (
          <button onClick={() => setReordering(true)} className="text-xs text-brand-muted hover:text-brand-ice transition flex items-center gap-1">
            <GripVertical size={13} /> Reordenar marcas
          </button>
        )}
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
          {companyResults.length > 0 && (
            <div className="mt-1 bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
              {companyResults.map((c) => (
                <button key={c.id} onClick={() => addClient(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition">
                  {c.name}
                </button>
              ))}
            </div>
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
            <div className="flex gap-2 flex-wrap">
              <button onClick={openAdd} className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition flex items-center gap-1.5">
                <Plus size={13} /> Agregar manual
              </button>
              <label className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs cursor-pointer hover:border-brand-violet transition flex items-center gap-1.5">
                <Upload size={13} /> Importar base contactada
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImport(e, 'contactados')} />
              </label>
              <label className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs cursor-pointer hover:border-brand-violet transition flex items-center gap-1.5">
                <CalendarCheck size={13} /> Importar reuniones
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImport(e, 'reuniones')} />
              </label>
              <button onClick={exportToContacts} disabled={exporting} className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition flex items-center gap-1.5 disabled:opacity-50">
                <ListPlus size={13} /> {exporting ? 'Enviando...' : 'Ver en Listas'}
              </button>
              <button onClick={copyShareLink} className="px-3 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-xs hover:opacity-90 transition flex items-center gap-1.5">
                {copiedLink ? <Check size={13} /> : <Link2 size={13} />}
                {copiedLink ? 'Link copiado' : 'Compartir con la marca'}
              </button>
              <button onClick={markAllRealizada} className="px-3 py-2 rounded-lg border border-green-500/30 text-green-300 text-xs hover:bg-green-500/10 transition flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Marcar todo como realizada
              </button>
              <button onClick={clearClientRecords} className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-xs hover:bg-red-500/10 transition flex items-center gap-1.5">
                <Trash2 size={13} /> Borrar todo de {client?.name}
              </button>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
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
                  <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><History size={12} /> Histórico</div>
                  {dashboard.by_month.length > 0 ? (
                    <div className="flex items-end gap-[2px] h-8 mt-1">
                      {dashboard.by_month.slice(-12).map((row) => {
                        const max = Math.max(...dashboard.by_month.map((r) => r.count), 1);
                        return <div key={row.month} title={`${row.month}: ${row.count}`} className="flex-1 bg-gradient-to-t from-brand-violet to-brand-magenta rounded-sm" style={{ height: `${Math.max((row.count / max) * 100, 6)}%` }} />;
                      })}
                    </div>
                  ) : (
                    <div className="text-xl sm:text-2xl font-headline font-semibold text-brand-muted">—</div>
                  )}
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-3 sm:p-4 panel-depth min-w-0">
                  <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={12} /> Este mes</div>
                  <div className="text-xl sm:text-2xl font-headline font-semibold text-yellow-300 truncate">{dashboard.meetings_this_month}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por industria</div>
                  <div className="space-y-2">
                    {dashboard.by_industry.map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {dashboard.by_industry.length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5 min-w-0">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por país</div>
                  <div className="space-y-2">
                    {dashboard.by_country.map((row, i) => (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                        <span className="text-xs font-tech">{row.count}</span>
                      </div>
                    ))}
                    {dashboard.by_country.length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
                  </div>
                </div>
              </div>

              <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-6 min-w-0">
                <div className="text-sm font-manrope font-medium mb-4">Reuniones por mes</div>
                {dashboard.by_month.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-1.5 h-32" style={{ minWidth: `${dashboard.by_month.length * 32}px` }}>
                      {dashboard.by_month.map((row) => {
                        const max = Math.max(...dashboard.by_month.map((r) => r.count), 1);
                        return (
                          <div key={row.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-[24px]">
                            <div className="text-[9px] text-brand-muted font-tech mb-1">{row.count}</div>
                            <div className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t" style={{ height: `${(row.count / max) * 100}%` }} />
                            <div className="text-[9px] text-brand-muted font-tech mt-1">{monthLabel(row.month)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-brand-muted text-xs">Sin datos todavía.</div>
                )}
              </div>

              {dashboard.by_person && dashboard.by_person.length > 0 && (
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
                      {dashboard.by_person.map((p, i) => (
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
                  <th className="px-4 py-3 font-manrope font-normal">Industria</th>
                  <th className="px-4 py-3 font-manrope font-normal">País</th>
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
                    <td className="px-4 py-3 text-brand-muted">{r.industry || '—'}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.country || '—'}</td>
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
