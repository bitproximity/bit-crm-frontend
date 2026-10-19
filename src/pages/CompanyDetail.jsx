import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ChevronLeft, MapPin, Users, DollarSign, Phone, Linkedin, FileText, Trash2, Plus, Pencil,
  Briefcase, TrendingUp, Trophy, CalendarDays, Globe2, Factory, Building2,
} from 'lucide-react';
import EnrichButtons from '../components/EnrichButtons';
import { useConfirm } from '../components/ConfirmModal';
import { INDUSTRY_OPTIONS, COUNTRY_OPTIONS } from '../components/B2bRecordModal';
import ContactDetailPanel from '../components/ContactDetailPanel';
import AddContactModal from '../components/AddContactModal';
import AddDealModal from '../components/AddDealModal';
import { Drawer, Field, inputCls, selectCls, primaryBtn, ghostBtn } from '../components/Modal';
import { CompanyAvatar } from './Companies';
import { colorForName } from '../lib/avatar';

const STATUS_STYLE = {
  abierto: 'bg-brand-violet/15 text-brand-ice',
  ganado: 'bg-green-500/15 text-green-300',
  perdido: 'bg-red-500/15 text-red-300',
};
const money = (n) => `$${Math.round(n).toLocaleString()}`;

function Kpi({ icon: Icon, label, value, sub, tone = 'text-brand-ice' }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 panel-depth">
      <div className="flex items-center gap-2 text-brand-muted text-xs mb-2"><Icon size={14} />{label}</div>
      <div className={`font-headline text-2xl font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-brand-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Card({ icon: Icon, title, count, action, children, className = '' }) {
  return (
    <section className={`bg-brand-panel border border-brand-border rounded-2xl p-5 panel-depth ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-brand-muted" />
          <h2 className="font-manrope font-semibold text-sm">{title}</h2>
          {count != null && <span className="font-tech text-[11px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full">{count}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => (
  <div className="text-brand-muted text-xs text-center py-7 border border-dashed border-brand-border rounded-xl">{children}</div>
);

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-brand-border/60 last:border-0">
      <Icon size={14} className="text-brand-muted mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-tech uppercase tracking-wide text-brand-muted">{label}</div>
        <div className="text-sm mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [company, setCompany] = useState(null);
  const [editing, setEditing] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [form, setForm] = useState({ name: '', industry: '', country: '', company_type: 'otro' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [docs, setDocs] = useState([]);
  const loadDocs = () => api.get(`/api/documents/tree?company_id=${id}`).then(setDocs).catch(() => setDocs([]));
  useEffect(() => { loadDocs(); }, [id]);

  const createDoc = async () => {
    const created = await api.post('/api/documents', { title: `${company.name} — nuevo documento`, content: '', company_id: id });
    navigate(`/documents?open=${created.id}`);
  };

  const load = () => api.get(`/api/companies/${id}`).then((data) => {
    setCompany(data);
    setForm({
      name: data.name || '',
      industry: data.industry || '',
      country: data.country || '',
      company_type: data.company_type || 'otro',
    });
    setLoading(false);
  }).catch((err) => { setError(err.message || 'No se pudo cargar la empresa.'); setLoading(false); });

  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.get('/api/pipelines').then(setPipelines).catch(() => setPipelines([])); }, []);
  useEffect(() => {
    api.get('/api/exchange-rates').then((rates) => {
      setExchangeRates(Object.fromEntries(rates.map((r) => [r.currency, Number(r.rate_to_usd)])));
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await api.patch(`/api/companies/${id}`, form);
      setEditing(false);
      load();
    } catch (err) {
      setSaveError(err.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async () => {
    const ok = await confirm({
      title: 'Eliminar empresa',
      message: `¿Eliminar "${company.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/companies/${id}`);
      navigate('/companies');
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la empresa (puede tener contactos o tratos vinculados).');
    }
  };

  const deleteContactFromList = async (c) => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'este contacto';
    const ok = await confirm({
      title: 'Eliminar contacto',
      message: `¿Eliminar a "${fullName}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/contacts/${c.id}`);
      load();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el contacto.');
    }
  };

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (loading || !company) return <SkeletonPage />;

  const toUsd = (value, currency) => Number(value || 0) * (exchangeRates[currency] ?? (currency === 'USD' || !currency ? 1 : 0));
  const deals = company.deals || [];
  const contacts = company.contacts || [];
  const openDeals = deals.filter((d) => !d.status || d.status === 'abierto');
  const wonDeals = deals.filter((d) => d.status === 'ganado');
  const openValue = openDeals.reduce((s, d) => s + toUsd(d.value, d.currency), 0);
  const wonValue = wonDeals.reduce((s, d) => s + toUsd(d.value, d.currency), 0);
  const accent = colorForName(company.name);
  const created = company.created_at ? new Date(company.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const hasEnrichment = company.phone || company.linkedin_url || company.description || company.employee_count;

  return (
    <div>
      <Link to="/companies" className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-ice mb-3 transition">
        <ChevronLeft size={14} /> Empresas
      </Link>

      {/* Cabecera */}
      <div className="relative bg-brand-panel border border-brand-border rounded-2xl overflow-hidden panel-depth mb-4">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${accent}, #E000FF)` }} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <CompanyAvatar name={company.name} size="w-16 h-16 text-xl" />
            <div className="min-w-0">
              <h1 className="font-headline text-2xl font-semibold truncate">{company.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-full bg-brand-violet/15 text-brand-ice font-tech">{company.industry || 'Sin industria'}</span>
                {company.country && <span className="flex items-center gap-1 text-brand-muted"><MapPin size={12} />{company.country}</span>}
                {openValue > 0 && <span className="flex items-center gap-1 text-green-300"><DollarSign size={12} />{money(openValue)} en tratos abiertos</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EnrichButtons entityType="companies" entityId={company.id} onEnriched={(updated) => setCompany((c) => ({ ...c, ...updated }))} />
            <button onClick={() => { setSaveError(''); setEditing(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-bg border border-brand-border text-sm hover:border-brand-violet transition">
              <Pencil size={14} /> Editar
            </button>
            <button onClick={deleteCompany} className="icon-btn p-2.5 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-red-300 hover:border-red-500/40 transition" title="Eliminar empresa" aria-label="Eliminar empresa">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Briefcase} label="Tratos abiertos" value={openDeals.length} sub={openValue > 0 ? `${money(openValue)} en juego` : 'Sin valor cargado'} />
        <Kpi icon={Trophy} label="Ganado" value={money(wonValue)} sub={`${wonDeals.length} ${wonDeals.length === 1 ? 'trato ganado' : 'tratos ganados'}`} tone="text-green-300" />
        <Kpi icon={Users} label="Contactos" value={contacts.length} sub={contacts.length ? 'personas vinculadas' : 'Aún sin contactos'} />
        <Kpi icon={FileText} label="Documentos" value={docs.length} sub="de la empresa, sus tratos y proyectos" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            icon={DollarSign}
            title="Tratos"
            count={deals.length}
            action={<button onClick={() => setShowAddDeal(true)} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-ice hover:bg-brand-bg transition" title="Nuevo trato" aria-label="Nuevo trato"><Plus size={16} /></button>}
          >
            <div className="space-y-2">
              {deals.map((d, i) => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/deals/${d.id}`)}
                  className="group flex items-center gap-3 bg-brand-bg rounded-xl px-3.5 py-3 cursor-pointer row-hover stagger-item"
                  style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-brand-muted flex-wrap">
                      {d.pipeline_stages?.name && <span>{d.pipeline_stages.name}</span>}
                      {d.product_line && <span className="px-1.5 py-0.5 rounded bg-brand-violet/10 text-brand-ice">{d.product_line}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-tech uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[d.status || 'abierto'] || STATUS_STYLE.abierto}`}>{d.status || 'abierto'}</span>
                  <span className="text-brand-ice font-tech text-sm flex-shrink-0 text-right min-w-[84px]">{d.currency} {Number(d.value || 0).toLocaleString()}</span>
                </div>
              ))}
              {deals.length === 0 && <Empty>Sin tratos todavía. Crea el primero con el botón +.</Empty>}
            </div>
          </Card>

          <Card
            icon={Users}
            title="Contactos"
            count={contacts.length}
            action={<button onClick={() => setShowAddContact(true)} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-ice hover:bg-brand-bg transition" title="Nuevo contacto" aria-label="Nuevo contacto"><Plus size={16} /></button>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {contacts.map((c, i) => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                const ini = fullName.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className="group flex items-center gap-3 bg-brand-bg rounded-xl px-3.5 py-3 cursor-pointer row-hover stagger-item"
                    style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center text-[11px] font-tech font-semibold flex-shrink-0">{ini || '?'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{fullName || 'Sin nombre'}</div>
                      {(c.position || c.email) && <div className="text-xs text-brand-muted truncate">{c.position || c.email}</div>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteContactFromList(c); }}
                      className="icon-btn p-1.5 rounded-lg text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                      title="Eliminar contacto" aria-label="Eliminar contacto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
            {contacts.length === 0 && <Empty>Sin contactos todavía.</Empty>}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          <Card icon={Building2} title="Información" action={<button onClick={() => { setSaveError(''); setEditing(true); }} className="text-xs text-brand-ice hover:underline">Editar</button>}>
            <InfoRow icon={Factory} label="Industria">{company.industry || <span className="text-brand-muted">Sin especificar</span>}</InfoRow>
            <InfoRow icon={Globe2} label="País">{company.country || <span className="text-brand-muted">Sin especificar</span>}</InfoRow>
            {created && <InfoRow icon={CalendarDays} label="Creada">{created}</InfoRow>}
            {company.phone && <InfoRow icon={Phone} label="Teléfono">{company.phone}</InfoRow>}
            {company.employee_count && <InfoRow icon={Users} label="Empleados">{company.employee_count}</InfoRow>}
            {company.linkedin_url && (
              <InfoRow icon={Linkedin} label="LinkedIn">
                <a href={company.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-ice hover:underline break-all">{company.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')}</a>
              </InfoRow>
            )}
            {company.description && <p className="text-brand-muted text-xs mt-3 leading-relaxed">{company.description}</p>}
            {company.enriched_at && (
              <p className="text-[11px] text-brand-muted font-tech mt-3 flex items-center gap-1.5">
                <TrendingUp size={11} /> Enriquecida vía {company.enrichment_source === 'lusha' ? 'Lusha' : 'Apollo'} · {new Date(company.enriched_at).toLocaleDateString('es-CO')}
              </p>
            )}
            {!hasEnrichment && !company.enriched_at && (
              <p className="text-[11px] text-brand-muted mt-3">Usa Lusha o Apollo arriba para completar teléfono, empleados y LinkedIn.</p>
            )}
          </Card>

          <CompanyDocuments docs={docs} onCreate={createDoc} />
        </div>
      </div>

      {editing && (
        <Drawer
          title="Editar empresa"
          subtitle={company.name}
          icon={Pencil}
          onClose={() => setEditing(false)}
          footer={(
            <>
              <button type="button" onClick={save} disabled={saving || !form.name.trim()} className={primaryBtn}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              <button type="button" onClick={() => setEditing(false)} className={ghostBtn}>Cancelar</button>
              {saveError && <span className="text-xs text-red-300 ml-2">{saveError}</span>}
            </>
          )}
        >
          <form onSubmit={save} className="space-y-5">
            <Field label="Nombre">
              <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="País">
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={selectCls} style={{ colorScheme: 'dark' }}>
                <option value="">Sin especificar</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Industria">
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={selectCls} style={{ colorScheme: 'dark' }}>
                <option value="">Sin especificar</option>
                {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        </Drawer>
      )}

      {selectedContactId && (
        <ContactDetailPanel
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          onDeleted={() => { setSelectedContactId(null); load(); }}
          onSaved={load}
        />
      )}

      {showAddContact && (
        <AddContactModal
          presetCompany={{ id: company.id, name: company.name }}
          onClose={() => setShowAddContact(false)}
          onCreated={() => { setShowAddContact(false); load(); }}
        />
      )}

      {showAddDeal && (
        <AddDealModal
          open={showAddDeal}
          pipelines={pipelines}
          pipelineId={pipelines[0]?.id}
          presetCompany={{ id: company.id, name: company.name, industry: company.industry }}
          onClose={() => setShowAddDeal(false)}
          onCreated={() => { setShowAddDeal(false); load(); }}
        />
      )}
    </div>
  );
}

// Documentos de la empresa agrupados igual que en la página Documentos: primero los
// generales de la empresa, luego uno por proyecto y uno por trato.
function CompanyDocuments({ docs, onCreate }) {
  const ids = new Set(docs.map((d) => d.id));
  const roots = docs.filter((d) => !d.parent_id || !ids.has(d.parent_id));
  const childCount = (id) => docs.filter((d) => d.parent_id === id).length;
  const groups = [];
  const general = roots.filter((d) => !d.project_id && !d.deal_id);
  if (general.length) groups.push({ key: 'general', label: 'General', docs: general });
  const byProject = {};
  roots.filter((d) => d.project_id).forEach((d) => { (byProject[d.project_id] ||= { label: d.project_name || 'Proyecto', docs: [] }).docs.push(d); });
  Object.entries(byProject).forEach(([k, g]) => groups.push({ key: `p-${k}`, label: `Proyecto · ${g.label}`, docs: g.docs }));
  const byDeal = {};
  roots.filter((d) => !d.project_id && d.deal_id).forEach((d) => { (byDeal[d.deal_id] ||= { label: d.deal_title || 'Trato', docs: [] }).docs.push(d); });
  Object.entries(byDeal).forEach(([k, g]) => groups.push({ key: `d-${k}`, label: `Trato · ${g.label}`, docs: g.docs }));

  return (
    <Card
      icon={FileText}
      title="Documentos"
      count={docs.length}
      action={<button onClick={onCreate} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-ice hover:bg-brand-bg transition" title="Nuevo documento" aria-label="Nuevo documento"><Plus size={16} /></button>}
    >
      {groups.length === 0 ? (
        <Empty>Sin documentos todavía. Los documentos de sus proyectos y tratos también aparecen aquí.</Empty>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="text-[10px] font-tech uppercase tracking-wide text-brand-muted mb-1.5">{g.label}</div>
              <div className="space-y-1.5">
                {g.docs.map((d) => (
                  <Link key={d.id} to={`/documents?open=${d.id}`} className="flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3 py-2.5 text-sm hover:border-brand-violet/40 transition min-w-0">
                    <FileText size={14} className="text-brand-muted flex-shrink-0" />
                    <span className="truncate flex-1">{d.title || 'Sin título'}</span>
                    {childCount(d.id) > 0 && <span className="text-[10px] font-tech text-brand-muted">+{childCount(d.id)}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
