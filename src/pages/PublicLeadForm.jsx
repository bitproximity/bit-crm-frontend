import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import LeadFormView, { DEFAULT_THEME } from '../components/LeadFormView';

const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

// Fuera del componente: si se define adentro, React lo trata como un componente nuevo en cada
// tecla y el campo pierde el foco (antes pasaba en este mismo archivo).
function Shell({ children, bg = DEFAULT_THEME.background }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: bg, fontFamily: 'Manrope, sans-serif' }}>
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}

export default function PublicLeadForm() {
  const { id: rawId, slug } = useParams();
  const id = encodeURIComponent(rawId || slug || '');
  // ?t=… = link personalizado de un trato: el formulario llega con los datos del cliente y la respuesta va a ese trato.
  const token = new URLSearchParams(useLocation().search).get('t') || '';
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/lead-forms/${id}${token ? `?t=${encodeURIComponent(token)}` : ''}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setForm)
      .catch(() => setNotFound(true));
  }, [id, token]);

  const submit = async (payload) => {
    const r = await fetch(`${API_URL}/api/public/lead-forms/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token ? { ...payload, t: token } : payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo enviar el formulario.');
  };

  if (notFound) {
    return <Shell><div className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-8 text-center text-[#8B87A3] text-sm">Este formulario no existe o ya no está disponible.</div></Shell>;
  }
  if (!form) {
    return <Shell><div className="flex justify-center py-12"><Loader2 size={22} className="text-[#8B87A3] animate-spin" /></div></Shell>;
  }
  if (!form.active) {
    return <Shell bg={form.settings?.theme?.background}><div className="bg-[#100E1C] border border-[#211D34] rounded-2xl p-8 text-center text-[#8B87A3] text-sm">Este formulario ya no está activo.</div></Shell>;
  }
  return <div className="min-h-screen" style={{ background: form.settings?.theme?.background || DEFAULT_THEME.background }}><LeadFormView form={form} onSubmit={submit} /></div>;
}
