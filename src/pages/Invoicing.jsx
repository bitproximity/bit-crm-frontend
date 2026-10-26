import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { formatDay, parseDay, todayLocal } from '../lib/dateOnly';
import { fmtUsd, fmtNative, agoFrom, pct } from '../lib/money';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import LiveStatus from '../components/LiveStatus';
import ReconciliationPanel from '../components/ReconciliationPanel';
import DateTimePicker from '../components/DateTimePicker';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { Receipt, Plus, X, DollarSign, AlertTriangle, CheckCircle2, Clock, Check, Search, FileUp, RefreshCw, ChevronDown, Link2, Percent } from 'lucide-react';
import NewInvoiceModal from '../components/NewInvoiceModal';
import InvoiceImportModal from '../components/InvoiceImportModal';
import { SOURCE_ACCOUNTS, CURRENCIES } from '../lib/invoiceMeta';

const STATUS_LABELS = { pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', cancelada: 'Cancelada' };
const STATUS_COLORS = {
  pendiente: 'bg-yellow-500/15 text-yellow-300',
  parcial: 'bg-blue-500/15 text-blue-300',
  pagada: 'bg-green-500/15 text-green-300',
  cancelada: 'bg-brand-border text-brand-muted',
};

const clamp2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

function contactName(c) {
  if (!c) return null;
  return `${c.first_name || ''} ${c.last_name || ''}`.trim();
}

export default function Invoicing() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const syncMenuRef = useRef(null);
  useOutsideClick(syncMenuRef, () => setShowSyncMenu(false), showSyncMenu);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingNameId, setEditingNameId] = useState(null);
  const [nameDraft, setNameDraft] = useState('');

  const [syncing, setSyncing] = useState('');
  const [markingPaid, setMarkingPaid] = useState(null);
  const [tab, setTab] = useState('facturas'); // 'facturas' | 'conciliacion'
  const [syncState, setSyncState] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const togglePaid = async (inv) => {
    setMarkingPaid(inv.id);
    try {
      const goingToPaid = inv.status !== 'pagada';
      await api.patch(`/api/invoices/${inv.id}`, {
        status: goingToPaid ? 'pagada' : 'pendiente',
        paid_amount: goingToPaid ? inv.total : 0,
      });
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: goingToPaid ? 'pagada' : 'pendiente', paid_amount: goingToPaid ? inv.total : 0 } : i)));
    } catch (err) {
      alert(err.message || 'No se pudo actualizar el estado de la factura');
    }
    setMarkingPaid(null);
  };

  const changeStatus = async (inv, status) => {
    try {
      const paid_amount = status === 'pagada' ? inv.total : status === 'cancelada' ? inv.paid_amount : inv.paid_amount;
      await api.patch(`/api/invoices/${inv.id}`, { status, paid_amount });
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status, paid_amount } : i)));
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado');
    }
  };

  const startEditName = (inv) => { setEditingNameId(inv.id); setNameDraft(inv.client_name || ''); };
  const saveEditName = async (inv) => {
    try {
      await api.patch(`/api/invoices/${inv.id}`, { client_name: nameDraft || null });
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, client_name: nameDraft || null } : i)));
    } catch (err) {
      alert(err.message || 'No se pudo guardar');
    }
    setEditingNameId(null);
  };

  const [syncMsg, setSyncMsg] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (monthFilter) params.set('month', monthFilter);
    else if (yearFilter) params.set('year', yearFilter);
    if (accountFilter) params.set('source_account', accountFilter);
    if (searchDebounced.trim()) params.set('q', searchDebounced.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return Promise.all([
      api.get(`/api/invoices${qs}`),
      api.get('/api/invoices/summary'),
      api.get('/api/invoice-sync/status').catch(() => null),
    ]).then(([inv, sum, st]) => {
      setInvoices(inv);
      setSummary(sum);
      setSyncState(st);
      setError('');
      setLastUpdated(Date.now());
      setLoading(false);
    }).catch((err) => { setError(err.message || 'No se pudieron cargar las facturas.'); setLoading(false); });
  };

  // En vivo: se vuelve a pedir solo cada 30 s (con la pestaña a la vista) y al volver a la ventana.
  const refresh = useAutoRefresh(load, { intervalMs: 30000, enabled: tab === 'facturas' });
  const refreshNow = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { load(); }, [statusFilter, yearFilter, monthFilter, accountFilter, searchDebounced]);

  const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const MONTH_NAMES = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };

  const SOURCE_LABELS = { stripe: 'Stripe', alegra: 'Alegra', 'facturero-movil': 'Facturero Móvil' };
  const runSync = async (source) => {
    setSyncing(source);
    setSyncMsg('');
    try {
      const result = await api.post(`/api/invoice-sync/${source}`, {});
      setSyncMsg(`${SOURCE_LABELS[source]}: ${result.created} nuevas, ${result.updated || 0} actualizadas, ${result.skipped} sin cambios.`);
      load();
    } catch (err) {
      setSyncMsg(`${SOURCE_LABELS[source]}: ${err.message}`);
    }
    setSyncing('');
  };

  // Sin tasa de cambio no hay USD que mostrar: se enseña el monto original (y se avisa), no un «USD 0» que engaña.
  const usdOf = (inv) => (inv.rate_missing ? null : (inv.total_usd ?? (inv.currency === 'USD' ? Number(inv.total) : null)));
  const paidUsdOf = (inv) => (inv.rate_missing ? null : (inv.paid_usd ?? (inv.currency === 'USD' ? Number(inv.paid_amount) : null)));
  // «Vencida hace 38 d» / «Vence en 3 d»: lo que más importa de una fecha de vencimiento es cuánto falta o cuánto se pasó.
  const dueInfo = (inv) => {
    if (inv.status === 'pagada' || inv.status === 'cancelada' || !inv.due_date) return null;
    if (inv.overdue) return { text: `Vencida hace ${inv.days_late} d`, cls: 'bg-red-500/15 text-red-300' };
    const n = Math.round((parseDay(inv.due_date) - parseDay(todayLocal())) / 86400000);
    if (n <= 7) return { text: n <= 0 ? 'Vence hoy' : `Vence en ${n} d`, cls: 'bg-yellow-500/15 text-yellow-300' };
    return null;
  };

  const runSyncAll = async () => {
    setSyncing('todo'); setSyncMsg('');
    const parts = [];
    for (const source of ['stripe', 'alegra', 'facturero-movil']) {
      try {
        const r = await api.post(`/api/invoice-sync/${source}`, {});
        parts.push(`${SOURCE_LABELS[source]}: +${r.created} nuevas, ${r.updated || 0} actualizadas`);
      } catch (err) { parts.push(`${SOURCE_LABELS[source]}: ${err.message}`); }
    }
    setSyncMsg(parts.join(' · '));
    setSyncing('');
    load();
  };

  // Los pagos se registran a mano en el CRM: que una factura figure «pagada» aquí y abierta en Alegra/Stripe es lo normal,
  // así que NO se muestra ningún aviso de «diferencias con el origen». La sincronización nunca pisa lo registrado en el CRM.
  const syncAges = Object.entries(syncState?.sources || {}).map(([name, v]) => ({ name, ok: v.ok, text: agoFrom(v.at) }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-headline text-xl font-semibold">Facturación</h1>
        <div className="flex flex-wrap items-center gap-2 [&_button]:whitespace-nowrap">
          <button onClick={() => setShowImport(true)} className="px-3.5 py-2 rounded-xl bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition flex items-center gap-1.5">
            <FileUp size={14} /> Importar facturas
          </button>
          <div className="relative" ref={syncMenuRef}>
            <button onClick={() => setShowSyncMenu((v) => !v)} disabled={!!syncing} aria-haspopup="menu" aria-expanded={showSyncMenu} className="px-3.5 py-2 rounded-xl bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando…' : 'Sincronizar'} <ChevronDown size={13} />
            </button>
            {showSyncMenu && (
              <div role="menu" className="absolute right-0 mt-1.5 w-52 bg-brand-bg border border-brand-border rounded-xl shadow-xl overflow-hidden z-20 dropdown-in">
                <button role="menuitem" onClick={() => { setShowSyncMenu(false); runSyncAll(); }} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition border-b border-brand-border font-medium">Todo (las 3 fuentes)</button>
                {[['stripe', 'Stripe'], ['alegra', 'Alegra'], ['facturero-movil', 'Facturero Móvil']].map(([k, label]) => (
                  <button key={k} role="menuitem" onClick={() => { setShowSyncMenu(false); runSync(k); }} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition">Sincronizar {label}</button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-xl text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Nueva factura
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <p className="text-brand-muted text-sm">Facturas ligadas a tratos y empresas · todo convertido a USD a la tasa del día</p>
        <LiveStatus lastUpdated={lastUpdated} onRefresh={refreshNow} refreshing={refreshing} />
      </div>
      {syncAges.length > 0 && (
        <p className="text-[11px] text-brand-muted mb-1">
          Sincronización automática cada 15 min: {syncAges.map((a, i) => <span key={a.name}>{i > 0 && ' · '}<span className={a.ok ? '' : 'text-red-300'}>{a.name} {a.ok ? a.text : 'con error'}</span></span>)}
        </p>
      )}
      {syncMsg && <p className="text-xs text-brand-ice mb-2">{syncMsg}</p>}
      <div className="flex gap-1 border-b border-brand-border mb-5 mt-3" role="tablist">
        {[['facturas', 'Facturas', Receipt], ['conciliacion', 'Conciliación con tratos', Link2]].map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-4 py-2.5 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition ${tab === key ? 'border-brand-violet text-brand-white' : 'border-transparent text-brand-muted hover:text-brand-white'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
      )}

      {summary?.missing_rates?.length > 0 && (
        <div role="alert" className="mb-4 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2">
          <AlertTriangle size={13} /> Falta la tasa de cambio de {summary.missing_rates.join(', ')}: las facturas en esa moneda no se suman al USD. Agrégala en Configuración → Tipos de cambio.
        </div>
      )}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Receipt size={12} /> Facturado (USD)</div>
              <div className="text-lg sm:text-xl font-headline font-semibold whitespace-nowrap">{fmtUsd(summary.total_facturado)}</div>
              <div className="text-[11px] text-brand-muted mt-0.5">{summary.count} factura{summary.count === 1 ? '' : 's'}</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><CheckCircle2 size={12} /> Cobrado</div>
              <div className="text-lg sm:text-xl font-headline font-semibold whitespace-nowrap text-green-300">{fmtUsd(summary.total_cobrado)}</div>
              <div className="text-[11px] text-brand-muted mt-0.5 flex items-center gap-1"><Percent size={10} /> {summary.collection_rate_pct ?? pct(summary.total_cobrado, summary.total_facturado)}% de lo facturado</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><Clock size={12} /> Por cobrar</div>
              <div className="text-lg sm:text-xl font-headline font-semibold whitespace-nowrap text-yellow-300">{fmtUsd(summary.total_pendiente)}</div>
              <div className="text-[11px] text-brand-muted mt-0.5">pendiente de cobro</div>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="flex items-center gap-1.5 text-red-300 text-xs mb-1"><AlertTriangle size={12} /> Vencido</div>
              <div className="text-lg sm:text-xl font-headline font-semibold whitespace-nowrap text-red-300">{fmtUsd(summary.total_vencido)}</div>
              <div className="text-[11px] text-brand-muted mt-0.5">{summary.count_overdue || 0} factura{summary.count_overdue === 1 ? '' : 's'} vencida{summary.count_overdue === 1 ? '' : 's'}</div>
            </div>
          </div>
          <p className="text-[11px] text-brand-muted mb-5">Todo en USD. Tasas de cambio actualizadas {agoFrom(summary.rates_updated_at) || 'recientemente'}.</p>
        </>
      )}

      {tab === 'facturas' && (<>
      <div className="relative mb-3 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente o número de factura..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm focus:outline-none focus:border-brand-violet transition"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {[{ key: '', label: 'Todas' }, { key: 'pendiente', label: 'Pendientes' }, { key: 'parcial', label: 'Parciales' }, { key: 'pagada', label: 'Pagadas' }, { key: 'cancelada', label: 'Canceladas' }].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${statusFilter === f.key ? 'bg-brand-violet/20 text-brand-ice' : 'text-brand-muted hover:text-brand-white bg-brand-panel border border-brand-border'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="w-px h-5 bg-brand-border mx-1" />
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setMonthFilter(''); }}
          className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted" style={{ colorScheme: 'dark' }}
        >
          <option value="" style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>Todos los años</option>
          {availableYears.map((y) => <option key={y} value={y} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{y}</option>)}
        </select>
        <select
          value={monthFilter ? monthFilter.slice(5, 7) : ''}
          onChange={(e) => {
            if (!e.target.value) { setMonthFilter(''); return; }
            const y = yearFilter || new Date().getFullYear();
            setMonthFilter(`${y}-${e.target.value}`);
          }}
          className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted" style={{ colorScheme: 'dark' }}
        >
          <option value="" style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>Todos los meses</option>
          {MONTHS.map((m) => <option key={m} value={m} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{MONTH_NAMES[m]}</option>)}
        </select>
        {summary?.by_account?.length > 0 && (
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted" style={{ colorScheme: 'dark' }}
          >
            <option value="" style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>Todas las empresas</option>
            {summary.by_account.map((a) => <option key={a.name} value={a.name} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{a.name}</option>)}
          </select>
        )}
        {(statusFilter || yearFilter || monthFilter || accountFilter || searchQuery) && (
          <button
            onClick={() => { setStatusFilter(''); setYearFilter(''); setMonthFilter(''); setAccountFilter(''); setSearchQuery(''); }}
            className="text-xs text-brand-muted hover:text-brand-white underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Insights: por empresa que factura, antigüedad de cartera, tendencia mensual —
          todo ya en USD (convertido server-side con exchange_rates). */}
      {summary && (summary.by_account?.length > 0 || summary.aging) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {summary.by_account?.length > 0 && (
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="text-xs font-manrope font-medium text-brand-muted uppercase tracking-wide mb-3">Facturado por empresa</div>
              <div className="space-y-2.5">
                {summary.by_account.slice(0, 6).map((a) => {
                  const max = summary.by_account[0].facturado || 1;
                  return (
                    <button key={a.name} onClick={() => setAccountFilter(a.name)} className="w-full text-left group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-brand-white group-hover:text-brand-ice transition truncate">{a.name}</span>
                        <span className="font-tech text-brand-muted flex-shrink-0 ml-2">{fmtUsd(a.facturado)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta" style={{ width: `${Math.max((a.facturado / max) * 100, 3)}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {summary.aging && (
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
              <div className="text-xs font-manrope font-medium text-brand-muted uppercase tracking-wide mb-3">Antigüedad de cartera (pendiente)</div>
              <div className="space-y-2.5">
                {[
                  { key: 'al_dia', label: 'Al día', color: 'bg-green-400' },
                  { key: '1_30', label: '1-30 días vencida', color: 'bg-yellow-400' },
                  { key: '31_60', label: '31-60 días', color: 'bg-orange-400' },
                  { key: '61_90', label: '61-90 días', color: 'bg-red-400' },
                  { key: 'mas_90', label: 'Más de 90 días', color: 'bg-red-600' },
                ].map((b) => {
                  const total = Object.values(summary.aging).reduce((s, v) => s + v, 0) || 1;
                  const val = summary.aging[b.key] || 0;
                  return (
                    <div key={b.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-brand-muted flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${b.color}`} /> {b.label}</span>
                        <span className="font-tech text-brand-white">{fmtUsd(val)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${Math.max((val / total) * 100, val > 0 ? 3 : 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla en escritorio, tarjetas en pantallas chicas — la tabla de 10 columnas no
          entra en un celular y quedaba rota (encabezados partidos, texto amontonado). */}
      <div className="hidden md:block bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 font-manrope font-normal">Factura</th>
              <th className="px-4 py-3 font-manrope font-normal">Cliente</th>
              <th className="px-4 py-3 font-manrope font-normal">Trato</th>
              <th className="px-4 py-3 font-manrope font-normal">Fechas</th>
              <th className="px-4 py-3 font-manrope font-normal text-right">Total (USD)</th>
              <th className="px-4 py-3 font-manrope font-normal">Cobrado</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
              <th className="px-4 py-3 font-manrope font-normal text-center">Pagó</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const usd = usdOf(inv); const paidUsd = paidUsdOf(inv); const due = dueInfo(inv);
              const paidPct = usd ? Math.min(100, pct(paidUsd ?? 0, usd)) : pct(Number(inv.paid_amount), Number(inv.total));
              return (
              <tr key={inv.id} onClick={() => setSelected(inv.id)} className="border-t border-brand-border row-hover cursor-pointer align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium">{inv.invoice_number || `#${inv.id.slice(0, 8)}`}</div>
                  {inv.source_account && (
                    <span title={inv.source_account} className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-tech bg-brand-violet/10 text-brand-ice border border-brand-violet/20 max-w-[9.5rem] truncate align-bottom">{inv.source_account}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-brand-muted min-w-[11rem]" onClick={(e) => editingNameId !== inv.id && e.stopPropagation()}>
                  {editingNameId === inv.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => saveEditName(inv)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditName(inv)}
                      className="px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs w-full"
                    />
                  ) : (
                    <button onClick={() => startEditName(inv)} className="hover:text-brand-ice text-left">
                      {inv.client_name || inv.companies?.name || contactName(inv.contacts) || <span className="italic">+ agregar nombre</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 min-w-[14rem] max-w-[22rem]">
                  {inv.deals?.title ? (
                    <div title={inv.deals.title} style={clamp2}>{inv.deals.title}</div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"><Link2 size={10} /> Sin trato</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-tech">
                  <div className="text-brand-muted">Emite {formatDay(inv.issue_date)}</div>
                  <div className="mt-0.5">Vence {formatDay(inv.due_date)}</div>
                  {due && <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${due.cls}`}>{due.text}</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="font-tech text-brand-ice text-base">{usd != null ? fmtUsd(usd) : fmtNative(inv.total, inv.currency)}</div>
                  {inv.currency !== 'USD' && (
                    <div className="text-[10px] text-brand-muted font-tech">{usd != null && fmtNative(inv.total, inv.currency)}{inv.rate_missing && <span className="text-yellow-300">sin tasa de cambio</span>}</div>
                  )}
                </td>
                <td className="px-4 py-3 min-w-[9rem]">
                  <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${paidPct >= 100 ? 'bg-green-400' : 'bg-gradient-to-r from-brand-violet to-brand-magenta'}`} style={{ width: `${paidPct}%` }} />
                  </div>
                  <div className="text-[11px] text-brand-muted font-tech mt-1">{paidUsd != null ? fmtUsd(paidUsd) : fmtNative(inv.paid_amount, inv.currency)} · {paidPct}%</div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {inv.overdue && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
                    <select
                      value={inv.status}
                      onChange={(e) => changeStatus(inv, e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className={`px-2 py-1 rounded-full text-xs font-tech border-0 ${STATUS_COLORS[inv.status]}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{v}</option>)}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => togglePaid(inv)}
                    disabled={inv.status === 'cancelada' || markingPaid === inv.id}
                    title={inv.status === 'pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition mx-auto disabled:opacity-30 ${
                      inv.status === 'pagada'
                        ? 'bg-green-500/20 border-green-400 text-green-300 hover:bg-green-500/10'
                        : 'border-brand-border text-transparent hover:border-green-400 hover:text-green-400/50'
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                </td>
              </tr>
            );
            })}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-brand-muted text-sm">Sin facturas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — pantallas chicas */}
      <div className="md:hidden space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth" onClick={() => setSelected(inv.id)}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <div className="font-manrope font-medium truncate">{inv.invoice_number || `#${inv.id.slice(0, 8)}`}</div>
                <div className="text-xs text-brand-muted truncate mt-0.5">{inv.client_name || inv.companies?.name || contactName(inv.contacts) || '—'}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); togglePaid(inv); }}
                disabled={inv.status === 'cancelada' || markingPaid === inv.id}
                className={`w-7 h-7 flex-shrink-0 rounded-full border flex items-center justify-center transition disabled:opacity-30 ${
                  inv.status === 'pagada' ? 'bg-green-500/20 border-green-400 text-green-300' : 'border-brand-border text-transparent'
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </button>
            </div>
            {!inv.deals?.title && <span className="inline-flex items-center gap-1 mb-2 mr-1.5 px-2 py-0.5 rounded-md text-[10px] bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"><Link2 size={9} /> Sin trato</span>}
            {inv.source_account && (
              <span className="inline-block mb-2 px-2 py-0.5 rounded-md text-[10px] font-tech bg-brand-violet/10 text-brand-ice border border-brand-violet/20">
                {inv.source_account}
              </span>
            )}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-tech text-brand-ice">{usdOf(inv) != null ? fmtUsd(usdOf(inv)) : fmtNative(inv.total, inv.currency)}{inv.currency !== 'USD' && <span className="block text-[10px] text-brand-muted">{fmtNative(inv.total, inv.currency)}</span>}</span>
              <span className="text-xs text-brand-muted text-right">{paidUsdOf(inv) != null ? fmtUsd(paidUsdOf(inv)) : fmtNative(inv.paid_amount, inv.currency)} cobrado</span>
            </div>
            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-brand-muted">{formatDay(inv.due_date)}{dueInfo(inv) && <span className={`ml-1.5 px-1.5 py-0.5 rounded ${dueInfo(inv).cls}`}>{dueInfo(inv).text}</span>}</span>
              <div className="flex items-center gap-1.5">
                {inv.overdue && <AlertTriangle size={11} className="text-red-400" />}
                <select
                  value={inv.status}
                  onChange={(e) => changeStatus(inv, e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={`px-2 py-1 rounded-full text-[11px] font-tech border-0 ${STATUS_COLORS[inv.status]}`}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        {!loading && invoices.length === 0 && (
          <div className="text-center text-brand-muted text-sm py-10">Sin facturas todavía.</div>
        )}
      </div>

      </>)}

      {tab === 'conciliacion' && <ReconciliationPanel isAdmin onChanged={load} />}

      {showCreate && <NewInvoiceModal defaultSource={accountFilter || ''} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setSyncMsg('Factura creada.'); load(); }} />}
      {showImport && <InvoiceImportModal onClose={() => { setShowImport(false); load(); }} onImported={() => load()} />}
      {selected && <InvoiceDetailModal invoiceId={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}

export function InvoiceDetailModal({ invoiceId, onClose, onChanged }) {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: '', notes: '' });
  const [editing, setEditing] = useState(false);
  const [currencyEdit, setCurrencyEdit] = useState('USD');
  const [fieldsEdit, setFieldsEdit] = useState({ invoice_number: '', client_name: '', source_account: '', issue_date: '', due_date: '', status: 'pendiente' });
  const [newLine, setNewLine] = useState({ description: '', quantity: 1, unit_price: '' });
  const [editingLineId, setEditingLineId] = useState(null);
  const [editLineForm, setEditLineForm] = useState({ description: '', quantity: 1, unit_price: '' });
  const [dealQuery, setDealQuery] = useState('');
  const [dealResults, setDealResults] = useState([]);
  const [dealSearching, setDealSearching] = useState(false);
  const dealBoxRef = useRef(null);
  useOutsideClick(dealBoxRef, () => setDealResults([]), dealResults.length > 0);

  const load = () => api.get(`/api/invoices/${invoiceId}`).then((data) => {
    setInvoice(data);
    setCurrencyEdit(data.currency);
    setFieldsEdit({
      invoice_number: data.invoice_number || '',
      client_name: data.client_name || '',
      source_account: data.source_account || '',
      issue_date: data.issue_date || '',
      due_date: data.due_date || '',
      status: data.status,
    });
  }).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [invoiceId]);

  useEffect(() => {
    if (!dealQuery.trim()) { setDealResults([]); return; }
    setDealSearching(true);
    const t = setTimeout(() => {
      api.get(`/api/deals?search=${encodeURIComponent(dealQuery.trim())}&limit=6`)
        .then(setDealResults)
        .catch(() => setDealResults([]))
        .finally(() => setDealSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [dealQuery]);

  const linkDeal = async (deal) => {
    await api.patch(`/api/invoices/${invoiceId}`, { deal_id: deal.id });
    setDealQuery('');
    setDealResults([]);
    load();
    onChanged?.();
  };

  const unlinkDeal = async () => {
    await api.patch(`/api/invoices/${invoiceId}`, { deal_id: null });
    load();
    onChanged?.();
  };

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [companySearching, setCompanySearching] = useState(false);
  const companyBoxRef = useRef(null);
  useOutsideClick(companyBoxRef, () => setCompanyResults([]), companyResults.length > 0);

  useEffect(() => {
    if (!companyQuery.trim()) { setCompanyResults([]); return; }
    setCompanySearching(true);
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companyQuery.trim())}&limit=6`)
        .then((res) => setCompanyResults(res.data || []))
        .catch(() => setCompanyResults([]))
        .finally(() => setCompanySearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [companyQuery]);

  const linkCompany = async (company) => {
    await api.patch(`/api/invoices/${invoiceId}`, { company_id: company.id });
    setCompanyQuery('');
    setCompanyResults([]);
    load();
    onChanged?.();
  };

  const unlinkCompany = async () => {
    await api.patch(`/api/invoices/${invoiceId}`, { company_id: null });
    load();
    onChanged?.();
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/invoices/${invoiceId}/payments`, paymentForm);
      setPaymentForm({ amount: '', method: '', notes: '' });
      setShowPayment(false);
      load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const removePayment = async (paymentId) => {
    await api.delete(`/api/invoices/${invoiceId}/payments/${paymentId}`);
    load();
    onChanged?.();
  };

  const saveCurrency = async () => {
    await api.patch(`/api/invoices/${invoiceId}`, { currency: currencyEdit });
    load();
    onChanged?.();
  };

  const saveFields = async () => {
    await api.patch(`/api/invoices/${invoiceId}`, {
      invoice_number: fieldsEdit.invoice_number || null,
      client_name: fieldsEdit.client_name || null,
      source_account: fieldsEdit.source_account || null,
      issue_date: fieldsEdit.issue_date || null,
      due_date: fieldsEdit.due_date || null,
      status: fieldsEdit.status,
    });
    load();
    onChanged?.();
  };

  const addLine = async (e) => {
    e.preventDefault();
    if (!newLine.description.trim()) return;
    await api.post(`/api/invoices/${invoiceId}/line-items`, {
      description: newLine.description,
      quantity: Number(newLine.quantity) || 1,
      unit_price: Number(newLine.unit_price) || 0,
    });
    setNewLine({ description: '', quantity: 1, unit_price: '' });
    load();
    onChanged?.();
  };

  const startEditLine = (li) => {
    setEditingLineId(li.id);
    setEditLineForm({ description: li.description || li.products?.name || '', quantity: li.quantity, unit_price: li.unit_price });
  };

  const saveEditLine = async (itemId) => {
    await api.patch(`/api/invoices/${invoiceId}/line-items/${itemId}`, {
      description: editLineForm.description,
      quantity: Number(editLineForm.quantity) || 1,
      unit_price: Number(editLineForm.unit_price) || 0,
    });
    setEditingLineId(null);
    load();
    onChanged?.();
  };

  const removeLine = async (itemId) => {
    await api.delete(`/api/invoices/${invoiceId}/line-items/${itemId}`);
    load();
    onChanged?.();
  };

  if (!invoice) return null;

  const pending = Number(invoice.total) - Number(invoice.paid_amount);
  const smallInput = 'px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';
  const plainInputClass = 'w-full px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet transition';
  const roClass = 'px-3 py-2.5 rounded-lg bg-brand-bg/60 border border-brand-border/60 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-headline text-lg font-semibold">{invoice.invoice_number || `Factura #${invoice.id.slice(0, 8)}`}</h2>
          <div className="flex items-center gap-3 flex-shrink-0 pl-3">
            <button onClick={() => { if (editing) saveFields(); setEditing(!editing); }} className="text-xs text-brand-ice hover:underline">{editing ? 'Guardar' : 'Editar'}</button>
            <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="mx-6 mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          {/* Misma estructura visual que Añadir trato: columna izquierda con los datos
              principales de la factura, columna derecha con secciones agrupadas
              (Detalles / Vinculado al CRM) — para que Facturación se vea y se sienta
              igual que el resto del CRM. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 px-6 py-5">
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Número de factura</label>
                {editing ? (
                  <input value={fieldsEdit.invoice_number} onChange={(e) => setFieldsEdit({ ...fieldsEdit, invoice_number: e.target.value })} className={plainInputClass} />
                ) : (
                  <div className={roClass}>{invoice.invoice_number || '—'}</div>
                )}
              </div>

              <div>
                <label className={labelClass}>Empresa que facturó</label>
                {editing ? (
                  <select value={fieldsEdit.source_account} onChange={(e) => setFieldsEdit({ ...fieldsEdit, source_account: e.target.value })} className={plainInputClass} style={{ colorScheme: 'dark' }}>
                    <option value="" style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>Sin especificar</option>
                    {SOURCE_ACCOUNTS.map((s) => <option key={s} value={s} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{s}</option>)}
                    {fieldsEdit.source_account && !SOURCE_ACCOUNTS.includes(fieldsEdit.source_account) && (
                      <option value={fieldsEdit.source_account} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{fieldsEdit.source_account} (actual)</option>
                    )}
                  </select>
                ) : (
                  <div className={roClass}>{invoice.source_account || <span className="text-brand-muted">Sin especificar</span>}</div>
                )}
              </div>

              <div>
                <label className={labelClass}>Razón social del cliente</label>
                {editing ? (
                  <input value={fieldsEdit.client_name} onChange={(e) => setFieldsEdit({ ...fieldsEdit, client_name: e.target.value })} className={plainInputClass} />
                ) : (
                  <div className={roClass}>{invoice.client_name || invoice.companies?.name || contactName(invoice.contacts) || <span className="text-brand-muted">Sin especificar</span>}</div>
                )}
              </div>

              <div>
                <label className={labelClass}>Moneda</label>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <select value={currencyEdit} onChange={(e) => setCurrencyEdit(e.target.value)} className={`${plainInputClass} font-tech`} style={{ colorScheme: 'dark' }}>
                      {CURRENCIES.map((c) => <option key={c} value={c} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{c}</option>)}
                    </select>
                    {currencyEdit !== invoice.currency && (
                      <button onClick={saveCurrency} className="text-[11px] text-brand-ice hover:underline flex-shrink-0">Guardar</button>
                    )}
                  </div>
                ) : (
                  <div className={`${roClass} font-tech`}>{invoice.currency}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center pt-1">
                <div className="bg-brand-bg rounded-lg p-3">
                  <div className="text-xs text-brand-muted mb-1">Total</div>
                  <div className="font-tech text-brand-white text-sm">{invoice.currency} {Number(invoice.total).toLocaleString()}</div>
                </div>
                <div className="bg-brand-bg rounded-lg p-3">
                  <div className="text-xs text-brand-muted mb-1">Cobrado</div>
                  <div className="font-tech text-green-300 text-sm">{invoice.currency} {Number(invoice.paid_amount).toLocaleString()}</div>
                </div>
                <div className="bg-brand-bg rounded-lg p-3">
                  <div className="text-xs text-brand-muted mb-1">Pendiente</div>
                  <div className="font-tech text-yellow-300 text-sm">{invoice.currency} {pending.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs font-tech tracking-wide text-brand-muted uppercase mb-3 pb-2 border-b border-brand-border">Detalles</div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Estado</label>
                    {editing ? (
                      <select value={fieldsEdit.status} onChange={(e) => setFieldsEdit({ ...fieldsEdit, status: e.target.value })} className={plainInputClass} style={{ colorScheme: 'dark' }}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k} style={{ backgroundColor: '#100E1C', color: '#FBFAFF' }}>{v}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {invoice.overdue && <AlertTriangle size={12} className="text-red-400" />}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${STATUS_COLORS[invoice.status]}`}>{STATUS_LABELS[invoice.status]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Fecha de emisión</label>
                    {editing ? (
                      <input type="date" value={fieldsEdit.issue_date} onChange={(e) => setFieldsEdit({ ...fieldsEdit, issue_date: e.target.value })} className={plainInputClass} style={{ colorScheme: 'dark' }} />
                    ) : (
                      <div className={roClass}>{formatDay(invoice.issue_date)}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Vencimiento</label>
                    {editing ? (
                      <input type="date" value={fieldsEdit.due_date} onChange={(e) => setFieldsEdit({ ...fieldsEdit, due_date: e.target.value })} className={plainInputClass} style={{ colorScheme: 'dark' }} />
                    ) : (
                      <div className={roClass}>{formatDay(invoice.due_date)}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-tech tracking-wide text-brand-muted uppercase mb-3 pb-2 border-b border-brand-border">Vinculado al CRM</div>
                <div className="space-y-4">
                  <div className="relative" ref={dealBoxRef}>
                    <label className={labelClass}>Trato</label>
                    {invoice.deals?.title ? (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm">
                        <span className="truncate">{invoice.deals.title}</span>
                        <button onClick={unlinkDeal} className="text-brand-muted hover:text-red-400 text-xs flex-shrink-0 ml-2">Quitar</button>
                      </div>
                    ) : (
                      <input
                        value={dealQuery}
                        onChange={(e) => setDealQuery(e.target.value)}
                        placeholder="Buscar un trato para vincular..."
                        className={plainInputClass}
                      />
                    )}
                    {dealQuery && (dealResults.length > 0 || dealSearching) && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-brand-panel border border-brand-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {dealSearching && <div className="px-3 py-2 text-xs text-brand-muted">Buscando...</div>}
                        {dealResults.map((d) => (
                          <button key={d.id} onClick={() => linkDeal(d)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg transition truncate">
                            {d.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div ref={companyBoxRef}>
                    <label className={labelClass}>Empresa / Contacto (CRM)</label>
                    {invoice.companies?.name || contactName(invoice.contacts) ? (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm">
                        <span className="truncate">{invoice.companies?.name || contactName(invoice.contacts)}</span>
                        {invoice.companies?.name && (
                          <button onClick={unlinkCompany} className="text-brand-muted hover:text-red-400 text-xs flex-shrink-0 ml-2">Quitar</button>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          value={companyQuery}
                          onChange={(e) => setCompanyQuery(e.target.value)}
                          placeholder="Buscar una empresa para vincular..."
                          className={plainInputClass}
                        />
                        {companyQuery && (companyResults.length > 0 || companySearching) && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-brand-panel border border-brand-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {companySearching && <div className="px-3 py-2 text-xs text-brand-muted">Buscando...</div>}
                            {companyResults.map((c) => (
                              <button key={c.id} onClick={() => linkCompany(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg transition truncate">
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">

          <div>
            <div className="text-xs text-brand-muted uppercase mb-2">Líneas (tipo de servicio)</div>
            <div className="space-y-1">
              {(invoice.line_items || []).map((li) => (
                editingLineId === li.id ? (
                  <form key={li.id} onSubmit={(e) => { e.preventDefault(); saveEditLine(li.id); }} className="flex flex-wrap gap-1.5 bg-brand-bg rounded-lg px-3 py-2">
                    <input autoFocus placeholder="Tipo de servicio" value={editLineForm.description} onChange={(e) => setEditLineForm({ ...editLineForm, description: e.target.value })} className={`${smallInput} flex-1 min-w-[100px]`} />
                    <input type="number" placeholder="Cant." value={editLineForm.quantity} onChange={(e) => setEditLineForm({ ...editLineForm, quantity: e.target.value })} className={`${smallInput} w-14`} />
                    <input type="number" placeholder="Precio" value={editLineForm.unit_price} onChange={(e) => setEditLineForm({ ...editLineForm, unit_price: e.target.value })} className={`${smallInput} w-20`} />
                    <button className="px-2 py-1 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Guardar</button>
                    <button type="button" onClick={() => setEditingLineId(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                  </form>
                ) : (
                  <div key={li.id} className="flex justify-between items-center text-sm bg-brand-bg rounded-lg px-3 py-2">
                    <span>{li.products?.name || li.description} <span className="text-brand-muted text-xs">x{li.quantity}</span></span>
                    <div className="flex items-center gap-2">
                      <span className="text-brand-ice font-tech">{invoice.currency} {(li.quantity * li.unit_price).toLocaleString()}</span>
                      {editing && (
                        <>
                          <button onClick={() => startEditLine(li)} className="text-brand-muted hover:text-brand-ice text-xs">editar</button>
                          <button onClick={() => removeLine(li.id)} className="text-brand-muted hover:text-red-400 text-xs">×</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              ))}
              {(invoice.line_items || []).length === 0 && <div className="text-brand-muted text-xs">Sin líneas todavía.</div>}
            </div>
            {editing && (
              <form onSubmit={addLine} className="flex flex-wrap gap-1.5 mt-2 bg-brand-bg border border-dashed border-brand-border rounded-lg p-2">
                <input placeholder="Tipo de servicio (ej. Social WiFi, Bit Music...)" value={newLine.description} onChange={(e) => setNewLine({ ...newLine, description: e.target.value })} className={`${smallInput} flex-1 min-w-[140px]`} />
                <input type="number" placeholder="Cant." value={newLine.quantity} onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })} className={`${smallInput} w-14`} />
                <input type="number" placeholder="Precio" value={newLine.unit_price} onChange={(e) => setNewLine({ ...newLine, unit_price: e.target.value })} className={`${smallInput} w-20`} />
                <button className="px-2 py-1 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">+ Añadir</button>
              </form>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-brand-muted uppercase">Pagos</div>
              {invoice.status !== 'pagada' && invoice.status !== 'cancelada' && (
                <button onClick={() => setShowPayment(!showPayment)} className="text-xs text-brand-ice hover:underline">+ Registrar pago</button>
              )}
            </div>
            {showPayment && (
              <form onSubmit={recordPayment} className="mb-3 bg-brand-bg border border-brand-border rounded-lg p-3 flex flex-wrap gap-2">
                <input autoFocus type="number" placeholder={`Monto (máx ${pending})`} required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-32 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                <input placeholder="Método (transferencia, tarjeta...)" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="flex-1 min-w-[120px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Registrar</button>
              </form>
            )}
            <div className="space-y-1.5">
              {(invoice.payments || []).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm bg-brand-bg rounded-lg px-3 py-2">
                  <div>
                    <span className="text-green-300 font-tech">{invoice.currency} {Number(p.amount).toLocaleString()}</span>
                    {p.method && <span className="text-brand-muted text-xs ml-2">{p.method}</span>}
                    <div className="text-xs text-brand-muted">{new Date(p.paid_at).toLocaleString()} · {p.team_members?.full_name}</div>
                  </div>
                  <button onClick={() => removePayment(p.id)} className="text-brand-muted hover:text-red-400 text-xs">×</button>
                </div>
              ))}
              {(invoice.payments || []).length === 0 && <div className="text-brand-muted text-xs">Sin pagos registrados todavía.</div>}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
