import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ChevronLeft, Building2, MapPin, Users, DollarSign, Phone, Linkedin, FileText, Trash2, Plus } from 'lucide-react';
import EnrichButtons from '../components/EnrichButtons';
import { useConfirm } from '../components/ConfirmModal';
import { INDUSTRY_OPTIONS, COUNTRY_OPTIONS } from '../components/B2bRecordModal';
import ContactDetailPanel from '../components/ContactDetailPanel';
import AddContactModal from '../components/AddContactModal';
import AddDealModal from '../components/AddDealModal';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    e.preventDefault();
    setSaving(true);
    await api.patch(`/api/companies/${id}`, form);
    setSaving(false);
    setEditing(false);
    load();
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

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (loading || !company) return <SkeletonPage />;

  const toUsd = (value, currency) => Number(value || 0) * (exchangeRates[currency] ?? (currency === 'USD' || !currency ? 1 : 0));
  const openDealsValue = Math.round(
    (company.deals || []).filter((d) => !d.status || d.status === 'abierto').reduce((sum, d) => sum + toUsd(d.value, d.currency), 0)
  );

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div>
      <Link to="/companies" className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-ice mb-3">
        <ChevronLeft size={14} /> Empresas
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="font-headline text-xl font-semibold">{company.name}</h1>
            <div className="flex items-center gap-2 text-xs text-brand-muted mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-brand-violet/15 text-brand-ice font-tech">
                {company.industry || 'Sin especificar'}
              </span>
              {company.country && <span className="flex items-center gap-1"><MapPin size={11} /> {company.country}</span>}
              {openDealsValue > 0 && (
                <span className="flex items-center gap-1 text-green-300">
                  <DollarSign size={11} /> ${openDealsValue.toLocaleString()} en tratos abiertos
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EnrichButtons entityType="companies" entityId={company.id} onEnriched={(updated) => setCompany((c) => ({ ...c, ...updated }))} />
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button
            onClick={deleteCompany}
            className="icon-btn p-2 rounded-lg bg-brand-panel border border-brand-border text-brand-muted hover:text-red-300 hover:border-red-500/40 transition"
            title="Eliminar empresa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>País</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass}>
              <option value="">Sin especificar</option>
              {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Industria</label>
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={inputClass}>
              <option value="">Sin especificar</option>
              {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(company.phone || company.linkedin_url || company.description || company.employee_count || company.enriched_at) && (
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-brand-muted" />
                <span className="font-manrope font-medium text-sm">Datos enriquecidos</span>
              </div>
              {company.enriched_at && (
                <span className="text-xs text-brand-muted font-tech">
                  vía {company.enrichment_source === 'lusha' ? 'Lusha' : 'Apollo'} · {new Date(company.enriched_at).toLocaleDateString('es-CO')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {company.phone && <span className="flex items-center gap-1.5 text-brand-muted"><Phone size={13} /> {company.phone}</span>}
              {company.employee_count && <span className="flex items-center gap-1.5 text-brand-muted"><Users size={13} /> {company.employee_count} empleados</span>}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand-ice hover:underline">
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
            </div>
            {company.description && <p className="text-brand-muted text-xs mt-3">{company.description}</p>}
          </div>
        )}

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-brand-muted" />
              <span className="font-manrope font-medium text-sm">Contactos ({(company.contacts || []).length})</span>
            </div>
            <button onClick={() => setShowAddContact(true)} className="icon-btn p-1 rounded text-brand-muted hover:text-brand-ice transition" title="Nuevo contacto">
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {(company.contacts || []).map((c, i) => {
              const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
              const initials = fullName.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className="flex items-center gap-2.5 text-sm bg-brand-bg rounded-lg px-3 py-2.5 cursor-pointer row-hover stagger-item"
                  style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center text-[10px] font-tech font-semibold flex-shrink-0">
                    {initials || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">{fullName || 'Sin nombre'}</div>
                    {c.email && <div className="text-xs text-brand-muted truncate">{c.email}</div>}
                  </div>
                </div>
              );
            })}
            {(company.contacts || []).length === 0 && (
              <div className="text-brand-muted text-xs text-center py-6 border border-dashed border-brand-border rounded-lg">
                Sin contactos todavía.
              </div>
            )}
          </div>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-brand-muted" />
              <span className="font-manrope font-medium text-sm">Tratos ({(company.deals || []).length})</span>
            </div>
            <button onClick={() => setShowAddDeal(true)} className="icon-btn p-1 rounded text-brand-muted hover:text-brand-ice transition" title="Nuevo trato">
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {(company.deals || []).map((d, i) => (
              <div
                key={d.id}
                onClick={() => navigate(`/deals/${d.id}`)}
                className="text-sm bg-brand-bg rounded-lg px-3 py-2.5 cursor-pointer row-hover flex items-center justify-between stagger-item"
                style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
              >
                <span className="truncate">{d.title}</span>
                <span className="text-brand-ice font-tech text-xs flex-shrink-0 ml-2">{d.currency} {Number(d.value || 0).toLocaleString()}</span>
              </div>
            ))}
            {(company.deals || []).length === 0 && (
              <div className="text-brand-muted text-xs text-center py-6 border border-dashed border-brand-border rounded-lg">
                Sin tratos todavía.
              </div>
            )}
          </div>
        </div>
      </div>

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
