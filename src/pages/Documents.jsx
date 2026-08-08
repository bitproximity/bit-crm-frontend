import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  FileText, Plus, ChevronRight, ChevronDown, Trash2, Bold, Italic, Underline,
  List, ListOrdered, Link as LinkIcon, Paperclip, X,
} from 'lucide-react';

function buildTree(flat) {
  const byParent = {};
  flat.forEach((d) => {
    const key = d.parent_id || 'root';
    byParent[key] = byParent[key] || [];
    byParent[key].push(d);
  });
  return byParent;
}

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

function TreeNode({ node, byParent, depth, activeId, onSelect, onAddChild, onDelete, expanded, toggleExpand }) {
  const children = byParent[node.id] || [];
  const isExpanded = expanded[node.id];
  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition ${
          activeId === node.id ? 'bg-brand-violet/15 text-brand-ice' : 'hover:bg-brand-bg text-brand-white'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
          className={`w-4 h-4 flex items-center justify-center text-brand-muted flex-shrink-0 ${children.length === 0 ? 'invisible' : ''}`}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <FileText size={13} className="text-brand-muted flex-shrink-0" />
        <span className="truncate flex-1">{node.title || 'Sin título'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          className="opacity-0 group-hover:opacity-100 text-brand-muted hover:text-brand-ice flex-shrink-0"
          title="Nueva subpágina"
        >
          <Plus size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-400 flex-shrink-0"
          title="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {isExpanded && children.map((c) => (
        <TreeNode
          key={c.id} node={c} byParent={byParent} depth={depth + 1}
          activeId={activeId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete}
          expanded={expanded} toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}

const FONTS = ['Manrope', 'Sora', 'Space Mono', 'Georgia', 'Arial', 'Courier New'];
const COLORS = ['#FBFAFF', '#D9F6FF', '#8500FF', '#E000FF', '#22c55e', '#f59e0b', '#ef4444', '#94a3b8'];
const SIZES = [{ label: 'Pequeño', value: '2' }, { label: 'Normal', value: '3' }, { label: 'Grande', value: '5' }, { label: 'Enorme', value: '7' }];

export default function Documents() {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
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

  const openDoc = async (id) => {
    setActiveId(id);
    setError('');
    try {
      const data = await api.get(`/api/documents/${id}`);
      setDoc(data);
      setTitle(data.title);
      setSaveState('idle');
      const raw = data.content || '';
      const isHtml = /^\s*</.test(raw);
      if (editorRef.current) editorRef.current.innerHTML = isHtml ? raw : markdownToHtml(raw);
      savedRange.current = null;
      api.get(`/api/document-files?document_id=${id}`).then(setFiles).catch(() => setFiles([]));
    } catch (err) {
      setError(err.message || 'No se pudo abrir la página.');
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const createDoc = async (parentId) => {
    setError('');
    try {
      const created = await api.post('/api/documents', { title: 'Sin título', content: '', parent_id: parentId || null });
      if (parentId) setExpanded((prev) => ({ ...prev, [parentId]: true }));
      await loadTree();
      openDoc(created.id);
    } catch (err) {
      setError(err.message || 'No se pudo crear la página.');
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('¿Eliminar esta página y todas sus subpáginas?')) return;
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
    if (!window.confirm('¿Eliminar este archivo?')) return;
    await api.delete(`/api/document-files/${fileId}`);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const byParent = buildTree(tree);
  const roots = byParent['root'] || [];

  const toolBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-white hover:bg-brand-bg transition';

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)]">
      {/* Sidebar árbol de páginas */}
      <div className="w-72 border-r border-brand-border p-4 overflow-y-auto flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline text-lg font-semibold">Documentos</h1>
          <button onClick={() => createDoc(null)} className="text-brand-muted hover:text-brand-ice" title="Nueva página">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-0.5">
          {error && (
            <div className="mb-3 px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}
          {roots.map((n) => (
            <TreeNode
              key={n.id} node={n} byParent={byParent} depth={0}
              activeId={activeId} onSelect={openDoc} onAddChild={createDoc} onDelete={deleteDoc}
              expanded={expanded} toggleExpand={toggleExpand}
            />
          ))}
          {roots.length === 0 && (
            <div className="text-brand-muted text-xs py-4 text-center">Sin páginas todavía.</div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {!doc ? (
          <div className="h-full flex items-center justify-center text-brand-muted text-sm">
            Selecciona una página o crea una nueva.
          </div>
        ) : (
          <div>
            {/* Barra de formato */}
            <div className="sticky top-0 z-10 flex items-center gap-1 px-6 py-2 border-b border-brand-border bg-brand-bg/95 backdrop-blur">
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
              <div className="ml-auto text-xs text-brand-muted font-tech">
                {saveState === 'saving' && 'Guardando...'}
                {saveState === 'saved' && 'Guardado'}
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-10 py-8">
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
                  <div className="text-xs text-brand-muted uppercase mb-2">Archivos adjuntos</div>
                  <div className="space-y-1.5">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between bg-brand-panel border border-brand-border rounded-lg px-3 py-2 text-sm">
                        <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-ice hover:underline truncate">
                          <Paperclip size={13} className="flex-shrink-0" /> {f.file_name}
                        </a>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-brand-muted font-tech">{(f.file_size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => removeFile(f.id)} className="text-brand-muted hover:text-red-400 text-xs"><X size={13} /></button>
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
