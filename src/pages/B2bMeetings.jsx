import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Handshake, FolderPlus } from 'lucide-react';

export default function B2bMeetings() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/projects?is_b2b=true').then(setProjects).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-headline text-xl font-semibold">Reuniones B2B</h1>
      </div>
      <p className="text-brand-muted text-sm mb-6">
        Cada marca/cliente es un proyecto. Ahí adentro cargas su base de contactados, arrastras el estado de cada reunión, y generas el link para compartírselo.
      </p>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`)}
            className="flex items-center gap-3 bg-brand-panel border border-brand-border rounded-xl p-4 cursor-pointer hover:border-brand-violet/40 transition"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-violet/15 flex items-center justify-center flex-shrink-0">
              <Handshake size={16} className="text-brand-ice" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-xs text-brand-muted truncate">{p.companies?.name || 'Sin empresa vinculada'}</div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 border border-dashed border-brand-border rounded-xl">
          <FolderPlus size={24} className="text-brand-muted mx-auto mb-3" />
          <p className="text-brand-muted text-sm mb-1">Todavía no hay proyectos de Reuniones B2B.</p>
          <p className="text-brand-muted text-xs">
            Ve a <span className="text-brand-ice">Proyectos</span> → crea uno para la marca/cliente → dentro, importa su base de contactados. Aparecerá aquí automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
