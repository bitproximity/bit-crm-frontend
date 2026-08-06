import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export default function DealDetailPanel({ dealId, onClose, onChanged }) {
  const [deal, setDeal] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [products, setProducts] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ product_id: '', quantity: 1, unit_price: '', currency: 'USD' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [dealData, items, acts, fields, prods] = await Promise.all([
      api.get(`/api/deals/${dealId}`),
      api.get(`/api/deals/${dealId}/line-items`),
      api.get(`/api/activities/for/deal/${dealId}`),
      api.get(`/api/custom-fields/values/${dealId}`),
      api.get('/api/products?active=true'),
    ]);
    setDeal(dealData);
    setLineItems(items);
    setActivities(acts);
    setCustomFields(fields);
    setProducts(prods);
    setLoading(false);
  };

  useEffect(() => {
    if (dealId) load().catch(console.error);
  }, [dealId]);

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await api.post('/api/activities', { entity_type: 'deal', entity_id: dealId, type: 'nota', summary: noteText });
    setNoteText('');
    load();
  };

  const addProduct = async (e) => {
    e.preventDefault();
    await api.post(`/api/deals/${dealId}/line-items`, {
      product_id: productForm.product_id || null,
      quantity: Number(productForm.quantity),
      unit_price: Number(productForm.unit_price),
      currency: productForm.currency,
    });
    setProductForm({ product_id: '', quantity: 1, unit_price: '', currency: 'USD' });
    setShowAddProduct(false);
    load();
  };

  const removeProduct = async (itemId) => {
    await api.delete(`/api/deals/${dealId}/line-items/${itemId}`);
    load();
  };

  const markWon = async () => {
    await api.post(`/api/deals/${dealId}/win`, {});
    load();
    onChanged?.();
  };

  const markLost = async () => {
    const reason = window.prompt('Motivo de la pérdida (opcional):') || '';
    await api.post(`/api/deals/${dealId}/lose`, { reason });
    load();
    onChanged?.();
  };

  if (!dealId) return null;

  // Combina historial de etapa + actividades/notas en una sola línea de tiempo
  const timeline = deal
    ? [
        ...(deal.history || []).map((h) => ({
          type: 'stage',
          date: h.changed_at,
          actor: h.team_members?.full_name,
          label: `movió a ${h.to_stage_id === deal.stage_id ? deal.pipeline_stages?.name : ''}`,
        })),
        ...activities.map((a) => ({
          type: 'activity',
          date: a.occurred_at,
          actor: a.author_id ? a.team_members?.full_name : null,
          label: a.summary,
          activityType: a.type,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-panel border-l border-brand-border h-full overflow-y-auto">
        {loading || !deal ? (
          <div className="p-6 text-brand-muted">Cargando...</div>
        ) : (
          <>
            <div className="sticky top-0 bg-brand-panel border-b border-brand-border p-5 flex items-start justify-between">
              <div>
                <h2 className="font-headline text-lg font-semibold">{deal.title}</h2>
                <div className="text-sm text-brand-muted mt-1">
                  {deal.companies?.name || deal.contacts ? `${deal.contacts?.first_name || ''} ${deal.contacts?.last_name || ''}`.trim() : ''}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-brand-ice font-tech text-sm">
                    {deal.currency} {Number(deal.value).toLocaleString()}
                  </span>
                  <span className="text-xs text-brand-muted font-tech">{deal.probability}% prob.</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-ice font-tech">
                    {deal.pipeline_stages?.name}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="text-brand-muted hover:text-brand-white text-xl leading-none">×</button>
            </div>

            {deal.status === 'abierto' && (
              <div className="flex gap-2 p-4 border-b border-brand-border">
                <button onClick={markWon} className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium hover:bg-green-500/30 transition">
                  Marcar ganado
                </button>
                <button onClick={markLost} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition">
                  Marcar perdido
                </button>
              </div>
            )}
            {deal.status !== 'abierto' && (
              <div className={`m-4 px-3 py-2 rounded-lg text-sm font-tech text-center ${deal.status === 'ganado' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                {deal.status === 'ganado' ? 'Deal ganado' : `Deal perdido${deal.lost_reason ? ` — ${deal.lost_reason}` : ''}`}
              </div>
            )}

            {/* Productos */}
            <div className="p-5 border-b border-brand-border">
              <div className="flex items-center justify-between mb-3">
                <div className="font-manrope font-medium text-sm">Productos</div>
                <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-xs text-brand-ice hover:underline">
                  + Agregar
                </button>
              </div>

              {showAddProduct && (
                <form onSubmit={addProduct} className="mb-3 flex flex-wrap gap-2 bg-brand-bg border border-brand-border rounded-lg p-3">
                  <select
                    value={productForm.product_id}
                    onChange={(e) => {
                      const p = products.find((pr) => pr.id === e.target.value);
                      setProductForm({ ...productForm, product_id: e.target.value, unit_price: p?.price || '', currency: p?.currency || 'USD' });
                    }}
                    className="flex-1 min-w-[140px] px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs"
                  >
                    <option value="">Personalizado</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" placeholder="Cant." value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    className="w-16 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                  <input type="number" placeholder="Precio" value={productForm.unit_price}
                    onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })}
                    className="w-20 px-2 py-1.5 rounded bg-brand-panel border border-brand-border text-xs" />
                  <button className="px-3 py-1.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded text-xs font-medium">Agregar</button>
                </form>
              )}

              {lineItems.length === 0 ? (
                <div className="text-brand-muted text-xs">Sin productos agregados.</div>
              ) : (
                <div className="space-y-1.5">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-brand-bg rounded-lg px-3 py-2">
                      <div>
                        <span>{item.products?.name || item.description || 'Ítem'}</span>
                        <span className="text-brand-muted text-xs ml-2 font-tech">x{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-ice font-tech text-xs">{item.currency} {Number(item.unit_price * item.quantity).toLocaleString()}</span>
                        <button onClick={() => removeProduct(item.id)} className="text-brand-muted hover:text-red-400 text-xs">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campos personalizados */}
            {customFields.length > 0 && (
              <div className="p-5 border-b border-brand-border">
                <div className="font-manrope font-medium text-sm mb-3">Campos personalizados</div>
                <div className="space-y-1.5">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span className="text-brand-muted">{f.custom_field_definitions?.label}</span>
                      <span>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actividad / notas */}
            <div className="p-5">
              <div className="font-manrope font-medium text-sm mb-3">Actividad</div>
              <form onSubmit={addNote} className="mb-4 flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Agregar una nota..."
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
                />
                <button className="px-3 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-xs font-medium">
                  Agregar
                </button>
              </form>

              <div className="space-y-3">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-violet mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div>
                        {item.actor && <span className="text-brand-white">{item.actor}</span>}{' '}
                        <span className="text-brand-muted">{item.label}</span>
                      </div>
                      <div className="text-xs text-brand-muted font-tech">{timeAgo(item.date)}</div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && <div className="text-brand-muted text-xs">Sin actividad todavía.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
