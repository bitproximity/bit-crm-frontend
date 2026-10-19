import { SkeletonLine } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colorForName, initials } from '../lib/avatar';
import { ShieldCheck, Eye, EyeOff, Mail, CalendarClock, Bell, CheckCircle2, Circle, Plus, Unplug, CalendarDays, KeyRound, Link2 } from 'lucide-react';

const ROLE_LABEL = { admin: 'Administrador', operaciones: 'Operaciones', outbound: 'Ventas outbound', wifi_partner: 'Socio WiFi', ventas: 'Ventas' };

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score += 1;
  const levels = [
    { label: 'Muy corta', color: '#EF4444' },
    { label: 'Débil', color: '#EF4444' },
    { label: 'Aceptable', color: '#F59E0B' },
    { label: 'Buena', color: '#22C55E' },
    { label: 'Excelente', color: '#22C55E' },
  ];
  return { score, ...levels[score] };
}

function Card({ icon: Icon, title, subtitle, status, children }) {
  return (
    <section className="bg-brand-panel border border-brand-border rounded-2xl p-5 panel-depth">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-violet/15 flex items-center justify-center flex-shrink-0"><Icon size={17} className="text-brand-ice" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-manrope font-semibold">{title}</h2>
          {subtitle && <p className="text-brand-muted text-xs mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
        {status}
      </div>
      {children}
    </section>
  );
}

const Pill = ({ ok, children }) => (
  <span className={`text-[10px] font-tech uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${ok ? 'bg-green-500/15 text-green-300' : 'bg-brand-muted/15 text-brand-muted'}`}>{children}</span>
);

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-sm placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition';

export default function Profile() {
  const { profile } = useAuth();
  const [gmail, setGmail] = useState(null);
  const [calcom, setCalcom] = useState(null);
  const [calcomKey, setCalcomKey] = useState('');
  const [calcomError, setCalcomError] = useState('');
  const [params] = useSearchParams();
  const gmailFlag = params.get('gmail');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const load = () => api.get('/api/gmail/status').then(setGmail).catch(console.error);
  const loadCalcom = () => api.get('/api/calcom/status').then(setCalcom).catch(console.error);

  useEffect(() => {
    load();
    loadCalcom();
  }, []);

  const connectCalcom = async (e) => {
    e.preventDefault();
    setCalcomError('');
    try {
      await api.post('/api/calcom/connect', { api_key: calcomKey });
      setCalcomKey('');
      loadCalcom();
    } catch (err) {
      setCalcomError(err.message || 'No se pudo conectar');
    }
  };

  const disconnectCalcom = async () => {
    await api.delete('/api/calcom/disconnect');
    loadCalcom();
  };

  const connect = async () => {
    const { url } = await api.get('/api/gmail/connect');
    window.location.href = url;
  };

  const disconnect = async (email) => {
    await api.delete(`/api/gmail/disconnect/${encodeURIComponent(email)}`);
    load();
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden');
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      console.error('Error updateUser:', error);
      if (error.message?.includes('same') || error.message?.includes('different')) {
        setPwError('La nueva contraseña debe ser distinta a la actual.');
      } else if (error.status === 422 || error.message?.includes('weak')) {
        setPwError('La contraseña es muy débil. Usa al menos 6 caracteres con letras y números.');
      } else {
        setPwError(`No se pudo actualizar: ${error.message}`);
      }
    } else {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const name = profile?.full_name || profile?.email || 'Mi perfil';
  const accent = colorForName(name);
  const strength = passwordStrength(newPassword);
  const match = confirmPassword !== '' && newPassword === confirmPassword;
  const connections = gmail?.connections || [];

  return (
    <div className="max-w-5xl">
      <div className="relative bg-brand-panel border border-brand-border rounded-2xl overflow-hidden panel-depth mb-5">
        <div className="h-20" style={{ background: `linear-gradient(120deg, ${accent}55, #8500FF33 55%, #E000FF22)` }} />
        <div className="px-5 pb-5 -mt-9 flex items-start gap-4 flex-wrap">
          <div
            className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center font-headline text-2xl font-semibold text-white border-4 border-brand-panel"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
          >
            {initials(name)}
          </div>
          <div className="min-w-0 pt-11">
            <h1 className="font-headline text-xl font-semibold truncate">{profile?.full_name || 'Mi Perfil'}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-brand-muted flex-wrap">
              {profile?.email && <span className="font-tech">{profile.email}</span>}
              {profile?.role && <span className="px-2 py-0.5 rounded-full bg-brand-violet/15 text-brand-ice font-tech">{ROLE_LABEL[profile.role] || profile.role}</span>}
            </div>
          </div>
        </div>
      </div>

      {gmailFlag === 'connected' && (
        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-300">Google conectado correctamente.</div>
      )}
      {gmailFlag === 'error' && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">Hubo un error conectando Google. Intenta de nuevo.</div>
      )}
      {gmailFlag === 'taken' && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
          La cuenta de Google <strong>{params.get('email')}</strong> pertenece a otra persona del equipo y no se puede conectar en tu perfil.
          Cierra esa sesión de Google en el navegador (o usa una ventana de incógnito) y conecta tu propia cuenta.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card
            icon={Mail}
            title="Gmail + Google Calendar"
            subtitle="Conecta tus cuentas de Google para trabajar el correo y el calendario desde el CRM."
            status={<Pill ok={connections.length > 0}>{connections.length > 0 ? `${connections.length} conectada${connections.length > 1 ? 's' : ''}` : 'Sin conectar'}</Pill>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {[
                [Mail, 'Correos con cada contacto'],
                [CalendarClock, 'Tus próximos eventos'],
                [Bell, 'Tareas con fecha en tu calendario, con recordatorio'],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-start gap-2 rounded-xl bg-brand-bg/60 border border-brand-border/70 px-3 py-2.5">
                  <Icon size={14} className="text-brand-ice mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] text-brand-muted leading-snug">{text}</span>
                </div>
              ))}
            </div>

            {gmail === null ? (
              <SkeletonLine className="w-32" />
            ) : (
              <div className="space-y-2 mb-4">
                {connections.map((c, i) => (
                  <div key={c.email} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-brand-bg border border-brand-border">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#4285F4] font-bold text-sm flex-shrink-0">G</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-brand-ice font-tech truncate">{c.email}</div>
                      <div className="text-[11px] text-brand-muted">{i === 0 ? 'Sincroniza tu Google Calendar' : 'Se revisa al buscar correos'}</div>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-brand-violet/15 text-brand-ice font-tech uppercase" title="Se usa para Google Calendar (tareas/actividades) — con varias cuentas, solo la principal sincroniza el calendario.">
                        principal
                      </span>
                    )}
                    <button onClick={() => disconnect(c.email)} className="flex items-center gap-1 text-xs text-brand-muted hover:text-red-400 transition">
                      <Unplug size={13} /> Desconectar
                    </button>
                  </div>
                ))}
                {connections.length === 0 && (
                  <div className="text-center text-xs text-brand-muted py-5 border border-dashed border-brand-border rounded-xl">Aún no hay una cuenta de Google conectada.</div>
                )}
              </div>
            )}

            <button onClick={connect} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition rounded-xl text-sm font-medium">
              <Plus size={15} /> {connections.length ? 'Conectar otra cuenta' : 'Conectar Google'}
            </button>
            <p className="text-[11px] text-brand-muted mt-3 leading-relaxed">
              Puedes conectar más de una cuenta (por ejemplo la de Bit Proximity y la de Bit WiFi). Al buscar correos con un contacto se revisan todas; el calendario solo se sincroniza con la principal.
            </p>
          </Card>

          <Card
            icon={CalendarDays}
            title="Cal.com"
            subtitle="Ve en el CRM las reuniones que te agendan por Cal.com."
            status={calcom === null ? null : <Pill ok={calcom.connected}>{calcom.connected ? 'Conectado' : 'Sin conectar'}</Pill>}
          >
            {calcom === null ? (
              <SkeletonLine className="w-32" />
            ) : calcom.connected ? (
              <button onClick={disconnectCalcom} className="flex items-center gap-1.5 px-4 py-2.5 border border-brand-border rounded-xl text-sm hover:border-red-500 hover:text-red-400 transition">
                <Unplug size={14} /> Desconectar
              </button>
            ) : (
              <>
                <form onSubmit={connectCalcom} className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input type="password" placeholder="cal_live_..." value={calcomKey} onChange={(e) => setCalcomKey(e.target.value)} required className={`${inputCls} pl-10 font-tech`} />
                  </div>
                  <button className="px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-xl text-sm font-medium whitespace-nowrap hover:opacity-90 transition">Conectar</button>
                </form>
                <p className="text-[11px] text-brand-muted mt-2.5 flex items-center gap-1.5"><Link2 size={11} /> Saca tu API key en Cal.com → Settings → Developer → API Keys.</p>
              </>
            )}
            {calcomError && <p className="text-red-400 text-xs mt-2">{calcomError}</p>}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card icon={ShieldCheck} title="Seguridad" subtitle="Define una contraseña nueva para tu cuenta.">
            <form onSubmit={changePassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pr-11`}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-white transition">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {newPassword && (
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="h-1 flex-1 rounded-full transition-colors" style={{ background: n <= strength.score ? strength.color : '#211D34' }} />
                    ))}
                  </div>
                  <div className="text-[11px] mt-1.5" style={{ color: strength.color }}>{strength.label}</div>
                </div>
              )}

              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Confirmar contraseña"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
              />

              <ul className="space-y-1.5 text-[11px] text-brand-muted pt-1">
                {[
                  [newPassword.length >= 6, 'Al menos 6 caracteres'],
                  [/[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword), 'Mezcla letras y números'],
                  [match, 'Las dos contraseñas coinciden'],
                ].map(([ok, text]) => (
                  <li key={text} className={`flex items-center gap-1.5 ${ok ? 'text-green-300' : ''}`}>
                    {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />} {text}
                  </li>
                ))}
              </ul>

              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              {pwSuccess && <p className="text-green-300 text-sm flex items-center gap-1.5"><CheckCircle2 size={14} /> Contraseña actualizada.</p>}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition"
              >
                {pwLoading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
