import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://bit-crm-backend-production.up.railway.app';

export default function PublicLeadForm() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '', message: '' });
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
        body: JSON.stringify(values),
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

  if (notFound) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={{ color: '#8B87A3' }}>Este formulario no existe o ya no está disponible.</p>
        </div>
      </div>
    );
  }
  if (!form) return <div style={styles.wrap} />;
  if (!form.active) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={{ color: '#8B87A3' }}>Este formulario ya no está activo.</p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>¡Gracias!</h1>
          <p style={{ color: '#8B87A3', marginTop: 8 }}>Recibimos tu información y te vamos a contactar pronto.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{form.name}</h1>
        {error && <div style={styles.error}>{error}</div>}
        <input style={styles.input} placeholder="Nombre*" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        <input style={styles.input} type="email" placeholder="Correo electrónico" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <input style={styles.input} placeholder="Teléfono" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
        <input style={styles.input} placeholder="Empresa" value={values.company} onChange={(e) => setValues({ ...values, company: e.target.value })} />
        <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }} placeholder="Mensaje (opcional)" value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
        <button type="submit" disabled={sending} style={styles.button}>{sending ? 'Enviando...' : 'Enviar'}</button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', background: '#080712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Manrope, sans-serif' },
  card: { width: '100%', maxWidth: 420, background: '#100E1C', border: '1px solid #211D34', borderRadius: 16, padding: 28 },
  title: { color: '#FBFAFF', fontSize: 20, fontWeight: 600, marginBottom: 16, fontFamily: 'Sora, sans-serif' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: '#080712', border: '1px solid #211D34', color: '#FBFAFF', fontSize: 14, fontFamily: 'inherit' },
  button: { width: '100%', padding: '11px 14px', borderRadius: 8, background: 'linear-gradient(90deg, #8500FF 0%, #E000FF 100%)', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
};
