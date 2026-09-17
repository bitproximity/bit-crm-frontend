import { useState } from 'react';

function senderInitials(fromEmail) {
  if (!fromEmail) return '?';
  const namePart = fromEmail.split('<')[0].trim().replace(/"/g, '');
  const base = namePart || fromEmail.split('@')[0];
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function senderName(fromEmail) {
  if (!fromEmail) return 'Desconocido';
  const namePart = fromEmail.split('<')[0].trim().replace(/"/g, '');
  return namePart || fromEmail.split('@')[0];
}

function relativeDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return date.toLocaleDateString('es', { weekday: 'long' });
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: diffDays > 300 ? 'numeric' : undefined });
}

// Colores estables por remitente (mismo email → mismo color siempre), para poder
// distinguir a simple vista quién escribió qué en una lista larga de correos.
const AVATAR_COLORS = [
  'from-blue-500 to-cyan-400', 'from-brand-violet to-brand-magenta', 'from-green-500 to-emerald-400',
  'from-orange-500 to-amber-400', 'from-pink-500 to-rose-400', 'from-indigo-500 to-blue-400',
];
function avatarColor(fromEmail) {
  if (!fromEmail) return AVATAR_COLORS[0];
  const hash = fromEmail.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function GmailMessageRow({ message, index = 0, animate = true }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!(message.body_html || message.body_text);

  return (
    <div
      className={`bg-brand-bg border border-brand-border rounded-xl overflow-hidden transition ${animate ? 'stagger-item' : ''} ${hasBody ? 'hover:border-brand-violet/40 hover:shadow-md cursor-pointer' : ''}`}
      style={animate ? { animationDelay: `${Math.min(index, 15) * 25}ms` } : undefined}
      onClick={() => hasBody && setExpanded((v) => !v)}
    >
      <div className="flex gap-3 p-3.5">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(message.from_email)} flex items-center justify-center text-[11px] font-tech font-semibold flex-shrink-0`}>
          {senderInitials(message.from_email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <span className="text-sm font-manrope font-medium text-brand-white truncate">{senderName(message.from_email)}</span>
            <span className="text-[11px] text-brand-muted font-tech flex-shrink-0">{relativeDate(message.sent_at)}</span>
          </div>
          <div className="text-sm text-brand-white/90 truncate mb-0.5">{message.subject || '(sin asunto)'}</div>
          {!expanded && <div className="text-xs text-brand-muted line-clamp-2">{message.snippet}</div>}
          {!hasBody && <div className="text-[11px] text-brand-muted/60 italic mt-1">Sin cuerpo sincronizado — reenviá "Sincronizar" para traerlo.</div>}
        </div>
      </div>

      {/* Cuerpo completo del correo — antes solo se guardaba/mostraba el snippet corto
          de Gmail (~100 caracteres). El HTML se renderiza en un iframe aislado
          (sandbox sin scripts) porque es contenido externo, no confiable. */}
      {expanded && hasBody && (
        <div className="border-t border-brand-border" onClick={(e) => e.stopPropagation()}>
          {message.body_html ? (
            <iframe
              title={`correo-${message.id || message.gmail_message_id}`}
              sandbox=""
              srcDoc={`<base target="_blank"><style>body{font-family:Manrope,sans-serif;color:#111;background:#fff;margin:0;padding:12px;word-break:break-word;}</style>${message.body_html}`}
              className="w-full bg-white"
              style={{ height: '420px', border: 'none' }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-xs text-brand-white/90 p-3.5 max-h-96 overflow-y-auto font-manrope">{message.body_text}</pre>
          )}
        </div>
      )}
    </div>
  );
}
