import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { FileText, Plus, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

function buildTree(flat) {
  const byParent = {};
  flat.forEach((d) => {
    const key = d.parent_id || 'root';
    byParent[key] = byParent[key] || [];
    byParent[key].push(d);
  });
  return byParent;
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

export default function Documents() {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [error, setError] = useState('');
  const saveTimer = useRef(null);

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
      setContent(data.content || '');
      setSaveState('idle');
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

  const scheduleSave = useCallback((newTitle, newContent) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.patch(`/api/documents/${activeId}`, { title: newTitle, content: newContent });
      setSaveState('saved');
      loadTree();
    }, 700);
  }, [activeId]);

  const onTitleChange = (v) => { setTitle(v); scheduleSave(v, content); };
  const onContentChange = (v) => { setContent(v); scheduleSave(title, v); };

  const byParent = buildTree(tree);
  const roots = byParent['root'] || [];

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
          <div className="max-w-3xl mx-auto px-10 py-10">
            <div className="text-xs text-brand-muted font-tech mb-2 h-4">
              {saveState === 'saving' && 'Guardando...'}
              {saveState === 'saved' && 'Guardado'}
            </div>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Sin título"
              className="w-full bg-transparent font-headline text-3xl font-semibold focus:outline-none mb-4 placeholder:text-brand-muted/50"
            />
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Escribe aquí... (soporta markdown)"
              rows={24}
              className="w-full bg-transparent text-sm leading-relaxed focus:outline-none resize-none placeholder:text-brand-muted/50 font-manrope"
            />
          </div>
        )}
      </div>
    </div>
  );
}
