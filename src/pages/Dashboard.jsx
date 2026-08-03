import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Card({ label, value, accent }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5">
      <div className="text-brand-muted text-sm font-manrope mb-1">{label}</div>
      <div className={`text-2xl font-headline font-semibold ${accent ? 'bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent' : 'text-brand-white'}`}>
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="text-brand-muted">Cargando...</div>;

  return (
    <div>
      <h1 className="font-headline text-xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Deals abiertos" value={data.open_deals} />
        <Card
          label="Valor pipeline abierto (USD)"
          value={`$${data.open_pipeline_value_usd.toLocaleString()}`}
          accent
        />
        <Card label="Ganados este mes" value={data.won_this_month} />
        <Card label="Tareas vencidas" value={data.overdue_tasks} />
        <Card label="Mis tareas pendientes" value={data.my_open_tasks} />
      </div>
    </div>
  );
}
