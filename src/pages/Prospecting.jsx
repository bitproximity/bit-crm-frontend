import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Check, Building2, User, ChevronDown, ChevronUp, ExternalLink, Sparkles, CircleDollarSign } from 'lucide-react';
import { api } from '../lib/api';

const B2B_TOOL_URL = 'https://prospeccion.bitproximity.com';
const SIZE_LABELS = {
  '1,10': '1–10', '11,50': '11–50', '51,200': '51–200', '201,500': '201–500',
  '501,1000': '501–1.000', '1001,5000': '1.001–5.000', '5001,10000': '5.001–10.000',
};
const inputCls = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';

function CrmBadge({ crm }) {
  if (!crm) return <span className="text-brand-muted text-xs">Nuevo</span>;
  if (crm.contactId) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-500/15 text-green-300">Ya es contacto{crm.contactHasEmail ? ' · con email' : ''}</span>;
  }
  if (crm.deals && crm.deals.length) {
    const d = crm.deals[0];
    return (
      <Link to={`/deals/${d.id}`} onClick={(e) => e.stopPropagation()} className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300 hover:underline" title={d.title}>
        Trato abierto: {d.pipeline || '—'} · {d.stage || '—'}{crm.deals.length > 1 ? ` (+${crm.deals.length - 1})` : ''}
      </Link>
    );
  }
  if (crm.openDeals > 0) return <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300">Empresa con trato abierto</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/15 text-blue-300">Empresa en el CRM</span>;
}

