import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';
import { Receipt, Plus, X, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];
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
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([
      api.get(`/api/invoices${qs}`),
      api.get('/api/invoices/summary'),
    ]).then(([inv, sum]) => {
      setInvoices(inv);
      setSummary(sum);
      setLoading(false);
    }).catch((err) => { setError(err.message || 'No se pudieron cargar las facturas.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Facturación</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm flex items-center gap-1.5"
        >
          <Plus size={14} /> Nueva factura
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">Registro de facturas ligadas a tratos y empresas</p>

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

      <div className="flex gap-1.5 mb-4">
        {[{ key: '', label: 'Todas' }, { key: 'pendiente', label: 'Pendientes' }, { key: 'parcial', label: 'Parciales' }, { key: 'pagada', label: 'Pagadas' }, { key: 'cancelada', label: 'Canceladas' }].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${statusFilter === f.key ? 'bg-brand-violet/20 text-brand-ice' : 'text-brand-muted hover:text-brand-white bg-brand-panel border border-brand-border'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 font-manrope font-normal">Factura</th>
              <th className="px-4 py-3 font-manrope font-normal">Empresa / Contacto</th>
              <th className="px-4 py-3 font-manrope font-normal">Trato</th>
              <th className="px-4 py-3 font-manrope font-normal">Total</th>
              <th className="px-4 py-3 font-manrope font-normal">Cobrado</th>
              <th className="px-4 py-3 font-manrope font-normal">Vencimiento</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} onClick={() => setSelected(inv.id)} className="border-t border-brand-border row-hover cursor-pointer">
                <td className="px-4 py-3">{inv.invoice_number || `#${inv.id.slice(0, 8)}`}</td>
                <td className="px-4 py-3 text-brand-muted">{inv.companies?.name || contactName(inv.contacts) || '—'}</td>
                <td className="px-4 py-3 text-brand-muted">{inv.deals?.title || '—'}</td>
                <td className="px-4 py-3 text-brand-ice font-tech">{inv.currency} {Number(inv.total).toLocaleString()}</td>
                <td className="px-4 py-3 text-brand-muted font-tech">{inv.currency} {Number(inv.paid_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-brand-muted font-tech text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${inv.overdue ? 'bg-red-500/15 text-red-300' : STATUS_COLORS[inv.status]}`}>
                    {inv.overdue ? 'Vencida' : STATUS_LABELS[inv.status]}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-muted text-sm">Sin facturas todavía.</td></tr>
            )}
          </tbody>
        </table>
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
  const [newLine, setNewLine] = useState({ description: '', quantity: 1, unit_price: '' });
  const [editingLineId, setEditingLineId] = useState(null);
  const [editLineForm, setEditLineForm] = useState({ description: '', quantity: 1, unit_price: '' });

  const load = () => api.get(`/api/invoices/${invoiceId}`).then((data) => { setInvoice(data); setCurrencyEdit(data.currency); }).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [invoiceId]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <div>
            <h2 className="font-headline text-lg font-semibold">{invoice.invoice_number || `Factura #${invoice.id.slice(0, 8)}`}</h2>
            <div className="text-xs text-brand-muted mt-0.5">{invoice.companies?.name || contactName(invoice.contacts) || '—'} {invoice.deals?.title && `· ${invoice.deals.title}`}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(!editing)} className="text-xs text-brand-ice hover:underline">{editing ? 'Listo' : 'Editar'}</button>
            <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          {editing && (
            <div className="flex items-center gap-2 bg-brand-bg border border-brand-border rounded-lg p-3">
              <label className="text-xs text-brand-muted">Moneda:</label>
              <select value={currencyEdit} onChange={(e) => setCurrencyEdit(e.target.value)} className={`${smallInput} font-tech`}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {currencyEdit !== invoice.currency && (
                <button onClick={saveCurrency} className="text-xs text-brand-ice hover:underline ml-auto">Guardar moneda</button>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-brand-bg rounded-lg p-3">
              <div className="text-xs text-brand-muted mb-1">Total</div>
              <div className="font-tech text-brand-white">{invoice.currency} {Number(invoice.total).toLocaleString()}</div>
            </div>
            <div className="bg-brand-bg rounded-lg p-3">
              <div className="text-xs text-brand-muted mb-1">Cobrado</div>
              <div className="font-tech text-green-300">{invoice.currency} {Number(invoice.paid_amount).toLocaleString()}</div>
            </div>
            <div className="bg-brand-bg rounded-lg p-3">
              <div className="text-xs text-brand-muted mb-1">Pendiente</div>
              <div className="font-tech text-yellow-300">{invoice.currency} {pending.toLocaleString()}</div>
            </div>
          </div>

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
  );
}
