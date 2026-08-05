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

  const handleGoogle = async () => {
    setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-8">
        <img src="/brand/logo.png" alt="Bit Proximity" className="h-7 mb-6" />
        <h1 className="font-headline text-xl font-semibold mb-1">Bit CRM</h1>

        {mode === 'login' && (
          <>
            <p className="text-brand-muted text-sm mb-6">Ingresa con tu cuenta de equipo</p>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full mb-4 py-2 rounded-lg border border-brand-border bg-brand-bg hover:border-brand-violet transition flex items-center justify-center gap-2 text-sm font-manrope"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.6 0-14.1 4.3-17.4 10.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14-5.4l-6.5-5.3c-2 1.5-4.6 2.4-7.5 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5c3.3 6.6 9.9 11.4 17.8 11.4z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.3C40.5 36.2 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
              Ingresar con Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-brand-border" />
              <span className="text-xs text-brand-muted">o</span>
              <div className="flex-1 h-px bg-brand-border" />
            </div>

            <form onSubmit={handleSubmit}>
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
              <form onSubmit={handleReset}>
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
