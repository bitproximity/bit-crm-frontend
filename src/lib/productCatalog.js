// Catálogo de productos como FUENTE ÚNICA de «Producto» en los tratos.
//
// Antes el trato tenía dos formas de elegir producto: un desplegable fijo (Bit Music / Bit Signage-
// Neomedia / Bit WiFi) y el catálogo real del CRM (Productos). Eran listas distintas, así que lo que
// se creaba en el catálogo (Email Marketing, SMS, Loyalty…) no se podía usar ni medir. Ahora los
// embudos por país (Bit Ecuador, Panamá, México, Perú, RD…) eligen directo del catálogo, y de ese
// producto sale el hardware aplicable.
import { useEffect, useState } from 'react';
import { api } from './api';

// Familias de hardware: se reconocen por palabra clave en el NOMBRE del producto (el catálogo lo
// crea el equipo, así que no hay un código fijo). Un producto que no encaja en ninguna familia es
// software/servicio (Email Marketing, WhatsApp Marketing, Loyalty, SMS…) y NO lleva hardware.
const FAMILIES = [
  {
    key: 'wifi',
    match: /wi-?fi|router|hotspot|captive/i,
    hardware: ['Aruba', 'Cisco', 'Extreme', 'Fortinet', 'Grandstream', 'Huawei', 'Juniper', 'Meraki', 'Mikrotik', 'Ruckus', 'Teltonika', 'Unifi', 'Zyxel', 'Otro'],
  },
  { key: 'music', match: /music|m[uú]sica|android/i, hardware: ['Android Box', 'Computadora', 'Tablet', 'Otro'] },
  { key: 'signage', match: /signage|neomedia|cartel|pantalla|monitor/i, hardware: ['LED', 'Monitor profesional', 'TV', 'Otro'] },
];
const GENERIC_HARDWARE = ['Pantalla / TV', 'Parlante', 'Reproductor Android', 'Router', 'Otro'];

// Si el catálogo no se puede leer (rol sin acceso a Productos, o caído) se usa esta lista.
export const FALLBACK_PRODUCTS = ['Bit Music', 'Bit Signage', 'Neomedia', 'Bit WiFi', 'Email Marketing', 'WhatsApp Marketing', 'Loyalty', 'SMS'];
// Valor viejo que mezclaba dos líneas distintas; se conserva legible en tratos ya guardados.
export const LEGACY_SIGNAGE_NEOMEDIA = 'Bit Signage / Neomedia';

export function familyOf(name) {
  return FAMILIES.find((f) => f.match.test(name || '')) || null;
}

// Hardware aplicable. Con producto elegido: el de su familia, o [] si es software (no se muestra el
// campo). Sin producto: el del embudo si el embudo ya dice la línea (Bit WiFi, Bit Music, Neomedia),
// o la lista genérica de siempre.
export function hardwareOptionsFor({ productLine, pipelineName } = {}) {
  if (productLine) return familyOf(productLine)?.hardware || [];
  return familyOf(pipelineName)?.hardware || GENERIC_HARDWARE;
}

// Opciones del desplegable «Producto»: el catálogo (o la lista de respaldo) más el valor ya guardado
// en el trato si no está en la lista, para no mostrarlo vacío ni perderlo al editar.
export function productOptions(products, current) {
  const names = (products || []).map((p) => p?.name).filter(Boolean);
  const set = new Set(names.length ? names : FALLBACK_PRODUCTS);
  if (current) set.add(current);
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

// Carga el catálogo activo una vez por pantalla.
export function useProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get('/api/products?active=true')
      .then((r) => { if (alive) setProducts(Array.isArray(r) ? r : []); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  return { products, loaded };
}