export default function Prospecting() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState('apollo');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [sizes, setSizes] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [opts, setOpts] = useState({ canReveal: false, canCreateDeals: false, revealCap: 25, sizeRanges: Object.keys(SIZE_LABELS) });
  const [lists, setLists] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  const [candidates, setCandidates] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);
  const [selected, setSelected] = useState({});
  const [done, setDone] = useState({});
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [listName, setListName] = useState('');
  const [reveal, setReveal] = useState(false);
  const [makeDeal, setMakeDeal] = useState(false);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [dealTitle, setDealTitle] = useState('{empresa} — Prospección');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    api.get('/api/prospecting/options').then(setOpts).catch(() => { });
    api.get('/api/tags/with-contact-counts').then(setLists).catch(() => { });
    api.get('/api/pipelines').then((p) => {
      setPipelines(p || []);
      if (p && p[0]) { setPipelineId(p[0].id); setStageId(p[0].pipeline_stages?.[0]?.id || ''); }
    }).catch(() => { });
  }, []);

  const stages = useMemo(() => pipelines.find((p) => p.id === pipelineId)?.pipeline_stages || [], [pipelines, pipelineId]);

  const runSearch = async (nextPage) => {
    setSearching(true);
    setError('');
    if (nextPage === 1) setImportResult(null);
    try {
      const res = await api.post('/api/prospecting/search', {
        provider, title, department, country, industry, company, sizes, page: nextPage,
      });
      setCandidates((prev) => {
        if (nextPage === 1 || !prev) return res.candidates;
        const seen = new Set(prev.map((c) => c.key));
        return [...prev, ...res.candidates.filter((c) => !seen.has(c.key))];
      });
      if (nextPage === 1) { setSelected({}); setDone({}); }
      setPage(res.page || nextPage);
      setHasMore(!!res.hasMore);
      setTotal(res.total ?? null);
    } catch (err) {
      setError(err.message || 'No se pudo buscar.');
      if (nextPage === 1) setCandidates(null);
    } finally {
      setSearching(false);
    }
  };

  const visible = candidates || [];
  const pending = visible.filter((c) => !done[c.key]);
  const selectedList = pending.filter((c) => selected[c.key]);
  const selectedCount = selectedList.length;
  const newOnes = pending.filter((c) => !c.crm?.contactId);
  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));
  const toggleAll = () => {
    const all = pending.length > 0 && pending.every((c) => selected[c.key]);
    const next = {};
    pending.forEach((c) => { next[c.key] = !all; });
    setSelected(next);
  };
  const selectNew = () => {
    const next = {};
    newOnes.forEach((c) => { next[c.key] = true; });
    setSelected(next);
  };
  const toggleSize = (r) => setSizes((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));

  const revealCount = reveal ? Math.min(selectedList.filter((c) => !c.crm?.contactHasEmail).length, opts.revealCap) : 0;

  const importSelected = async () => {
    if (selectedCount === 0) return;
    if (reveal) {
      const unit = provider === 'apollo' ? 'Apollo' : 'Lusha';
      const ok = window.confirm(`Vas a revelar email/teléfono de hasta ${revealCount} contacto(s). Cada uno consume créditos de ${unit}. ¿Continuar?`);
      if (!ok) return;
    }
    setImporting(true);
    setError('');
    try {
      const body = {
        candidates: selectedList,
        listName: listName.trim() || (provider === 'apollo' ? 'Apollo' : 'Lusha'),
        revealEmails: reveal,
      };
      if (makeDeal && pipelineId) body.createDeal = { pipelineId, stageId: stageId || undefined, title: dealTitle };
      const res = await api.post('/api/prospecting/import', body);
      setImportResult(res);
      const ok = {};
      (res.results || []).forEach((r) => { if (r.status === 'imported' || r.status === 'existing') ok[r.key] = r; });
      setDone((d) => ({ ...d, ...ok }));
      setSelected({});
      api.get('/api/tags/with-contact-counts').then(setLists).catch(() => { });
    } catch (err) {
      setError(err.message || 'No se pudo importar.');
    } finally {
      setImporting(false);
    }
  };

  const defaultList = provider === 'apollo' ? 'Apollo' : 'Lusha';

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-headline text-xl font-semibold mb-1">Prospección</h1>
          <p className="text-brand-muted text-sm">Busca contactos en Lusha o Apollo, mira qué ya existe en tu CRM y súbelos a una Lista (o directo al pipeline).</p>
        </div>
        <a href={B2B_TOOL_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-border text-xs text-brand-muted hover:text-brand-white hover:border-brand-violet transition">
          <Sparkles size={13} /> Prospección B2B (secuencias y seguimiento) <ExternalLink size={12} />
        </a>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-6">
        <div className="flex gap-1 mb-4 bg-brand-bg border border-brand-border rounded-lg p-1 w-fit">
          {['apollo', 'lusha'].map((p) => (
            <button key={p} onClick={() => setProvider(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${provider === p ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>
              {p === 'apollo' ? 'Apollo' : 'Lusha'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {provider === 'apollo' ? (
            <div>
              <label className="block text-xs text-brand-muted mb-1.5">Cargo(s) — separados por coma</label>
              <input aria-label="Cargos" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CEO, Director de Marketing" className={inputCls} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-brand-muted mb-1.5">Departamento(s) — separados por coma</label>
              <input aria-label="Departamentos" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Marketing, Sales" className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs text-brand-muted mb-1.5">País</label>
            <input aria-label="País" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Panama" className={inputCls} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => runSearch(1)} disabled={searching}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
              <Search size={14} /> {searching && page === 1 && !candidates ? 'Buscando...' : 'Buscar'}
            </button>
            <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-brand-border text-xs text-brand-muted hover:text-brand-white">
              Más filtros {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-brand-border">
            {provider === 'apollo' && (
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Industria o palabras clave</label>
                <input aria-label="Industria" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="retail, restaurantes, hotelería" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-xs text-brand-muted mb-1.5">Empresa(s) — separadas por coma</label>
              <input aria-label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Banistmo, Grupo Éxito" className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-brand-muted mb-1.5">Tamaño de la empresa (empleados)</label>
              <div className="flex flex-wrap gap-2">
                {(opts.sizeRanges || []).map((r) => (
                  <button key={r} onClick={() => toggleSize(r)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition ${sizes.includes(r) ? 'bg-brand-violet border-brand-violet text-white' : 'border-brand-border text-brand-muted hover:text-brand-white'}`}>
                    {SIZE_LABELS[r] || r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {provider === 'lusha' && (
          <p className="text-xs text-brand-muted mt-3">
            Lusha cobra créditos por cada resultado de esta búsqueda, aunque sea solo vista previa (sin email/teléfono todavía). Cada página son 25 resultados.
          </p>
        )}
        {provider === 'apollo' && (
          <p className="text-xs text-brand-muted mt-3">
            Esta búsqueda de Apollo es gratuita (no consume créditos). Los resultados traen apellido parcial y sin email: el email se revela al importar, solo si lo marcas.
          </p>
        )}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {importResult && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm" data-testid="import-result">
          <div>
            Se importaron {importResult.imported} contacto(s) a la lista «{importResult.list_name}».
            {importResult.skipped > 0 && ` ${importResult.skipped} ya existían o se omitieron.`}
            {importResult.revealed > 0 && ` Se revelaron ${importResult.revealed} email(s).`}
            {importResult.dealsCreated > 0 && ` Se crearon ${importResult.dealsCreated} trato(s) en ${importResult.pipeline} · ${importResult.stage}.`}
            {importResult.dealsSkipped > 0 && ` ${importResult.dealsSkipped} empresa(s) ya tenían trato abierto en ese embudo.`}
            {importResult.errors > 0 && ` ${importResult.errors} con error.`}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <button onClick={() => navigate('/lists')} className="underline hover:text-white">Ver la lista en Listas</button>
            <a href={`${B2B_TOOL_URL}/?lista=${encodeURIComponent(importResult.list_name)}`} target="_blank" rel="noreferrer" className="underline hover:text-white inline-flex items-center gap-1">
              Trabajarla en Prospección B2B <ExternalLink size={11} />
            </a>
          </div>
          {(importResult.results || []).some((r) => r.revealError) && (
            <div className="mt-2 text-xs text-amber-300">Algunos emails no se pudieron revelar: {(importResult.results.find((r) => r.revealError) || {}).revealError}</div>
          )}
        </div>
      )}

      {candidates && (
        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" aria-label="Seleccionar todos" checked={pending.length > 0 && pending.every((c) => selected[c.key])} onChange={toggleAll} />
                {visible.length} resultado{visible.length === 1 ? '' : 's'}{total ? ` de ~${total.toLocaleString('es')}` : ''}
              </label>
              <button onClick={selectNew} className="text-xs text-brand-muted hover:text-brand-white underline" disabled={newOnes.length === 0}>
                Seleccionar solo los nuevos ({newOnes.length})
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-5 py-2"></th>
                <th className="px-5 py-2 font-manrope font-normal">Nombre</th>
                <th className="px-5 py-2 font-manrope font-normal">Cargo</th>
                <th className="px-5 py-2 font-manrope font-normal">Empresa</th>
                <th className="px-5 py-2 font-manrope font-normal">País</th>
                <th className="px-5 py-2 font-manrope font-normal">En tu CRM</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const r = done[c.key];
                return (
                  <tr key={c.key} onClick={() => !r && toggle(c.key)} className={`border-t border-brand-border row-hover ${r ? 'opacity-60' : 'cursor-pointer'}`}>
                    <td className="px-5 py-2.5">
                      {r ? <Check size={14} className="text-green-400" /> : <input type="checkbox" aria-label={`Elegir ${c.firstName}`} checked={!!selected[c.key]} onChange={() => toggle(c.key)} onClick={(e) => e.stopPropagation()} />}
                    </td>
                    <td className="px-5 py-2.5"><span className="inline-flex items-center gap-1.5"><User size={12} className="text-brand-muted" /> {c.firstName} {c.lastName}</span></td>
                    <td className="px-5 py-2.5 text-brand-muted">{c.title || '—'}</td>
                    <td className="px-5 py-2.5 text-brand-muted"><span className="inline-flex items-center gap-1.5"><Building2 size={12} /> {c.companyName || '—'}</span></td>
                    <td className="px-5 py-2.5 text-brand-muted">{c.country || '—'}</td>
                    <td className="px-5 py-2.5">
                      {r ? (
                        <span className="text-green-300 text-xs">
                          {r.status === 'imported' ? 'Importado' : 'Ya existía'}{r.revealed ? ' · email revelado' : ''}{r.dealStatus === 'created' ? ' · trato creado' : ''}
                        </span>
                      ) : <CrmBadge crm={c.crm} />}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-muted text-sm">Sin resultados para estos filtros.</td></tr>
              )}
            </tbody>
          </table>

          {hasMore && (
            <div className="px-5 py-3 border-t border-brand-border text-center">
              <button onClick={() => runSearch(page + 1)} disabled={searching}
                className="px-4 py-1.5 rounded-lg border border-brand-border text-xs text-brand-muted hover:text-brand-white hover:border-brand-violet disabled:opacity-50">
                {searching ? 'Cargando...' : `Ver más (página ${page + 1})`}
              </button>
              {provider === 'lusha' && <span className="ml-3 text-xs text-brand-muted">consume créditos de Lusha</span>}
            </div>
          )}

          <div className="px-5 py-4 border-t border-brand-border bg-brand-bg/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-brand-muted mb-1.5">Lista donde quedan agrupados</label>
                <input list="prospect-lists" aria-label="Lista" value={listName} onChange={(e) => setListName(e.target.value)} placeholder={defaultList} className={inputCls} />
                <datalist id="prospect-lists">
                  {lists.map((l) => <option key={l.id} value={l.name}>{l.contact_count} contactos</option>)}
                </datalist>

                {opts.canReveal && (
                  <label className="flex items-start gap-2 mt-3 text-xs cursor-pointer">
                    <input type="checkbox" aria-label="Revelar email" checked={reveal} onChange={(e) => setReveal(e.target.checked)} className="mt-0.5" />
                    <span>
                      <span className="text-brand-white">Revelar email/teléfono al importar</span>
                      <span className="block text-brand-muted">Consume créditos de {provider === 'apollo' ? 'Apollo' : 'Lusha'}: hasta {opts.revealCap} por importación{reveal ? ` · ahora ~${revealCount}` : ''}. Sin esto, el contacto llega sin email.</span>
                    </span>
                  </label>
                )}
              </div>

              <div>
                {opts.canCreateDeals && (
                  <>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input type="checkbox" aria-label="Crear trato" checked={makeDeal} onChange={(e) => setMakeDeal(e.target.checked)} className="mt-0.5" />
                      <span>
                        <span className="text-brand-white flex items-center gap-1"><CircleDollarSign size={12} /> Crear un trato en el pipeline</span>
                        <span className="block text-brand-muted">Uno por empresa; si ya tiene trato abierto en ese embudo, no se duplica.</span>
                      </span>
                    </label>
                    {makeDeal && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <select aria-label="Embudo" value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); const p = pipelines.find((x) => x.id === e.target.value); setStageId(p?.pipeline_stages?.[0]?.id || ''); }} className={inputCls}>
                          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select aria-label="Etapa" value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input aria-label="Título del trato" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className={`${inputCls} col-span-2`} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={importSelected} disabled={selectedCount === 0 || importing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-sm font-medium disabled:opacity-40">
                <Check size={14} /> {importing ? 'Importando...' : `Importar seleccionados (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
