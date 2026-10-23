// Crear una factura a mano. Ahora permite lo que antes no: origen («Empresa que facturó»), cliente buscando la
// empresa del CRM (o escribiendo el nombre), fecha de emisión y marcarla como ya cobrada.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Receipt, Search, X, Plus, Trash2, Building2, Handshake } from 'lucide-react';
import { api } from '../lib/api';
import { todayLocal } from '../lib/dateOnly';
import { Modal, Field, inputCls, selectCls, primaryBtn, ghostBtn } from './Modal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { SOURCE_ACCOUNTS, CURRENCIES } from '../lib/invoiceMeta';

const today = () => todayLocal();
const asList = (r) => (Array.isArray(r) ? r : r?.data || []);
const lineaVacia = () => ({ product_id: '', description: '', quantity: 1, unit_price: '' });

export default function NewInvoiceModal({ onClose, onCreated, defaultSource = '' }) {
  const [form, setForm] = useState({ invoice_number: '', currency: 'USD', issue_date: today(), due_date: '', tax: 0, notes: '', source_account: defaultSource, cobrada: false });
  const [lines, setLines] = useState([lineaVacia()]);
  const [products, setProducts] = useState([]);
  const [cliente, setCliente] = useState('');
  const [company, setCompany] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [dealQuery, setDealQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [deal, setDeal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const empBox = useRef(null); const dealBox = useRef(null);
  useOutsideClick(empBox, () => setEmpresas([]), empresas.length > 0);
  useOutsideClick(dealBox, () => setDeals([]), deals.length > 0);

  useEffect(() => { api.get('/api/products?active=true').then((r) => setProducts(asList(r))).catch(() => setProducts([])); }, []);

  useEffect(() => {
    const q = cliente.trim();
    if (q.length < 2 || company?.name === cliente) { setEmpresas([]); return undefined; }
    const t = setTimeout(() => api.get(`/api/companies?search=${encodeURIComponent(q)}&limit=6`).then((r) => setEmpresas(asList(r))).catch(() => setEmpresas([])), 250);
    return () => clearTimeout(t);
  }, [cliente]);

  useEffect(() => {
    const q = dealQuery.trim();
    if (!q || deal?.title === dealQuery) { setDeals([]); return undefined; }
    const t = setTimeout(() => api.get(`/api/deals?search=${encodeURIComponent(q)}&limit=6`).then((r) => setDeals(asList(r))).catch(() => setDeals([])), 250);
    return () => clearTimeout(t);
  }, [dealQuery]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, patch) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const subtotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0), [lines]);
  const total = subtotal + (Number(form.tax) || 0);
  const validLines = lines.filter((l) => l.description.trim() || l.product_id);

  const pickDeal = (d) => {
    setDeal(d); setDealQuery(d.title); setDeals([]);
    if (d.currency) set('currency', d.currency);
    if (!company && d.companies?.name) setCliente(d.companies.name);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (saving) return;
    if (!validLines.length) { setError('Agrega al menos una línea con descripción o producto.'); return; }
    if (!(total > 0)) { setError('El total debe ser mayor a 0: revisa los precios de las líneas.'); return; }
    setError(''); setSaving(true);
    try {
      const body = {
        invoice_number: form.invoice_number.trim() || null,
        deal_id: deal?.id || null,
        company_id: company?.id || deal?.company_id || null,
        contact_id: deal?.contact_id || null,
        client_name: cliente.trim() || null,
        source_account: form.source_account || null,
        issue_date: form.issue_date || today(),
        due_date: form.due_date || null,
        currency: form.currency,
        tax: Number(form.tax) || 0,
        notes: form.notes.trim() || null,
        line_items: validLines,
      };
      if (form.cobrada) { body.status = 'pagada'; body.paid_amount = total; }
      onCreated(await api.post('/api/invoices', body));
    } catch (err) {
      setError(err.message || 'No se pudo crear la factura.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nueva factura" subtitle="Registra una factura y ligala a su empresa y trato" icon={Receipt} onClose={onClose} width="max-w-3xl"
      footer={(
        <>
          <button type="button" onClick={submit} disabled={saving} className={primaryBtn}>{saving ? 'Guardando…' : 'Crear factura'}</button>
          <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
          <span className="ml-auto text-sm text-brand-muted">Total <span className="text-brand-ice font-tech text-base">{form.currency} {total.toLocaleString()}</span></span>
          {error && <span className="basis-full text-xs text-red-300">{error}</span>}
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Empresa que facturó (origen)">
            <select aria-label="Empresa que facturó" value={form.source_account} onChange={(e) => set('source_account', e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }}>
              <option value="">Sin origen (manual)</option>
              {SOURCE_ACCOUNTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="relative" ref={empBox}>
            <Field label="Cliente">
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input aria-label="Cliente" value={cliente} onChange={(e) => { setCliente(e.target.value); setCompany(null); }} placeholder="Nombre o busca la empresa del CRM" className={`${inputCls} pl-10 ${company ? 'pr-9' : ''}`} />
                {company && <button type="button" aria-label="Quitar empresa" onClick={() => { setCompany(null); setCliente(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-white"><X size={14} /></button>}
              </div>
            </Field>
            {company && <p className="text-[11px] text-green-300 mt-1.5">Ligada a la empresa «{company.name}» del CRM.</p>}
            {empresas.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in">
                {empresas.map((c) => <button key={c.id} type="button" onClick={() => { setCompany(c); setCliente(c.name); setEmpresas([]); }} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition truncate">{c.name}{c.country && <span className="text-brand-muted"> · {c.country}</span>}</button>)}
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={dealBox}>
          <Field label="Trato (opcional)" hint="Si eliges uno, toma su empresa, contacto y moneda.">
            <div className="relative">
              <Handshake size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input aria-label="Trato" value={dealQuery} onChange={(e) => { setDealQuery(e.target.value); setDeal(null); }} placeholder="Buscar trato…" className={`${inputCls} pl-10`} />
            </div>
          </Field>
          {deals.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-brand-bg border border-brand-border rounded-xl shadow-xl dropdown-in">
              {deals.map((d) => <button key={d.id} type="button" onClick={() => pickDeal(d)} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-brand-panel transition truncate">{d.title}{d.companies?.name && <span className="text-brand-muted"> · {d.companies.name}</span>}</button>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="N.º de factura"><input aria-label="N.º de factura" value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} placeholder="Opcional" className={`${inputCls} font-tech`} /></Field>
          <Field label="Fecha de emisión"><input aria-label="Fecha de emisión" type="date" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} className={`${inputCls} font-tech`} style={{ colorScheme: 'dark' }} /></Field>
          <Field label="Vence el pago"><input aria-label="Vence el pago" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} className={`${inputCls} font-tech`} style={{ colorScheme: 'dark' }} /></Field>
          <Field label="Moneda">
            <select aria-label="Moneda" value={form.currency} onChange={(e) => set('currency', e.target.value)} className={`${selectCls} font-tech`} style={{ colorScheme: 'dark' }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Líneas">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select aria-label={`Producto de la línea ${i + 1}`} value={l.product_id} className={`${selectCls} col-span-12 md:col-span-3 text-xs`} style={{ colorScheme: 'dark' }}
                  onChange={(e) => { const p = products.find((x) => x.id === e.target.value); setLine(i, { product_id: e.target.value, ...(p ? { description: p.name, unit_price: p.price } : {}) }); }}>
                  <option value="">Personalizado</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input aria-label={`Descripción de la línea ${i + 1}`} placeholder="Descripción" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={`${inputCls} col-span-12 md:col-span-5`} />
                <input aria-label={`Cantidad de la línea ${i + 1}`} type="number" min="0" step="any" placeholder="Cant." value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={`${inputCls} col-span-4 md:col-span-1 font-tech`} />
                <input aria-label={`Precio de la línea ${i + 1}`} type="number" min="0" step="any" placeholder="Precio" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className={`${inputCls} col-span-5 md:col-span-2 font-tech`} />
                <button type="button" aria-label={`Quitar línea ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))} className="col-span-3 md:col-span-1 icon-btn p-2 rounded-lg text-brand-muted hover:text-red-400 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines((p) => [...p, lineaVacia()])} className="mt-2 text-xs text-brand-ice hover:underline flex items-center gap-1"><Plus size={12} /> Agregar línea</button>
        </Field>

        <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-brand-border bg-brand-bg/40 px-4 py-3">
          <button type="button" role="switch" aria-checked={form.cobrada} aria-label="Ya está cobrada" onClick={() => set('cobrada', !form.cobrada)} className="flex items-center gap-3 text-left">
            <span className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${form.cobrada ? 'bg-green-500' : 'bg-brand-border'}`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${form.cobrada ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
            </span>
            <span><span className="block text-sm">Ya está cobrada</span><span className="block text-[11px] text-brand-muted">{form.cobrada ? 'Se crea como pagada por el total.' : 'Se crea como pendiente.'}</span></span>
          </button>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-brand-muted">Subtotal <span className="text-brand-white font-tech">{subtotal.toLocaleString()}</span></span>
            <label className="flex items-center gap-2 text-brand-muted">Impuesto <input aria-label="Impuesto" type="number" min="0" step="any" value={form.tax} onChange={(e) => set('tax', e.target.value)} className={`${inputCls} w-24 font-tech py-1.5`} /></label>
          </div>
        </div>

        <Field label="Notas"><textarea aria-label="Notas" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-y`} /></Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
