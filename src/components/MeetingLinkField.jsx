// Campo «Link de la reunión»: pega el enlace (Meet, Zoom, Teams…) y se envía al evento de Google
// Calendar de la tarea/actividad. Reconoce el servicio, valida mientras escribes y deja abrir/copiar.
import { useEffect, useState } from 'react';
import { Video, ExternalLink, Copy, Check, Link2 } from 'lucide-react';
import { cleanMeetingUrl, meetingProvider } from '../lib/meetingLink';
import { safeUrl } from '../lib/safeUrl';

export default function MeetingLinkField({ value, onSave, onDraft, hint = true }) {
  const [text, setText] = useState(value || '');
  const [copied, setCopied] = useState(false);
  useEffect(() => { setText(value || ''); }, [value]);

  const trimmed = text.trim();
  const clean = cleanMeetingUrl(trimmed);
  const invalid = trimmed !== '' && !clean;
  const provider = clean ? meetingProvider(clean) : null;
  const changed = (clean || '') !== (value || '') && !invalid;

  const commit = () => { if (changed) onSave?.(clean || ''); };

  const copy = () => {
    if (!clean) return;
    navigator.clipboard?.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div>
      <div className={`flex items-center gap-2 rounded-xl border bg-brand-bg transition ${invalid ? 'border-red-500/50' : 'border-brand-border focus-within:border-brand-violet focus-within:ring-2 focus-within:ring-brand-violet/20'}`}>
        <span className="pl-3.5 text-brand-muted">{provider ? <Video size={15} className="text-brand-ice" /> : <Link2 size={15} />}</span>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); onDraft?.(cleanMeetingUrl(e.target.value) || ''); }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder="Pega el link de Meet, Zoom o Teams"
          aria-label="Link de la reunión"
          className="flex-1 min-w-0 bg-transparent py-2.5 pr-2 text-sm placeholder:text-brand-muted/60 focus:outline-none focus-visible:outline-none focus:shadow-none"
        />
        {provider && <span className="hidden sm:inline text-[10px] font-tech uppercase tracking-wide text-brand-ice bg-brand-violet/15 px-2 py-0.5 rounded-full whitespace-nowrap">{provider}</span>}
        {clean && (
          <div className="flex items-center pr-1.5">
            <button type="button" onClick={copy} title="Copiar link" className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-white">
              {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} />}
            </button>
            <a href={safeUrl(clean)} target="_blank" rel="noreferrer" title="Abrir reunión" className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-ice">
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
      {invalid && <p className="text-[11px] text-red-300 mt-1.5">Ese texto no parece un link. Pega la dirección completa, por ejemplo https://meet.google.com/abc-defg-hij</p>}
      {!invalid && hint && <p className="text-[11px] text-brand-muted mt-1.5">Se agrega al evento de Google Calendar para que se vea y se abra desde ahí.</p>}
    </div>
  );
}
