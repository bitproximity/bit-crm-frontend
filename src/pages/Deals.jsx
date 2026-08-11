import { SkeletonPage } from '../components/Skeleton';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import AddDealModal from '../components/AddDealModal';
import { csvToDeals } from '../lib/csv';
import {
  LayoutGrid, List, DollarSign, Archive, Plus, Search,
  Info, ChevronDown, User, AlertTriangle, Upload,
} from 'lucide-react';

function isOverdue(deal) {
  return deal.expected_close_date && new Date(deal.expected_close_date) < new Date();
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function Deals() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [pipelineMenuOpen, setPipelineMenuOpen] = useState(false);
  const [deals, setDeals] = useState([]);
  const [archivedDeals, setArchivedDeals] = useState([]);
  const [view, setView] = useState('board'); // board | list | value | archive
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const pipeline = pipelines.find((p) => p.id === pipelineId);

  const loadPipelines = async () => {
    const list = await api.get('/api/pipelines');
    setPipelines(list);
    if (list.length && !pipelineId) setPipelineId(list[0].id);
  };

  const loadDeals = async (pid) => {
    if (!pid) return;
    const dealsData = await api.get(`/api/deals?pipeline_id=${pid}&status=abierto`);
    setDeals(dealsData);
  };

  const loadArchived = async (pid) => {
    if (!pid) return;
    const data = await api.get(`/api/deals?pipeline_id=${pid}&status=ganado,perdido`);
    setArchivedDeals(data);
  };

  useEffect(() => {
    loadPipelines().catch(console.error);
  }, []);

  useEffect(() => {
    loadDeals(pipelineId).catch(console.error);
  }, [pipelineId]);

  useEffect(() => {
    if (view === 'archive' && pipelineId) loadArchived(pipelineId).catch(console.error);
  }, [view, pipelineId]);

  const onDrop = async (stageId, dealId) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d)));
    await api.patch(`/api/deals/${dealId}/stage`, { stage_id: stageId });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !pipelineId) return;

    const text = await file.text();
    const parsedDeals = csvToDeals(text);

    if (parsedDeals.length === 0) {
      setImportResult({ error: 'No se encontraron deals válidos. Verifica que el CSV tenga una columna de título.' });
      e.target.value = '';
      return;
    }

    setImporting(true);
    const result = await api.post('/api/deals/import', { pipeline_id: pipelineId, deals: parsedDeals });
    setImporting(false);
    setImportResult(result);
    e.target.value = '';
    loadDeals(pipelineId);
  };

  const filteredDeals = search
    ? deals.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()) || d.companies?.name?.toLowerCase().includes(search.toLowerCase()))
    : deals;

  const stageTotal = (stageId) =>
    filteredDeals.filter((d) => d.stage_id === stageId).reduce((sum, d) => sum + Number(d.value || 0), 0);

  const contactName = (d) => (d.contacts ? `${d.contacts.first_name || ''} ${d.contacts.last_name || ''}`.trim() : null);

  if (!pipeline) return <SkeletonPage />;

  const VIEW_TABS = [
    { key: 'board', icon: LayoutGrid },
    { key: 'list', icon: List },
    { key: 'value', icon: DollarSign },
    { key: 'archive', icon: Archive },
  ];

  return (
    <div>
      {/* Header superior: título + búsqueda + nuevo */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-headline text-xl font-semibold">Pipeline</h1>
          <Info size={15} className="text-brand-muted" />
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el pipeline..."
              className="pl-9 pr-3 py-2 w-40 sm:w-64 rounded-full bg-brand-panel border border-brand-border text-sm focus:outline-none focus:border-brand-violet"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta flex items-center justify-center hover:opacity-90 transition flex-shrink-0"
          >
            <Plus size={18} />
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-2 rounded-full bg-brand-panel border border-brand-border text-xs hover:border-brand-violet transition flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
          >
            <Upload size={13} /> <span className="hidden sm:inline">{importing ? 'Importando...' : 'Importar CSV'}</span>
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${importResult.error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
          {importResult.error ? importResult.error : (
            <>
              {importResult.created} deals importados al pipeline "{pipeline.name}".
              {importResult.errors?.length > 0 && ` ${importResult.errors.length} filas con error.`}
            </>
          )}
          <button onClick={() => setImportResult(null)} className="ml-3 text-xs underline">Cerrar</button>
        </div>
      )}

      {/* Toolbar: vistas + nuevo trato + conteo + selector de pipeline */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex bg-brand-panel border border-brand-border rounded-xl p-1">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${view === tab.key ? 'bg-gradient-to-r from-brand-violet to-brand-magenta' : 'text-brand-muted hover:text-brand-white'}`}
              >
                <tab.icon size={15} />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={15} /> Trato
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-brand-muted">
            <span>{(view === 'archive' ? archivedDeals : filteredDeals).length} tratos</span>
            <Info size={13} />
          </div>

          <div className="relative">
            <button
              onClick={() => setPipelineMenuOpen(!pipelineMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-panel border border-brand-border text-sm hover:border-brand-violet transition"
            >
              <LayoutGrid size={14} className="text-brand-muted" />
              <span>{pipeline.name}</span>
              <ChevronDown size={14} className="text-brand-muted" />
            </button>
            {pipelineMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-brand-panel border border-brand-border rounded-xl shadow-xl z-20 overflow-hidden">
                {pipelines.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPipelineId(p.id); setPipelineMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-brand-bg transition flex items-center justify-between ${p.id === pipelineId ? 'text-brand-ice' : 'text-brand-white'}`}
                  >
                    {p.name}
                    {p.id === pipelineId && <span className="text-brand-violet">✓</span>}
                  </button>
                ))}
                <a href="/settings" className="block px-4 py-2.5 text-xs text-brand-muted hover:bg-brand-bg border-t border-brand-border transition">
                  Administrar pipelines
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddDealModal
        open={showForm}
        onClose={() => setShowForm(false)}
        pipelines={pipelines}
        pipelineId={pipelineId}
        onCreated={() => loadDeals(pipelineId)}
        onImportClick={() => { setShowForm(false); fileInputRef.current?.click(); }}
      />

      {/* ── VISTA TABLERO (kanban) ── */}
      {view === 'board' && (
        <div className="board-scroll flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {pipeline.pipeline_stages.sort((a, b) => a.position - b.position).map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(stage.id, e.dataTransfer.getData('dealId'))}
                className="w-64 md:w-72 flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-sm font-manrope font-semibold">{stage.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-brand-muted mb-3 px-1">
                  <DollarSign size={12} />
                  <span className="font-tech">${stageTotal(stage.id).toLocaleString('es-CO')}</span>
                  <span>· {stageDeals.length} tratos</span>
                </div>

                <div className="space-y-2 min-h-[40px]">
                  {stageDeals.map((deal) => {
                    const cName = contactName(deal);
                    const overdue = isOverdue(deal);
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className="relative card-elevated rounded-xl p-3.5 cursor-pointer group overflow-hidden"
                      >
                        {deal.probability >= 70 && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-violet to-brand-magenta" />
                        )}
                        <div className="text-sm font-manrope font-medium mb-0.5">{deal.title}</div>
                        {cName && <div className="text-xs text-brand-muted mb-0.5">{cName}</div>}
                        {deal.companies?.name && <div className="text-xs text-brand-muted mb-2">{deal.companies.name}</div>}
                        {Number(deal.value) > 0 && (
                          <div className="text-sm text-brand-ice font-tech font-medium mb-2">
                            {deal.currency} {Number(deal.value).toLocaleString('es-CO')}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="w-6 h-6 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-[10px] text-brand-muted font-tech">
                            {cName ? initials(cName) : <User size={12} />}
                          </div>
                          {overdue && <AlertTriangle size={14} className="text-yellow-400" />}
                        </div>
                      </div>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="text-brand-muted text-xs text-center py-6 border border-dashed border-brand-border rounded-xl">
                      Sin tratos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA LISTA (tabla plana, todos los abiertos) ── */}
      {view === 'list' && (
        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Trato</th>
                <th className="px-4 py-3 font-manrope font-normal">Contacto</th>
                <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                <th className="px-4 py-3 font-manrope font-normal">Etapa</th>
                <th className="px-4 py-3 font-manrope font-normal">Valor</th>
                <th className="px-4 py-3 font-manrope font-normal">Prob.</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="border-t border-brand-border row-hover cursor-pointer"
                >
                  <td className="px-4 py-3">{deal.title}</td>
                  <td className="px-4 py-3 text-brand-muted">{contactName(deal) || '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{deal.companies?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-tech bg-brand-violet/15 text-brand-ice">
                      {deal.pipeline_stages?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-ice font-tech">
                    {Number(deal.value) > 0 ? `${deal.currency} ${Number(deal.value).toLocaleString('es-CO')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-brand-muted font-tech">{deal.probability}%</td>
                </tr>
              ))}
              {filteredDeals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-muted text-sm">Sin tratos abiertos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VISTA VALOR (ordenado por valor, con total corrido) ── */}
      {view === 'value' && (() => {
        const sorted = [...filteredDeals].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        const total = sorted.reduce((sum, d) => sum + Number(d.value || 0), 0);
        let running = 0;
        return (
          <div>
            <div className="mb-4 bg-brand-panel border border-brand-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-brand-muted">Valor total del pipeline (mezcla de monedas)</span>
              <span className="text-xl font-headline font-semibold bg-gradient-to-r from-brand-violet to-brand-magenta bg-clip-text text-transparent">
                ${total.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-panel/80 text-brand-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-manrope font-normal">Trato</th>
                    <th className="px-4 py-3 font-manrope font-normal">Etapa</th>
                    <th className="px-4 py-3 font-manrope font-normal">Valor</th>
                    <th className="px-4 py-3 font-manrope font-normal">% del total</th>
                    <th className="px-4 py-3 font-manrope font-normal">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((deal) => {
                    running += Number(deal.value || 0);
                    const pct = total ? Math.round((Number(deal.value || 0) / total) * 100) : 0;
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className="border-t border-brand-border row-hover cursor-pointer"
                      >
                        <td className="px-4 py-3">{deal.title}</td>
                        <td className="px-4 py-3 text-brand-muted text-xs">{deal.pipeline_stages?.name}</td>
                        <td className="px-4 py-3 text-brand-ice font-tech">{deal.currency} {Number(deal.value).toLocaleString('es-CO')}</td>
                        <td className="px-4 py-3 text-brand-muted font-tech">{pct}%</td>
                        <td className="px-4 py-3 text-brand-muted font-tech">${running.toLocaleString('es-CO')}</td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-brand-muted text-sm">Sin tratos abiertos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── VISTA ARCHIVO (ganados/perdidos) ── */}
      {view === 'archive' && (
        <div className="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-panel/80 text-brand-muted text-left">
              <tr>
                <th className="px-4 py-3 font-manrope font-normal">Trato</th>
                <th className="px-4 py-3 font-manrope font-normal">Empresa</th>
                <th className="px-4 py-3 font-manrope font-normal">Valor</th>
                <th className="px-4 py-3 font-manrope font-normal">Resultado</th>
                <th className="px-4 py-3 font-manrope font-normal">Cerrado</th>
              </tr>
            </thead>
            <tbody>
              {archivedDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="border-t border-brand-border row-hover cursor-pointer"
                >
                  <td className="px-4 py-3">{deal.title}</td>
                  <td className="px-4 py-3 text-brand-muted">{deal.companies?.name || '—'}</td>
                  <td className="px-4 py-3 text-brand-ice font-tech">
                    {Number(deal.value) > 0 ? `${deal.currency} ${Number(deal.value).toLocaleString('es-CO')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-tech ${deal.status === 'ganado' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted font-tech text-xs">
                    {deal.closed_at ? new Date(deal.closed_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {archivedDeals.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-brand-muted text-sm">Sin tratos ganados o perdidos todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
