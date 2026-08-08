import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// value/onChange trabajan con string ISO ('' si no hay fecha).
export default function DateTimePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [time, setTime] = useState(value ? new Date(value).toTimeString().slice(0, 5) : '09:00');
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = value ? new Date(value) : null;

  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const pickDay = (day) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, h, m);
    onChange(d.toISOString());
  };

  const onTimeChange = (newTime) => {
    setTime(newTime);
    if (selected) {
      const [h, m] = newTime.split(':').map(Number);
      const d = new Date(selected);
      d.setHours(h, m);
      onChange(d.toISOString());
    }
  };

  const isSameDay = (day) =>
    selected && selected.getDate() === day && selected.getMonth() === viewDate.getMonth() && selected.getFullYear() === viewDate.getFullYear();

  const isToday = (day) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === viewDate.getMonth() && t.getFullYear() === viewDate.getFullYear();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm text-left hover:border-brand-violet transition ${className}`}
      >
        <Calendar size={14} className="text-brand-muted flex-shrink-0" />
        <span className={selected ? 'text-brand-white' : 'text-brand-muted'}>
          {selected ? `${selected.toLocaleDateString()} ${selected.toTimeString().slice(0, 5)}` : 'Elegir fecha y hora'}
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 bg-brand-panel border border-brand-border rounded-xl shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 text-brand-muted hover:text-white">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-manrope font-medium">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 text-brand-muted hover:text-white">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => <div key={d} className="text-center text-[10px] text-brand-muted font-tech">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {cells.map((day, i) => (
              <button
                type="button"
                key={i}
                disabled={!day}
                onClick={() => pickDay(day)}
                className={`h-7 rounded-lg text-xs transition ${!day ? 'invisible' : isSameDay(day) ? 'bg-gradient-to-r from-brand-violet to-brand-magenta text-white' : isToday(day) ? 'border border-brand-violet text-brand-ice' : 'text-brand-white hover:bg-brand-bg'}`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-brand-border">
            <Clock size={13} className="text-brand-muted" />
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs font-tech focus:outline-none"
            />
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-brand-muted hover:text-red-400">
                Quitar
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-brand-ice hover:underline">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
