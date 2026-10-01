import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-[#080712] border border-[#211D34] text-[#FBFAFF] text-sm placeholder:text-[#5B5775] focus:border-[#8500FF] focus:outline-none transition';
const labelClass = 'block text-xs text-[#8B87A3] mb-1.5';

export default function PublicLeadForm() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [customAnswers, setCustomAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/public/lead-forms/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setForm)
      .catch(() => setNotFound(true));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!values.name.trim()) { setError('Por favor escribe tu nombre.'); return; }
    setSending(true);
    try {
      const r = await fetch(`${API_URL}/api/public/lead-forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, custom_answers: customAnswers }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo enviar el formulario.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-[#080712] flex items-center justify-center p-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );

  if (notFound) {
    return <Shell><div className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-8 text-center text-[#8B87A3] text-sm">Este formulario no existe o ya no está disponible.</div></Shell>;
  }
  if (!form) {
    return <Shell><div className="flex justify-center py-12"><Loader2 size={22} className="text-[#8B87A3] animate-spin" /></div></Shell>;
  }
  if (!form.active) {
    return <Shell><div className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-8 text-center text-[#8B87A3] text-sm">Este formulario ya no está activo.</div></Shell>;
  }
  if (sent) {
    return (
      <Shell>
        <div className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>¡Gracias!</h1>
          <p className="text-[#8B87A3] text-sm">Recibimos tu información y te vamos a contactar pronto.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-7 shadow-2xl">
        <h1 className="text-xl font-semibold text-white mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>{form.name}</h1>

        {error && <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input className={inputClass} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Correo</label>
              <input className={inputClass} type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input className={inputClass} value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Empresa</label>
            <input className={inputClass} value={values.company} onChange={(e) => setValues({ ...values, company: e.target.value })} />
          </div>

          {(form.custom_fields || []).length > 0 && (
            <div className="pt-1 border-t border-[#211D34] space-y-3.5" style={{ marginTop: 18, paddingTop: 18 }}>
              {form.custom_fields.map((f) => (
                <div key={f.id}>
                  <label className={labelClass}>{f.label}</label>
                  {f.field_type === 'select' ? (
                    <select
                      className={inputClass} style={{ colorScheme: 'dark' }}
                      value={customAnswers[f.id] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}
                    >
                      <option value="">Elige...</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.field_type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-sm text-white py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customAnswers[f.id] === 'Sí'}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.checked ? 'Sí' : 'No' })}
                        className="w-4 h-4 accent-[#8500FF]"
                      />
                      Sí
                    </label>
                  ) : (
                    <input
                      className={inputClass}
                      type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                      value={customAnswers[f.id] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={labelClass}>Mensaje (opcional)</label>
            <textarea className={`${inputClass} min-h-[80px] resize-y`} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
          </div>
        </div>

        <button
          type="submit" disabled={sending}
          className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#8500FF] to-[#E000FF] hover:opacity-90 transition text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending && <Loader2 size={14} className="animate-spin" />}
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </Shell>
  );
}
