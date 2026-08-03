import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'producto', price: '', currency: 'USD', sku: '' });

  const load = () => api.get('/api/products').then(setProducts).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/api/products', { ...form, price: Number(form.price) || 0 });
    setForm({ name: '', type: 'producto', price: '', currency: 'USD', sku: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Productos y servicios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium"
        >
          + Nuevo
        </button>
      </div>

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
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-brand-border hover:bg-brand-bg/50">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-brand-muted font-tech text-xs uppercase">{p.type}</td>
                <td className="px-4 py-3 text-brand-muted font-tech text-xs">{p.sku || '—'}</td>
                <td className="px-4 py-3 text-brand-ice font-tech">
                  {p.currency} {Number(p.price).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
