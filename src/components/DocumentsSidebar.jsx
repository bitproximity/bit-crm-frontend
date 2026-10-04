import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Plus, ChevronRight, ChevronDown, Trash2, Building2, FolderKanban,
  CircleDollarSign, Search, Inbox, X, Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { colorForName, initials } from '../lib/avatar';
import { useOutsideClick } from '../hooks/useOutsideClick';

// ── Agrupación ──────────────────────────────────────────────────────────────
// Empresa → (General | Proyecto X | Trato Y) → páginas (con subpáginas anidadas).
// Proyectos sin empresa van en su propio bloque, y lo que no tiene nada en "Sin asignar".
export function groupDocuments(tree) {
  const ids = new Set(tree.map((d) => d.id));
  const childrenOf = {};
  tree.forEach((d) => {
    if (d.parent_id && ids.has(d.parent_id)) (childrenOf[d.parent_id] ||= []).push(d);
  });
  const roots = tree.filter((d) => !d.parent_id || !ids.has(d.parent_id));

  const companies = {};
  const orphanProjects = {};
  const unassigned = [];

  roots.forEach((d) => {
    if (d.company_id) {
      const c = (companies[d.company_id] ||= { id: d.company_id, name: d.company_name || 'Empresa', general: [], projects: {}, deals: {}, total: 0 });
      if (d.project_id) (c.projects[d.project_id] ||= { id: d.project_id, name: d.project_name || 'Proyecto', docs: [] }).docs.push(d);
      else if (d.deal_id) (c.deals[d.deal_id] ||= { id: d.deal_id, name: d.deal_title || 'Trato', docs: [] }).docs.push(d);
      else c.general.push(d);
    } else if (d.project_id) {
      (orphanProjects[d.project_id] ||= { id: d.project_id, name: d.project_name || 'Proyecto', docs: [] }).docs.push(d);
    } else if (d.deal_id) {
      (orphanProjects[`deal-${d.deal_id}`] ||= { id: d.deal_id, isDeal: true, name: d.deal_title || 'Trato', docs: [] }).docs.push(d);
    } else {
      unassigned.push(d);
    }
  });

  const countDeep = (list) => list.reduce((n, d) => n + 1 + countDeep(childrenOf[d.id] || []), 0);
  const companyList = Object.values(companies).map((c) => ({
    ...c,
    projects: Object.values(c.projects).sort((a, b) => a.name.localeCompare(b.name)),
    deals: Object.values(c.deals).sort((a, b) => a.name.localeCompare(b.name)),
    total: countDeep([...c.general, ...Object.values(c.projects).flatMap((p) => p.docs), ...Object.values(c.deals).flatMap((p) => p.docs)]),
  })).sort((a, b) => a.name.localeCompare(b.name));

  return {
    childrenOf,
    companies: companyList,
    orphanProjects: Object.values(orphanProjects).sort((a, b) => a.name.localeCompare(b.name)),
    unassigned,
    countDeep,
  };
}

