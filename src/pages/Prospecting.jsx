import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Check, Building2, ChevronDown, ChevronUp, ExternalLink, Sparkles, CircleDollarSign, Mail,
  SlidersHorizontal, Loader2, Info, ArrowRight, Coins, BadgeCheck, AlertTriangle, Layers, ListChecks,
  Target, Eye, X, RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';

const B2B_TOOL_URL = 'https://prospeccion.bitproximity.com';
const SIZE_LABELS = {
  '1,10': '1–10', '11,50': '11–50', '51,200': '51–200', '201,500': '201–500',
  '501,1000': '501–1.000', '1001,5000': '1.001–5.000', '5001,10000': '5.001–10.000',
};
const PRESETS = [
  { label: 'CEO · Panamá', title: 'CEO, Gerente General', country: 'Panama' },
  { label: 'Marketing · Colombia', title: 'Director de Marketing, CMO', country: 'Colombia' },
  { label: 'Comercial · México', title: 'Director Comercial, Gerente Comercial', country: 'Mexico' },
  { label: 'Operaciones · Ecuador', title: 'Director de Operaciones, COO', country: 'Ecuador' },
];
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet/40 transition';
const labelCls = 'block text-[11px] uppercase tracking-wider font-tech text-brand-muted mb-1.5';

const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const initials = (c) => `${(c.firstName || '?')[0]}${((c.lastName || '').replace(/\*/g, '')[0] || (c.companyName || '')[0] || '')}`.toUpperCase();
const errorHint = (msg) => {
  const m = String(msg || '');
  if (/APOLLO_API_KEY/.test(m)) return 'Agrégala en Railway → bit-crm-backend → Variables (debe ser una API key master de Apollo).';
  if (/LUSHA_API_KEY/.test(m)) return 'Agrégala en Railway → bit-crm-backend → Variables.';
  if (/Apollo respondió 403|master/i.test(m)) return 'Apollo exige una API key master para buscar por API. Créala en Apollo → Settings → Integrations → API.';
  if (/Lusha respondió 4(01|03)/.test(m)) return 'Revisa que la API key de Lusha siga vigente y tenga créditos.';
  if (/solo.*admin|no tiene acceso/i.test(m)) return 'La Prospección es solo para admins porque consume créditos.';
  return '';
};
const hueOf = (s) => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

function Avatar({ c }) {
  const h = hueOf(`${c.firstName}${c.companyName}`);
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-white/5"
      style={{ background: `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 40) % 360} 55% 22%))`, color: `hsl(${h} 90% 88%)` }}>
      {initials(c)}
    </div>
  );
}

function CrmBadge({ crm }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl md:rounded-full text-[11px] font-medium leading-snug max-w-full md:whitespace-nowrap';
  if (!crm) return <span className={`${base} bg-emerald-500/10 text-emerald-300`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Nuevo</span>;
  if (crm.contactId) {
    return <span className={`${base} bg-green-500/15 text-green-300`}><BadgeCheck size={12} />Ya es contacto{crm.contactHasEmail ? ' · con email' : ''}</span>;
  }
  if (crm.deals && crm.deals.length) {
    const d = crm.deals[0];
    return (
      <Link to={`/deals/${d.id}`} onClick={(e) => e.stopPropagation()} title={d.title}
        className={`${base} bg-amber-500/15 text-amber-300 hover:bg-amber-500/25`}>
        <CircleDollarSign size={12} />Trato abierto: {d.pipeline || '—'} · {d.stage || '—'}{crm.deals.length > 1 ? ` (+${crm.deals.length - 1})` : ''}
      </Link>
    );
  }
  if (crm.openDeals > 0) return <span className={`${base} bg-amber-500/15 text-amber-300`}><CircleDollarSign size={12} />Empresa con trato abierto</span>;
  return <span className={`${base} bg-sky-500/15 text-sky-300`}><Building2 size={12} />Empresa en el CRM</span>;
}

function SourceCard({ active, onClick, name, tag, tagTone, desc }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`text-left rounded-xl border p-3.5 transition ${active ? 'border-brand-violet bg-brand-violet/10 shadow-[0_0_0_1px_rgba(133,0,255,0.25)]' : 'border-brand-border bg-brand-bg/40 hover:border-brand-violet/50'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-headline text-sm font-semibold">{name}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${tagTone}`}>{tag}</span>
      </div>
      <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">{desc}</p>
    </button>
  );
}

