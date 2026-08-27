import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useConfirm } from './ConfirmModal';
import { X } from 'lucide-react';
import DateTimePicker from './DateTimePicker';

const STATUS_OPTIONS = [
  { key: 'contactado', label: 'Contactado' },
  { key: 'reunion_agendada', label: 'Reunión agendada' },
  { key: 'reunion_realizada', label: 'Reunión realizada' },
  { key: 'no_interesado', label: 'No interesado' },
];

export const INDUSTRY_OPTIONS = ['Restaurantes', 'Retail', 'Salud', 'Banca', 'Centros Comerciales', 'Educación', 'Entretenimiento', 'Hotelería', 'Automotriz', 'Gas & Oil', 'Servicios', 'Aseguradoras', 'Food & Beverage', 'Agrícola'];

export const COUNTRY_OPTIONS = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
  'El Salvador', 'España', 'Estados Unidos', 'Guatemala', 'Honduras', 'México',
  'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
];

export const POSITION_OPTIONS = ['Gerente de Marketing', 'CEO', 'Gerente de IT', 'Trade Marketing', 'Gerente de Operaciones'];

export default function B2bRecordModal({ clientId, record, onClose, onSaved }) {
  const confirm = useConfirm();
  const [team, setTeam] = useState([]);
  useEffect(() => { api.get('/api/team').then(setTeam).catch(() => setTeam([])); }, []);
  const [form, setForm] = useState({
    target_company: record?.target_company || '',
    target_contact: record?.target_contact || '',
    target_position: record?.target_position || '',
    target_email: record?.target_email || '',
    target_phone: record?.target_phone || '',
    executive: record?.executive || '',
    industry: record?.industry || '',
    country: record?.country || '',
    city: record?.city || '',
    status: record?.status || 'contactado',
    meeting_date: record?.meeting_date ? new Date(record.meeting_date).toISOString() : '',
    realized_date: record?.realized_date ? new Date(record.realized_date).toISOString() : '',
    notes: record?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const knownNames = team.filter((m) => m.active !== false).map((m) => m.full_name);
  const isCustomExecutive = form.executive && !knownNames.includes(form.executive);
  const [executiveMode, setExecutiveMode] = useState(null); // null = auto (se decide al render), 'select' | 'custom' una vez que el usuario interactúa
  const isCustomPosition = form.target_position && !POSITION_OPTIONS.includes(form.target_position);
  const [positionMode, setPositionMode] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.target_company.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        meeting_date: form.meeting_date ? form.meeting_date.slice(0, 10) : null,
        realized_date: form.realized_date ? form.realized_date.slice(0, 10) : null,
      };
      if (record) {
        await api.patch(`/api/b2b/records/${record.id}`, payload);
      } else {
        await api.post('/api/b2b/records', { ...payload, client_company_id: clientId });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!record) return;
    const ok = await confirm({ title: 'Eliminar registro', message: `¿Eliminar "${record.target_company}"?`, confirmLabel: 'Eliminar' });
    if (!ok) return;
    await api.delete(`/api/b2b/records/${record.id}`);
    onSaved();
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm focus:outline-none focus:border-brand-violet';
  const labelClass = 'block text-xs text-brand-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <h2 className="font-headline text-lg font-semibold">{record ? 'Editar registro' : 'Agregar registro manual'}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-3">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

          <div>
            <label className={labelClass}>Empresa / marca contactada</label>
            <input autoFocus required value={form.target_company} onChange={set('target_company')} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contacto</label>
              <input value={form.target_contact} onChange={set('target_contact')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cargo</label>
              {(positionMode === 'custom' || (positionMode === null && isCustomPosition)) ? (
                <div className="flex gap-1.5">
                  <input value={form.target_position} onChange={set('target_position')} placeholder="Cargo" className={inputClass} />
                  <button type="button" onClick={() => { setPositionMode('select'); setForm({ ...form, target_position: '' }); }} className="text-xs text-brand-muted hover:text-brand-ice px-2 whitespace-nowrap">
                    Elegir de la lista
                  </button>
                </div>
              ) : (
                <select
                  value={form.target_position}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') { setPositionMode('custom'); setForm({ ...form, target_position: '' }); }
                    else { setPositionMode('select'); setForm({ ...form, target_position: e.target.value }); }
                  }}
                  className={inputClass}
                >
                  <option value="">Sin especificar</option>
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  <option value="__custom__">Otro (escribir cargo)</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Correo</label>
              <input type="email" value={form.target_email} onChange={set('target_email')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input value={form.target_phone} onChange={set('target_phone')} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={form.status}
                onChange={(e) => {
                  const status = e.target.value;
                  const shouldPrefillRealized = status === 'reunion_realizada' && !form.realized_date;
                  setForm({ ...form, status, realized_date: shouldPrefillRealized ? new Date().toISOString() : form.realized_date });
                }}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Responsable</label>
              {(executiveMode === 'custom' || (executiveMode === null && isCustomExecutive)) ? (
                <div className="flex gap-1.5">
                  <input value={form.executive} onChange={set('executive')} placeholder="Nombre" className={inputClass} />
                  {team.length > 0 && (
                    <button type="button" onClick={() => { setExecutiveMode('select'); setForm({ ...form, executive: '' }); }} className="text-xs text-brand-muted hover:text-brand-ice px-2 whitespace-nowrap">
                      Elegir del equipo
                    </button>
                  )}
                </div>
              ) : (
                <select
                  value={form.executive}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') { setExecutiveMode('custom'); setForm({ ...form, executive: '' }); }
                    else { setExecutiveMode('select'); setForm({ ...form, executive: e.target.value }); }
                  }}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {knownNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  <option value="__custom__">Otro (escribir nombre)</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Industria</label>
              <select value={form.industry} onChange={set('industry')} className={inputClass}>
                <option value="">Sin especificar</option>
                {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>País</label>
              <select value={form.country} onChange={set('country')} className={inputClass}>
                <option value="">Sin especificar</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input value={form.city} onChange={set('city')} placeholder="Ej. Bogotá, Ciudad de México..." className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha programada</label>
              <DateTimePicker value={form.meeting_date} onChange={(v) => setForm({ ...form, meeting_date: v })} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>Fecha realizada</label>
              <DateTimePicker value={form.realized_date} onChange={(v) => setForm({ ...form, realized_date: v })} className="w-full" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} className={inputClass} />
          </div>

          <div className="flex items-center justify-between pt-2">
            {record ? (
              <button type="button" onClick={remove} className="text-xs text-brand-muted hover:text-red-400">Eliminar</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-white transition">Cancelar</button>
              <button disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
