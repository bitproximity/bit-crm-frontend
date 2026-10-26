// Finanzas del CEO, todo en USD: ventas, facturación, cobranza, líderes y velocidad.
// <FinanceStrip /> es la versión compacta del Dashboard; <FinancePanel /> la completa de Métricas.
import { Link } from 'react-router-dom';
import { TrendingUp, Receipt, Wallet, Hourglass, AlertTriangle, Gauge, Link2, Globe2, Package, Workflow } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { fmtUsd, agoFrom } from '../lib/money';

function Card({ icon: Icon, label, value, sub, tone = 'text-brand-white', to }) {
  const body = (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth h-full hover:border-brand-violet/60 transition">
      <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Icon size={12} /> {label}</div>
      <div className={`text-xl font-headline font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-brand-muted mt-0.5">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

function Unavailable({ error, onRetry }) {
  return <div role="alert" className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error} <button type="button" onClick={onRetry} className="underline ml-2">Reintentar</button></div>;
}

function Cards({ f }) {
  const c = f.collections;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card icon={TrendingUp} label="Ganado este mes" value={fmtUsd(f.sales.won_month_usd)} sub={`${f.sales.won_count_month} trato${f.sales.won_count_month === 1 ? '' : 's'} · año ${fmtUsd(f.sales.won_ytd_usd)}`} to="/metrics" tone="text-brand-ice" />
      <Card icon={Receipt} label="Facturado este mes" value={fmtUsd(f.billing.facturado_month_usd)} sub={`año ${fmtUsd(f.billing.facturado_ytd_usd)}`} to="/invoicing" />
      <Card icon={Wallet} label="Cobros del mes" value={fmtUsd(c.cobros_month_usd)} tone="text-green-300" sub={c.collection_rate_pct == null ? 'sin facturas del año' : `${c.collection_rate_pct}% de lo facturado en el año`} to="/invoicing" />
      <Card icon={Hourglass} label="Por cobrar" value={fmtUsd(c.por_cobrar_usd)} tone="text-yellow-300" sub={c.dso_days == null ? 'aún sin días de cobro' : `se cobra en ~${c.dso_days} días`} to="/invoicing" />
      <Card icon={AlertTriangle} label="Vencido" value={fmtUsd(c.vencido_usd)} tone={c.vencido_usd > 0 ? 'text-red-300' : 'text-brand-white'} sub={`${c.vencido_count} factura${c.vencido_count === 1 ? '' : 's'} vencida${c.vencido_count === 1 ? '' : 's'}`} to="/invoicing" />
    </div>
  );
}

function RatesNote({ f }) {
  return (
    <>
      {f.rates.missing.length > 0 && (
        <div role="alert" className="mt-3 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2"><AlertTriangle size={13} /> Falta la tasa de cambio de {f.rates.missing.join(', ')}: lo que esté en esa moneda no se suma. Agrégala en Configuración → Tipos de cambio.</div>
      )}
      <p className="text-[11px] text-brand-muted mt-3">Todo convertido a USD con las tasas de {f.rates.currencies.filter((x) => x !== 'USD').join(', ') || '—'}, actualizadas {agoFrom(f.rates.updated_at) || 'recientemente'}.</p>
    </>
  );
}

export function FinanceStrip({ refreshSignal = 0 }) {
  const { data: f, error, forbidden, refreshNow } = useFinance({ refreshSignal });
  if (forbidden) return null;
  if (error && !f) return <Unavailable error={error} onRetry={refreshNow} />;
  if (!f) return <div className="mb-6 h-28 rounded-xl bg-brand-panel border border-brand-border animate-pulse" aria-label="Cargando finanzas" />;
  const lead = f.leaders; const slow = f.slowest_payers[0]; const rec = f.reconciliation;
  return (
    <section aria-label="Finanzas" className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-headline text-sm font-semibold text-brand-muted uppercase tracking-wide">Negocio en USD</h2>
      </div>
      <Cards f={f} />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-brand-muted">
        {lead.product && <span className="flex items-center gap-1.5"><Package size={12} className="text-brand-ice" /> Producto líder: <b className="text-brand-white font-medium">{lead.product.name}</b> {fmtUsd(lead.product.won_usd)}</span>}
        {lead.country && <span className="flex items-center gap-1.5"><Globe2 size={12} className="text-brand-ice" /> País que más vende: <b className="text-brand-white font-medium">{lead.country.name}</b> {fmtUsd(lead.country.won_usd)}</span>}
        {f.data_gaps?.country_unassigned_usd > 0 && <span className="flex items-center gap-1.5 text-yellow-300"><AlertTriangle size={12} /> {fmtUsd(f.data_gaps.country_unassigned_usd)} ganados sin país asignado</span>}
        {f.data_gaps?.won_without_close_date > 0 && <span className="flex items-center gap-1.5 text-yellow-300"><AlertTriangle size={12} /> {f.data_gaps.won_without_close_date} tratos ganados ({fmtUsd(f.data_gaps.won_without_close_date_usd)}) sin fecha de cierre: no cuentan en el ganado del mes ni del año</span>}
        {slow && <span className="flex items-center gap-1.5"><Gauge size={12} className="text-yellow-300" /> Paga más lento: <b className="text-brand-white font-medium">{slow.client}</b> ({slow.avg_days_to_pay} días)</span>}
        {rec && rec.won_without_invoice > 0 && <Link to="/invoicing" className="flex items-center gap-1.5 text-yellow-300 hover:underline"><Link2 size={12} /> {rec.won_without_invoice} tratos ganados sin factura ({fmtUsd(rec.won_without_invoice_usd)})</Link>}
      </div>
      <RatesNote f={f} />
    </section>
  );
}

function Bars({ rows, nameKey = 'name', valueKey, format = fmtUsd, tone = 'from-brand-violet to-brand-magenta', empty = 'Sin datos todavía.' }) {
  // cada fila puede traer su propio color (la antigüedad de cartera va de verde a rojo)
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <div className="text-brand-muted text-xs py-4">{empty}</div>;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r[nameKey]}>
          <div className="flex justify-between text-xs mb-1 gap-3"><span className="truncate">{r[nameKey]}</span><span className="font-tech text-brand-white flex-shrink-0">{format(r[valueKey])}</span></div>
          <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${r.color || tone}`} style={{ width: `${Math.max(3, (r[valueKey] / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

const Box = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth ${className}`}>
    <div className="flex items-center gap-1.5 text-xs font-manrope font-medium text-brand-muted uppercase tracking-wide mb-3"><Icon size={12} /> {title}</div>
    {children}
  </div>
);

function Slowest({ title, rows }) {
  return (
    <div>
      <div className="text-[11px] text-brand-muted mb-1.5">{title}</div>
      {rows.length === 0 ? <div className="text-xs text-brand-muted">Necesita al menos 2 tratos cerrados por grupo.</div> : (
        <ul className="space-y-1">{rows.map((r) => <li key={r.name} className="flex justify-between text-xs gap-3"><span className="truncate">{r.name}</span><span className="font-tech flex-shrink-0 text-brand-white">{r.avg_days} d <span className="text-brand-muted">({r.deals})</span></span></li>)}</ul>
      )}
    </div>
  );
}

export default function FinancePanel({ refreshSignal = 0 }) {
  const { data: f, error, forbidden, refreshNow } = useFinance({ refreshSignal });
  if (forbidden) return null;
  if (error && !f) return <Unavailable error={error} onRetry={refreshNow} />;
  if (!f) return <div className="mb-8 h-40 rounded-xl bg-brand-panel border border-brand-border animate-pulse" aria-label="Cargando finanzas" />;
  const c = f.collections; const a = c.aging; const cs = f.closing_speed; const rec = f.reconciliation;
  const agingRows = [['Al día', a.al_dia, 'from-green-400 to-green-500'], ['1-30 días vencida', a['1_30'], 'from-yellow-400 to-yellow-500'], ['31-60 días', a['31_60'], 'from-orange-400 to-orange-500'], ['61-90 días', a['61_90'], 'from-red-400 to-red-500'], ['Más de 90 días', a.mas_90, 'from-red-600 to-red-700']].map(([name, v, color]) => ({ name, v, color }));
  return (
    <section aria-label="Finanzas del CEO" className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="font-headline text-lg font-semibold flex items-center gap-2"><Wallet size={16} className="text-brand-ice" /> Finanzas y cobranza <span className="text-xs font-normal text-brand-muted">USD · {f.year}</span></h2>
      </div>
      <p className="text-xs text-brand-muted mb-4">Ventas, facturación y cobranza en un solo lugar, siempre en USD y al día.</p>
      <Cards f={f} />
      <p className="text-[11px] text-brand-muted mt-2">Los «cobros del mes» y los días de cobro cuentan solo pagos registrados con fecha. Desde ahora, marcar una factura como pagada registra el pago con su fecha; lo anterior no tiene fecha de cobro.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Box title="Antigüedad de la cartera" icon={Hourglass}><Bars rows={agingRows} valueKey="v" tone="from-yellow-400 to-red-500" empty="Sin cartera pendiente." /></Box>
        <Box title="Quién más debe (vencido)" icon={AlertTriangle}>
          {f.top_debtors.length === 0 ? <div className="text-brand-muted text-xs py-4">Nadie tiene facturas vencidas 🎉</div> : (
            <ul className="space-y-2">{f.top_debtors.map((d) => <li key={d.client} className="text-xs"><div className="flex justify-between gap-3"><span className="truncate">{d.client}</span><span className="font-tech text-red-300 flex-shrink-0">{fmtUsd(d.overdue_usd)}</span></div><div className="text-[10px] text-brand-muted">{d.invoices} factura{d.invoices === 1 ? '' : 's'} · hasta {d.max_days_late} días de atraso</div></li>)}</ul>
          )}
        </Box>
        <Box title="Quién más tarda en pagar" icon={Gauge}>
          {f.slowest_payers.length === 0 ? <div className="text-brand-muted text-xs py-4">Se necesita historial de al menos 2 facturas pagadas por cliente.</div> : (
            <ul className="space-y-2">{f.slowest_payers.map((d) => <li key={d.client} className="flex justify-between text-xs gap-3"><span className="truncate">{d.client}</span><span className="font-tech flex-shrink-0">{d.avg_days_to_pay} días <span className="text-brand-muted">({d.invoices})</span></span></li>)}</ul>
          )}
          <div className="text-[11px] text-brand-muted mt-3 pt-3 border-t border-brand-border">Promedio general de cobro: <b className="text-brand-white">{c.dso_days == null ? '—' : `${c.dso_days} días`}</b>{c.dso_sample ? ` (${c.dso_sample} facturas)` : ''}</div>
        </Box>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Box title="País que más vende" icon={Globe2}>
          <Bars rows={f.by_country.slice(0, 6)} valueKey="won_usd" empty="Sin ventas este año." />
          {f.data_gaps?.country_unassigned_usd > 0 && <div className="text-[11px] text-yellow-300 mt-3">{fmtUsd(f.data_gaps.country_unassigned_usd)} no tienen país (la empresa no lo trae y el embudo no es de un solo país). Complétalo en las empresas para ver el ranking real.</div>}
        </Box>
        <Box title="Producto más vendido" icon={Package}><Bars rows={f.by_product.slice(0, 6)} valueKey="won_usd" empty="Sin ventas este año." /></Box>
        <Box title="Embudo que más vende" icon={Workflow}><Bars rows={f.by_pipeline.slice(0, 6)} valueKey="won_usd" empty="Sin ventas este año." /></Box>
      </div>

      <Box title={`Quién se demora más en cerrar${cs.avg_days != null ? ` · promedio ${cs.avg_days} días` : ''}`} icon={Gauge} className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Slowest title="Por embudo" rows={cs.slowest_pipelines} />
          <Slowest title="Por país" rows={cs.slowest_countries} />
          <Slowest title="Por producto" rows={cs.slowest_products} />
        </div>
        <div className="text-[10px] text-brand-muted mt-3">Días desde que se crea el trato hasta que se gana, en el último año. Entre paréntesis, cuántos tratos.</div>
      </Box>

      {rec && (
        <Box title="Ganado vs facturado" icon={Link2} className="mt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="h-2 rounded-full bg-brand-bg overflow-hidden"><div className="h-full rounded-full bg-green-400" style={{ width: `${rec.coverage_pct || 0}%` }} /></div>
              <div className="text-xs text-brand-muted mt-1.5">{rec.coverage_pct ?? 0}% de lo ganado en {f.year} ya tiene factura ({fmtUsd(rec.won_with_invoice_usd)} de {fmtUsd(rec.won_usd)})</div>
            </div>
            <Link to="/invoicing" className="text-xs text-brand-ice hover:underline">{rec.won_without_invoice} sin factura · {rec.invoices_unlinked} facturas sin trato → Conciliar</Link>
          </div>
        </Box>
      )}
      <RatesNote f={f} />
    </section>
  );
}
