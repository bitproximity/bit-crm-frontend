// Placeholders de carga con efecto shimmer, para usar en vez del texto plano "Cargando...".
// Dan sensación de velocidad/pulido incluso cuando la red tarda lo mismo.

export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3">
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b border-brand-border last:border-0">
          {Array.from({ length: cols }).map((__, c) => (
            <SkeletonLine key={c} className={c === 0 ? 'w-1/4' : 'flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonLine className="w-40 h-6" />
      <SkeletonGrid count={3} />
      <SkeletonTable />
    </div>
  );
}
