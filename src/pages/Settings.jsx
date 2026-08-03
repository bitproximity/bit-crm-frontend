import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Settings() {
  const [gmail, setGmail] = useState(null);
  const [params] = useSearchParams();
  const gmailFlag = params.get('gmail');

  const load = () => api.get('/api/gmail/status').then(setGmail).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    const { url } = await api.get('/api/gmail/connect');
    window.location.href = url;
  };

  const disconnect = async () => {
    await api.delete('/api/gmail/disconnect');
    load();
  };

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Configuración</h1>

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

      <div className="bg-brand-panel border border-brand-border rounded-xl p-5 max-w-md">
        <div className="font-manrope font-medium mb-1">Gmail</div>
        <p className="text-brand-muted text-sm mb-4">
          Conecta tu cuenta para ver y sincronizar el historial de correos con
          cada contacto directamente desde su ficha.
        </p>

        {gmail === null ? (
          <div className="text-brand-muted text-sm">Cargando...</div>
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
            Conectar Gmail
          </button>
        )}
      </div>
    </div>
  );
}
