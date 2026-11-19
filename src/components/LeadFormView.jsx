import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Formulario de captura con la marca de cada formulario (logo, colores, textos). Lo usan la página
// pública y la vista previa del CRM, así lo que ves al armarlo es exactamente lo que ve el cliente.

export const DEFAULT_THEME = {
  primary: '#8500FF', secondary: '#E000FF', accent: '#D9F6FF', background: '#080712', card: '#100E1C',
};

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '255,255,255';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

export function themeOf(settings) {
  return { ...DEFAULT_THEME, ...(settings?.theme || {}) };
}

const isFilled = (v) => v != null && String(v).trim() !== '';

export default function LeadFormView({ form, onSubmit, preview = false }) {
  const s = form.settings || {};
  const t = themeOf(s);
  const L = s.labels || {};
  const req = s.required || {};
  const fields = form.custom_fields || [];
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '', message: '', website: '' });
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (preview) return undefined;
    const prev = document.title;
    document.title = s.title || form.name || 'Formulario';
    return () => { document.title = prev; };
  }, [preview, s.title, form.name]);

  const rgbP = hexToRgb(t.primary); const rgbS = hexToRgb(t.secondary); const rgbA = hexToRgb(t.accent);
  const cssVars = {
    '--lf-p': t.primary, '--lf-s': t.secondary, '--lf-a': t.accent, '--lf-bg': t.background, '--lf-card': t.card,
    '--lf-p-rgb': rgbP, '--lf-s-rgb': rgbS, '--lf-a-rgb': rgbA,
  };

  const base = [
    { key: 'name', label: L.name || 'Nombre', required: true, type: 'text', autoComplete: 'name' },
    { key: 'email', label: L.email || 'Correo', required: !!req.email, type: 'email', autoComplete: 'email' },
    { key: 'phone', label: L.phone || 'Teléfono', required: !!req.phone, type: 'tel', autoComplete: 'tel' },
    { key: 'company', label: L.company || 'Empresa', required: !!req.company, type: 'text', autoComplete: 'organization' },
  ];

  const missing = () => {
    const out = base.filter((b) => b.required && !isFilled(values[b.key])).map((b) => b.label);
    for (const f of fields) if (f.required && !isFilled(answers[f.id])) out.push(f.label);
    return out;
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true); setError('');
    const m = missing();
    if (m.length) { setError(m.length === 1 ? `Falta: ${m[0]}` : `Faltan ${m.length} respuestas obligatorias.`); return; }
    if (preview) { setError('Vista previa: no se envía nada de verdad.'); return; }
    setSending(true);
    try {
      await onSubmit({ ...values, custom_answers: answers });
      setSent(true);
      document.querySelector('.lf-root')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setError(err.message || 'No se pudo enviar el formulario.');
    } finally {
      setSending(false);
    }
  };

  const invalid = (filled, required) => touched && required && !filled;
  const inputCls = (bad) => `lf-input w-full px-4 py-3 rounded-xl text-[15px] transition ${bad ? 'lf-bad' : ''}`;
  let n = 0;
  const num = () => { n += 1; return <span className="lf-num">{n}.</span>; };

  return (
    <div className="lf-root" style={cssVars}>
      <style>{CSS}</style>
      <div className="lf-wrap">
        <header className="lf-head">
          {t.logo_url ? <img src={t.logo_url} alt={t.brand_name || ''} className="lf-logo" /> : t.brand_name ? <div className="lf-brand">{t.brand_name}</div> : null}
        </header>

        {sent ? (
          <div className="lf-card lf-done" role="status">
            <div className="lf-done-icon"><CheckCircle2 size={30} /></div>
            <h1 className="lf-title">¡Gracias{values.name ? `, ${values.name.split(' ')[0]}` : ''}!</h1>
            <p className="lf-desc">{s.thank_you || 'Recibimos tu información y te vamos a contactar pronto.'}</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="lf-card">
            <h1 className="lf-title">{s.title || form.name}</h1>
            {s.description && <p className="lf-desc">{s.description}</p>}
            <div className="lf-rule" />

            {/* Campo trampa: las personas no lo ven; los robots lo llenan y el servidor descarta el envío. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} />
            </div>

            <div className="lf-qs">
              {base.map((b) => (
                <div key={b.key} className="lf-q">
                  <label htmlFor={`lf-${b.key}`} className="lf-label">{num()}<span>{b.label}{b.required && <span className="lf-req" aria-hidden="true">*</span>}</span></label>
                  <input
                    id={`lf-${b.key}`} type={b.type} autoComplete={b.autoComplete} required={b.required} aria-required={b.required}
                    className={inputCls(invalid(isFilled(values[b.key]), b.required))}
                    value={values[b.key]} onChange={(e) => setValues({ ...values, [b.key]: e.target.value })}
                  />
                </div>
              ))}

              {fields.map((f) => {
                const v = answers[f.id] ?? '';
                const set = (val) => setAnswers({ ...answers, [f.id]: val });
                const bad = invalid(isFilled(v), f.required);
                const choices = f.field_type === 'boolean' ? ['Sí', 'No'] : f.field_type === 'select' && (f.options || []).length <= 5 ? f.options : null;
                return (
                  <div key={f.id} className="lf-q">
                    <label htmlFor={`lf-${f.id}`} className="lf-label" id={`lf-l-${f.id}`}>{num()}<span>{f.label}{f.required && <span className="lf-req" aria-hidden="true">*</span>}</span></label>
                    {f.hint && <p className="lf-hint">{f.hint}</p>}
                    {choices ? (
                      <div role="radiogroup" aria-labelledby={`lf-l-${f.id}`} className={`lf-choices ${bad ? 'lf-bad-group' : ''}`}>
                        {choices.map((o) => (
                          <button key={o} type="button" role="radio" aria-checked={v === o} onClick={() => set(v === o ? '' : o)} className={`lf-choice ${v === o ? 'on' : ''}`}>
                            <span className="lf-dot" />{o}
                          </button>
                        ))}
                      </div>
                    ) : f.field_type === 'select' ? (
                      <select id={`lf-${f.id}`} className={inputCls(bad)} style={{ colorScheme: 'dark' }} value={v} onChange={(e) => set(e.target.value)}>
                        <option value="">Elige…</option>
                        {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.long ? (
                      <textarea id={`lf-${f.id}`} rows={3} className={`${inputCls(bad)} lf-area`} value={v} onChange={(e) => set(e.target.value)} />
                    ) : (
                      <input
                        id={`lf-${f.id}`} className={inputCls(bad)} value={v} onChange={(e) => set(e.target.value)}
                        type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'} inputMode={f.field_type === 'number' ? 'numeric' : undefined} min={f.field_type === 'number' ? 0 : undefined}
                      />
                    )}
                  </div>
                );
              })}

              {!s.hide_message && (
                <div className="lf-q">
                  <label htmlFor="lf-message" className="lf-label">{num()}{L.message || 'Mensaje (opcional)'}</label>
                  <textarea id="lf-message" rows={3} className={`${inputCls(false)} lf-area`} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
                </div>
              )}
            </div>

            {error && <div role="alert" className="lf-error">{error}</div>}

            <button type="submit" disabled={sending} className="lf-submit">
              {sending && <Loader2 size={16} className="animate-spin" />}
              {sending ? 'Enviando…' : (s.submit_label || 'Enviar')}
            </button>
          </form>
        )}
        {t.brand_name && <p className="lf-foot">{t.brand_name}</p>}
      </div>
    </div>
  );
}

const CSS = `
.lf-root{min-height:100%;background:var(--lf-bg);color:#FBFAFF;font-family:Manrope,system-ui,sans-serif;position:relative;overflow:hidden}
.lf-root::before{content:"";position:absolute;inset:-20% -10% auto -10%;height:520px;background:radial-gradient(ellipse at 30% 0%,rgba(var(--lf-p-rgb),.28),transparent 60%),radial-gradient(ellipse at 85% 10%,rgba(var(--lf-s-rgb),.18),transparent 55%);pointer-events:none}
.lf-wrap{position:relative;max-width:620px;margin:0 auto;padding:40px 16px 56px}
.lf-head{display:flex;justify-content:center;margin-bottom:28px;min-height:8px}
.lf-logo{height:40px;width:auto;max-width:220px;object-fit:contain}
.lf-brand{font-family:Sora,sans-serif;font-weight:700;font-size:20px;background:linear-gradient(90deg,#fff,var(--lf-s));-webkit-background-clip:text;background-clip:text;color:transparent}
.lf-card{position:relative;background:var(--lf-card);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:32px 28px;box-shadow:0 30px 80px -30px rgba(var(--lf-p-rgb),.45),inset 0 1px 0 rgba(255,255,255,.04)}
@media (max-width:480px){.lf-card{padding:24px 18px;border-radius:20px}.lf-wrap{padding-top:28px}}
.lf-title{font-family:Sora,sans-serif;font-weight:700;font-size:clamp(22px,4.6vw,28px);line-height:1.2;letter-spacing:-.01em;background:linear-gradient(90deg,#fff 30%,var(--lf-s));-webkit-background-clip:text;background-clip:text;color:transparent;margin:0}
.lf-desc{color:rgba(251,250,255,.68);font-size:15px;line-height:1.55;margin:10px 0 0}
.lf-rule{height:2px;border-radius:2px;margin:22px 0 26px;background:linear-gradient(90deg,var(--lf-p),var(--lf-s),transparent)}
.lf-qs{display:flex;flex-direction:column;gap:22px}
.lf-label{display:flex;gap:8px;font-weight:600;font-size:15px;line-height:1.4;color:#FBFAFF;margin-bottom:8px}
.lf-num{font-family:'Space Mono',monospace;font-size:12px;color:var(--lf-a);opacity:.85;padding-top:3px;min-width:18px}
.lf-req{color:var(--lf-s);margin-left:4px}
.lf-hint{color:rgba(251,250,255,.5);font-size:13px;line-height:1.45;margin:-2px 0 10px 26px}
.lf-input{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);color:#FBFAFF;outline:none}
.lf-input::placeholder{color:rgba(251,250,255,.35)}
.lf-input:hover{border-color:rgba(255,255,255,.18)}
.lf-input:focus{border-color:var(--lf-s);box-shadow:0 0 0 3px rgba(var(--lf-s-rgb),.22)}
.lf-area{resize:vertical;min-height:88px;line-height:1.5}
.lf-bad,.lf-bad-group .lf-choice{border-color:rgba(248,113,113,.7)!important}
.lf-choices{display:flex;gap:10px;flex-wrap:wrap}
.lf-choice{display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#FBFAFF;font-size:15px;font-weight:600;cursor:pointer;transition:all .15s}
.lf-choice:hover{border-color:rgba(var(--lf-s-rgb),.6)}
.lf-choice:focus-visible{outline:2px solid var(--lf-a);outline-offset:2px}
.lf-dot{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.35);transition:all .15s}
.lf-choice.on{border-color:transparent;background:linear-gradient(90deg,rgba(var(--lf-p-rgb),.35),rgba(var(--lf-s-rgb),.35));box-shadow:0 0 0 1px var(--lf-s) inset}
.lf-choice.on .lf-dot{border-color:var(--lf-a);background:radial-gradient(circle,var(--lf-a) 40%,transparent 45%)}
.lf-error{margin-top:20px;padding:12px 14px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#FCA5A5;font-size:14px}
.lf-submit{margin-top:28px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border:0;border-radius:14px;color:#fff;font-family:Sora,sans-serif;font-weight:600;font-size:16px;cursor:pointer;background:linear-gradient(90deg,var(--lf-p),var(--lf-s));box-shadow:0 12px 30px -10px rgba(var(--lf-s-rgb),.7);transition:transform .15s,box-shadow .15s,opacity .15s}
.lf-submit:hover{transform:translateY(-1px);box-shadow:0 16px 36px -10px rgba(var(--lf-s-rgb),.85)}
.lf-submit:focus-visible{outline:2px solid var(--lf-a);outline-offset:3px}
.lf-submit:disabled{opacity:.6;cursor:default;transform:none}
.lf-done{text-align:center;padding:44px 28px}
.lf-done .lf-title{display:inline-block}
.lf-done-icon{width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,var(--lf-p),var(--lf-s));box-shadow:0 12px 30px -8px rgba(var(--lf-s-rgb),.7)}
.lf-foot{text-align:center;margin-top:22px;font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(var(--lf-a-rgb),.45)}
@media (prefers-reduced-motion:reduce){.lf-submit,.lf-choice,.lf-dot{transition:none}}
`;
