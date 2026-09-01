import { useState } from 'react';
import { Building2, MapPin, X, Loader2 } from 'lucide-react';
import { INDUSTRY_OPTIONS, COUNTRY_OPTIONS } from './B2bRecordModal';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-violet transition-colors';
const labelClass = 'block text-xs font-medium text-brand-muted mb-1.5';

function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function CreateCompanyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', industry: '', country: '', company_type: 'otro' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreated(form);
    } catch (err) {
      setError(err.message || 'No se pudo crear la empresa.');
      setSaving(false);
    }
  };

  const hasName = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 overlay-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl modal-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <h2 className="font-headline text-lg font-semibold">Nueva empresa</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Avatar con iniciales en vivo — el mismo gradiente que va a tener la tarjeta real */}
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-headline font-semibold text-lg transition-all duration-300 ${
                hasName ? 'bg-gradient-to-br from-brand-violet to-brand-magenta' : 'bg-brand-bg border border-dashed border-brand-border text-brand-muted'
              }`}
            >
              {hasName ? initials(form.name) : <Building2 size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <label className={labelClass}>Nombre de la empresa</label>
              <input
                autoFocus
                placeholder="Ej. Centro Cerámico"
                required
                value={form.name}
                onChange={set('name')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Industria</label>
              <select value={form.industry} onChange={set('industry')} className={inputClass}>
                <option value="">Sin especificar</option>
                {INDUSTRY_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>País</label>
              <select value={form.country} onChange={set('country')} className={inputClass}>
                <option value="">Sin especificar</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vista previa: exactamente la tarjeta que va a aparecer en la grilla al crearla */}
          <div>
            <label className={labelClass}>Así se va a ver</label>
            <div className="card-elevated rounded-xl p-4 pointer-events-none">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-manrope font-medium truncate">{hasName ? form.name : 'Nombre de la empresa'}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-tech bg-brand-violet/15 text-brand-ice">
                    {form.industry || 'Sin especificar'}
                  </span>
                </div>
              </div>
              {form.country && (
                <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-3">
                  <MapPin size={12} /> {form.country}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-muted hover:text-brand-white hover:border-brand-white/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasName || saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-opacity"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Creando...' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
