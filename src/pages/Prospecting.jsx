import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Check, Building2, User } from 'lucide-react';
import { api } from '../lib/api';

export default function Prospecting() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState('apollo');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState({});
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const search = async () => {
    setSearching(true);
    setError('');
    setImportResult(null);
    try {
      const res = await api.post('/api/prospecting/search', { provider, title, department, country });
      setCandidates(res.candidates);
      setSelected({});
    } catch (err) {
      setError(err.message || 'No se pudo buscar.');
      setCandidates(null);
    } finally {
      setSearching(false);
    }
  };

  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));
  const toggleAll = () => {
    if (!candidates) return;
    const allSelected = candidates.every((c) => selected[c.key]);
    const next = {};
    candidates.forEach((c) => { next[c.key] = !allSelected; });
    setSelected(next);
  };

  const importSelected = async () => {
    const chosen = (candidates || []).filter((c) => selected[c.key]);
    if (chosen.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const res = await api.post('/api/prospecting/import', { candidates: chosen });
      setImportResult(res);
      setCandidates((prev) => prev.filter((c) => !selected[c.key]));
      setSelected({});
    } catch (err) {
      setError(err.message || 'No se pudo importar.');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-1">Prospección</h1>
      <p className="text-brand-muted text-sm mb-6">Busca contactos en Lusha o Apollo y súbelos directo a Bit CRM.</p>

      <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-6">
        <div className="flex gap-1 mb-4 bg-brand-bg border border-brand-border rounded-lg p-1 w-fit">
          <button
            onClick={() => setProvider('apollo')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${provider === 'apollo' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}
          >
            Apollo
          </button>
          <button
            onClick={() => setProvider('lusha')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${provider === 'lusha' ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}
          >
            Lusha
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {provider === 'apollo' ? (
            <div>
              <label className="block text-xs text-brand-muted mb-1.5">Cargo(s) — separados por coma</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CEO, Director de Marketing"
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-brand-muted mb-1.5">Departamento(s) — separados por coma</label>
              <input
                value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Marketing, Sales"
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-brand-muted mb-1.5">País</label>
            <input
              value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Panama"
              className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={search}
              disabled={searching}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50"
            >
              <Search size={14} /> {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {provider === 'lusha' && (
          <p className="text-xs text-brand-muted mt-3">
            Lusha cobra créditos por cada resultado de esta búsqueda, aunque sea solo vista previa (sin email/teléfono todavía).
          </p>
        )}
        {provider === 'apollo' && (
          <p className="text-xs text-brand-muted mt-3">
            Esta búsqueda de Apollo es gratuita (no consume créditos) — solo se cobra cuando reveles email/teléfono de un contacto ya importado.
          </p>
        )}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      {importResult && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          Se importaron {importResult.imported} contacto(s) a Bit CRM.
          {importResult.skipped > 0 && ` ${importResult.skipped} se omitieron (probablemente ya existían).`}
        </div>
      )}

      {candidates && (
        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={candidates.length > 0 && candidates.every((c) => selected[c.key])} onChange={toggleAll} />
              {candidates.length} resultado{candidates.length === 1 ? '' : 's'}
            </label>
            <button
              onClick={importSelected}
              disabled={selectedCount === 0 || importing}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-violet text-sm font-medium disabled:opacity-40"
            >
              <Check size={14} /> {importing ? 'Importando...' : `Importar seleccionados (${selectedCount})`}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-5 py-2"></th>
                <th className="px-5 py-2 font-manrope font-normal">Nombre</th>
                <th className="px-5 py-2 font-manrope font-normal">Cargo</th>
                <th className="px-5 py-2 font-manrope font-normal">Empresa</th>
                <th className="px-5 py-2 font-manrope font-normal">País</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.key} onClick={() => toggle(c.key)} className="border-t border-brand-border cursor-pointer row-hover">
                  <td className="px-5 py-2.5"><input type="checkbox" checked={!!selected[c.key]} onChange={() => toggle(c.key)} onClick={(e) => e.stopPropagation()} /></td>
                  <td className="px-5 py-2.5 flex items-center gap-1.5"><User size={12} className="text-brand-muted" /> {c.firstName} {c.lastName}</td>
                  <td className="px-5 py-2.5 text-brand-muted">{c.title || '—'}</td>
                  <td className="px-5 py-2.5 text-brand-muted flex items-center gap-1.5"><Building2 size={12} /> {c.companyName || '—'}</td>
                  <td className="px-5 py-2.5 text-brand-muted">{c.country || '—'}</td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-brand-muted text-sm">Sin resultados para estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
