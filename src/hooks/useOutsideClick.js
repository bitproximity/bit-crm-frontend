import { useEffect } from 'react';

// Cierra un desplegable (ej. resultados de búsqueda de empresa) al hacer clic fuera de él
// o al presionar Escape. Antes esto no existía en ningún lado: los desplegables de
// "Buscar o crear empresa..." (Añadir persona, Añadir trato, editar contacto, etc.) solo
// se cerraban si elegías un resultado — si hacías clic afuera se quedaban flotando
// encima del resto del formulario ("pegados"), sin forma de descartarlos.
export function useOutsideClick(ref, onOutsideClick, active = true) {
  useEffect(() => {
    if (!active) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutsideClick();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onOutsideClick();
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onOutsideClick, active]);
}
