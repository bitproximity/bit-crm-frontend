import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TYPES = ['restaurante', 'retail', 'hotel', 'espacio_comercial', 'otro'];

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', industry: '', country: '', company_type: 'otro' });

  const load = () => api.get('/api/companies').then((r) => setCompanies(r.data)).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const createCompany = async (e) => {
    e.preventDefault();
    await api.post('/api/companies', form);
    setForm({ name: '', industry: '', country: '', company_type: 'otro' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl font-semibold">Empresas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium"
        >
          + Nueva empresa
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCompany} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 grid grid-cols-4 gap-3">
          <input placeholder="Nombre" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <select value={form.company_type} onChange={(e) => setForm({ ...form, company_type: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="País" value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <input placeholder="Industria" value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm" />
          <button className="col-span-4 px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {companies.map((c) => (
          <div key={c.id} className="bg-brand-panel border border-brand-border rounded-xl p-4">
            <div className="font-manrope font-medium">{c.name}</div>
            <div className="text-xs text-brand-muted font-tech uppercase mt-1">{c.company_type}</div>
            <div className="text-xs text-brand-muted mt-1">{c.country || ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
