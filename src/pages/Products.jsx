import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import ProductModal from '../components/ProductModal';
import { Package, Plus, Pencil, Trash2, Search, EyeOff } from 'lucide-react';
import { productIcon, BILLING_LABELS } from '../lib/productMeta';

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'producto', label: 'Productos' },
  { key: 'servicio', label: 'Servicios' },
  { key: 'archivados', label: 'Archivados' },
];

export default function Products() {
  const confirm = useConfirm();
  const [products, setProducts] = useState(null);
  const [modal, setModal] = useState(null); // null | { product?: objeto } — sin product = crear
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api.get('/api/products').then(setProducts).catch((err) => { setProducts([]); setError(err.message || 'No se pudieron cargar los productos.'); });

  useEffect(() => { load(); }, []);

  const submit = async (payload, { another } = {}) => {
    if (modal?.product) {
      await api.patch(`/api/products/${modal.product.id}`, payload);
      setNotice(`«${payload.name}» actualizado.`);
    } else {
      await api.post('/api/products', payload);
      setNotice(`«${payload.name}» creado. Ya aparece en «Producto» de los tratos.`);
    }
    await load();
    if (!another) setModal(null);
  };

  const remove = async (p) => {
    const ok = await confirm({
      title: 'Borrar producto',
      message: `¿Borrar "${p.name}"? Si ya se usó en tratos, mejor archívalo desde Editar: deja de aparecer al crear tratos sin tocar los que ya lo tienen.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/api/products/${p.id}`);
      setNotice(`«${p.name}» borrado.`);
      load();
    } catch (err) {
      setError(`No se pudo borrar «${p.name}» (probablemente está en uso en tratos). Archívalo desde Editar para ocultarlo.`);
    }
  };

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (q && !(`${p.name} ${p.sku || ''}`).toLowerCase().includes(q)) return false;
      if (filter === 'archivados') return p.active === false;
      if (p.active === false) return false;
      if (filter === 'producto' || filter === 'servicio') return p.type === filter;
      return true;
    });
  }, [products, search, filter]);

  const archivedCount = (products || []).filter((p) => p.active === false).length;
  const existingNames = (products || []).filter((p) => !modal?.product || p.id !== modal.product.id).map((p) => p.name);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-semibold flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center"><Package size={18} /></span>
            Productos y servicios
          </h1>
          <p className="text-brand-muted text-sm mt-1.5">
            <span className="font-tech text-brand-ice">{(products || []).filter((p) => p.active !== false).length}</span> disponibles en los tratos
            {archivedCount > 0 && <> · <span className="font-tech">{archivedCount}</span> archivados</>}
          </p>
        </div>
        <button onClick={() => { setError(''); setModal({}); }} className="px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition rounded-xl text-sm font-medium flex items-center gap-1.5">
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-xs underline ml-3">Cerrar</button>
        </div>
      )}
      {notice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm flex items-center justify-between">
          {notice}
          <button onClick={() => setNotice('')} className="text-xs underline ml-3">Cerrar</button>
        </div>
      )}

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-3 mb-4 flex items-center gap-3 flex-wrap panel-depth">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            placeholder="Buscar por nombre o SKU..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition"
          />
        </div>
        <div className="flex bg-brand-bg border border-brand-border rounded-xl p-0.5" role="tablist" aria-label="Filtro">
          {FILTERS.filter((f) => f.key !== 'archivados' || archivedCount > 0).map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-tech transition ${filter === f.key ? 'bg-brand-violet/25 text-brand-ice' : 'text-brand-muted hover:text-brand-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden panel-depth">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-tech uppercase tracking-wide text-brand-muted border-b border-brand-border">
              <th className="px-4 py-3 font-normal">Nombre</th>
              <th className="px-4 py-3 font-normal">Tipo</th>
              <th className="px-4 py-3 font-normal">Facturación</th>
              <th className="px-4 py-3 font-normal hidden md:table-cell">SKU</th>
              <th className="px-4 py-3 font-normal text-right">Precio</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {products === null && (
              <tr><td colSpan={6} className="px-4 py-10"><div className="skeleton h-5 w-1/3 rounded" /></td></tr>
            )}
            {list.map((p) => {
              const Icon = productIcon(p.name, p.type);
              const archived = p.active === false;
              return (
                <tr key={p.id} className={`group border-b border-brand-border/60 last:border-0 row-hover ${archived ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-violet/15 flex items-center justify-center flex-shrink-0"><Icon size={14} className="text-brand-ice" /></div>
                      <span className="truncate font-medium">{p.name}</span>
                      {archived && <span className="flex items-center gap-1 text-[10px] font-tech uppercase px-2 py-0.5 rounded-full bg-brand-muted/15 text-brand-muted"><EyeOff size={10} /> Archivado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-tech uppercase px-2 py-0.5 rounded-full ${p.type === 'servicio' ? 'bg-brand-ice/10 text-brand-ice' : 'bg-brand-violet/15 text-brand-ice'}`}>{p.type}</span></td>
                  <td className="px-4 py-3 text-brand-muted font-tech text-xs">{BILLING_LABELS[p.billing_frequency] || 'Mensual'}</td>
                  <td className="px-4 py-3 text-brand-muted font-tech text-xs hidden md:table-cell">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-right text-brand-ice font-tech whitespace-nowrap">{p.currency} {Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button onClick={() => { setError(''); setModal({ product: p }); }} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-ice hover:bg-brand-bg" title="Editar" aria-label={`Editar ${p.name}`}><Pencil size={14} /></button>
                      <button onClick={() => remove(p)} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10" title="Borrar" aria-label={`Borrar ${p.name}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products !== null && list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-brand-white font-medium">{products.length === 0 ? 'Sin productos todavía' : 'Nada coincide con tu búsqueda'}</p>
                  <p className="text-brand-muted text-sm mt-1">{products.length === 0 ? 'Crea el primero: aparecerá en «Producto» de los tratos.' : 'Prueba con otro nombre o cambia el filtro.'}</p>
                  {products.length === 0 && <button onClick={() => setModal({})} className="mt-4 px-4 py-2 rounded-xl border border-brand-border text-sm hover:border-brand-violet transition">Nuevo producto</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ProductModal
          product={modal.product || null}
          existingNames={existingNames}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
