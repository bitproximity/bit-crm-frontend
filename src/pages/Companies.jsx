import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, Plus, MapPin, Users, Handshake, LayoutGrid, List, X, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import CreateCompanyModal from '../components/CreateCompanyModal';
import RowActionButtons from '../components/RowActionButtons';
import { useConfirm } from '../components/ConfirmModal';
import { colorForName, initials } from '../lib/avatar';
import { COUNTRY_OPTIONS, INDUSTRY_OPTIONS } from '../components/B2bRecordModal';

const PAGE_SIZE = 60;
const countOf = (rel) => (Array.isArray(rel) ? rel[0]?.count ?? 0 : 0);

export function CompanyAvatar({ name, size = 'w-11 h-11 text-sm' }) {
  const c = colorForName(name);
  return (
    <div
      className={`${size} rounded-xl flex items-center justify-center flex-shrink-0 font-headline font-semibold text-white`}
      style={{ background: `linear-gradient(135deg, ${c}, ${c}88)`, boxShadow: `0 6px 18px -8px ${c}` }}
    >
      {initials(name)}
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-brand-bg/70 border border-brand-border/70 px-2.5 py-1.5 flex-1 min-w-0">
      <Icon size={13} className="text-brand-muted flex-shrink-0" />
      <span className="font-tech text-sm text-brand-white">{value}</span>
      <span className="text-[11px] text-brand-muted truncate">{label}</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-panel p-4 space-y-3">
      <div className="flex gap-3"><div className="skeleton w-11 h-11 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-3 w-1/3 rounded" /></div></div>
      <div className="skeleton h-8 rounded-lg" />
    </div>
  );
}

