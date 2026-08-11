import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { X, Trash2, Plus } from 'lucide-react';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

function money(n) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function rowImporte(row) {
  const price = Number(row.price) || 0;
  const qty = Number(row.quantity) || 0;
  const discountPct = Number(row.discountPct) || 0;
  return price * qty * (1 - discountPct / 100);
}

let tempIdCounter = 0;
const nextTempId = () => `tmp_${Date.now()}_${tempIdCounter++}`;

export default function ProductsModal({ open, onClose, dealId, dealTitle, dealCurrency, onSaved }) {
  const [products, setProducts] = useState([]);
  const [currency, setCurrency] = useState(dealCurrency || 'USD');
  const [rows, setRows] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openPickerRowId, setOpenPickerRowId] = useState(null);
  const [creatingProductRowId, setCreatingProductRowId] = useState(null);
  const [newProductPrice, setNewProductPrice] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open || !dealId) return;
    setError('');
    setRemovedIds([]);
    setCurrency(dealCurrency || 'USD');
    (async () => {
      const [prods, items] = await Promise.all([
        api.get('/api/products?active=true'),
        api.get(`/api/deals/${dealId}/line-items`),
      ]);
      setProducts(prods);
      if (items.length === 0) {
        setRows([{ id: nextTempId(), existingId: null, product_id: '', name: '', price: '', quantity: 1, discountPct: 0, currency: dealCurrency || 'USD' }]);
      } else {
        setRows(items.map((it) => ({
          id: nextTempId(),
          existingId: it.id,
          product_id: it.product_id || '',
          name: it.products?.name || it.description || '',
          price: it.unit_price,
          quantity: it.quantity,
          discountPct: 0,
          currency: it.currency || dealCurrency || 'USD',
        })));
      }
    })().catch((err) => setError(err.message));
  }, [open, dealId]);

  if (!open) return null;

  const updateRow = (rowId, patch) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextTempId(), existingId: null, product_id: '', name: '', price: '', quantity: 1, discountPct: 0, currency }]);
  };

  const removeRow = (rowId) => {
    const row = rows.find((r) => r.id === rowId);
    if (row?.existingId) setRemovedIds((prev) => [...prev, row.existingId]);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const pickProduct = (rowId, product) => {
    updateRow(rowId, { product_id: product.id, name: product.name, price: product.price, currency: product.currency || currency });
    setOpenPickerRowId(null);
  };

  const startCreateProduct = (rowId, name) => {
    setCreatingProductRowId(rowId);
    updateRow(rowId, { name });
    setNewProductPrice('');
  };

  const confirmCreateProduct = async (rowId) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row?.name.trim()) return;
    const created = await api.post('/api/products', { name: row.name.trim(), type: 'producto', price: Number(newProductPrice) || 0, currency });
    setProducts((prev) => [...prev, created]);
    updateRow(rowId, { product_id: created.id, name: created.name, price: created.price, currency: created.currency || currency });
    setCreatingProductRowId(null);
    setOpenPickerRowId(null);
  };

  const subtotal = rows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.quantity) || 0), 0);
  const totalDescuento = rows.reduce((sum, r) => sum + ((Number(r.price) || 0) * (Number(r.quantity) || 0)) * ((Number(r.discountPct) || 0) / 100), 0);
  const total = subtotal - totalDescuento;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await Promise.all(removedIds.map((itemId) => api.delete(`/api/deals/${dealId}/line-items/${itemId}`)));

      const validRows = rows.filter((r) => r.name.trim() && Number(r.price) >= 0 && Number(r.quantity) > 0);

      await Promise.all(validRows.map((r) => {
        const effectiveUnitPrice = Number(r.price) * (1 - (Number(r.discountPct) || 0) / 100);
        const payload = {
          product_id: r.product_id || null,
          description: r.product_id ? undefined : r.name.trim(),
          quantity: Number(r.quantity),
          unit_price: effectiveUnitPrice,
          currency,
        };
        if (r.existingId) {
          // No hay endpoint de edición: se recrea el ítem (borrar + crear) para reflejar el cambio.
          return api.delete(`/api/deals/${dealId}/line-items/${r.existingId}`).then(() => api.post(`/api/deals/${dealId}/line-items`, payload));
        }
        return api.post(`/api/deals/${dealId}/line-items`, payload);
      }));

      // Sincroniza el valor del trato con el total de productos, como en Pipedrive.
      await api.patch(`/api/deals/${dealId}`, { value: total, currency });

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const filteredProducts = (query) =>
    products.filter((p) => p.name.toLowerCase().includes((query || '').toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={containerRef} className="relative w-full max-w-4xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-headline text-lg font-semibold">Añadir productos al trato — {dealTitle}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
          )}

          {/* Moneda del trato */}
          <div className="mb-5">
            <label className="block text-xs text-brand-muted mb-1.5">Moneda del trato</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tabla de productos */}
          <div className="border border-brand-border rounded-xl">
            <div className="grid grid-cols-[1fr_110px_80px_100px_110px_40px] gap-2 px-3 py-2 bg-brand-bg/60 text-[11px] uppercase tracking-wide text-brand-muted font-tech rounded-t-xl">
              <span>Producto</span>
              <span>Precio</span>
              <span>Cant.</span>
              <span>Desc. %</span>
              <span className="text-right">Importe</span>
              <span></span>
            </div>

            <div className="divide-y divide-brand-border">
              {rows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_110px_80px_100px_110px_40px] gap-2 px-3 py-2 items-center relative">
                  <div className="relative">
                    <input
                      value={row.name}
                      onChange={(e) => { updateRow(row.id, { name: e.target.value, product_id: '' }); setOpenPickerRowId(row.id); }}
                      onFocus={() => setOpenPickerRowId(row.id)}
                      placeholder="Empieza a escribir para buscar"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
                    />
                    {openPickerRowId === row.id && (
                      <div className="absolute z-20 mt-1 left-0 right-0 bg-brand-bg border border-brand-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredProducts(row.name).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => pickProduct(row.id, p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center justify-between"
                          >
                            <span>{p.name}</span>
                            <span className="text-brand-muted text-xs font-tech">{p.currency} {money(p.price)}</span>
                          </button>
                        ))}
                        {row.name.trim() && creatingProductRowId !== row.id && (
                          <button
                            onClick={() => startCreateProduct(row.id, row.name.trim())}
                            className="w-full text-left px-3 py-2 text-sm text-brand-ice hover:bg-brand-panel transition flex items-center gap-1.5 border-t border-brand-border"
                          >
                            <Plus size={13} /> Crear producto "{row.name.trim()}"
                          </button>
                        )}
                        {creatingProductRowId === row.id && (
                          <div className="p-2 border-t border-brand-border flex items-center gap-1.5">
                            <input
                              type="number" autoFocus placeholder="Precio"
                              value={newProductPrice}
                              onChange={(e) => setNewProductPrice(e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-brand-panel border border-brand-border text-xs"
                            />
                            <button onClick={() => confirmCreateProduct(row.id)} className="px-2.5 py-1 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">
                              Crear
                            </button>
                          </div>
                        )}
                        <button onClick={() => setOpenPickerRowId(null)} className="w-full text-center px-3 py-1.5 text-xs text-brand-muted hover:text-brand-white border-t border-brand-border">
                          Cerrar
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    type="number" min="0" step="0.01"
                    value={row.price}
                    onChange={(e) => updateRow(row.id, { price: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech focus:outline-none focus:border-brand-violet"
                  />
                  <input
                    type="number" min="1" step="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech focus:outline-none focus:border-brand-violet"
                  />
                  <input
                    type="number" min="0" max="100" step="1"
                    value={row.discountPct}
                    onChange={(e) => updateRow(row.id, { discountPct: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech focus:outline-none focus:border-brand-violet"
                  />
                  <div className="text-right text-sm font-tech text-brand-ice">
                    {currency} {money(rowImporte(row))}
                  </div>
                  <button onClick={() => removeRow(row.id)} className="text-brand-muted hover:text-red-400 flex justify-center">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="w-full flex items-center gap-1.5 px-3 py-2.5 text-sm text-brand-ice hover:bg-brand-bg/60 transition border-t border-brand-border rounded-b-xl"
            >
              <Plus size={14} /> Producto
            </button>
          </div>

          {/* Resumen */}
          <div className="mt-5 bg-brand-bg border border-brand-border rounded-xl p-4 ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm text-brand-muted">
              <span>Subtotal</span>
              <span className="font-tech">{currency} {money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-brand-muted">
              <span>Descuento</span>
              <span className="font-tech">− {currency} {money(totalDescuento)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-brand-border">
              <span>Total</span>
              <span className="font-tech text-brand-ice">{currency} {money(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brand-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
