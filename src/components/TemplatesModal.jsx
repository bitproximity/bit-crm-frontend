// Plantillas de tareas para proyectos: crear, editar y borrar. Cada plantilla es una lista de
// tareas con "día +N" (días desde el inicio del proyecto). Se aplican al crear un proyecto o
// desde el detalle de un proyecto existente ("Cargar plantilla").
import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Trash2, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, primaryBtn, ghostBtn } from './Modal';

const emptyItem = () => ({ title: '', days_offset: 0 });

function Editor({ initial, onCancel, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [items, setItems] = useState(
    initial?.task_template_items?.length
      ? initial.task_template_items.map((i) => ({ title: i.title, days_offset: i.days_offset || 0 }))
      : [emptyItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setItem = (idx, patch) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const move = (idx, dir) => setItems((arr) => {
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr]; [copy[idx], copy[j]] = [copy[j], copy[idx]]; return copy;
  });

  const save = async () => {
    const clean = items.filter((i) => i.title.trim()).map((i) => ({ title: i.title.trim(), days_offset: Number(i.days_offset) || 0 }));
    if (!name.trim()) { setError('Ponle un nombre a la plantilla.'); return; }
    if (!clean.length) { setError('Agrega al menos una tarea.'); return; }
    setSaving(true); setError('');
    try {
      const body = { name: name.trim(), description: description.trim() || null, items: clean };
      if (initial?.id) await api.patch(`/api/templates/${initial.id}`, body);
      else await api.post('/api/templates', body);
      onSaved();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
      <Field label="Nombre">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Onboarding Bit WiFi" className={inputCls} />
      </Field>
      <Field label="Descripción (opcional)">
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-brand-muted">Tareas · el día se cuenta desde el inicio del proyecto</span>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[10px] font-tech text-brand-muted w-5 text-right">{idx + 1}</span>
              <input
                value={it.title}
                onChange={(e) => setItem(idx, { title: e.target.value })}
                placeholder="Tarea"
                className={`${inputCls} flex-1`}
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-brand-muted">día +</span>
                <input
                  type="number" min="0" max="365"
                  value={it.days_offset}
                  onChange={(e) => setItem(idx, { days_offset: e.target.value })}
                  className={`${inputCls} w-16 px-2 text-center`}
                />
              </div>
              <button type="button" onClick={() => move(idx, -1)} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-white" title="Subir"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(idx, 1)} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-brand-white" title="Bajar"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))} className="icon-btn p-1.5 rounded-lg text-brand-muted hover:text-red-300" title="Quitar"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems((arr) => [...arr, emptyItem()])} className="mt-2 flex items-center gap-1.5 text-xs text-brand-ice hover:text-brand-white">
          <Plus size={13} /> Agregar tarea
        </button>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={ghostBtn}>Cancelar</button>
        <button type="button" onClick={save} disabled={saving} className={primaryBtn}>{saving ? 'Guardando…' : 'Guardar plantilla'}</button>
      </div>
    </div>
  );
}

export default function TemplatesModal({ onClose, onChanged }) {
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | template
  const [error, setError] = useState('');

  const load = () => api.get('/api/templates').then(setTemplates).catch((e) => { setError(e.message); setTemplates([]); });
  useEffect(() => { load(); }, []);

  const remove = async (t) => {
    if (!window.confirm(`¿Borrar la plantilla «${t.name}»? Los proyectos que ya la usaron no cambian.`)) return;
    try { await api.delete(`/api/templates/${t.id}`); load(); onChanged?.(); } catch (e) { setError(e.message); }
  };

  return (
    <Modal
      title={editing ? (editing === 'new' ? 'Nueva plantilla' : `Editar «${editing.name}»`) : 'Plantillas de proyecto'}
      subtitle={editing ? null : 'Tareas que se cargan solas al crear un proyecto'}
      icon={ClipboardList}
      onClose={onClose}
      width="max-w-2xl"
    >
      {editing ? (
        <Editor
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); onChanged?.(); }}
        />
      ) : (
        <div className="space-y-3">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
          {templates === null && <div className="text-sm text-brand-muted">Cargando…</div>}
          {templates?.length === 0 && <div className="text-sm text-brand-muted">Todavía no hay plantillas.</div>}
          {templates?.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-brand-border bg-brand-bg/40">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-xs text-brand-muted">
                  {t.task_template_items?.length || 0} tareas
                  {t.task_template_items?.length ? ` · ${Math.max(...t.task_template_items.map((i) => i.days_offset || 0))} días` : ''}
                  {t.description ? ` · ${t.description}` : ''}
                </div>
              </div>
              <button onClick={() => setEditing(t)} className="icon-btn p-2 rounded-lg text-brand-muted hover:text-brand-white" title="Editar"><Pencil size={15} /></button>
              <button onClick={() => remove(t)} className="icon-btn p-2 rounded-lg text-brand-muted hover:text-red-300" title="Borrar"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setEditing('new')} className={`${primaryBtn} flex items-center gap-2`}>
            <Plus size={15} /> Nueva plantilla
          </button>
        </div>
      )}
    </Modal>
  );
}
