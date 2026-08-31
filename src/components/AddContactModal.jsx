import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { X, Building2, Plus } from 'lucide-react';
import { INDUSTRY_OPTIONS, POSITION_OPTIONS, COUNTRY_OPTIONS } from './B2bRecordModal';

const PHONE_TYPES = ['Trabajo', 'Personal', 'Móvil', 'Otro'];
const EMAIL_TYPES = ['Trabajo', 'Personal', 'Otro'];

export default function AddContactModal({ onClose, onCreated, presetCompany }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyQuery, setCompanyQuery] = useState(presetCompany?.name || '');
  const [companyResults, setCompanyResults] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(presetCompany || null);
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneType, setPhoneType] = useState('Trabajo');
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState('Trabajo');
  const [team, setTeam] = useState([]);
  const [ownerId, setOwnerId] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/team').then((list) => { setTeam(list); if (list[0]) setOwnerId(list[0].id); }).catch(() => setTeam([]));
    api.get('/api/tags').then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    if (selectedCompany || !companyQuery.trim()) { setCompanyResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/companies?search=${encodeURIComponent(companyQuery.trim())}&limit=5`)
        .then((res) => setCompanyResults(res.data || []))
        .catch(() => setCompanyResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [companyQuery, selectedCompany]);

  const pickCompany = (c) => {
    setSelectedCompany(c);
    setCompanyQuery(c.name);
    setIndustry(c.industry || '');
    setCompanyResults([]);
  };

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const createTagFromInput = async () => {
    const name = tagInput.trim();
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) setSelectedTagIds((p) => [...p, existing.id]);
    } else {
      const created = await api.post('/api/tags', { name });
      setAllTags((p) => [...p, created]);
      setSelectedTagIds((p) => [...p, created.id]);
    }
    setTagInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    setError('');
    try {
      let companyId = selectedCompany?.id || null;
      if (companyId) {
        if (industry !== (selectedCompany.industry || '')) {
          await api.patch(`/api/companies/${companyId}`, { industry: industry || null });
        }
      } else if (companyQuery.trim()) {
        const created = await api.post('/api/companies', { name: companyQuery.trim(), industry: industry || null });
        companyId = created.id;
      }

      const contact = await api.post('/api/contacts', {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone: phone || null,
        email: email || null,
        company_id: companyId,
        owner_id: ownerId || null,
        country: country || null,
        position: position || null,
      });

      for (const tagId of selectedTagIds) {
        await api.post(`/api/tags/${tagId}/attach`, { entity_type: 'contact', entity_id: contact.id });
      }

      onCreated();
    } catch (err) {
      setError(err.message || 'No se pudo crear el contacto.');
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-brand-panel border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-headline text-lg font-semibold">Añadir persona</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {error && <div className="md:col-span-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input autoFocus required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>

            <div className="relative">
              <label className={labelClass}>Organización</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  value={companyQuery}
                  onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }}
                  className={`${inputClass} pl-9`}
                  placeholder="Buscar o crear empresa..."
                />
              </div>
              {companyResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden">
                  {companyResults.map((c) => (
                    <button type="button" key={c.id} onClick={() => pickCompany(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Teléfono</label>
              <div className="flex gap-2">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} flex-1 font-tech`} placeholder="+57 300 000 0000" />
                <select value={phoneType} onChange={(e) => setPhoneType(e.target.value)} className="px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs">
                  {PHONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Correo electrónico</label>
              <div className="flex gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} flex-1`} placeholder="nombre@empresa.com" />
                <select value={emailType} onChange={(e) => setEmailType(e.target.value)} className="px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs">
                  {EMAIL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Cargo</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass}>
                <option value="">Sin especificar</option>
                {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Industria</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputClass}>
                <option value="">Sin especificar</option>
                {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>País</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                <option value="">Sin especificar</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Propietario</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
                {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}{m.id === ownerId ? ' (Tú)' : ''}</option>)}
              </select>
            </div>

            <div className="relative">
              <label className={labelClass}>Etiquetas</label>
              <div onClick={() => setTagMenuOpen(true)} className={`${inputClass} min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text`}>
                {selectedTagIds.map((id) => {
                  const t = allTags.find((tg) => tg.id === id);
                  if (!t) return null;
                  return (
                    <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-ice text-xs">
                      {t.name}
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleTag(id); }} className="hover:text-white">×</button>
                    </span>
                  );
                })}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onFocus={() => setTagMenuOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createTagFromInput(); } }}
                  placeholder={selectedTagIds.length ? '' : 'Añadir etiquetas'}
                  className="flex-1 min-w-[80px] bg-transparent focus:outline-none text-sm"
                />
              </div>
              {tagMenuOpen && (
                <div className="absolute z-10 mt-1 w-full bg-brand-bg border border-brand-border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                  {allTags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase())).map((t) => (
                    <button type="button" key={t.id} onClick={() => toggleTag(t.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-panel transition flex items-center justify-between">
                      {t.name}
                      {selectedTagIds.includes(t.id) && <span className="text-brand-violet">✓</span>}
                    </button>
                  ))}
                  {tagInput.trim() && !allTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                    <button type="button" onClick={createTagFromInput} className="w-full text-left px-3 py-2 text-sm text-brand-ice hover:bg-brand-panel transition flex items-center gap-1.5">
                      <Plus size={13} /> Crear etiqueta "{tagInput.trim()}"
                    </button>
                  )}
                  <button type="button" onClick={() => setTagMenuOpen(false)} className="w-full text-center px-3 py-1.5 text-xs text-brand-muted hover:bg-brand-panel border-t border-brand-border">
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-brand-border flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
          <button onClick={submit} disabled={saving || !firstName.trim()} className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
