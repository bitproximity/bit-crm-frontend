import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';
import { Receipt, Plus, X, DollarSign, AlertTriangle, CheckCircle2, Clock, Check, Search } from 'lucide-react';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];
const SOURCE_ACCOUNTS = ['Bit Colombia SAS', 'BitProximity LLC', 'Mario Colombia', 'Diana Sánchez', 'Mario Ramos', 'Bithub SRL', 'Bit Paraguay EAS', 'Bit México'];
const STATUS_LABELS = { pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', cancelada: 'Cancelada' };
const STATUS_COLORS = {
  pendiente: 'bg-yellow-500/15 text-yellow-300',
  parcial: 'bg-blue-500/15 text-blue-300',
  pagada: 'bg-green-500/15 text-green-300',
  cancelada: 'bg-brand-border text-brand-muted',
};

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
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingNameId, setEditingNameId] = useState(null);
  const [nameDraft, setNameDraft] = useState('');

  const [syncing, setSyncing] = useState('');
  const [markingPaid, setMarkingPaid] = useState(null);

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
    Promise.all([
      api.get(`/api/invoices${qs}`),
      api.get('/api/invoices/summary'),
    ]).then(([inv, sum]) => {
      setInvoices(inv);
      setSummary(sum);
      setLoading(false);
    }).catch((err) => { setError(err.message || 'No se pudieron cargar las facturas.'); setLoading(false); });
  };

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
      setSyncMsg(`${SOURCE_LABELS[source]}: ${result.created} facturas nuevas, ${result.skipped} ya existían.`);
      load();
    } catch (err) {
      setSyncMsg(`${SOURCE_LABELS[source]}: ${err.message}`);
    }
    setSyncing('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Facturación</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runSync('stripe')}
            disabled={!!syncing}
            className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition disabled:opacity-50"
          >
            {syncing === 'stripe' ? 'Sincronizando...' : 'Sincronizar Stripe'}
          </button>
          <button
            onClick={() => runSync('alegra')}
            disabled={!!syncing}
            className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition disabled:opacity-50"
          >
            {syncing === 'alegra' ? 'Sincronizando...' : 'Sincronizar Alegra'}
          </button>
          <button
            onClick={() => runSync('facturero-movil')}
            disabled={!!syncing}
            className="px-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition disabled:opacity-50"
          >
            {syncing === 'facturero-movil' ? 'Sincronizando...' : 'Sincronizar Facturero Móvil'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Nueva factura
          </button>
        </div>
      </div>
      <p className="text-brand-muted text-sm mb-1">Registro de facturas ligadas a tratos y empresas</p>
      {syncMsg && <p className="text-xs text-brand-ice mb-4">{syncMsg}</p>}
      {!syncMsg && <div className="mb-6" />}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
            <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Receipt size={12} /> Total facturado</div>
            <div className="text-xl font-headline font-semibold">${summary.total_facturado.toLocaleString()}</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
            <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><CheckCircle2 size={12} /> Cobrado</div>
            <div className="text-xl font-headline font-semibold text-green-300">${summary.total_cobrado.toLocaleString()}</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
            <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><Clock size={12} /> Pendiente</div>
            <div className="text-xl font-headline font-semibold text-yellow-300">${summary.total_pendiente.toLocaleString()}</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
            <div className="flex items-center gap-1.5 text-red-300 text-xs mb-1"><AlertTriangle size={12} /> Vencido</div>
            <div className="text-xl font-headline font-semibold text-red-300">${summary.total_vencido.toLocaleString()}</div>
          </div>
        </div>
      )}

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
          className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted"
        >
          <option value="">Todos los años</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={monthFilter ? monthFilter.slice(5, 7) : ''}
          onChange={(e) => {
            if (!e.target.value) { setMonthFilter(''); return; }
            const y = yearFilter || new Date().getFullYear();
            setMonthFilter(`${y}-${e.target.value}`);
          }}
          className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted"
        >
          <option value="">Todos los meses</option>
          {MONTHS.map((m) => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)}
        </select>
        {summary?.by_account?.length > 0 && (
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-full text-xs bg-brand-panel border border-brand-border text-brand-muted"
          >
            <option value="">Todas las empresas</option>
            {summary.by_account.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
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
                        <span className="font-tech text-brand-muted flex-shrink-0 ml-2">${a.facturado.toLocaleString()}</span>
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
                        <span className="font-tech text-brand-white">${val.toLocaleString()}</span>
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
              <th className="px-4 py-3 font-manrope font-normal">Empresa (origen)</th>
              <th className="px-4 py-3 font-manrope font-normal">Empresa / Contacto</th>
              <th className="px-4 py-3 font-manrope font-normal">Trato</th>
              <th className="px-4 py-3 font-manrope font-normal">Año</th>
              <th className="px-4 py-3 font-manrope font-normal">Total</th>
              <th className="px-4 py-3 font-manrope font-normal">Cobrado</th>
              <th className="px-4 py-3 font-manrope font-normal">Vencimiento</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
              <th className="px-4 py-3 font-manrope font-normal text-center">Pagó</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} onClick={() => setSelected(inv.id)} className="border-t border-brand-border row-hover cursor-pointer">
                <td className="px-4 py-3">{inv.invoice_number || `#${inv.id.slice(0, 8)}`}</td>
                <td className="px-4 py-3">
                  {inv.source_account ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-tech bg-brand-violet/10 text-brand-ice border border-brand-violet/20">
                      {inv.source_account}
                    </span>
                  ) : <span className="text-brand-muted text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-brand-muted" onClick={(e) => editingNameId !== inv.id && e.stopPropagation()}>
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
                <td className="px-4 py-3 text-brand-muted">{inv.deals?.title || '—'}</td>
                <td className="px-4 py-3 text-brand-muted font-tech text-xs">{inv.issue_date ? new Date(inv.issue_date).getFullYear() : '—'}</td>
                <td className="px-4 py-3 text-brand-ice font-tech">{inv.currency} {Number(inv.total).toLocaleString()}</td>
                <td className="px-4 py-3 text-brand-muted font-tech">{inv.currency} {Number(inv.paid_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-brand-muted font-tech text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {inv.overdue && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
                    <select
                      value={inv.status}
                      onChange={(e) => changeStatus(inv, e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className={`px-2 py-1 rounded-full text-xs font-tech border-0 ${STATUS_COLORS[inv.status]}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            ))}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-brand-muted text-sm">Sin facturas todavía.</td></tr>
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
            {inv.source_account && (
              <span className="inline-block mb-2 px-2 py-0.5 rounded-md text-[10px] font-tech bg-brand-violet/10 text-brand-ice border border-brand-violet/20">
                {inv.source_account}
              </span>
            )}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-tech text-brand-ice">{inv.currency} {Number(inv.total).toLocaleString()}</span>
              <span className="text-xs text-brand-muted">de {inv.currency} {Number(inv.paid_amount).toLocaleString()} cobrado</span>
            </div>
            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-brand-muted">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</span>
              <div className="flex items-center gap-1.5">
                {inv.overdue && <AlertTriangle size={11} className="text-red-400" />}
                <select
                  value={inv.status}
                  onChange={(e) => changeStatus(inv, e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={`px-2 py-1 rounded-full text-[11px] font-tech border-0 ${STATUS_COLORS[inv.status]}`}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        {!loading && invoices.length === 0 && (
          <div className="text-center text-brand-muted text-sm py-10">Sin facturas todavía.</div>
        )}
      </div>

      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {selected && <InvoiceDetailModal invoiceId={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}

function CreateInvoiceModal({ onClose, onCreated }) {
  const [deals, setDeals] = useState([]);
  const [dealQuery, setDealQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ invoice_number: '', currency: 'USD', due_date: '', tax: 0, notes: '' });
  const [lineItems, setLineItems] = useState([{ product_id: '', description: '', quantity: 1, unit_price: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/products?active=true').then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!dealQuery.trim()) { setDeals([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/deals?status=abierto,ganado,perdido`).then((all) => {
        setDeals(all.filter((d) => d.title.toLowerCase().includes(dealQuery.toLowerCase())).slice(0, 6));
      }).catch(() => setDeals([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dealQuery]);

  const pickDeal = (d) => {
    setSelectedDeal(d);
    setDealQuery(d.title);
    setDeals([]);
    setForm((f) => ({ ...f, currency: d.currency || 'USD' }));
  };

  const updateLine = (i, field, val) => {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, [field]: val } : li)));
  };

  const addLine = () => setLineItems((prev) => [...prev, { product_id: '', description: '', quantity: 1, unit_price: '' }]);
  const removeLine = (i) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
  const total = subtotal + (Number(form.tax) || 0);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const validLines = lineItems.filter((li) => li.description.trim() || li.product_id);
      await api.post('/api/invoices', {
        invoice_number: form.invoice_number || null,
        deal_id: selectedDeal?.id || null,
        company_id: selectedDeal?.company_id || null,
        contact_id: selectedDeal?.contact_id || null,
        currency: form.currency,
        tax: Number(form.tax) || 0,
        due_date: form.due_date || null,
        notes: form.notes || null,
        line_items: validLines,
      });
      onCreated();
    } catch (err) {
      setError(err.message || 'No se pudo crear la factura.');
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-headline text-lg font-semibold">Nueva factura</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          <div className="relative">
            <label className={labelClass}>Trato (opcional — autocompleta empresa y contacto)</label>
            <input value={dealQuery} onChange={(e) => { setDealQuery(e.target.value); setSelectedDeal(null); }} placeholder="Buscar trato..." className={inputClass} />
            {deals.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                {deals.map((d) => (
                  <button type="button" key={d.id} onClick={() => pickDeal(d)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition">
                    {d.title} {d.companies?.name && <span className="text-brand-muted">· {d.companies.name}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>N° de factura</label>
              <input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Opcional" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Moneda</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={`${inputClass} font-tech`}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de vencimiento</label>
              <DateTimePicker value={form.due_date ? new Date(form.due_date).toISOString() : ''} onChange={(v) => setForm({ ...form, due_date: v ? v.slice(0, 10) : '' })} className="w-full" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Líneas</label>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={li.product_id}
                    onChange={(e) => {
                      const p = products.find((pr) => pr.id === e.target.value);
                      updateLine(i, 'product_id', e.target.value);
                      if (p) { updateLine(i, 'description', p.name); updateLine(i, 'unit_price', p.price); }
                    }}
                    className="w-32 px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs flex-shrink-0"
                  >
                    <option value="">Personalizado</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input placeholder="Descripción" value={li.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="flex-1 min-w-[100px] px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs" />
                  <input type="number" placeholder="Cant." value={li.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="w-16 px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs" />
                  <input type="number" placeholder="Precio" value={li.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} className="w-20 px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs" />
                  <button type="button" onClick={() => removeLine(i)} className="text-brand-muted hover:text-red-400 flex-shrink-0">×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="text-xs text-brand-ice hover:underline mt-2">+ Agregar línea</button>
          </div>

          <div className="flex justify-end gap-6 pt-2 border-t border-brand-border">
            <div className="text-sm text-brand-muted">Subtotal: <span className="text-brand-white font-tech">{form.currency} {subtotal.toLocaleString()}</span></div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-brand-muted">Impuesto:</label>
              <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="w-20 px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs font-tech" />
            </div>
            <div className="text-sm font-medium">Total: <span className="text-brand-ice font-tech">{form.currency} {total.toLocaleString()}</span></div>
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} />
          </div>
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-brand-border flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Crear factura'}
          </button>
        </div>
      </div>
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
                    <option value="">Sin especificar</option>
                    {SOURCE_ACCOUNTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    {fieldsEdit.source_account && !SOURCE_ACCOUNTS.includes(fieldsEdit.source_account) && (
                      <option value={fieldsEdit.source_account}>{fieldsEdit.source_account} (actual)</option>
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
                    <select value={currencyEdit} onChange={(e) => setCurrencyEdit(e.target.value)} className={`${plainInputClass} font-tech`}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                      <div className={roClass}>{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Vencimiento</label>
                    {editing ? (
                      <input type="date" value={fieldsEdit.due_date} onChange={(e) => setFieldsEdit({ ...fieldsEdit, due_date: e.target.value })} className={plainInputClass} style={{ colorScheme: 'dark' }} />
                    ) : (
                      <div className={roClass}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-tech tracking-wide text-brand-muted uppercase mb-3 pb-2 border-b border-brand-border">Vinculado al CRM</div>
                <div className="space-y-4">
                  <div className="relative">
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
                  <div>
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
