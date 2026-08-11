import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError('Email o contraseña incorrectos');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError('No se pudo enviar el correo. Verifica el email.');
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 800px 600px at 50% 0%, rgba(133,0,255,0.15), transparent), radial-gradient(ellipse 600px 500px at 100% 100%, rgba(224,0,255,0.1), transparent)'
      }} />
      <div className="relative z-10 w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-8 shadow-2xl shadow-brand-violet/10 flex flex-col items-center text-center">
        <img src="/brand/logo.png" alt="Bit Proximity" className="h-7 mb-6" />
        <h1 className="font-headline text-xl font-semibold mb-1">Bit CRM</h1>

        {mode === 'login' && (
          <>
            <p className="text-brand-muted text-sm mb-6">Ingresa con tu cuenta de equipo</p>

            <form onSubmit={handleSubmit} className="w-full text-left">
              <label className="block text-sm text-brand-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
              />

              <label className="block text-sm text-brand-muted mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mb-2 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
              />

              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); }}
                className="text-xs text-brand-muted hover:text-brand-ice mb-4 block"
              >
                ¿Olvidaste tu contraseña?
              </button>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition font-manrope font-semibold disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </>
        )}

        {mode === 'reset' && (
          <>
            <p className="text-brand-muted text-sm mb-6">
              Te enviamos un enlace para restablecer tu contraseña.
            </p>

            {resetSent ? (
              <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                Revisa tu correo — te enviamos un enlace para crear una nueva contraseña.
              </div>
            ) : (
              <form onSubmit={handleReset} className="w-full text-left">
                <label className="block text-sm text-brand-muted mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
                />
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition font-manrope font-semibold disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
              className="text-xs text-brand-muted hover:text-brand-ice mt-4 block"
            >
              ← Volver al login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
