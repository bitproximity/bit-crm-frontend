import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FolderKanban, Calendar } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(console.error);
  }, []);

  const statusColor = {
    activo: 'bg-green-500/15 text-green-300',
    pausado: 'bg-yellow-500/15 text-yellow-300',
    completado: 'bg-blue-500/15 text-blue-300',
    archivado: 'bg-brand-border text-brand-muted',
  };

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-1">Proyectos</h1>
      <p className="text-brand-muted text-sm mb-6">{projects.length} proyectos</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link
            to={`/projects/${p.id}`}
            key={p.id}
            className="bg-brand-panel border border-brand-border rounded-xl p-4 hover:border-brand-violet/40 hover:shadow-lg hover:shadow-brand-violet/5 transition block"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-violet to-brand-magenta flex items-center justify-center flex-shrink-0">
                <FolderKanban size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-manrope font-medium truncate">{p.name}</div>
                <div className="text-xs text-brand-muted truncate">{p.companies?.name || p.type}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-tech flex-shrink-0 ${statusColor[p.status]}`}>
                {p.status}
              </span>
            </div>

            <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta rounded-full transition-all"
                style={{ width: `${p.progress_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-brand-muted font-tech">
              <span>{p.progress_pct}% completado</span>
              <span>{p.total_tasks} tareas</span>
            </div>

            {p.due_date && (
              <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-3">
                <Calendar size={12} /> Vence: {new Date(p.due_date).toLocaleDateString()}
              </div>
            )}
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-3 text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
            Sin proyectos aún — se crean automáticamente al ganar un deal con plantilla de onboarding.
          </div>
        )}
      </div>
    </div>
  );
}
