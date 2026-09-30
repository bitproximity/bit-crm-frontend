import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { api } from '../lib/api';

const TYPE_ICON_COLOR = {
  task_assigned: 'text-brand-ice',
  deal_reassigned: 'text-brand-ice',
  deal_won: 'text-green-400',
  deal_lost: 'text-red-400',
  mention: 'text-brand-magenta',
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(null);
  const [panelStyle, setPanelStyle] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // El panel va en un portal al body (ver más abajo) — "clic afuera" tiene que mirar el
  // botón Y el panel, no solo uno, o clickear el botón para cerrar terminaría reabriéndolo
  // (el mismo problema que ya resolvimos en el selector de fecha).
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => {
      const inButton = buttonRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inButton && !inPanel) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Con el panel en position:fixed, si la ventana cambia de tamaño mientras está abierto
  // queda flotando en el lugar equivocado — más simple cerrarlo que recalcular en vivo.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [open]);

  const loadCount = () => api.get('/api/notifications/unread-count').then((d) => setCount(d.count)).catch(() => {});

  useEffect(() => {
    loadCount();
    // Sondeo simple cada 30s — sin websockets, pero suficiente para que la campanita
    // no se quede pegada en 0 mientras la pestaña está abierta.
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const PANEL_W = 320;
  const MARGIN = 8;

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Antes el panel se abría "left-0" respecto al botón, y como el botón vive en un
      // menú angosto (~230px) con el panel de 320px, se salía de la pantalla por la
      // derecha (exactamente lo que se veía cortado en la captura). Ahora se posiciona
      // respecto al viewport de verdad, y se acomoda contra el borde si no cabe.
      const left = Math.min(Math.max(rect.left, MARGIN), vw - PANEL_W - MARGIN);
      const maxHeight = Math.min(vh * 0.7, vh - rect.bottom - MARGIN - 8);
      setPanelStyle({ position: 'fixed', top: rect.bottom + MARGIN, left, width: PANEL_W, maxHeight: Math.max(maxHeight, 200) });
      api.get('/api/notifications?limit=20').then(setItems).catch(() => setItems([]));
    }
    setOpen((v) => !v);
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      api.patch(`/api/notifications/${n.id}`, { read: true }).catch(() => {});
      setCount((c) => Math.max(0, c - 1));
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async (e) => {
    e.stopPropagation();
    await api.post('/api/notifications/mark-all-read', {}).catch(() => {});
    setCount(0);
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={toggleOpen} className="relative text-brand-muted hover:text-brand-white transition p-1">
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-magenta text-white text-[10px] font-tech flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="z-[200] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border sticky top-0 bg-brand-panel">
            <span className="font-manrope font-medium text-sm">Notificaciones</span>
            {count > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-brand-ice hover:underline">
                <Check size={11} /> Marcar todas leídas
              </button>
            )}
          </div>
          {items === null && <div className="px-4 py-6 text-center text-brand-muted text-sm">Cargando...</div>}
          {items?.length === 0 && <div className="px-4 py-6 text-center text-brand-muted text-sm">Sin notificaciones todavía.</div>}
          {items?.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={`w-full text-left px-4 py-3 border-b border-brand-border/60 last:border-0 hover:bg-brand-bg transition ${!n.read ? 'bg-brand-violet/[0.06]' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-magenta mt-1.5 flex-shrink-0" />}
                <div className={n.read ? 'ml-3.5' : ''}>
                  <div className={`text-sm font-manrope ${TYPE_ICON_COLOR[n.type] || 'text-brand-white'}`}>{n.title}</div>
                  {n.body && <div className="text-xs text-brand-muted mt-0.5 line-clamp-2">{n.body}</div>}
                  <div className="text-[11px] text-brand-muted mt-1">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