function Toggle({ checked, onChange, label, children, icon: Icon }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition select-none ${checked ? 'border-brand-violet bg-brand-violet/15 text-brand-white' : 'border-brand-border text-brand-muted hover:text-brand-white hover:border-brand-violet/50'}`}>
      <input type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-brand-violet border-brand-violet' : 'border-brand-muted/50'}`}>{checked && <Check size={11} />}</span>
      <Icon size={13} className="flex-shrink-0" />
      <span>{children}</span>
    </label>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-brand-border/70" aria-label="Cargando resultados">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="w-4 h-4 rounded bg-brand-border" />
          <div className="w-9 h-9 rounded-xl bg-brand-border" />
          <div className="flex-1 space-y-2"><div className="h-3 rounded bg-brand-border w-40" /><div className="h-2.5 rounded bg-brand-border/70 w-56" /></div>
          <div className="hidden md:block flex-1 space-y-2"><div className="h-3 rounded bg-brand-border w-36" /><div className="h-2.5 rounded bg-brand-border/70 w-20" /></div>
          <div className="h-6 w-28 rounded-full bg-brand-border" />
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Search, t: 'Busca', d: 'Por cargo, país, industria y tamaño. La búsqueda de Apollo es gratis.' },
    { icon: Eye, t: 'Mira qué ya tienes', d: 'Cada resultado te dice si ya es contacto o tiene un trato abierto, para no contactar dos veces.' },
    { icon: ListChecks, t: 'Importa', d: 'A una Lista, con email revelado y trato en el pipeline si lo decides.' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
      {steps.map((s, i) => (
        <div key={s.t} className="rounded-2xl border border-brand-border bg-brand-panel/60 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center"><s.icon size={16} className="text-[#b66bff]" /></span>
            <span className="font-tech text-[11px] text-brand-muted tracking-wider">PASO {i + 1}</span>
          </div>
          <h3 className="font-headline text-sm font-semibold mb-1">{s.t}</h3>
          <p className="text-xs text-brand-muted leading-relaxed">{s.d}</p>
        </div>
      ))}
    </div>
  );
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
  const [view, setView] = useState('all');
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
  const compact = !!candidates || searching;
  const activeFilters = [industry, company, sizes.length ? 'tamaño' : ''].filter(Boolean).length;

  const runSearch = async (nextPage, q) => {
    const query = q || { provider, title, department, country, industry, company, sizes };
    setSearching(true);
    setError('');
    if (nextPage === 1) { setImportResult(null); setView('all'); }
    try {
      const res = await api.post('/api/prospecting/search', { ...query, page: nextPage });
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

  const usePreset = (p) => {
    setProvider('apollo'); setTitle(p.title); setCountry(p.country); setIndustry(''); setCompany(''); setSizes([]);
    runSearch(1, { provider: 'apollo', title: p.title, country: p.country, department: '', industry: '', company: '', sizes: [] });
  };

  const all = candidates || [];
  const newCount = all.filter((c) => !c.crm?.contactId).length;
  const crmCount = all.filter((c) => c.crm).length;
  const visible = all.filter((c) => (view === 'new' ? !c.crm?.contactId : view === 'crm' ? !!c.crm : true));
  const pending = visible.filter((c) => !done[c.key]);
  const selectedList = all.filter((c) => selected[c.key] && !done[c.key]);
  const selectedCount = selectedList.length;
  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));
  const toggleAll = () => {
    const allSel = pending.length > 0 && pending.every((c) => selected[c.key]);
    const next = { ...selected };
    pending.forEach((c) => { next[c.key] = !allSel; });
    setSelected(next);
  };
  const selectNew = () => {
    const next = {};
    all.filter((c) => !c.crm?.contactId && !done[c.key]).forEach((c) => { next[c.key] = true; });
    setSelected(next);
  };
  const toggleSize = (r) => setSizes((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const revealCount = reveal ? Math.min(selectedList.filter((c) => !c.crm?.contactHasEmail).length, opts.revealCap) : 0;
  const unit = provider === 'apollo' ? 'Apollo' : 'Lusha';

  const importSelected = async () => {
    if (selectedCount === 0) return;
    if (reveal) {
      const ok = window.confirm(`Vas a revelar email/teléfono de hasta ${revealCount} contacto(s). Cada uno consume créditos de ${unit}. ¿Continuar?`);
      if (!ok) return;
    }
    setImporting(true);
    setError('');
    try {
      const body = { candidates: selectedList, listName: listName.trim() || unit, revealEmails: reveal };
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

  const chip = (id, label, n) => (
    <button key={id} onClick={() => setView(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === id ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>
      {label} <span className={view === id ? 'text-white/80' : 'text-brand-muted/70'}>{n}</span>
    </button>
  );

  return (
    <div className="max-w-[1320px] mx-auto">
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight">Prospección</h1>
          <p className="text-brand-muted text-sm mt-1 max-w-2xl">Encuentra decisores en Apollo o Lusha, ve qué ya existe en tu CRM y súbelos a una Lista o al pipeline.</p>
        </div>
        <a href={B2B_TOOL_URL} target="_blank" rel="noreferrer"
          className="group flex items-center gap-2 px-3.5 py-2 rounded-xl border border-brand-border bg-brand-panel/60 text-xs text-brand-muted hover:text-brand-white hover:border-brand-violet transition">
          <Sparkles size={13} className="text-[#b66bff]" /> Prospección B2B (secuencias y seguimiento) <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
        </a>
      </div>

      {/* Búsqueda */}
      <div className="relative rounded-2xl border border-brand-border bg-brand-panel overflow-hidden mb-5">
        <div className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-70" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand-violet/10 blur-3xl pointer-events-none" />
        <div className={`relative ${compact ? 'p-4 md:p-5' : 'p-5 md:p-6'}`}>
          {compact ? (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[['apollo', 'Apollo', 'Gratis', 'text-emerald-300'], ['lusha', 'Lusha', 'Créditos', 'text-amber-300']].map(([id, name, tag, tone]) => (
                <button key={id} type="button" onClick={() => setProvider(id)} aria-pressed={provider === id}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs transition ${provider === id ? 'border-brand-violet bg-brand-violet/15 text-brand-white' : 'border-brand-border text-brand-muted hover:text-brand-white'}`}>
                  <span className="font-medium">{name}</span><span className={`text-[10px] ${tone}`}>{tag}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-w-3xl">
              <SourceCard active={provider === 'apollo'} onClick={() => setProvider('apollo')} name="Apollo" tag="Búsqueda gratis" tagTone="bg-emerald-500/15 text-emerald-300"
                desc="Por cargo, país, industria y tamaño. El email se revela solo si lo marcas al importar." />
              <SourceCard active={provider === 'lusha'} onClick={() => setProvider('lusha')} name="Lusha" tag="Cuesta créditos" tagTone="bg-amber-500/15 text-amber-300"
                desc="Por departamento y país. Cobra por cada resultado, aunque sea vista previa." />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              {provider === 'apollo' ? (
                <>
                  <label className={labelCls} htmlFor="f-title">Cargo(s) — separados por coma</label>
                  <input id="f-title" aria-label="Cargos" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch(1)} placeholder="CEO, Director de Marketing" className={inputCls} />
                </>
              ) : (
                <>
                  <label className={labelCls} htmlFor="f-dept">Departamento(s) — separados por coma</label>
                  <input id="f-dept" aria-label="Departamentos" value={department} onChange={(e) => setDepartment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch(1)} placeholder="Marketing, Sales" className={inputCls} />
                </>
              )}
            </div>
            <div className="md:col-span-3">
              <label className={labelCls} htmlFor="f-country">País</label>
              <input id="f-country" aria-label="País" value={country} onChange={(e) => setCountry(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch(1)} placeholder="Panama" className={inputCls} />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button onClick={() => runSearch(1)} disabled={searching}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-semibold shadow-lg shadow-brand-violet/20 hover:brightness-110 disabled:opacity-60 transition">
                {searching && page === 1 && !candidates ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
              </button>
              <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs transition ${showFilters || activeFilters ? 'border-brand-violet/60 text-brand-white bg-brand-violet/10' : 'border-brand-border text-brand-muted hover:text-brand-white'}`}>
                <SlidersHorizontal size={13} /> Más filtros
                {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-brand-violet text-[10px] flex items-center justify-center">{activeFilters}</span>}
                {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-brand-border/70">
              {provider === 'apollo' && (
                <div className="md:col-span-5">
                  <label className={labelCls} htmlFor="f-ind">Industria o palabras clave</label>
                  <input id="f-ind" aria-label="Industria" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="retail, restaurantes, hotelería" className={inputCls} />
                </div>
              )}
              <div className="md:col-span-4">
                <label className={labelCls} htmlFor="f-co">Empresa(s) — separadas por coma</label>
                <input id="f-co" aria-label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Banistmo, Grupo Éxito" className={inputCls} />
              </div>
              <div className="md:col-span-12">
                <span className={labelCls}>Tamaño de la empresa (empleados)</span>
                <div className="flex flex-wrap gap-2">
                  {(opts.sizeRanges || []).map((r) => (
                    <button key={r} onClick={() => toggleSize(r)} aria-pressed={sizes.includes(r)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition ${sizes.includes(r) ? 'bg-brand-violet border-brand-violet text-white' : 'border-brand-border text-brand-muted hover:text-brand-white hover:border-brand-violet/50'}`}>
                      {SIZE_LABELS[r] || r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(!compact || provider === 'lusha') && <div className={`flex items-start gap-2 mt-4 text-xs rounded-xl px-3.5 py-2.5 ${provider === 'lusha' ? 'bg-amber-500/10 text-amber-200/90 border border-amber-500/20' : 'bg-brand-bg/60 text-brand-muted border border-brand-border/60'}`}>
            {provider === 'lusha' ? <Coins size={14} className="mt-0.5 flex-shrink-0" /> : <Info size={14} className="mt-0.5 flex-shrink-0" />}
            {provider === 'lusha'
              ? <span>Lusha cobra créditos por cada resultado de esta búsqueda, aunque sea solo vista previa (sin email/teléfono todavía). Cada página son 25 resultados.</span>
              : <span>Esta búsqueda de Apollo es gratuita (no consume créditos). Los resultados traen apellido parcial y sin email: el email se revela al importar, solo si lo marcas.</span>}
          </div>}

          {!candidates && !searching && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-tech text-brand-muted mr-1 flex items-center gap-1"><Target size={12} /> Búsquedas rápidas · Apollo</span>
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => usePreset(p)}
                  className="px-3 py-1.5 rounded-full border border-brand-border text-xs text-brand-muted hover:text-brand-white hover:border-brand-violet/60 hover:bg-brand-violet/10 transition">
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-300" />
          <span className="flex-1"><span className="block">{error}</span>{errorHint(error) && <span className="block text-xs text-red-200/70 mt-1">{errorHint(error)}</span>}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso" className="text-red-300/70 hover:text-red-200"><X size={15} /></button>
        </div>
      )}

      {importResult && (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5" data-testid="import-result">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0"><Check size={18} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-emerald-100">
                Se importaron {importResult.imported} contacto(s) a la lista «{importResult.list_name}».
                {importResult.skipped > 0 && ` ${importResult.skipped} ya existían o se omitieron.`}
                {importResult.revealed > 0 && ` Se revelaron ${importResult.revealed} email(s).`}
                {importResult.dealsCreated > 0 && ` Se crearon ${importResult.dealsCreated} trato(s) en ${importResult.pipeline} · ${importResult.stage}.`}
                {importResult.dealsSkipped > 0 && ` ${importResult.dealsSkipped} empresa(s) ya tenían trato abierto en ese embudo.`}
                {importResult.errors > 0 && ` ${importResult.errors} con error.`}
              </div>
              {(importResult.results || []).some((r) => r.revealError) && (
                <div className="mt-2 text-xs text-amber-300 flex items-center gap-1.5"><AlertTriangle size={12} />Algunos emails no se pudieron revelar: {(importResult.results.find((r) => r.revealError) || {}).revealError}</div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`${B2B_TOOL_URL}/?lista=${encodeURIComponent(importResult.list_name)}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-violet text-xs font-medium hover:brightness-110 transition">
                  Trabajarla en Prospección B2B <ArrowRight size={13} />
                </a>
                <button onClick={() => navigate('/lists')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 text-xs text-emerald-100 hover:bg-emerald-500/10 transition">
                  <Layers size={13} /> Ver la lista en Listas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!candidates && !searching && !error && <HowItWorks />}

      {/* Cargando */}
      {searching && !candidates && (
        <div className="rounded-2xl border border-brand-border bg-brand-panel overflow-hidden"><Skeleton /></div>
      )}

      {/* Resultados */}
      {candidates && (
        <div className="rounded-2xl border border-brand-border bg-brand-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" aria-label="Seleccionar todos" className="accent-[#8500FF] w-4 h-4" checked={pending.length > 0 && pending.every((c) => selected[c.key])} onChange={toggleAll} />
                <span><span className="font-semibold">{all.length}</span> resultado{all.length === 1 ? '' : 's'}{total ? <span className="text-brand-muted"> de ~{fmtN(total)}</span> : ''}</span>
              </label>
              <div className="flex gap-1 bg-brand-bg border border-brand-border rounded-xl p-1">
                {chip('all', 'Todos', all.length)}
                {chip('new', 'Nuevos', newCount)}
                {chip('crm', 'En tu CRM', crmCount)}
              </div>
            </div>
            <button onClick={selectNew} disabled={newCount === 0} className="text-xs text-brand-muted hover:text-brand-white underline underline-offset-4 disabled:opacity-40 disabled:no-underline">
              Seleccionar solo los nuevos ({all.filter((c) => !c.crm?.contactId && !done[c.key]).length})
            </button>
          </div>

          <div className="hidden md:grid grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1fr)] gap-4 px-5 py-2 text-[11px] uppercase tracking-wider font-tech text-brand-muted/80 bg-brand-bg/40 border-b border-brand-border/70">
            <span /><span>Persona</span><span>Empresa</span><span>En tu CRM</span>
          </div>

          <div className="divide-y divide-brand-border/60">
            {visible.map((c) => {
              const r = done[c.key];
              const isSel = !!selected[c.key];
              return (
                <div key={c.key} onClick={() => !r && toggle(c.key)}
                  className={`flex flex-col md:grid md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1fr)] gap-1.5 md:gap-4 md:items-center px-4 md:px-5 py-3 border-l-2 transition ${r ? 'opacity-60 border-transparent' : isSel ? 'bg-brand-violet/[0.08] border-brand-violet cursor-pointer' : 'border-transparent hover:bg-white/[0.03] cursor-pointer'}`}>
                  <div className="flex items-center gap-3 min-w-0 md:contents">
                    <div className="flex items-center">
                      {r ? <Check size={15} className="text-green-400" /> : <input type="checkbox" aria-label={`Elegir ${c.firstName}`} className="accent-[#8500FF] w-4 h-4" checked={isSel} onChange={() => toggle(c.key)} onClick={(e) => e.stopPropagation()} />}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar c={c} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-brand-muted truncate">{c.title || '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 pl-[3.25rem] md:pl-0">
                    <div className="text-sm truncate flex items-center gap-1.5"><Building2 size={13} className="text-brand-muted flex-shrink-0" />{c.companyName || '—'}</div>
                    <div className="text-xs text-brand-muted truncate pl-[19px]">{c.country || '—'}</div>
                  </div>
                  <div className="pl-[3.25rem] md:pl-0">
                    {r ? (
                      <span className="text-green-300 text-xs">
                        {r.status === 'imported' ? 'Importado' : 'Ya existía'}{r.revealed ? ' · email revelado' : ''}{r.dealStatus === 'created' ? ' · trato creado' : ''}
                      </span>
                    ) : <CrmBadge crm={c.crm} />}
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="px-5 py-12 text-center text-brand-muted text-sm">
                {all.length === 0 ? 'Sin resultados para estos filtros.' : 'Ningún resultado en este filtro.'}
              </div>
            )}
          </div>

          {hasMore && (
            <div className="px-5 py-4 border-t border-brand-border text-center">
              <button onClick={() => runSearch(page + 1)} disabled={searching}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-brand-border text-xs text-brand-muted hover:text-brand-white hover:border-brand-violet disabled:opacity-50 transition">
                {searching ? <><Loader2 size={13} className="animate-spin" />Cargando...</> : <><RefreshCw size={13} />Ver más (página {page + 1})</>}
              </button>
              {provider === 'lusha' && <span className="ml-3 text-xs text-amber-300/90">consume créditos de Lusha</span>}
            </div>
          )}
        </div>
      )}

      {/* Barra flotante de importación */}
      {candidates && selectedCount > 0 && (
        <div className="sticky bottom-3 z-20 mt-4">
          <div className="rounded-2xl border border-brand-violet/50 bg-brand-panel/95 backdrop-blur-md shadow-2xl shadow-black/60 p-3.5 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 md:items-center">
              <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 md:pr-3 md:border-r border-brand-border">
                <span className="min-w-7 h-7 px-1.5 rounded-full bg-brand-violet text-xs font-semibold flex items-center justify-center">{selectedCount}</span>
                <span className="text-sm">seleccionado{selectedCount === 1 ? '' : 's'}</span>
              </div>
              <div className="flex items-center gap-2 flex-1 md:flex-none min-w-[9rem]">
                <label htmlFor="f-list" className="sr-only">Lista</label>
                <input id="f-list" list="prospect-lists" aria-label="Lista" value={listName} onChange={(e) => setListName(e.target.value)} placeholder={`Lista · ${unit}`}
                  title="Nombre de la lista donde quedan agrupados los contactos importados" className={`${inputCls} md:!w-44 !py-2`} />
                <datalist id="prospect-lists">
                  {lists.map((l) => <option key={l.id} value={l.name}>{l.contact_count} contactos</option>)}
                </datalist>
              </div>
              {opts.canReveal && (
                <Toggle checked={reveal} onChange={setReveal} label="Revelar email" icon={Mail}>
                  Revelar email{reveal ? <span className="text-brand-muted"> · hasta {revealCount}<span className="hidden md:inline"> · consume créditos de {unit}</span><span className="md:hidden"> · créditos</span></span> : <span className="text-brand-muted"> · <span className="hidden md:inline">consume </span>créditos</span>}
                </Toggle>
              )}
              {opts.canCreateDeals && (
                <Toggle checked={makeDeal} onChange={setMakeDeal} label="Crear trato" icon={CircleDollarSign}>Crear trato<span className="hidden md:inline"> en el pipeline</span></Toggle>
              )}
              </div>
              <button onClick={importSelected} disabled={importing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-violet text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-brand-violet/30 whitespace-nowrap">
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {importing ? 'Importando...' : `Importar seleccionados (${selectedCount})`}
              </button>
            </div>
            {opts.canCreateDeals && makeDeal && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-brand-border/70">
                <select aria-label="Embudo" value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); const p = pipelines.find((x) => x.id === e.target.value); setStageId(p?.pipeline_stages?.[0]?.id || ''); }} className={inputCls}>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select aria-label="Etapa" value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input aria-label="Título del trato" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className={inputCls} />
                <p className="md:col-span-3 text-[11px] text-brand-muted">Un trato por empresa, valor $0. Si la empresa ya tiene un trato abierto en ese embudo, no se duplica.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
