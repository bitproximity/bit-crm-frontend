import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Users, Plus, Upload, Building2, TrendingUp, Percent, CalendarCheck,
  Link2, Check, Pencil,
} from 'lucide-react';
import B2bRecordModal from '../components/B2bRecordModal';

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
  contacto: 'target_contact', target_contact: 'target_contact', nombre: 'target_contact',
  industria: 'industry', industry: 'industry', sector: 'industry',
  pais: 'country', país: 'country', country: 'country',
  fecha: 'contacted_at', contacted_at: 'contacted_at', fecha_contacto: 'contacted_at',
  fecha_reunion: 'meeting_date', meeting_date: 'meeting_date', fecha_reunión: 'meeting_date',
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
const STATUS_LABEL = {
  contactado: 'Contactado', reunion_agendada: 'Reunión agendada',
  reunion_realizada: 'Reunión realizada', no_interesado: 'No interesado',
};

export default function B2bMeetings() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const loadClients = () => api.get('/api/b2b/clients').then((list) => {
    setClients(list);
    if (!clientId && list.length) setClientId(list[0].id);
  }).catch((err) => setError(err.message));

  useEffect(() => { loadClients(); }, []);

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
      const result = await api.post('/api/b2b/import', { client_company_id: clientId, mode, records: rows });
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

  const openEdit = (record) => { setEditingRecord(record); setModalOpen(true); };
  const openAdd = () => { setEditingRecord(null); setModalOpen(true); };
  const onSaved = () => { setModalOpen(false); loadClientData(); };

  const client = clients.find((c) => c.id === clientId);
  const COLORS = ['#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444'];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Bit Prospect</h1>
      </div>
      <p className="text-brand-muted text-sm mb-6">Panel por marca/cliente: base de datos, reuniones y reporte compartible</p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

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
      </div>

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
              <button onClick={copyShareLink} className="px-3 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-xs hover:opacity-90 transition flex items-center gap-1.5">
                {copiedLink ? <Check size={13} /> : <Link2 size={13} />}
                {copiedLink ? 'Link copiado' : 'Compartir con la marca'}
              </button>
            </div>
          </div>

          {importResult && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${importResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
              {importResult.error || `Importado: ${importResult.inserted} nuevos${importResult.updated ? `, ${importResult.updated} actualizados a "reunión agendada"` : ''}.`}
            </div>
          )}

          {dashboard && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Users size={12} /> Contactados</div>
                  <div className="text-2xl font-headline font-semibold">{dashboard.total_contacted}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-brand-ice text-xs mb-1"><CalendarCheck size={12} /> Reuniones agendadas</div>
                  <div className="text-2xl font-headline font-semibold text-brand-ice">{dashboard.total_meetings}</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><Percent size={12} /> Tasa de conversión</div>
                  <div className="text-2xl font-headline font-semibold text-green-300">{dashboard.conversion_rate}%</div>
                </div>
                <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={12} /> Este mes</div>
                  <div className="text-2xl font-headline font-semibold text-yellow-300">{dashboard.meetings_this_month}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
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

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
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

                <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
                  <div className="text-sm font-manrope font-medium mb-4">Reuniones por mes</div>
                  {dashboard.by_month.length > 0 ? (
                    <div className="flex items-end gap-1.5 h-28">
                      {dashboard.by_month.map((row) => {
                        const max = Math.max(...dashboard.by_month.map((r) => r.count), 1);
                        return (
                          <div key={row.month} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div className="text-[9px] text-brand-muted font-tech mb-1">{row.count}</div>
                            <div className="w-full bg-gradient-to-t from-brand-violet to-brand-magenta rounded-t" style={{ height: `${(row.count / max) * 100}%` }} />
                            <div className="text-[9px] text-brand-muted font-tech mt-1">{row.month.slice(5)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-brand-muted text-xs">Sin datos todavía.</div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-panel/80 text-brand-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                  <th className="px-4 py-3 font-manrope font-normal">Contacto</th>
                  <th className="px-4 py-3 font-manrope font-normal">Industria</th>
                  <th className="px-4 py-3 font-manrope font-normal">País</th>
                  <th className="px-4 py-3 font-manrope font-normal">Fecha reunión</th>
                  <th className="px-4 py-3 font-manrope font-normal">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-brand-border hover:bg-brand-bg/50 transition cursor-pointer" onClick={() => openEdit(r)}>
                    <td className="px-4 py-3">{r.target_company}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.target_contact || '—'}</td>
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
                {records.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-muted text-sm">Sin registros todavía. Importa una base o agrega uno manual para empezar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
