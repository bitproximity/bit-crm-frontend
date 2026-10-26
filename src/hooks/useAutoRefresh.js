import { useCallback, useEffect, useRef } from 'react';

// Vuelve a pedir los datos solo, para que las cifras estén «en vivo» sin recargar la página:
//   · cada `intervalMs` mientras la pestaña está a la vista
//   · al volver a la pestaña o a la ventana (el momento en que más se nota que estaba vieja)
// `intervalMs: 0` = solo al volver a la ventana (sin reloj), para pantallas donde se arrastran tarjetas.
// Nunca corre dos veces a la vez y se detiene si la pestaña está oculta. `fn` debe devolver una promesa.
export function useAutoRefresh(fn, { intervalMs = 30000, enabled = true } = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try { await fnRef.current(); } catch { /* cada pantalla muestra su propio error */ } finally { running.current = false; }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') refresh(); };
    const id = intervalMs > 0 ? setInterval(tick, intervalMs) : null;
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { if (id) clearInterval(id); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [enabled, intervalMs, refresh]);

  return refresh;
}
