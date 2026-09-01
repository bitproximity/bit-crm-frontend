import { CalendarClock, CalendarCheck, RefreshCcw } from 'lucide-react';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthLabel(key) {
  const [, m] = key.split('-');
  return MONTH_NAMES[Number(m) - 1] || key.slice(5);
}

// Gráfico "Reuniones por mes" con calidad de presentación — pensado para que se vea bien
// tanto dentro del CRM como en el reporte que se comparte con los clientes (sus CEOs lo
// ven directo), así que usa barras grandes, degradados, y totales siempre visibles en
// vez de números diminutos.
export default function MeetingsByMonthChart({ scheduled = [], realized = [], reactivated = [], printMode = false }) {
  const months = [...new Set([
    ...scheduled.map((r) => r.month),
    ...realized.map((r) => r.month),
    ...reactivated.map((r) => r.month),
  ])].sort().slice(-12);

  const getCount = (arr, month) => arr.find((r) => r.month === month)?.count || 0;
  const totalScheduled = scheduled.reduce((s, r) => s + r.count, 0);
  const totalRealized = realized.reduce((s, r) => s + r.count, 0);
  const totalReactivated = reactivated.reduce((s, r) => s + r.count, 0);

  // printMode agrega las mismas clases "print-*" que usa el resto del reporte público —
  // solo aplican dentro de @media print (ver el <style> en PublicB2bReport.jsx), así que
  // en pantalla se ve con el tema oscuro normal, y solo cambia a fondo blanco al exportar
  // a PDF de verdad. No es un modo aparte que rompa la vista en pantalla.
  const textMuted = `text-brand-muted ${printMode ? 'print-text-muted' : ''}`;
  const textBlack = `text-brand-white ${printMode ? 'print-text-black' : ''}`;
  const cardBg = `bg-brand-panel border border-brand-border ${printMode ? 'print-card' : ''}`;
  const innerBg = `bg-brand-bg ${printMode ? 'print-card' : ''}`;

  if (months.length === 0) {
    return (
      <div className={`${cardBg} rounded-xl p-6 text-center`}>
        <div className={`${textMuted} text-sm`}>Todavía no hay reuniones registradas.</div>
      </div>
    );
  }

  const max = Math.max(
    ...months.map((m) => Math.max(getCount(scheduled, m), getCount(realized, m), getCount(reactivated, m))),
    1
  );

  const SERIES = [
    { key: 'scheduled', label: 'Programadas', total: totalScheduled, icon: CalendarClock, gradient: 'linear-gradient(180deg, #4FC3F7, #0288D1)', solid: '#0288D1' },
    { key: 'realized', label: 'Realizadas', total: totalRealized, icon: CalendarCheck, gradient: 'linear-gradient(180deg, #66E6A0, #16A34A)', solid: '#16A34A' },
    { key: 'reactivated', label: 'Reactivadas', total: totalReactivated, icon: RefreshCcw, gradient: 'linear-gradient(180deg, #FFB74D, #EA580C)', solid: '#EA580C' },
  ];
  const getters = { scheduled: (m) => getCount(scheduled, m), realized: (m) => getCount(realized, m), reactivated: (m) => getCount(reactivated, m) };

  return (
    <div className={`${cardBg} rounded-2xl p-6`}>
      <div className={`font-headline text-base font-semibold mb-1 ${textBlack}`}>Reuniones por mes</div>
      <p className={`${textMuted} text-xs mb-5`}>Últimos {months.length} meses con actividad</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {SERIES.map((s) => (
          <div key={s.key} className={`rounded-xl p-3.5 ${innerBg}`}>
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color: s.solid }}>
              <s.icon size={13} />
              <span className={`text-[11px] font-manrope ${textMuted}`}>{s.label}</span>
            </div>
            <div className={`text-2xl font-headline font-bold ${textBlack}`}>{s.total}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex items-end gap-4" style={{ minWidth: `${months.length * 84}px`, height: '220px' }}>
          {months.map((month) => (
            <div key={month} className="flex-1 flex flex-col items-center justify-end h-full min-w-[68px]">
              <div className="flex items-end gap-2 w-full justify-center flex-1">
                {SERIES.map((s) => {
                  const value = getters[s.key](month);
                  const heightPct = Math.max((value / max) * 100, value ? 6 : 0);
                  return (
                    <div key={s.key} className="w-5 flex flex-col items-center justify-end h-full">
                      <div className={`text-[10px] font-tech font-semibold mb-1 ${textBlack}`} style={{ opacity: value ? 1 : 0 }}>{value}</div>
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: value ? '4px' : 0,
                          background: s.gradient,
                          boxShadow: `0 0 12px ${s.solid}55`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className={`text-xs font-tech font-medium mt-2.5 ${textMuted}`}>{monthLabel(month)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
