import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { Package, Plus, Wrench, Pencil, Trash2, Wifi, Music2, Monitor, Mail, MessageCircle, Bell, Heart, ShoppingCart, Radio, Users, Receipt } from 'lucide-react';

// Ícono específico según palabras clave del nombre del producto; si no matchea nada, cae a Producto/Servicio genérico.
function productIcon(name, type) {
  const n = (name || '').toLowerCase();
  if (n.includes('wifi')) return Wifi;
  if (n.includes('music') || n.includes('radio')) return Music2;
  if (n.includes('signage') || n.includes('cartel') || n.includes('pantalla')) return Monitor;
  if (n.includes('email') || n.includes('mail') || n.includes('getresponse')) return Mail;
  if (n.includes('whatsapp')) return MessageCircle;
  if (n.includes('push') || n.includes('notifica')) return Bell;
  if (n.includes('loyalty') || n.includes('fideliza')) return Heart;
  if (n.includes('ecommerce')) return ShoppingCart;
  if (n.includes('crm')) return Users;
  if (n.includes('factura') || n.includes('comision') || n.includes('setup')) return Receipt;
  return type === 'servicio' ? Wrench : Package;
}

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

export default function Products() {
  const confirm = useConfirm();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'producto', price: '', currency: 'USD', sku: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  const load = () => api.get('/api/products').then(setProducts).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/products', { ...form, price: Number(form.price) || 0 });
      setForm({ name: '', type: 'producto', price: '', currency: 'USD', sku: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message.includes('products_sku_key') ? 'Ese SKU ya lo está usando otro producto.' : (err.message || 'No se pudo crear.'));
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, type: p.type, price: p.price, currency: p.currency, sku: p.sku || '' });
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.patch(`/api/products/${id}`, { ...editForm, price: Number(editForm.price) || 0 });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message.includes('products_sku_key') ? 'Ese SKU ya lo está usando otro producto.' : (err.message || 'No se pudo guardar.'));
    }
  };

  const remove = async (id) => {
    const ok = await confirm({ title: 'Borrar producto', message: '¿Borrar este producto?', confirmLabel: 'Borrar' });
    if (!ok) return;
    await api.delete(`/api/products/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Productos y servicios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-xs underline">Cerrar</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 grid grid-cols-5 gap-3">
          <input placeholder="Nombre" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech">
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
          <input placeholder="Precio" type="number" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="SKU (opcional)" value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <button className="col-span-5 px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-brand-border row-hover">
                {editingId === p.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs">
                        <option value="producto">producto</option>
                        <option value="servicio">servicio</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="w-20 px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs" />
                        <select value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                          className="px-2 py-1 rounded bg-brand-bg border border-brand-border text-xs">
                          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => saveEdit(p.id)} className="text-xs text-brand-ice hover:underline mr-3">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-brand-muted hover:underline">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-brand-violet/15 flex items-center justify-center flex-shrink-0">
                          {(() => { const Icon = productIcon(p.name, p.type); return <Icon size={13} className="text-brand-ice" />; })()}
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-muted font-tech text-xs uppercase">{p.type}</td>
                    <td className="px-4 py-3 text-brand-muted font-tech text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-brand-ice font-tech">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(p)} className="text-brand-muted hover:text-brand-ice mr-3" title="Editar">
                        <Pencil size={13} className="inline" />
                      </button>
                      <button onClick={() => remove(p.id)} className="text-brand-muted hover:text-red-400" title="Borrar">
                        <Trash2 size={13} className="inline" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-brand-muted text-sm">
                  Sin productos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
