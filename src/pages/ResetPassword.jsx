import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado — solicita uno nuevo.');
    } else {
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-8 shadow-2xl shadow-brand-violet/10">
        <img src="/brand/logo.png" alt="Bit Proximity" className="h-7 mb-6" />
        <h1 className="font-headline text-xl font-semibold mb-1">Nueva contraseña</h1>
        <p className="text-brand-muted text-sm mb-6">Elige una contraseña nueva para tu cuenta.</p>

        {done ? (
          <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            Contraseña actualizada. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-brand-muted mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
            />
            <label className="block text-sm text-brand-muted mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full mb-4 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border focus:outline-none focus:border-brand-violet text-brand-white"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 transition font-manrope font-semibold disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
