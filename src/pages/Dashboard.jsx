import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Trophy, AlertCircle, ListTodo, Calendar, MapPin, Video, ExternalLink, PieChart } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

function Card({ icon: Icon, label, value, accent, iconColor, barColor, onClick, index = 0, big }) {
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`relative card-elevated rounded-xl overflow-hidden group stagger-item ${onClick ? 'cursor-pointer' : ''} ${big ? 'sm:col-span-2 p-6' : 'p-5'}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${barColor || '#8500FF'}, ${barColor || '#8500FF'}22)` }} />
      <div className="flex items-center justify-between mb-3">
        <div className="text-brand-muted text-sm font-manrope">{label}</div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 ${iconColor || 'bg-brand-violet/10'}`}>
          <Icon size={16} className="text-brand-ice" />
        </div>
      </div>
      <div className={`${big ? 'text-4xl' : 'text-2xl'} font-headline font-semibold ${accent ? 'bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent' : 'text-brand-white'}`}>
        {value}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function CardSkeleton() {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-brand-border rounded" />
        <div className="w-8 h-8 rounded-lg bg-brand-border" />
      </div>
      <div className="h-7 w-16 bg-brand-border rounded" />
    </div>
  );
}

function EventTime(startStr) {
  const d = new Date(startStr);
  if (isNaN(d)) return startStr; // fecha "todo el día", viene como YYYY-MM-DD
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const dateLabel = isToday ? 'Hoy' : d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dateLabel} · ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState(null);
  const [eventsError, setEventsError] = useState('');
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    const loadDashboard = () => api.get('/api/dashboard').then(setData).catch(console.error);
    loadDashboard();
    api.get('/api/gmail/calendar/events?days=7')
      .then(setEvents)
      .catch((err) => setEventsError(err.message || 'No se pudo cargar tu calendario'));

    // "Sincronizar en tiempo real" sin necesitar websockets: se refresca solo al volver
    // a esta pestaña (ej. terminaste algo en otra pestaña o app y regresas acá) y cada
    // 60s mientras la pantalla está visible y abierta — así los números nunca quedan
    // pegados en lo que había al momento de entrar.
    const onVisible = () => { if (document.visibilityState === 'visible') loadDashboard(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', loadDashboard);
    const interval = setInterval(() => { if (document.visibilityState === 'visible') loadDashboard(); }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', loadDashboard);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-1">
        {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} <span className="inline-block">👋</span>
      </h1>
      <p className="text-brand-muted text-sm mb-6">Esto es lo que está pasando en Bit Proximity hoy.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {!data ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card
              icon={DollarSign}
              label="Pipeline abierto (USD)"
              value={`$${data.open_pipeline_value_usd.toLocaleString()}`}
              accent
              iconColor="bg-brand-violet/10"
              barColor="#8500FF"
              onClick={() => navigate('/deals-list?status=abierto')}
              index={0}
              big
            />
            <Card icon={TrendingUp} label="Deals abiertos" value={data.open_deals} iconColor="bg-blue-500/10" barColor="#3B82F6" onClick={() => navigate('/deals-list?status=abierto')} index={1} />
            <Card icon={Trophy} label="Ganados este mes" value={data.won_this_month} iconColor="bg-green-500/10" barColor="#22C55E" onClick={() => navigate('/deals-list?status=ganado&period=this_month')} index={2} />
            <Card icon={AlertCircle} label="Tareas vencidas" value={data.overdue_tasks} iconColor="bg-red-500/10" barColor="#EF4444" onClick={() => navigate('/tasks')} index={3} />
            <Card icon={ListTodo} label="Mis tareas pendientes" value={data.my_open_tasks} iconColor="bg-yellow-500/10" barColor="#EAB308" onClick={() => navigate('/tasks')} index={4} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Próximos eventos de Google Calendar */}
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-brand-ice" />
            <span className="font-manrope font-medium text-sm">Próximos eventos (7 días)</span>
          </div>
          {eventsError ? (
            <div className="text-brand-muted text-xs">
              {eventsError.includes('conectado') ? (
                <>No tienes tu Google conectado. <Link to="/profile" className="text-brand-ice hover:underline">Conéctalo en Mi Perfil</Link>.</>
              ) : eventsError}
            </div>
          ) : !events ? (
            <div className="text-brand-muted text-xs">Cargando...</div>
          ) : events.length === 0 ? (
            <div className="text-brand-muted text-xs">Sin eventos programados en los próximos 7 días.</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {events.slice(0, 8).map((e) => (
                <div key={e.id} className="border-l-2 border-brand-violet/50 pl-3">
                  <div className="text-sm text-brand-white truncate">{e.title || '(sin título)'}</div>
                  <div className="text-xs text-brand-muted font-tech">{EventTime(e.start)}</div>
                  <div className="flex items-center gap-3 mt-1">
                    {e.location && (
                      <span className="flex items-center gap-1 text-[11px] text-brand-muted truncate"><MapPin size={10} /> {e.location}</span>
                    )}
                    {e.meetLink && (
                      <a href={e.meetLink} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 text-[11px] text-brand-ice hover:underline flex-shrink-0">
                        <Video size={10} /> Meet
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline abierto por embudo */}
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={15} className="text-brand-ice" />
            <span className="font-manrope font-medium text-sm">Pipeline abierto por embudo</span>
          </div>
          {!data ? (
            <div className="text-brand-muted text-xs">Cargando...</div>
          ) : data.pipeline_breakdown.length === 0 ? (
            <div className="text-brand-muted text-xs">Sin tratos abiertos todavía.</div>
          ) : (
            <div className="space-y-2.5">
              {data.pipeline_breakdown.map((p) => {
                const max = Math.max(...data.pipeline_breakdown.map((x) => x.value_usd), 1);
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-brand-muted truncate">{p.name}</span>
                      <span className="text-brand-ice font-tech flex-shrink-0 ml-2">${p.value_usd.toLocaleString()} · {p.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta rounded-full" style={{ width: `${(p.value_usd / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos ganados */}
        <div className="bg-brand-panel border border-brand-border rounded-xl p-5 panel-depth lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} className="text-green-300" />
            <span className="font-manrope font-medium text-sm">Últimos tratos ganados</span>
          </div>
          {!data ? (
            <div className="text-brand-muted text-xs">Cargando...</div>
          ) : data.recent_wins.length === 0 ? (
            <div className="text-brand-muted text-xs">Sin tratos ganados todavía.</div>
          ) : (
            <div className="space-y-3">
              {data.recent_wins.map((w, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-brand-white truncate">{w.title}</div>
                    {w.company && <div className="text-xs text-brand-muted truncate">{w.company}</div>}
                  </div>
                  <span className="text-green-300 font-tech text-sm flex-shrink-0">${w.value_usd.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
