import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmModal';
import {
  FileText, Plus, Bold, Italic, Underline, Building2, FolderKanban, CircleDollarSign,
  List, ListOrdered, Link as LinkIcon, Paperclip, X, MapPin, ChevronRight, Inbox,
} from 'lucide-react';
import DocumentsSidebar, { AssignPopover, groupDocuments } from '../components/DocumentsSidebar';

// Conversión ligera de markdown -> HTML, solo para migrar contenido viejo la primera vez que se abre.
function markdownToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^\* (.*)$/gm, '<li>$1</li>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .split('\n\n').map((p) => (/^<(h\d|ul|li)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`)).join('');
  return html;
}

const FONTS = ['Manrope', 'Sora', 'Space Mono', 'Georgia', 'Arial', 'Courier New'];
const COLORS = ['#FBFAFF', '#D9F6FF', '#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#ef4444', '#94a3b8'];
const SIZES = [{ label: 'Pequeño', value: '2' }, { label: 'Normal', value: '3' }, { label: 'Grande', value: '5' }, { label: 'Enorme', value: '7' }];

export default function Documents() {
  const confirm = useConfirm();
  const [tree, setTree] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const saveTimer = useRef(null);
  const editorRef = useRef(null);

  const loadTree = () => api.get('/api/documents/tree').then(setTree).catch((err) => setError(err.message || 'No se pudo cargar el árbol de documentos.'));

  useEffect(() => { loadTree(); }, []);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) openDoc(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openDoc = async (id, { assign = false } = {}) => {
    setActiveId(id);
    setAssignOpen(assign);
    setError('');
    try {
      const data = await api.get(`/api/documents/${id}`);
      setDoc(data);
      setTitle(data.title);
      setSaveState('idle');
      savedRange.current = null;
      api.get(`/api/document-files?document_id=${id}`).then(setFiles).catch(() => setFiles([]));
    } catch (err) {
      setError(err.message || 'No se pudo abrir la página.');
    }
  };

  // Subpágina: hereda empresa/proyecto/trato del padre (lo resuelve el backend)
  const createDoc = async (parentId) => {
    setError('');
    try {
      const created = await api.post('/api/documents', { title: 'Sin título', content: '', parent_id: parentId || null });
      await loadTree();
      openDoc(created.id);
    } catch (err) {
      setError(err.message || 'No se pudo crear la página.');
    }
  };

  // Documento nuevo dentro de una empresa/proyecto/trato. Sin contexto (botón "Nuevo"),
  // se abre directo el selector para asignarlo — así no se vuelven a acumular sueltos.
  const createIn = async (assoc) => {
    setError('');
    try {
      const created = await api.post('/api/documents', { title: 'Sin título', content: '', ...(assoc || {}) });
      await loadTree();
      openDoc(created.id, { assign: !assoc });
    } catch (err) {
      setError(err.message || 'No se pudo crear el documento.');
    }
  };

  const afterAssign = async () => {
    setAssignOpen(false);
    await loadTree();
    if (activeId) {
      const data = await api.get(`/api/documents/${activeId}`).catch(() => null);
      if (data) setDoc(data);
    }
  };

  const deleteDoc = async (id) => {
    const ok = await confirm({
      title: 'Eliminar página',
      message: '¿Eliminar esta página y todas sus subpáginas?',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/documents/${id}`);
      if (activeId === id) { setActiveId(null); setDoc(null); }
      loadTree();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la página.');
    }
  };

  const scheduleSave = useCallback((newTitle, newContentHtml) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.patch(`/api/documents/${activeId}`, { title: newTitle, content: newContentHtml });
      setSaveState('saved');
      loadTree();
    }, 700);
  }, [activeId]);

  const onTitleChange = (v) => { setTitle(v); scheduleSave(v, editorRef.current?.innerHTML || ''); };
  const onEditorInput = () => { scheduleSave(title, editorRef.current?.innerHTML || ''); };

  // contentEditable pierde la selección de texto en cuanto un <select> del toolbar recibe el foco.
  // Por eso guardamos el Range activo mientras el usuario escribe/selecciona dentro del editor,
  // y lo restauramos justo antes de aplicar cualquier comando de formato.
  const savedRange = useRef(null);
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  };

  const exec = (command, value) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    onEditorInput();
  };

  const insertLink = () => {
    const url = window.prompt('URL del link:');
    if (url) exec('createLink', url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_id', activeId);
      await api.upload('/api/document-files', formData);
      const updated = await api.get(`/api/document-files?document_id=${activeId}`);
      setFiles(updated);
    } catch (err) {
      alert(err.message || 'No se pudo subir el archivo.');
    }
    setUploadingFile(false);
    e.target.value = '';
  };

  const removeFile = async (fileId) => {
    const ok = await confirm({ title: 'Eliminar archivo', message: '¿Eliminar este archivo?', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await api.delete(`/api/document-files/${fileId}`);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const grouped = groupDocuments(tree);
  const recent = [...tree].filter((d) => d.updated_at).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8);

  // El contenido se carga en el editor DESPUÉS de que se monta: antes se asignaba dentro de
  // openDoc, cuando el editor todavía no existía en pantalla (al abrir el primer documento
  // desde la vista vacía), así que se veía en blanco — y si alguien escribía encima, el
  // autoguardado pisaba el contenido real con ese texto.
  useEffect(() => {
    if (!doc || !editorRef.current) return;
    const raw = doc.content || '';
    editorRef.current.innerHTML = /^\s*</.test(raw) ? raw : markdownToHtml(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const toolBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg transition';

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)]">
      <DocumentsSidebar
        tree={tree}
        activeId={activeId}
        onSelect={(id) => openDoc(id)}
        onAddChild={createDoc}
        onDelete={deleteDoc}
        onCreateIn={createIn}
        error={error}
      />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {!doc ? (
          <DocumentsOverview grouped={grouped} recent={recent} total={tree.length} onOpen={(id) => openDoc(id)} onCreate={() => createIn(null)} />
        ) : (
          <div>
            {/* Barra de formato */}
            <div className="sticky top-0 z-10 flex items-center gap-1 px-6 py-2.5 border-b border-brand-border bg-brand-panel/95 backdrop-blur">
              <button onClick={() => exec('bold')} className={toolBtn} title="Negrita"><Bold size={15} /></button>
              <button onClick={() => exec('italic')} className={toolBtn} title="Cursiva"><Italic size={15} /></button>
              <button onClick={() => exec('underline')} className={toolBtn} title="Subrayado"><Underline size={15} /></button>
              <div className="w-px h-5 bg-brand-border mx-1" />
              <select onChange={(e) => exec('fontName', e.target.value)} defaultValue="" className="bg-transparent text-xs text-brand-muted hover:text-white px-1 py-1.5 rounded focus:outline-none">
                <option value="" disabled>Fuente</option>
                {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              <select onChange={(e) => exec('fontSize', e.target.value)} defaultValue="" className="bg-transparent text-xs text-brand-muted hover:text-white px-1 py-1.5 rounded focus:outline-none">
                <option value="" disabled>Tamaño</option>
                {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select onChange={(e) => exec('formatBlock', e.target.value)} defaultValue="" className="bg-transparent text-xs text-brand-muted hover:text-white px-1 py-1.5 rounded focus:outline-none">
                <option value="" disabled>Título</option>
                <option value="p">Párrafo</option>
                <option value="h1">Título 1</option>
                <option value="h2">Título 2</option>
                <option value="h3">Título 3</option>
              </select>
              <div className="relative">
                <button onClick={() => setColorMenuOpen(!colorMenuOpen)} className={toolBtn} title="Color de texto">
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-brand-violet to-brand-magenta block" />
                </button>
                {colorMenuOpen && (
                  <div className="absolute z-20 mt-1 left-0 bg-brand-panel border border-brand-border rounded-lg shadow-xl p-2 flex gap-1.5">
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => { exec('foreColor', c); setColorMenuOpen(false); }} className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-brand-border mx-1" />
              <button onClick={() => exec('insertUnorderedList')} className={toolBtn} title="Lista"><List size={15} /></button>
              <button onClick={() => exec('insertOrderedList')} className={toolBtn} title="Lista numerada"><ListOrdered size={15} /></button>
              <button onClick={insertLink} className={toolBtn} title="Insertar link"><LinkIcon size={15} /></button>
              <div className="w-px h-5 bg-brand-border mx-1" />
              <label className={`${toolBtn} cursor-pointer`} title="Adjuntar PDF, PPT u otro archivo">
                {uploadingFile ? <span className="text-[9px]">...</span> : <Paperclip size={15} />}
                <input type="file" className="hidden" disabled={uploadingFile} onChange={handleFileUpload} />
              </label>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-brand-muted font-tech">
                {saveState === 'saving' && (
                  <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> Guardando...</>
                )}
                {saveState === 'saved' && (
                  <><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Guardado</>
                )}
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-10 py-8">
              <div className="relative flex items-center gap-1.5 mb-3 text-xs text-brand-muted min-h-[28px]">
                {doc.companies ? (
                  <Link to={`/companies/${doc.companies.id}`} className="flex items-center gap-1 hover:text-brand-ice"><Building2 size={12} /> {doc.companies.name}</Link>
                ) : null}
                {doc.projects ? (
                  <>
                    {doc.companies && <ChevronRight size={11} />}
                    <Link to={`/projects/${doc.projects.id}`} className="flex items-center gap-1 hover:text-brand-ice"><FolderKanban size={12} /> {doc.projects.name}</Link>
                  </>
                ) : null}
                {doc.deals ? (
                  <>
                    {(doc.companies || doc.projects) && <ChevronRight size={11} />}
                    <Link to={`/deals/${doc.deals.id}`} className="flex items-center gap-1 hover:text-brand-ice"><CircleDollarSign size={12} /> {doc.deals.title}</Link>
                  </>
                ) : null}
                {!doc.companies && !doc.projects && !doc.deals && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-200/90">Sin asignar</span>
                )}
                <button
                  onClick={() => setAssignOpen(true)}
                  className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-md border border-brand-border hover:border-brand-violet/50 hover:text-brand-ice transition"
                >
                  <MapPin size={11} /> {doc.companies || doc.projects || doc.deals ? 'Mover' : 'Asignar'}
                </button>
                {assignOpen && <AssignPopover key={doc.id} doc={doc} onClose={() => setAssignOpen(false)} onSaved={afterAssign} />}
              </div>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Sin título"
                className="w-full bg-transparent font-headline text-3xl font-semibold focus:outline-none mb-4 placeholder:text-brand-muted/50"
              />

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={onEditorInput}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                data-placeholder="Escribe aquí..."
                className="doc-editor w-full min-h-[400px] bg-transparent text-sm leading-relaxed focus:outline-none font-manrope"
              />

              {files.length > 0 && (
                <div className="mt-8 pt-4 border-t border-brand-border">
                  <div className="text-xs text-brand-muted uppercase mb-2 flex items-center gap-1.5">
                    <Paperclip size={11} /> Archivos adjuntos
                  </div>
                  <div className="space-y-1.5">
                    {files.map((f, i) => (
                      <div key={f.id} className="flex items-center justify-between bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm stagger-item hover:border-brand-violet/40 transition" style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}>
                        <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-ice hover:underline truncate min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-brand-violet/15 flex items-center justify-center flex-shrink-0">
                            <Paperclip size={12} className="text-brand-ice" />
                          </span>
                          <span className="truncate">{f.file_name}</span>
                        </a>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-brand-muted font-tech">{(f.file_size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => removeFile(f.id)} className="icon-btn text-brand-muted hover:text-red-400"><X size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .doc-editor h1 { font-family: 'Sora', sans-serif; font-size: 1.75rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .doc-editor h2 { font-family: 'Sora', sans-serif; font-size: 1.4rem; font-weight: 600; margin: 0.875rem 0 0.5rem; }
        .doc-editor h3 { font-family: 'Sora', sans-serif; font-size: 1.15rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
        .doc-editor p { margin: 0.5rem 0; }
        .doc-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .doc-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .doc-editor a { color: #D9F6FF; text-decoration: underline; }
        .doc-editor:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

// Vista inicial (sin documento abierto): resumen por empresa + recientes, en vez de un
// panel vacío.
function DocumentsOverview({ grouped, recent, total, onOpen, onCreate }) {
  const unassignedCount = grouped.countDeep(grouped.unassigned);
  return (
    <div className="max-w-4xl mx-auto px-10 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-headline text-2xl font-semibold">Documentos</h2>
          <p className="text-sm text-brand-muted mt-1">{total} documento{total !== 1 ? 's' : ''} · organizados por empresa y proyecto</p>
        </div>
        <button onClick={onCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-white text-sm font-medium hover:opacity-90 transition">
          <Plus size={14} /> Nuevo documento
        </button>
      </div>

      {unassignedCount > 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-sm">
          <Inbox size={16} className="text-yellow-300 flex-shrink-0" />
          <span className="text-yellow-100/90">{unassignedCount} documento{unassignedCount !== 1 ? 's' : ''} sin empresa ni proyecto. Están al final del panel izquierdo, en <strong>Sin asignar</strong>.</span>
        </div>
      )}

      {grouped.companies.length > 0 && (
        <>
          <div className="text-[10px] font-tech uppercase tracking-wider text-brand-muted mb-2">Por empresa</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {grouped.companies.map((c) => {
              const first = c.general[0] || c.projects[0]?.docs[0] || c.deals[0]?.docs[0];
              return (
                <button
                  key={c.id}
                  onClick={() => first && onOpen(first.id)}
                  className="text-left bg-brand-panel border border-brand-border rounded-xl p-4 hover:border-brand-violet/40 transition panel-depth"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-brand-ice flex-shrink-0" />
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <div className="text-xs text-brand-muted">
                    {c.total} documento{c.total !== 1 ? 's' : ''}
                    {c.projects.length > 0 && ` · ${c.projects.length} proyecto${c.projects.length !== 1 ? 's' : ''}`}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="text-[10px] font-tech uppercase tracking-wider text-brand-muted mb-2">Editados recientemente</div>
          <div className="bg-brand-panel border border-brand-border rounded-xl divide-y divide-brand-border/60">
            {recent.map((d) => (
              <button key={d.id} onClick={() => onOpen(d.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-bg/60 transition">
                <FileText size={14} className="text-brand-muted flex-shrink-0" />
                <span className="truncate flex-1">{d.title || 'Sin título'}</span>
                <span className="text-xs text-brand-muted truncate max-w-[45%]">
                  {[d.company_name, d.project_name || d.deal_title].filter(Boolean).join(' › ') || 'Sin asignar'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {total === 0 && (
        <div className="text-center text-brand-muted text-sm py-16 border border-dashed border-brand-border rounded-xl">
          Todavía no hay documentos. Crea el primero desde una empresa, un proyecto o con el botón de arriba.
        </div>
      )}
    </div>
  );
}
