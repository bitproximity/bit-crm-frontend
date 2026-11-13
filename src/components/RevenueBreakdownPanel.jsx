// Lo COBRADO (facturas reales, no tratos) por producto y por país, en USD.
import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { api } from '../lib/api';

function Bars({ rows, extra }) {
  const max = Math.max(...rows.map((r) => r.usd), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex items-center justify-between text-sm mb-1 gap-3">
            <span className={`truncate ${r.name.startsWith('Sin ') ? 'text-brand-muted' : ''}`}>{r.name}</span>
            <span className="font-tech text-xs text-brand-muted whitespace-nowrap">USD {r.usd.toLocaleString('es')} · {r.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
            <div className={`h-full rounded-full ${r.name.startsWith('Sin ') ? 'bg-brand-border' : 'bg-gradient-to-r from-brand-violet to-brand-magenta'}`} style={{ width: `${(r.usd / max) * 100}%` }} />
          </div>
          {extra && extra(r)}
        </div>
      ))}
    </div>
  );
}

export default function RevenueBreakdownPanel() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/api/insights/revenue-breakdown').then(setData).catch(() => setData(null)); }, []);
  if (!data || !data.total_usd) return null;
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-panel p-6 mb-6">
      <h2 className="font-headline text-base font-semibold flex items-center gap-2 mb-1">
        <DollarSign size={16} className="text-brand-ice" /> Cobrado por producto y país
      </h2>
      <p className="text-xs text-brand-muted mb-5">
        Plata realmente cobrada (facturas), en USD: USD {data.total_usd.toLocaleString('es')}. País: el de la empresa vinculada o, si no, el de la empresa que facturó.
        {data.detail_coverage_pct < 90 && ` Solo el ${data.detail_coverage_pct}% de lo cobrado tiene detalle de productos; el resto aparece como «Sin detalle» y se va completando con cada sincronización.`}
      </p>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="text-xs text-brand-muted font-tech uppercase mb-3">Por producto</div>
          <Bars rows={data.by_product} />
        </div>
        <div>
          <div className="text-xs text-brand-muted font-tech uppercase mb-3">Por país</div>
          <Bars
            rows={data.by_country}
            extra={(r) => r.top_products?.length > 0 && (
              <div className="text-[11px] text-brand-muted mt-1 truncate">
                {r.top_products.map((t) => `${t.product} (USD ${t.usd.toLocaleString('es')})`).join(' · ')}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
