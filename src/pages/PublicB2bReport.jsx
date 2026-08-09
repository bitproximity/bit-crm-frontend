import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Users, TrendingUp, Percent, CalendarCheck } from 'lucide-react';

export default function PublicB2bReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/public/b2b/${token}`).then(setReport).catch((err) => setError(err.message));
  }, [token]);

  const COLORS = ['#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444'];

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-headline text-lg mb-2">Link no disponible</p>
          <p className="text-brand-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return <div className="min-h-screen bg-brand-bg text-brand-muted flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-brand-violet to-brand-magenta" />
          <span className="font-headline font-semibold text-brand-ice">Bit Proximity</span>
        </div>
        <h1 className="font-headline text-2xl font-semibold mb-1">{report.project_name}</h1>
        {report.client_name && <p className="text-brand-muted text-sm mb-6">{report.client_name}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Users size={12} /> Contactados</div>
            <div className="text-2xl font-headline font-semibold">{report.total_contacted}</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-brand-ice text-xs mb-1"><CalendarCheck size={12} /> Reuniones agendadas</div>
            <div className="text-2xl font-headline font-semibold text-brand-ice">{report.total_meetings}</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-green-300 text-xs mb-1"><Percent size={12} /> Tasa de conversión</div>
            <div className="text-2xl font-headline font-semibold text-green-300">{report.conversion_rate}%</div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-yellow-300 text-xs mb-1"><TrendingUp size={12} /> Este mes</div>
            <div className="text-2xl font-headline font-semibold text-yellow-300">{report.meetings_this_month}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
            <div className="text-sm font-manrope font-medium mb-4">Reuniones por industria</div>
            <div className="space-y-2">
              {report.by_industry.map((row, i) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                  <span className="text-xs font-tech">{row.count}</span>
                </div>
              ))}
              {report.by_industry.length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
            </div>
          </div>
          <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
            <div className="text-sm font-manrope font-medium mb-4">Reuniones por país</div>
            <div className="space-y-2">
              {report.by_country.map((row, i) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-brand-muted flex-1 truncate">{row.name}</span>
                  <span className="text-xs font-tech">{row.count}</span>
                </div>
              ))}
              {report.by_country.length === 0 && <div className="text-brand-muted text-xs">Sin datos todavía.</div>}
            </div>
          </div>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                <th className="px-4 py-3 font-manrope font-normal">Industria</th>
                <th className="px-4 py-3 font-manrope font-normal">País</th>
                <th className="px-4 py-3 font-manrope font-normal">Fecha reunión</th>
                <th className="px-4 py-3 font-manrope font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {report.records.map((r, i) => (
                <tr key={i} className="border-t border-brand-border">
                  <td className="px-4 py-3">{r.target_company}</td>
                  <td className="px-4 py-3 text-brand-muted">{r.industry || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{r.country || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted font-tech text-xs">{r.meeting_date ? new Date(r.meeting_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${r.status === 'reunion_agendada' || r.status === 'reunion_realizada' ? 'bg-green-500/15 text-green-300' : 'bg-brand-bg text-brand-muted'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
