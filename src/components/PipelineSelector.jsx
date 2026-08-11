import { useState, useRef } from 'react';
import { api } from '../lib/api';
import {
  LayoutGrid, ChevronDown, Search, GripVertical, Eye, EyeOff,
  Palette, LayoutTemplate, Plus, ArrowLeft, Check,
} from 'lucide-react';

const STAGE_COLORS = ['#8500FF', '#E000FF', '#D9F6FF', '#22C55E', '#F59E0B', '#EF4444', '#6B7280'];

// ── Submenú: Reordenar embudos (drag & drop) ──
function ReorderPanel({ pipelines, onBack, onSaved }) {
  const [order, setOrder] = useState(pipelines);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef(null);

  const handleDragStart = (i) => { dragIndex.current = i; };
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === i) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(i, 0, moved);
    dragIndex.current = i;
    setOrder(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/api/pipelines/reorder', { ordered_ids: order.map((p) => p.id) });
      onSaved(order);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Reordenar embudos" onBack={onBack} />
      <div className="max-h-72 overflow-y-auto py-1">
        {order.map((p, i) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-white cursor-grab active:cursor-grabbing hover:bg-brand-bg transition"
          >
            <GripVertical size={14} className="text-brand-muted shrink-0" />
            {p.name}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-brand-border">
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-brand-violet text-sm font-medium text-white hover:bg-brand-violet/90 transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar orden'}
        </button>
      </div>
    </div>
  );
}

// ── Submenú: Visibilidad del embudo ──
function VisibilityPanel({ pipelines, onBack, onToggled }) {
  const [busyId, setBusyId] = useState(null);

  const toggle = async (p) => {
    setBusyId(p.id);
    try {
      const updated = await api.patch(`/api/pipelines/${p.id}/visibility`, { is_hidden: !p.is_hidden });
      onToggled(updated);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PanelHeader title="Visibilidad del embudo" onBack={onBack} />
      <p className="px-4 py-2 text-xs text-brand-muted">Los embudos ocultos no aparecen en el selector, pero sus tratos siguen intactos.</p>
      <div className="max-h-72 overflow-y-auto py-1">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p)}
            disabled={busyId === p.id}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-brand-white hover:bg-brand-bg transition disabled:opacity-50"
          >
            <span className={p.is_hidden ? 'text-brand-muted' : ''}>{p.name}</span>
            {p.is_hidden ? <EyeOff size={14} className="text-brand-muted" /> : <Eye size={14} className="text-brand-ice" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Submenú: Personalizar las tarjetas del trato ──
const CARD_FIELD_LABELS = {
  company: 'Empresa',
  contact: 'Contacto',
  value: 'Valor',
  due_date_warning: 'Alerta de vencimiento',
  avatar: 'Avatar del contacto',
};

function CardFieldsPanel({ onBack }) {
  const [fields, setFields] = useState(null);
  const [saving, setSaving] = useState(false);

  useState(() => {
    api.get('/api/settings/deal_card_fields').then(setFields).catch(() => setFields({}));
  });

  const toggle = (key) => setFields((f) => ({ ...f, [key]: !f[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/api/settings/deal_card_fields', fields);
    } finally {
      setSaving(false);
    }
  };

  if (!fields) return <div className="p-4 text-sm text-brand-muted">Cargando...</div>;

  return (
    <div>
      <PanelHeader title="Personalizar las tarjetas del trato" onBack={onBack} />
      <div className="py-1">
        {Object.entries(CARD_FIELD_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-brand-white hover:bg-brand-bg transition"
          >
            {label}
            <span className={`w-4 h-4 rounded border flex items-center justify-center ${fields[key] ? 'bg-brand-violet border-brand-violet' : 'border-brand-border'}`}>
              {fields[key] && <Check size={11} className="text-white" />}
            </span>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-brand-border">
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-brand-violet text-sm font-medium text-white hover:bg-brand-violet/90 transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// ── Submenú: Configuración del diseño del embudo (color por etapa) ──
function DesignPanel({ pipeline, onBack, onStageColored }) {
  const setColor = async (stage, color) => {
    const updated = await api.patch(`/api/pipelines/stages/${stage.id}`, { color });
    onStageColored(stage.id, updated.color);
  };

  return (
    <div>
      <PanelHeader title="Configuración del diseño del embudo" onBack={onBack} />
      <p className="px-4 py-2 text-xs text-brand-muted">Color de columna por etapa, para "{pipeline.name}".</p>
      <div className="max-h-72 overflow-y-auto py-1">
        {[...pipeline.pipeline_stages].sort((a, b) => a.position - b.position).map((stage) => (
          <div key={stage.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-brand-white">
            <span className="truncate">{stage.name}</span>
            <div className="flex items-center gap-1">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(stage, c)}
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: c, outline: stage.color === c ? '2px solid white' : 'none', outlineOffset: '1px' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-brand-border">
      <button onClick={onBack} className="p-1 rounded hover:bg-brand-bg transition">
        <ArrowLeft size={14} className="text-brand-muted" />
      </button>
      <span className="text-sm font-medium text-brand-white">{title}</span>
    </div>
  );
}

// ── Componente principal ──
export default function PipelineSelector({ pipelines, pipelineId, onSelect, onPipelinesChanged, onCreateClick }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'reorder' | 'visibility' | 'cards' | 'design'
  const [query, setQuery] = useState('');

  const pipeline = pipelines.find((p) => p.id === pipelineId);
  const visiblePipelines = pipelines.filter((p) => !p.is_hidden);
  const filtered = visiblePipelines.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const close = () => { setOpen(false); setPanel(null); setQuery(''); };

  const patchPipeline = (updated) => {
    onPipelinesChanged(pipelines.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition"
      >
        <LayoutGrid size={14} className="text-brand-muted" />
        <span>{pipeline?.name}</span>
        <ChevronDown size={14} className="text-brand-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-brand-panel border border-brand-border rounded-xl shadow-xl z-20 overflow-hidden">
          {panel === 'reorder' && (
            <ReorderPanel
              pipelines={visiblePipelines}
              onBack={() => setPanel(null)}
              onSaved={(ordered) => {
                onPipelinesChanged(ordered.concat(pipelines.filter((p) => p.is_hidden)));
                setPanel(null);
              }}
            />
          )}
          {panel === 'visibility' && (
            <VisibilityPanel pipelines={pipelines} onBack={() => setPanel(null)} onToggled={patchPipeline} />
          )}
          {panel === 'cards' && <CardFieldsPanel onBack={() => setPanel(null)} />}
          {panel === 'design' && pipeline && (
            <DesignPanel
              pipeline={pipeline}
              onBack={() => setPanel(null)}
              onStageColored={(stageId, color) => {
                onPipelinesChanged(pipelines.map((p) =>
                  p.id !== pipeline.id ? p : { ...p, pipeline_stages: p.pipeline_stages.map((s) => (s.id === stageId ? { ...s, color } : s)) }
                ));
              }}
            />
          )}

          {panel === null && (
            <>
              <div className="p-2 border-b border-brand-border">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-brand-bg">
                  <Search size={13} className="text-brand-muted shrink-0" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Búsqueda de embudos"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-brand-muted"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onSelect(p.id); close(); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-brand-bg transition flex items-center justify-between ${p.id === pipelineId ? 'text-brand-ice' : 'text-brand-white'}`}
                  >
                    {p.name}
                    {p.id === pipelineId && <span className="text-brand-violet">✓</span>}
                  </button>
                ))}
                {filtered.length === 0 && <div className="px-4 py-3 text-sm text-brand-muted">Sin resultados.</div>}
              </div>

              <div className="border-t border-brand-border py-1">
                <MenuItem icon={GripVertical} label="Reordenar embudos" onClick={() => setPanel('reorder')} />
                <MenuItem icon={Eye} label="Visibilidad del embudo" onClick={() => setPanel('visibility')} />
                <MenuItem icon={LayoutTemplate} label="Personalizar las tarjetas del trato" onClick={() => setPanel('cards')} />
                <MenuItem icon={Palette} label="Configuración del diseño del embudo" onClick={() => setPanel('design')} />
              </div>

              <div className="border-t border-brand-border py-1">
                <button
                  onClick={() => { close(); onCreateClick(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand-violet hover:bg-brand-bg transition"
                >
                  <Plus size={14} /> Nuevo embudo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-muted hover:bg-brand-bg hover:text-brand-white transition">
      <Icon size={14} />
      {label}
    </button>
  );
}
