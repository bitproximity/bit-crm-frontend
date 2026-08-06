import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(console.error);
  }, []);

  const statusColor = {
    activo: 'bg-green-500/20 text-green-300',
    pausado: 'bg-yellow-500/20 text-yellow-300',
    completado: 'bg-blue-500/20 text-blue-300',
    archivado: 'bg-brand-border/60 text-brand-muted',
  };

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Proyectos</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link to={`/projects/${p.id}`} key={p.id} className="bg-brand-panel border border-brand-border rounded-xl p-4 hover:border-brand-violet transition block">
            <div className="flex justify-between items-start mb-2">
              <div className="font-manrope font-medium">{p.name}</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${statusColor[p.status]}`}>
                {p.status}
              </span>
            </div>
            <div className="text-xs text-brand-muted mb-3">{p.companies?.name || p.type}</div>

            <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta"
                style={{ width: `${p.progress_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-brand-muted font-tech">
              <span>{p.progress_pct}% completado</span>
              <span>{p.total_tasks} tareas</span>
            </div>

            {p.due_date && (
              <div className="text-xs text-brand-muted mt-2">
                Vence: {new Date(p.due_date).toLocaleDateString()}
              </div>
            )}
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="text-brand-muted text-sm">
            Sin proyectos aún — se crean automáticamente al ganar un deal con plantilla de onboarding.
          </div>
        )}
      </div>
    </div>
  );
}
