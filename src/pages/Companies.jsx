import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Building2, Search, Plus, MapPin } from 'lucide-react';
import CreateCompanyModal from '../components/CreateCompanyModal';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api.get(`/api/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then((r) => setCompanies(r.data))
      .catch(console.error);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const createCompany = async (form) => {
    await api.post('/api/companies', form);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Empresas</h1>
      </div>
      <p className="text-brand-muted text-sm mb-6">{companies.length} empresas registradas</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-panel border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm font-medium flex items-center gap-1.5 ml-auto"
        >
          <Plus size={14} /> Nueva empresa
        </button>
      </div>

      {showForm && (
        <CreateCompanyModal onClose={() => setShowForm(false)} onCreated={createCompany} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {companies.map((c, i) => (
          <div
            key={c.id}
            onClick={() => navigate(`/companies/${c.id}`)}
            className="card-elevated rounded-xl p-4 cursor-pointer stagger-item"
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-manrope font-medium truncate">{c.name}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-tech bg-brand-violet/15 text-brand-ice">
                  {c.industry || 'Sin especificar'}
                </span>
              </div>
            </div>
            {c.country && (
              <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-3">
                <MapPin size={12} /> {c.country}
              </div>
            )}
          </div>
        ))}
        {companies.length === 0 && (
          <div className="col-span-3 text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
            Sin empresas todavía.
          </div>
        )}
      </div>
    </div>
  );
}
