import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Trophy, AlertCircle, ListTodo } from 'lucide-react';
import { api } from '../lib/api';

function Card({ icon: Icon, label, value, accent, iconColor, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card-elevated rounded-xl p-5 group ${onClick ? 'cursor-pointer hover:border-brand-violet transition' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-brand-muted text-sm font-manrope">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor || 'bg-brand-violet/10'}`}>
          <Icon size={15} className="text-brand-ice" />
        </div>
      </div>
      <div className={`text-2xl font-headline font-semibold ${accent ? 'bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent' : 'text-brand-white'}`}>
        {value}
      </div>
    </div>
  );
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/dashboard').then(setData).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-1">Dashboard</h1>
      <p className="text-brand-muted text-sm mb-6">Panorama general de ventas y operaciones</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {!data ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card icon={TrendingUp} label="Deals abiertos" value={data.open_deals} iconColor="bg-blue-500/10" onClick={() => navigate('/deals-list?status=abierto')} />
            <Card
              icon={DollarSign}
              label="Pipeline abierto (USD)"
              value={`$${data.open_pipeline_value_usd.toLocaleString()}`}
              accent
              iconColor="bg-brand-violet/10"
              onClick={() => navigate('/deals-list?status=abierto')}
            />
            <Card icon={Trophy} label="Ganados este mes" value={data.won_this_month} iconColor="bg-green-500/10" onClick={() => navigate('/deals-list?status=ganado&period=this_month')} />
            <Card icon={AlertCircle} label="Tareas vencidas" value={data.overdue_tasks} iconColor="bg-red-500/10" onClick={() => navigate('/tasks')} />
            <Card icon={ListTodo} label="Mis tareas pendientes" value={data.my_open_tasks} iconColor="bg-yellow-500/10" onClick={() => navigate('/tasks')} />
          </>
        )}
      </div>
    </div>
  );
}
