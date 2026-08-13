import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ChevronLeft, Building2, MapPin, Users, DollarSign, Phone, Linkedin, FileText } from 'lucide-react';
import EnrichButtons from '../components/EnrichButtons';

const TYPES = ['restaurante', 'retail', 'hotel', 'espacio_comercial', 'otro'];
const TYPE_LABELS = {
  restaurante: 'Restaurante', retail: 'Retail', hotel: 'Hotel',
  espacio_comercial: 'Espacio comercial', otro: 'Otro',
};

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [editing, setEditing] = useState(false);
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

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.patch(`/api/companies/${id}`, form);
    setSaving(false);
    setEditing(false);
    load();
  };

  if (error) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-4">{error}</div>;
  if (loading || !company) return <SkeletonPage />;

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div>
      <Link to="/companies" className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-ice mb-3">
        <ChevronLeft size={14} /> Empresas
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="font-headline text-xl font-semibold">{company.name}</h1>
            <div className="flex items-center gap-2 text-xs text-brand-muted mt-1">
              <span className="px-2 py-0.5 rounded-full bg-brand-violet/15 text-brand-ice font-tech">
                {TYPE_LABELS[company.company_type] || 'Otro'}
              </span>
              {company.country && <span className="flex items-center gap-1"><MapPin size={11} /> {company.country}</span>}
              {company.industry && <span>· {company.industry}</span>}
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
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={form.company_type} onChange={(e) => setForm({ ...form, company_type: e.target.value })} className={`${inputClass} font-tech`}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>País</label>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Industria</label>
            <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={inputClass} />
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

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-brand-muted" />
            <span className="font-manrope font-medium text-sm">Contactos ({(company.contacts || []).length})</span>
          </div>
          <div className="space-y-2">
            {(company.contacts || []).map((c) => (
              <div key={c.id} className="text-sm bg-brand-bg rounded-lg px-3 py-2">
                <div>{c.first_name} {c.last_name}</div>
                {c.email && <div className="text-xs text-brand-muted">{c.email}</div>}
              </div>
            ))}
            {(company.contacts || []).length === 0 && <div className="text-brand-muted text-xs">Sin contactos todavía.</div>}
          </div>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={15} className="text-brand-muted" />
            <span className="font-manrope font-medium text-sm">Tratos ({(company.deals || []).length})</span>
          </div>
          <div className="space-y-2">
            {(company.deals || []).map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/deals/${d.id}`)}
                className="text-sm bg-brand-bg rounded-lg px-3 py-2 cursor-pointer row-hover flex items-center justify-between"
              >
                <span>{d.title}</span>
                <span className="text-brand-ice font-tech text-xs">{d.currency} {Number(d.value || 0).toLocaleString()}</span>
              </div>
            ))}
            {(company.deals || []).length === 0 && <div className="text-brand-muted text-xs">Sin tratos todavía.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
