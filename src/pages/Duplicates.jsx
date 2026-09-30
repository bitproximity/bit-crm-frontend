import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import { Copy, Building2, User, Merge, RefreshCw } from 'lucide-react';

export default function Duplicates() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('companies');
  const [companyGroups, setCompanyGroups] = useState(null);
  const [contactGroups, setContactGroups] = useState(null);
  const [selected, setSelected] = useState({}); // groupIndex -> id elegido como principal
  const [merging, setMerging] = useState(null); // índice del grupo que se está fusionando
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get('/api/duplicates/companies').then(setCompanyGroups).catch((err) => setError(err.message));
    api.get('/api/duplicates/contacts').then(setContactGroups).catch((err) => setError(err.message));
  };

  useEffect(() => { load(); }, []);

  const groups = tab === 'companies' ? companyGroups : contactGroups;

  const merge = async (groupIndex, group) => {
    const primaryId = selected[`${tab}-${groupIndex}`] || group[0].id;
    const duplicateIds = group.filter((r) => r.id !== primaryId).map((r) => r.id);
    const ok = await confirm({
      title: 'Fusionar duplicados',
      message: `Se van a mover ${duplicateIds.length} registro(s) hacia "${group.find((r) => r.id === primaryId)?.name}" y se van a borrar los demás. Los tratos, facturas y actividades ligados a ellos pasan al que quede. Esto no se puede deshacer.`,
      confirmLabel: 'Fusionar',
      danger: true,
    });
    if (!ok) return;
    setMerging(groupIndex);
    try {
      await api.post('/api/duplicates/merge', { type: tab === 'companies' ? 'company' : 'contact', primary_id: primaryId, duplicate_ids: duplicateIds });
      load();
    } catch (err) {
      setError(err.message || 'No se pudo fusionar.');
    } finally {
      setMerging(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold flex items-center gap-2"><Copy size={20} /> Duplicados</h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition">
          <RefreshCw size={13} /> Revisar de nuevo
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-6">
        Empresas y contactos que probablemente son el mismo registro — por nombre parecido (sin tildes, mayúsculas ni sufijos como SAS/LLC) o el mismo correo.
      </p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1 w-fit mb-6">
        <button onClick={() => setTab('companies')} className={`px-4 py-1.5 rounded-lg text-sm font-tech flex items-center gap-1.5 transition ${tab === 'companies' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>
          <Building2 size={13} /> Empresas {companyGroups && `(${companyGroups.length})`}
        </button>
        <button onClick={() => setTab('contacts')} className={`px-4 py-1.5 rounded-lg text-sm font-tech flex items-center gap-1.5 transition ${tab === 'contacts' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>
          <User size={13} /> Contactos {contactGroups && `(${contactGroups.length})`}
        </button>
      </div>

      {groups === null && <div className="text-brand-muted text-sm">Buscando duplicados...</div>}
      {groups && groups.length === 0 && (
        <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
          No encontré duplicados de {tab === 'companies' ? 'empresas' : 'contactos'}. 🎉
        </div>
      )}

      <div className="space-y-4">
        {groups && groups.map((group, i) => {
          const key = `${tab}-${i}`;
          const primaryId = selected[key] || group[0].id;
          return (
            <div key={i} className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
              <div className="divide-y divide-brand-border">
                {group.map((row) => (
                  <label key={row.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${row.id === primaryId ? 'bg-brand-violet/10' : 'hover:bg-brand-bg'}`}>
                    <input
                      type="radio"
                      name={key}
                      checked={row.id === primaryId}
                      onChange={() => setSelected((prev) => ({ ...prev, [key]: row.id }))}
                      className="accent-brand-violet flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-manrope font-medium text-sm truncate">{row.name}</div>
                      <div className="text-xs text-brand-muted flex flex-wrap gap-x-3">
                        {row.email && <span>{row.email}</span>}
                        {row.company_name && <span>{row.company_name}</span>}
                        {row.industry && <span>{row.industry}</span>}
                        {row.country && <span>{row.country}</span>}
                        <span>{row.deals_count ?? 0} trato(s)</span>
                        {row.contacts_count !== undefined && <span>{row.contacts_count} contacto(s)</span>}
                        <span>creado {new Date(row.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {row.id === primaryId && <span className="text-[10px] font-tech uppercase tracking-wide text-brand-ice flex-shrink-0">Se queda</span>}
                  </label>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-brand-bg/60 flex justify-end">
                <button
                  onClick={() => merge(i, group)}
                  disabled={merging === i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-xs font-medium disabled:opacity-50"
                >
                  <Merge size={13} /> {merging === i ? 'Fusionando...' : `Fusionar ${group.length} en 1`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
