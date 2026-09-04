import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

const TITLES = {
  abierto: 'Deals abiertos',
  ganado_mes: 'Ganados este mes',
  ganado: 'Tratos ganados',
  perdido: 'Tratos perdidos',
  'ganado,perdido': 'Tratos cerrados (ganados y perdidos)',
  'abierto,ganado,perdido': 'Deals nuevos',
};

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

export default function DealsList() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState('');
  const [rates, setRates] = useState({});

  const status = params.get('status') || 'abierto';
  const period = params.get('period'); // 'this_month' opcional (retrocompatibilidad)
  const pipelineId = params.get('pipeline_id');
  const createdMonth = params.get('created_month');
  const closedMonth = params.get('closed_month');
  const closedYear = params.get('closed_year');
  const lostReason = params.get('lost_reason');
  const country = params.get('country');

  useEffect(() => {
    api.get('/api/exchange-rates').then((rows) => {
      setRates(Object.fromEntries((rows || []).map((r) => [r.currency, Number(r.rate_to_usd)])));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setDeals(null);
    const qs = new URLSearchParams({ status });
    if (pipelineId) qs.set('pipeline_id', pipelineId);
    if (createdMonth) qs.set('created_month', createdMonth);
    if (closedMonth) qs.set('closed_month', closedMonth);
    if (closedYear) qs.set('closed_year', closedYear);
    if (lostReason) qs.set('lost_reason', lostReason);
    if (country) qs.set('country', country);

    api
      .get(`/api/deals?${qs.toString()}`)
      .then((data) => {
        let filtered = data;
        if (period === 'this_month') {
          const now = new Date();
          filtered = data.filter((d) => {
            if (!d.closed_at) return false;
            const c = new Date(d.closed_at);
            return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
          });
        }
        setDeals(filtered);
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar los tratos.'));
  }, [status, period, pipelineId, createdMonth, closedMonth, closedYear, lostReason, country]);

  const key = period === 'this_month' && status === 'ganado' ? 'ganado_mes' : status;
  let title = TITLES[key] || 'Tratos';
  const subParts = [];
  if (createdMonth) subParts.push(`creados en ${monthLabel(createdMonth)}`);
  if (closedMonth) subParts.push(`cerrados en ${monthLabel(closedMonth)}`);
  if (closedYear) subParts.push(`cerrados en ${closedYear}`);
  if (lostReason) subParts.push(`motivo: "${lostReason === '(sin motivo)' ? 'sin motivo especificado' : lostReason}"`);
  if (country) subParts.push(`país: ${country}`);
  if (subParts.length) title += ` — ${subParts.join(', ')}`;

  // FIX: sumaba d.value crudo de distintas monedas sin convertir a USD — mismo bug ya
  // arreglado en Pipeline/Empresa/Métricas. Con filtros que mezclan monedas (ej. por país)
  // esto se nota rápido, así que se convierte antes de sumar como en todos lados.
  const toUsd = (value, currency) => Number(value || 0) * (rates[currency] ?? 1);
  const totalValueUsd = (deals || []).reduce((sum, d) => sum + toUsd(d.value, d.currency), 0);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-brand-muted text-sm hover:text-brand-white mb-4 transition">
        <ArrowLeft size={14} /> Volver
      </button>
      <h1 className="font-headline text-xl font-semibold mb-1">{title}</h1>
      <p className="text-brand-muted text-sm mb-6">
        {deals ? `${deals.length} trato${deals.length === 1 ? '' : 's'}` : 'Cargando...'}
        {deals && totalValueUsd > 0 && ` · $${Math.round(totalValueUsd).toLocaleString('es-CO')} en total`}
      </p>

      {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

      <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-panel/80 text-brand-muted text-left">
            <tr>
              <th className="px-4 py-3 font-manrope font-normal">Trato</th>
              <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
              <th className="px-4 py-3 font-manrope font-normal">Pipeline</th>
              <th className="px-4 py-3 font-manrope font-normal">Etapa</th>
              <th className="px-4 py-3 font-manrope font-normal">Valor</th>
              <th className="px-4 py-3 font-manrope font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(deals || []).map((deal) => (
              <tr
                key={deal.id}
                onClick={() => navigate(`/deals/${deal.id}`)}
                className="border-t border-brand-border row-hover cursor-pointer"
              >
                <td className="px-4 py-3">{deal.title}</td>
                <td className="px-4 py-3 text-brand-muted">{deal.companies?.name || '—'}</td>
                <td className="px-4 py-3 text-brand-muted text-xs">{deal.pipelines?.name || '—'}</td>
                <td className="px-4 py-3 text-brand-muted text-xs">{deal.pipeline_stages?.name || '—'}</td>
                <td className="px-4 py-3 text-brand-ice font-tech">
                  {Number(deal.value) > 0 ? `${deal.currency} ${Number(deal.value).toLocaleString('es-CO')}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${
                    deal.status === 'ganado' ? 'bg-green-500/15 text-green-300' :
                    deal.status === 'perdido' ? 'bg-red-500/15 text-red-300' :
                    'bg-blue-500/15 text-blue-300'
                  }`}>
                    {deal.status}
                  </span>
                </td>
              </tr>
            ))}
            {deals && deals.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-muted text-sm">Sin tratos para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