export default function Companies() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [sort, setSort] = useState('nombre');
  const [view, setView] = useState('tarjetas');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState('');
  const firstRun = useRef(true);

  const load = () => {
    const qs = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (search) qs.set('search', search);
    if (country) qs.set('country', country);
    if (industry) qs.set('industry', industry);
    if (sort === 'recientes') qs.set('sort', 'recientes');
    return api.get(`/api/companies?${qs.toString()}`)
      .then((r) => { setCompanies(r.data || []); setTotal(r.count ?? (r.data || []).length); setLoadError(''); })
      .catch((err) => { setCompanies([]); setLoadError(err.message || 'No se pudieron cargar las empresas.'); });
  };

  useEffect(() => {
    // La primera carga va directo; al escribir en el buscador se espera un instante
    const t = setTimeout(load, firstRun.current ? 0 : 300);
    firstRun.current = false;
    return () => clearTimeout(t);
  }, [search, country, industry, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(search || country || industry);
  const clearFilters = () => { setSearch(''); setCountry(''); setIndustry(''); setPage(1); };

  const createCompany = async (form) => {
    await api.post('/api/companies', form);
    setShowForm(false);
    load();
  };

  const deleteCompany = async (c) => {
    const ok = await confirm({
      title: 'Eliminar empresa',
      message: `¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/companies/${c.id}`);
      load();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la empresa (puede tener tratos o contactos vinculados).');
    }
  };

  const selectCls = 'px-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm text-brand-white focus:outline-none focus:border-brand-violet cursor-pointer';

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-semibold flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center"><Building2 size={18} /></span>
            Empresas
          </h1>
          <p className="text-brand-muted text-sm mt-1.5">
            <span className="font-tech text-brand-ice">{total.toLocaleString()}</span> {filtered ? 'empresas con estos filtros' : 'empresas registradas'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition rounded-xl text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={15} /> Nueva empresa
        </button>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-3 mb-5 flex items-center gap-2.5 flex-wrap panel-depth">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition"
          />
        </div>
        <select aria-label="País" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="">Todos los países</option>
          {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__sin_especificar__">Sin país</option>
        </select>
        <select aria-label="Industria" value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="">Todas las industrias</option>
          {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          <option value="__sin_especificar__">Sin industria</option>
        </select>
        <select aria-label="Orden" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="nombre">A–Z</option>
          <option value="recientes">Más recientes</option>
        </select>
        <div className="flex bg-brand-bg border border-brand-border rounded-xl p-0.5 ml-auto">
          {[['tarjetas', LayoutGrid, 'Tarjetas'], ['tabla', List, 'Tabla']].map(([k, Icon, label]) => (
            <button key={k} onClick={() => setView(k)} title={label} aria-label={label} aria-pressed={view === k}
              className={`p-2 rounded-lg transition ${view === k ? 'bg-brand-violet/25 text-brand-ice' : 'text-brand-muted hover:text-brand-white'}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {filtered && (
        <div className="flex items-center gap-2 mb-4 flex-wrap text-xs">
          {search && <span className="px-2.5 py-1 rounded-full bg-brand-violet/15 text-brand-ice">«{search}»</span>}
          {country && <span className="px-2.5 py-1 rounded-full bg-brand-violet/15 text-brand-ice">{country === '__sin_especificar__' ? 'Sin país' : country}</span>}
          {industry && <span className="px-2.5 py-1 rounded-full bg-brand-violet/15 text-brand-ice">{industry === '__sin_especificar__' ? 'Sin industria' : industry}</span>}
          <button onClick={clearFilters} className="flex items-center gap-1 text-brand-muted hover:text-brand-white transition"><X size={12} /> Limpiar filtros</button>
        </div>
      )}

      {showForm && <CreateCompanyModal onClose={() => setShowForm(false)} onCreated={createCompany} />}
      {loadError && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{loadError}</div>}

      {companies === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-violet/15 flex items-center justify-center"><Building2 size={22} className="text-brand-ice" /></div>
          <p className="text-brand-white font-medium">{filtered ? 'Ninguna empresa coincide con estos filtros' : 'Sin empresas todavía'}</p>
          <p className="text-brand-muted text-sm mt-1">{filtered ? 'Prueba con otra búsqueda o limpia los filtros.' : 'Crea la primera para empezar a ordenar tus contactos y tratos.'}</p>
          <button onClick={filtered ? clearFilters : () => setShowForm(true)} className="mt-4 px-4 py-2 rounded-xl border border-brand-border text-sm hover:border-brand-violet transition">
            {filtered ? 'Limpiar filtros' : 'Nueva empresa'}
          </button>
        </div>
      ) : view === 'tarjetas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((c, i) => (
            <div
              key={c.id}
              onClick={() => navigate(`/companies/${c.id}`)}
              className="group relative card-elevated rounded-2xl p-4 cursor-pointer stagger-item flex flex-col"
              style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
            >
              <div className="flex items-start gap-3">
                <CompanyAvatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="font-manrope font-semibold truncate" title={c.name}>{c.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-tech bg-brand-violet/15 text-brand-ice">{c.industry || 'Sin industria'}</span>
                    {c.country && <span className="flex items-center gap-1 text-xs text-brand-muted"><MapPin size={11} />{c.country}</span>}
                  </div>
                </div>
              </div>
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition rounded-lg bg-brand-panel/95 shadow-lg shadow-black/40" onClick={(e) => e.stopPropagation()}>
                <RowActionButtons onEdit={() => navigate(`/companies/${c.id}`)} onCopy={() => c.name} copyLabel="Copiar nombre" onDelete={() => deleteCompany(c)} />
              </div>
              <div className="flex gap-2 mt-auto pt-4">
                <Stat icon={Users} value={countOf(c.contacts)} label={countOf(c.contacts) === 1 ? 'contacto' : 'contactos'} />
                <Stat icon={Handshake} value={countOf(c.deals)} label={countOf(c.deals) === 1 ? 'trato' : 'tratos'} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden panel-depth">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-tech uppercase tracking-wide text-brand-muted border-b border-brand-border">
                <th className="py-3 pl-4 font-normal">Empresa</th>
                <th className="py-3 font-normal hidden md:table-cell">Industria</th>
                <th className="py-3 font-normal hidden md:table-cell">País</th>
                <th className="py-3 font-normal text-right">Contactos</th>
                <th className="py-3 font-normal text-right">Tratos</th>
                <th className="py-3 pr-4 w-24" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/companies/${c.id}`)} className="group border-b border-brand-border/60 last:border-0 row-hover cursor-pointer">
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyAvatar name={c.name} size="w-8 h-8 text-[11px]" />
                      <span className="font-medium truncate">{c.name}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell"><span className="px-2 py-0.5 rounded-full text-[11px] font-tech bg-brand-violet/15 text-brand-ice">{c.industry || 'Sin industria'}</span></td>
                  <td className="hidden md:table-cell text-brand-muted">{c.country || '—'}</td>
                  <td className="text-right font-tech text-brand-muted">{countOf(c.contacts)}</td>
                  <td className="text-right font-tech text-brand-muted">{countOf(c.deals)}</td>
                  <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                      <RowActionButtons onEdit={() => navigate(`/companies/${c.id}`)} onCopy={() => c.name} copyLabel="Copiar nombre" onDelete={() => deleteCompany(c)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-brand-border hover:border-brand-violet disabled:opacity-40 disabled:hover:border-brand-border transition">
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-brand-muted font-tech text-xs">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-brand-border hover:border-brand-violet disabled:opacity-40 disabled:hover:border-brand-border transition">
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
