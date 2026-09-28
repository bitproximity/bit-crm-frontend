import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// value/onChange trabajan con string ISO ('' si no hay fecha).
// dateOnly=true: sin selector de hora, onChange devuelve 'YYYY-MM-DD' en vez de ISO con hora
// (para filtros de fecha simples, como "reunión desde/hasta").
export default function DateTimePicker({ value, onChange, className = '', dateOnly = false, placeholder }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [time, setTime] = useState(value ? new Date(value).toTimeString().slice(0, 5) : '09:00');
  const ref = useRef(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // El panel ya no vive dentro del modal (ver portal más abajo), así que "clic afuera" tiene
  // que mirar los DOS: el botón y el panel. Antes solo miraba el contenedor, y con el panel
  // fuera de él, cualquier clic dentro del calendario lo cerraba antes de poder elegir.
  useEffect(() => {
    const onClickOutside = (e) => {
      const inButton = ref.current && ref.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inButton && !inPanel) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Con el panel posicionado en pantalla (fixed), si algo se desplaza o cambia el tamaño
  // de la ventana queda flotando en el lugar equivocado: se cierra.
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!panelRef.current || !panelRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  // Si el valor cambia desde afuera (ej. se abre otra actividad en el mismo formulario),
  // el mes mostrado y la hora se ponen al día cuando el panel está cerrado.
  useEffect(() => {
    if (open || !value) return;
    const d = new Date(dateOnly ? `${value}T00:00:00` : value);
    if (isNaN(d.getTime())) return;
    setViewDate(d);
    if (!dateOnly) setTime(d.toTimeString().slice(0, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const PANEL_W = 288; // w-72
  const PANEL_H = dateOnly ? 330 : 390; // altura aproximada del panel completo
  const MARGIN = 8;

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spaceBelow = vh - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;
      // Abre abajo si cabe; si no, arriba si cabe; si no cabe en ningún lado, del lado con más
      // espacio y con scroll interno (maxHeight) en vez de recortarse.
      const below = spaceBelow >= PANEL_H || spaceBelow >= spaceAbove;
      const available = below ? spaceBelow : spaceAbove;
      const left = Math.min(Math.max(rect.left, MARGIN), Math.max(vw - PANEL_W - MARGIN, MARGIN));
      setPanelStyle({
        position: 'fixed',
        left,
        width: PANEL_W,
        maxHeight: Math.max(Math.min(PANEL_H, available), 200),
        ...(below ? { top: rect.bottom + MARGIN } : { bottom: vh - rect.top + MARGIN }),
      });
    }
    setOpen((v) => !v);
  };

  const selected = value ? new Date(dateOnly ? `${value}T00:00:00` : value) : null;

  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const pickDay = (day) => {
    if (dateOnly) {
      const iso = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onChange(iso);
      setOpen(false);
      return;
    }
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
        ref={buttonRef}
        onClick={toggleOpen}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm text-left hover:border-brand-violet transition ${className}`}
      >
        <Calendar size={14} className="text-brand-muted flex-shrink-0" />
        <span className={selected ? 'text-brand-white' : 'text-brand-muted'}>
          {selected ? (dateOnly ? selected.toLocaleDateString() : `${selected.toLocaleDateString()} ${selected.toTimeString().slice(0, 5)}`) : (placeholder || 'Elegir fecha y hora')}
        </span>
      </button>

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="z-[300] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-2xl p-3"
        >
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
            {!dateOnly && (
              <>
                <Clock size={13} className="text-brand-muted" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => onTimeChange(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded bg-brand-bg border border-brand-border text-xs font-tech focus:outline-none"
                />
              </>
            )}
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-brand-muted hover:text-red-400">
                Quitar
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className={`text-xs text-brand-ice hover:underline ${dateOnly ? 'ml-auto' : ''}`}>
              Listo
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