// ── Árbol de páginas ────────────────────────────────────────────────────────
function PageNode({ node, childrenOf, depth, ctx }) {
  const children = childrenOf[node.id] || [];
  const isOpen = ctx.expanded[node.id];
  const active = ctx.activeId === node.id;
  return (
    <div>
      <div
        onClick={() => ctx.onSelect(node.id)}
        className={`group flex items-center gap-1 pr-1.5 py-1.5 rounded-md cursor-pointer text-[13px] transition ${
          active ? 'bg-brand-violet/20 text-brand-ice' : 'hover:bg-brand-bg text-brand-white/90'
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); ctx.toggle(node.id); }}
          className={`w-4 h-4 flex items-center justify-center text-brand-muted flex-shrink-0 ${children.length === 0 ? 'invisible' : ''}`}
        >
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <FileText size={12} className={`flex-shrink-0 ${active ? 'text-brand-ice' : 'text-brand-muted'}`} />
        <span className="truncate flex-1 ml-1">{node.title || 'Sin título'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); ctx.onAddChild(node.id); }}
          className="icon-btn opacity-0 group-hover:opacity-100 text-brand-muted hover:text-brand-ice flex-shrink-0 p-0.5"
          title="Nueva subpágina"
        >
          <Plus size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); ctx.onDelete(node.id); }}
          className="icon-btn opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-400 flex-shrink-0 p-0.5"
          title="Eliminar"
        >
          <Trash2 size={11} />
        </button>
      </div>
      {isOpen && children.map((c) => <PageNode key={c.id} node={c} childrenOf={childrenOf} depth={depth + 1} ctx={ctx} />)}
    </div>
  );
}

function SubGroup({ icon: Icon, label, docs, groupKey, assoc, ctx, childrenOf, depth = 1 }) {
  const open = ctx.expanded[groupKey] ?? true;
  return (
    <div>
      <div
        className="group flex items-center gap-1.5 pr-1.5 py-1 rounded-md cursor-pointer text-xs text-brand-muted hover:text-brand-white"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => ctx.toggle(groupKey, true)}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Icon size={12} className="flex-shrink-0" />
        <span className="truncate flex-1">{label}</span>
        <span className="font-tech text-[10px] opacity-60 group-hover:hidden">{docs.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); ctx.onCreateIn(assoc); }}
          className="hidden group-hover:block icon-btn text-brand-muted hover:text-brand-ice p-0.5"
          title={`Nuevo documento en ${label}`}
        >
          <Plus size={11} />
        </button>
      </div>
      {open && docs.map((d) => <PageNode key={d.id} node={d} childrenOf={childrenOf} depth={depth + 1} ctx={ctx} />)}
    </div>
  );
}

function CompanyBlock({ company, ctx, childrenOf }) {
  const key = `company-${company.id}`;
  const open = ctx.forceOpen || ctx.expanded[key];
  const color = colorForName(company.name);
  return (
    <div className="mb-0.5">
      <div
        onClick={() => ctx.toggle(key)}
        className="group flex items-center gap-2 px-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-brand-bg transition"
      >
        {open ? <ChevronDown size={12} className="text-brand-muted" /> : <ChevronRight size={12} className="text-brand-muted" />}
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-tech font-bold flex-shrink-0"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {initials(company.name)}
        </span>
        <span className="text-sm truncate flex-1">{company.name}</span>
        <span className="font-tech text-[10px] text-brand-muted group-hover:hidden">{company.total}</span>
        <button
          onClick={(e) => { e.stopPropagation(); ctx.onCreateIn({ company_id: company.id }); }}
          className="hidden group-hover:block icon-btn text-brand-muted hover:text-brand-ice p-0.5"
          title={`Nuevo documento de ${company.name}`}
        >
          <Plus size={12} />
        </button>
      </div>
      {open && (
        <div className="ml-2 border-l border-brand-border/60">
          {company.general.length > 0 && (
            <SubGroup icon={Building2} label="General" docs={company.general} groupKey={`${key}-general`} assoc={{ company_id: company.id }} ctx={ctx} childrenOf={childrenOf} />
          )}
          {company.projects.map((p) => (
            <SubGroup key={p.id} icon={FolderKanban} label={p.name} docs={p.docs} groupKey={`${key}-p-${p.id}`} assoc={{ company_id: company.id, project_id: p.id }} ctx={ctx} childrenOf={childrenOf} />
          ))}
          {company.deals.map((d) => (
            <SubGroup key={d.id} icon={CircleDollarSign} label={d.name} docs={d.docs} groupKey={`${key}-d-${d.id}`} assoc={{ company_id: company.id, deal_id: d.id }} ctx={ctx} childrenOf={childrenOf} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div className="flex items-center justify-between px-1.5 mt-4 mb-1.5">
      <span className="text-[10px] font-tech uppercase tracking-wider text-brand-muted">{children}</span>
      {count != null && <span className="text-[10px] font-tech text-brand-muted">{count}</span>}
    </div>
  );
}

export default function DocumentsSidebar({ tree, activeId, onSelect, onAddChild, onDelete, onCreateIn, error }) {
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState('');

  // Al abrir un documento (ej. desde un trato con ?open=), despliega su empresa y su rama
  useEffect(() => {
    if (!activeId) return;
    const byId = Object.fromEntries(tree.map((d) => [d.id, d]));
    const doc = byId[activeId];
    if (!doc) return;
    const next = {};
    let cur = doc;
    while (cur?.parent_id && byId[cur.parent_id]) { next[cur.parent_id] = true; cur = byId[cur.parent_id]; }
    if (doc.company_id) next[`company-${doc.company_id}`] = true;
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [activeId, tree]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    // Un match trae también a sus ancestros, para no perder el contexto del árbol
    const byId = Object.fromEntries(tree.map((d) => [d.id, d]));
    const keep = new Set();
    tree.forEach((d) => {
      const hay = `${d.title || ''} ${d.company_name || ''} ${d.project_name || ''} ${d.deal_title || ''}`.toLowerCase();
      if (!hay.includes(q)) return;
      let cur = d;
      while (cur) { keep.add(cur.id); cur = cur.parent_id ? byId[cur.parent_id] : null; }
    });
    return tree.filter((d) => keep.has(d.id));
  }, [tree, query]);

  const grouped = useMemo(() => groupDocuments(filtered), [filtered]);
  const searching = query.trim().length > 0;

  const ctx = {
    expanded: searching ? new Proxy(expanded, { get: () => true }) : expanded,
    forceOpen: searching,
    toggle: (id, defaultOpen = false) => setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? defaultOpen) })),
    activeId, onSelect, onAddChild, onDelete, onCreateIn,
  };

  return (
    <div className="w-80 border-r border-brand-border flex-shrink-0 bg-brand-panel/40 flex flex-col">
      <div className="p-4 pb-3 border-b border-brand-border/60">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-headline text-lg font-semibold flex items-center gap-2">
            <FileText size={17} className="text-brand-ice" /> Documentos
          </h1>
          <button
            onClick={() => onCreateIn(null)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-white text-xs font-medium hover:opacity-90 transition"
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documento, empresa o proyecto"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs focus:outline-none focus:border-brand-violet/60"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"><X size={12} /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-6">
        {error && (
          <div className="mt-3 px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>
        )}

        {grouped.companies.length > 0 && <SectionTitle count={grouped.companies.length}>Empresas</SectionTitle>}
        {grouped.companies.map((c) => <CompanyBlock key={c.id} company={c} ctx={ctx} childrenOf={grouped.childrenOf} />)}

        {grouped.orphanProjects.length > 0 && <SectionTitle count={grouped.orphanProjects.length}>Proyectos sin empresa</SectionTitle>}
        {grouped.orphanProjects.map((p) => (
          <SubGroup
            key={p.id}
            icon={p.isDeal ? CircleDollarSign : FolderKanban}
            label={p.name}
            docs={p.docs}
            groupKey={`orphan-${p.id}`}
            assoc={p.isDeal ? { deal_id: p.id } : { project_id: p.id }}
            ctx={ctx}
            childrenOf={grouped.childrenOf}
            depth={0}
          />
        ))}

        {grouped.unassigned.length > 0 && (
          <>
            <SectionTitle count={grouped.countDeep(grouped.unassigned)}>Sin asignar</SectionTitle>
            <div className="mx-1.5 mb-1.5 px-2 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-200/80 leading-snug">
              Abre cada uno y usa <strong>Asignar</strong> para ubicarlo en su empresa o proyecto.
            </div>
            {grouped.unassigned.map((d) => <PageNode key={d.id} node={d} childrenOf={grouped.childrenOf} depth={0} ctx={ctx} />)}
          </>
        )}

        {tree.length === 0 && !error && (
          <button onClick={() => onCreateIn(null)} className="mt-4 w-full flex flex-col items-center gap-2 text-brand-muted text-xs py-8 text-center border border-dashed border-brand-border rounded-xl hover:border-brand-violet/50 hover:text-brand-ice transition">
            <Inbox size={20} />
            Sin documentos todavía.<br />Crea el primero.
          </button>
        )}
        {tree.length > 0 && filtered.length === 0 && (
          <div className="mt-6 text-center text-xs text-brand-muted">Nada coincide con “{query}”.</div>
        )}
      </div>
    </div>
  );
}

// ── Asignar documento a empresa / proyecto ──────────────────────────────────
export function AssignPopover({ doc, onClose, onSaved }) {
  const ref = useRef(null);
  useOutsideClick(ref, onClose);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState([]);
  const [company, setCompany] = useState(doc.companies ? { id: doc.companies.id, name: doc.companies.name } : null);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(doc.project_id || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/api/projects').then(setProjects).catch(() => setProjects([])); }, []);

  useEffect(() => {
    const q = companyQuery.trim();
    if (q.length < 2) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(q)}&limit=8`).then((r) => setCompanyResults(r.data || [])).catch(() => setCompanyResults([]));
    }, 220);
    return () => clearTimeout(t);
  }, [companyQuery]);

  const companyProjects = company ? projects.filter((p) => p.company_id === company.id) : projects.filter((p) => !p.company_id);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const sameCompany = (company?.id || null) === (doc.company_id || null);
      await api.patch(`/api/documents/${doc.id}`, {
        company_id: company?.id || null,
        project_id: projectId || null,
        // El trato se conserva solo si sigue en la misma empresa
        deal_id: sameCompany ? doc.deal_id || null : null,
      });
      onSaved();
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.');
    }
    setSaving(false);
  };

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-30 w-80 bg-brand-panel border border-brand-border rounded-xl shadow-2xl p-4 text-sm">
      <div className="font-manrope font-medium mb-3">Asignar documento</div>

      <label className="text-[10px] font-tech uppercase text-brand-muted">Empresa</label>
      {company ? (
        <div className="mt-1 mb-3 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-brand-bg border border-brand-violet/40">
          <Building2 size={13} className="text-brand-ice" />
          <span className="flex-1 truncate">{company.name}</span>
          <button onClick={() => { setCompany(null); setProjectId(''); }} className="text-brand-muted hover:text-white"><X size={13} /></button>
        </div>
      ) : (
        <div className="relative mt-1 mb-3">
          <input
            autoFocus
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full px-2.5 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet/60"
          />
          {companyResults.length > 0 && (
            <div className="absolute z-40 mt-1 w-full max-h-52 overflow-y-auto bg-brand-panel border border-brand-border rounded-lg shadow-xl">
              {companyResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCompany({ id: c.id, name: c.name }); setCompanyQuery(''); setCompanyResults([]); setProjectId(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg truncate"
                >
                  {c.name}{c.country ? <span className="text-brand-muted text-xs"> · {c.country}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="text-[10px] font-tech uppercase text-brand-muted">Proyecto (opcional)</label>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="mt-1 mb-1 w-full px-2.5 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
      >
        <option value="">{company ? 'Documento general de la empresa' : 'Sin proyecto'}</option>
        {companyProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {company && companyProjects.length === 0 && (
        <div className="text-[11px] text-brand-muted mb-2">Esta empresa no tiene proyectos.</div>
      )}

      {err && <div className="text-xs text-red-300 mt-2">{err}</div>}

      <div className="flex items-center justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-brand-muted hover:text-white">Cancelar</button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-white text-xs font-medium disabled:opacity-50"
        >
          <Check size={12} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      <div className="text-[10px] text-brand-muted mt-3 leading-snug">Las subpáginas se mueven junto con este documento.</div>
    </div>
  );
}
