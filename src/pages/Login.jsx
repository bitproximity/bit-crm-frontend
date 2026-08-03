import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError('Email o contraseña incorrectos');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-8"
      >
        <img src="/brand/logo.png" alt="Bit Proximity" className="h-7 mb-6" />
        <h1 className="font-headline text-xl font-semibold mb-1">Bit CRM</h1>
        <p className="text-brand-muted text-sm mb-6">Ingresa con tu cuenta de equipo</p>

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
          className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition font-manrope font-semibold disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
