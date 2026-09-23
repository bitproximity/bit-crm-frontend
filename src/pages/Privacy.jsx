import { Link } from 'react-router-dom';

// Página PÚBLICA (sin auth) — Google exige que la política de privacidad esté en el mismo
// dominio de la app y sea visible sin iniciar sesión, para poder salir de "Testing" y dejar
// de necesitar reconectar Gmail cada 7 días.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/login" className="inline-flex items-center gap-2 mb-8">
          <img src="/brand/logo.png" alt="Bit Proximity" className="h-6" />
        </Link>
        <h1 className="font-headline text-2xl font-semibold mb-1">Política de Privacidad</h1>
        <p className="text-brand-muted text-sm mb-10">Bit CRM (crm.bitproximity.com) — Bit Proximity · Última actualización: 22 de septiembre de 2026</p>

        <p className="mb-6">Bit CRM es una herramienta interna que Bit Proximity usa para gestionar sus relaciones comerciales (contactos, empresas y oportunidades de venta). Esta política describe qué datos maneja y cómo.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Quién usa esta herramienta</h2>
        <p>Bit CRM es de uso exclusivo del equipo interno de Bit Proximity (ventas, operaciones y dirección). No es un producto público ni se ofrece a terceros.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Qué información se recopila</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Datos de contactos y empresas que el equipo carga manualmente o importa (nombre, correo, teléfono, cargo, país, industria).</li>
          <li>Información de oportunidades de venta (tratos): valor, etapa, productos, notas y actividad relacionada.</li>
          <li>Con el permiso explícito de cada miembro del equipo: acceso de solo lectura a su cuenta de Gmail y Google Calendar, para mostrar dentro del CRM los correos y reuniones que ya tiene con cada contacto. Bit CRM no envía correos ni crea eventos en nombre del usuario salvo que este lo pida explícitamente desde la propia herramienta.</li>
        </ul>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Cómo se usa la información</h2>
        <p>Únicamente para que el equipo de Bit Proximity dé seguimiento a sus propias relaciones comerciales. No se vende, alquila ni comparte con terceros con fines publicitarios ni de ningún otro tipo.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Dónde se almacena</h2>
        <p>Los datos se guardan en una base de datos administrada (Supabase) y el servidor de la aplicación corre en Railway, ambos proveedores de infraestructura estándar de la industria con cifrado en tránsito y en reposo.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Acceso a Google (Gmail y Calendar)</h2>
        <p>El acceso a Gmail y Google Calendar es opcional, lo activa cada usuario por su cuenta desde "Mi Perfil" dentro del CRM, y se puede revocar en cualquier momento desde ahí mismo o desde la configuración de la cuenta de Google del usuario. Bit CRM solo lee los correos y eventos relacionados con los contactos cargados en el sistema — no accede al resto de la bandeja de entrada del usuario más allá de lo necesario para esa búsqueda.</p>

        <h2 className="font-headline text-base font-semibold text-brand-ice mt-8 mb-2">Retención y eliminación</h2>
        <p>Los datos se conservan mientras la cuenta del CRM esté activa. Un administrador puede eliminar cualquier registro (contacto, trato, o la cuenta de Gmail conectada) en cualquier momento desde la propia herramienta.</p>

        <div className="mt-12 bg-brand-panel border border-brand-border rounded-xl p-5">
          <strong className="block mb-1">Contacto</strong>
          <p className="mb-0 text-sm text-brand-muted">Para preguntas sobre esta política, escribir a <a href="mailto:mario@bitproximity.com" className="text-brand-ice hover:underline">mario@bitproximity.com</a>.</p>
        </div>

        <Link to="/login" className="inline-block mt-10 text-sm text-brand-ice hover:underline">← Volver al login</Link>
      </div>
    </div>
  );
}
