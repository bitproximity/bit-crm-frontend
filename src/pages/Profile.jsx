import { SkeletonLine } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const [gmail, setGmail] = useState(null);
  const [calcom, setCalcom] = useState(null);
  const [calcomKey, setCalcomKey] = useState('');
  const [calcomError, setCalcomError] = useState('');
  const [params] = useSearchParams();
  const gmailFlag = params.get('gmail');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const disconnect = async () => {
    await api.delete('/api/gmail/disconnect');
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

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Mi Perfil</h1>

      {gmailFlag === 'connected' && (
        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300">
          Gmail conectado correctamente.
        </div>
      )}
      {gmailFlag === 'error' && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          Hubo un error conectando Gmail. Intenta de nuevo.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="font-manrope font-medium mb-1">Cambiar contraseña</div>
          <p className="text-brand-muted text-sm mb-4">
            Define una contraseña nueva para tu cuenta.
          </p>
          <form onSubmit={changePassword}>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
            />
            {pwError && <p className="text-red-400 text-sm mb-3">{pwError}</p>}
            {pwSuccess && <p className="text-green-300 text-sm mb-3">Contraseña actualizada.</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {pwLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="font-manrope font-medium mb-1">Gmail + Google Calendar</div>
          <p className="text-brand-muted text-sm mb-4">
            Conecta tu cuenta de Google para sincronizar correos con cada contacto,
            ver tus próximos eventos, y que tus tareas con fecha límite se creen
            automáticamente en tu Google Calendar con recordatorio (30 min antes por
            notificación, 1 hora antes por correo).
          </p>

          {gmail === null ? (
            <SkeletonLine className="w-32" />
          ) : gmail.connected ? (
            <div>
              <div className="text-sm text-brand-ice font-tech mb-3">{gmail.email}</div>
              <button
                onClick={disconnect}
                className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-red-500 hover:text-red-400 transition"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium"
            >
              Conectar Google
            </button>
          )}
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth">
          <div className="font-manrope font-medium mb-1">Cal.com</div>
          <p className="text-brand-muted text-sm mb-4">
            Conecta tu cuenta de Cal.com para ver tus reuniones agendadas por ese medio.
            Sacá tu API key en Cal.com → Settings → Developer → API Keys.
          </p>

          {calcom === null ? (
            <SkeletonLine className="w-32" />
          ) : calcom.connected ? (
            <div>
              <div className="text-sm text-green-300 mb-3">Conectado</div>
              <button
                onClick={disconnectCalcom}
                className="px-4 py-2 border border-brand-border rounded-lg text-sm hover:border-red-500 hover:text-red-400 transition"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <form onSubmit={connectCalcom} className="flex gap-2">
              <input
                type="password"
                placeholder="cal_live_..."
                value={calcomKey}
                onChange={(e) => setCalcomKey(e.target.value)}
                required
                className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
              />
              <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium whitespace-nowrap">
                Conectar
              </button>
            </form>
          )}
          {calcomError && <p className="text-red-400 text-xs mt-2">{calcomError}</p>}
        </div>
      </div>
    </div>
  );
}
