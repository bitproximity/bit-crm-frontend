import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/login" className="inline-flex items-center gap-2 mb-8">
          <img src="/brand/logo.png" alt="Bit Proximity" className="h-6" />
        </Link>
        <h1 className="font-headline text-2xl font-semibold mb-1">Términos del Servicio</h1>
        <p className="text-brand-muted text-sm mb-10">Bit CRM (crm.bitproximity.com) — Bit Proximity · Última actualización: 22 de septiembre de 2026</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Alcance</h2>
        <p>Bit CRM es una herramienta de uso interno, provista por Bit Proximity para su propio equipo (ventas, operaciones y dirección). No se ofrece como producto ni servicio a terceros, y el acceso está restringido a personas autorizadas por Bit Proximity.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Uso aceptable</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Cada usuario es responsable de la información que carga y de mantener la confidencialidad de sus credenciales de acceso.</li>
          <li>La herramienta debe usarse únicamente para la gestión legítima de las relaciones comerciales de Bit Proximity.</li>
          <li>El acceso a Gmail y Google Calendar, cuando el usuario lo activa, se usa exclusivamente para mostrar correos y reuniones relacionadas con los contactos del CRM, según se describe en la Política de Privacidad.</li>
        </ul>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Disponibilidad</h2>
        <p>Bit Proximity hace su mejor esfuerzo por mantener la herramienta disponible, pero no garantiza un tiempo de actividad ininterrumpido. La herramienta puede actualizarse, modificarse o suspenderse en cualquier momento a criterio de Bit Proximity.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Responsabilidad</h2>
        <p>Bit CRM se provee "tal cual", sin garantías de ningún tipo. Bit Proximity no se hace responsable por pérdidas derivadas del uso o la imposibilidad de uso de la herramienta.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Cambios a estos términos</h2>
        <p>Estos términos pueden actualizarse. El uso continuado de la herramienta después de un cambio implica su aceptación.</p>

        <div className="mt-12 bg-brand-panel border border-brand-border rounded-xl p-5">
          <strong className="block mb-1">Contacto</strong>
          <p className="mb-0 text-sm text-brand-muted">Para preguntas sobre estos términos, escribir a <a href="mailto:mario@bitproximity.com" className="text-brand-ice hover:underline">mario@bitproximity.com</a>.</p>
        </div>

        <Link to="/login" className="inline-block mt-10 text-sm text-brand-ice hover:underline">← Volver al login</Link>
      </div>
    </div>
  );
}
