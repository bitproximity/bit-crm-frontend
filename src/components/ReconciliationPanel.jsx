// Conciliación: ¿lo que ganamos ya se facturó? ¿Cada factura tiene su trato? Todo en USD.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Wand2, AlertTriangle, CheckCircle2, Receipt, Trophy, FileX2 } from 'lucide-react';
import { api } from '../lib/api';
import { useConfirm } from './ConfirmModal';
import { fmtUsd, fmtNative } from '../lib/money';
import { formatDay } from '../lib/dateOnly';

const CONF = { alta: { label: 'Seguro', cls: 'bg-green-500/15 text-green-300' }, media: { label: 'Posible', cls: 'bg-yellow-500/15 text-yellow-300' } };

function Stat({ icon: Icon, label, value, sub, tone = 'text-brand-white' }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-4 panel-depth">
      <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><Icon size={12} /> {label}</div>
      <div className={`text-xl font-headline font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-brand-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ReconciliationPanel({ isAdmin = false, onChanged = () => {} }) {
  const confirm = useConfirm();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setError('');
    return api.get(`/api/finance/reconciliation?year=${year}`).then(setData).catch((e) => setError(e.message || 'No se pudo cargar la conciliación.'));
  }, [year]);
  useEffect(() => { setData(null); load(); }, [load]);

  const link = async (invoice, suggestion) => {
    setBusy(invoice.id); setMsg('');
    try {
      await api.patch(`/api/invoices/${invoice.id}`, { deal_id: suggestion.deal_id, ...(invoice.company_id ? { company_id: invoice.company_id } : {}) });
      setMsg(`${invoice.invoice_number || 'La factura'} quedó vinculada a «${suggestion.title}».`);
      await load(); onChanged();
    } catch (e) { setMsg(e.message || 'No se pudo vincular.'); }
    setBusy(null);
  };

  const autoLink = async () => {
    const n = data?.totals?.auto_linkable || 0;
    const ok = await confirm({
      title: 'Vincular automáticamente',
      message: `Se vincularán ${n} factura${n === 1 ? '' : 's'} a su trato ganado: solo las que son casi seguras (la empresa se reconoce por su nombre y tiene un único trato ganado, o uno cuyo monto coincide). Las dudosas no se tocan. Quedan en la auditoría y puedes desvincular cualquiera desde su ficha.`,
      confirmLabel: 'Vincular',
    });
    if (!ok) return;
    setBusy('auto'); setMsg('');
    try {
      const r = await api.post('/api/finance/auto-link', {});
      setMsg(`${r.linked_deals} factura${r.linked_deals === 1 ? '' : 's'} vinculada${r.linked_deals === 1 ? '' : 's'} a su trato y ${r.linked_companies} a su empresa.`);
      await load(); onChanged();
    } catch (e) { setMsg(e.message || 'No se pudo vincular.'); }
    setBusy(null);
  };

  if (error) return <div role="alert" className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error} <button type="button" onClick={load} className="underline ml-2">Reintentar</button></div>;
  if (!data) return <div className="text-brand-muted text-sm py-10 text-center">Calculando la conciliación…</div>;

  const t = data.totals;
  const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg bg-brand-bg border border-brand-border p-0.5" role="group" aria-label="Año">
          {years.map((y) => <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className={`px-3 py-1 rounded-md text-xs font-medium ${year === y ? 'bg-brand-violet text-white' : 'text-brand-muted hover:text-brand-white'}`}>{y}</button>)}
        </div>
        <p className="text-xs text-brand-muted flex-1 min-w-[200px]">Tratos ganados en {year} frente a lo facturado. Todo en USD a la tasa del día.</p>
        {isAdmin && t.auto_linkable > 0 && (
          <button type="button" disabled={busy === 'auto'} onClick={autoLink} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-sm flex items-center gap-1.5 disabled:opacity-50">
            <Wand2 size={14} /> {busy === 'auto' ? 'Vinculando…' : `Vincular automáticamente (${t.auto_linkable} seguras)`}
          </button>
        )}
      </div>

      {data.missing_rates?.length > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2"><AlertTriangle size={13} /> Falta la tasa de cambio de {data.missing_rates.join(', ')}: esas facturas no se suman al USD. Agrégala en Configuración → Tipos de cambio.</div>
      )}
      {msg && <div role="status" className="mb-4 px-4 py-2.5 rounded-lg bg-brand-violet/10 border border-brand-violet/30 text-brand-ice text-xs">{msg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Trophy} label={`Ganado en ${year}`} value={fmtUsd(t.won_usd)} sub={`${t.won_deals} trato${t.won_deals === 1 ? '' : 's'} ganado${t.won_deals === 1 ? '' : 's'}`} />
        <Stat icon={CheckCircle2} label="Ya facturado" value={t.coverage_pct == null ? '—' : `${t.coverage_pct}%`} tone="text-green-300" sub={`${fmtUsd(t.won_with_invoice_usd)} · ${t.won_with_invoice} tratos`} />
        <Stat icon={FileX2} label="Ganado sin factura" value={fmtUsd(t.won_without_invoice_usd)} tone={t.won_without_invoice ? 'text-yellow-300' : 'text-brand-white'} sub={`${t.won_without_invoice} trato${t.won_without_invoice === 1 ? '' : 's'} por facturar`} />
        <Stat icon={Receipt} label="Facturas sin trato" value={fmtUsd(t.invoices_unlinked_usd)} tone={t.invoices_unlinked ? 'text-yellow-300' : 'text-brand-white'} sub={`${t.invoices_unlinked} de ${t.invoices_total} facturas`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden" aria-label="Facturas sin trato">
          <div className="px-4 py-3 border-b border-brand-border text-sm font-medium flex items-center gap-2"><Link2 size={14} className="text-brand-ice" /> Facturas sin trato <span className="text-brand-muted text-xs">({t.invoices_unlinked})</span></div>
          <div className="divide-y divide-brand-border max-h-[640px] overflow-y-auto">
            {data.unlinked_invoices.map((inv) => (
              <div key={inv.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{inv.invoice_number || `#${String(inv.id).slice(0, 8)}`} <span className="text-brand-muted">· {inv.client_name || 'Sin nombre'}</span></div>
                    <div className="text-[11px] text-brand-muted">{inv.source_account || 'Sin origen'} · {formatDay(inv.issue_date)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-tech text-sm text-brand-ice">{fmtUsd(inv.total_usd)}</div>
                    {inv.currency !== 'USD' && <div className="text-[10px] text-brand-muted font-tech">{fmtNative(inv.total, inv.currency)}</div>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inv.suggestions.slice(0, 2).map((s) => (
                    <button key={s.deal_id} type="button" disabled={busy === inv.id} onClick={() => link(inv, s)} className="max-w-full px-2.5 py-1 rounded-lg border border-brand-border hover:border-brand-violet text-xs flex items-center gap-1.5 disabled:opacity-50" title={`Vincular a «${s.title}»`}>
                      <span className={`px-1.5 rounded text-[10px] ${CONF[inv.confidence]?.cls || 'bg-brand-border text-brand-muted'}`}>{CONF[inv.confidence]?.label || 'Posible'}</span>
                      <span className="truncate">{s.title}</span><span className="text-brand-muted font-tech flex-shrink-0">{fmtUsd(s.value_usd)}{s.amount_match ? ' ✓' : ''}</span>
                    </button>
                  ))}
                  {inv.suggestions.length === 0 && <span className="text-[11px] text-brand-muted">{inv.company_id ? 'Su empresa no tiene tratos ganados.' : 'No se reconoce la empresa por su nombre: vincúlala desde la factura.'}</span>}
                </div>
              </div>
            ))}
            {data.unlinked_invoices.length === 0 && <div className="px-4 py-10 text-center text-brand-muted text-sm">Todas las facturas tienen su trato ✓</div>}
          </div>
        </section>

        <section className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden" aria-label="Tratos ganados sin factura">
          <div className="px-4 py-3 border-b border-brand-border text-sm font-medium flex items-center gap-2"><Trophy size={14} className="text-yellow-300" /> Ganados sin factura <span className="text-brand-muted text-xs">({t.won_without_invoice})</span></div>
          <div className="divide-y divide-brand-border max-h-[640px] overflow-y-auto">
            {data.won_without_invoice.map((d) => (
              <Link key={d.id} to={`/deals/${d.id}`} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-brand-bg/60 transition">
                <div className="min-w-0">
                  <div className="text-sm truncate">{d.title}</div>
                  <div className="text-[11px] text-brand-muted truncate">{d.company_name || 'Sin empresa'}{d.product_line ? ` · ${d.product_line}` : ''} · ganado {formatDay(String(d.closed_at || '').slice(0, 10))}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-tech text-sm text-yellow-300">{fmtUsd(d.value_usd)}</div>
                  {d.currency !== 'USD' && <div className="text-[10px] text-brand-muted font-tech">{fmtNative(d.value, d.currency)}</div>}
                </div>
              </Link>
            ))}
            {data.won_without_invoice.length === 0 && <div className="px-4 py-10 text-center text-brand-muted text-sm">Todo lo ganado en {year} ya tiene factura ✓</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
