// Paleta de acento de la app — la misma que ya usan los Espacios para diferenciarse entre sí.
// Se reutiliza aquí para que Proyectos, Empresas y los gráficos de Métricas dejen de verse
// todos como el mismo cuadrado violeta repetido, o repetir color entre pipelines distintos:
// cada nombre cae siempre en el mismo color (determinístico, no aleatorio). 12 colores porque
// hoy existen 12 pipelines — con menos, dos pipelines terminaban compartiendo color en la
// leyenda de "Valor de tratos creados por mes".
export const AVATAR_COLORS = [
  '#8500FF', '#E000FF', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899',
  '#14B8A6', '#EF4444', '#FACC15', '#06B6D4', '#A3E635', '#F472B6',
];

export function colorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
