import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import DealDetailPanel from '../components/DealDetailPanel';

const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];

export default function Deals() {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [deals, setDeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', currency: 'USD', probability: 50 });
  const [selectedDealId, setSelectedDealId] = useState(null);

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

  useEffect(() => {
    loadPipelines().catch(console.error);
  }, []);

  useEffect(() => {
    loadDeals(pipelineId).catch(console.error);
  }, [pipelineId]);

  const onDrop = async (stageId, dealId) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d)));
    await api.patch(`/api/deals/${dealId}/stage`, { stage_id: stageId });
  };

  const createDeal = async (e) => {
    e.preventDefault();
    if (!pipeline) return;
    const firstStage = pipeline.pipeline_stages[0];
    await api.post('/api/deals', {
      title: form.title,
      value: Number(form.value) || 0,
      currency: form.currency,
      probability: Number(form.probability),
      pipeline_id: pipeline.id,
      stage_id: firstStage.id,
    });
    setForm({ title: '', value: '', currency: 'USD', probability: 50 });
    setShowForm(false);
    loadDeals(pipelineId);
  };

  const stageTotal = (stageId) =>
    deals.filter((d) => d.stage_id === stageId).reduce((sum, d) => sum + Number(d.value || 0), 0);

  if (!pipeline) return <div className="text-brand-muted">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-xl font-semibold">Pipeline</h1>
          <select
            value={pipelineId || ''}
            onChange={(e) => setPipelineId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-sm font-tech"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-90 rounded-lg text-sm font-medium"
        >
          + Nuevo deal
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDeal} className="mb-6 bg-brand-panel border border-brand-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <input
            placeholder="Título del deal"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <input
            placeholder="Valor"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="w-28 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
          />
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-brand-muted">
            Prob.
            <input
              type="number" min="0" max="100"
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
              className="w-16 px-2 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm font-tech"
            />%
          </label>
          <button className="px-4 py-2 bg-gradient-to-r from-brand-violet to-brand-magenta rounded-lg text-sm font-medium">
            Crear
          </button>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.pipeline_stages.map((stage) => (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(stage.id, e.dataTransfer.getData('dealId'))}
            className="w-64 flex-shrink-0 bg-brand-panel/60 border border-brand-border rounded-xl p-3"
          >
            <div className="text-sm font-manrope font-medium text-brand-white mb-1 flex justify-between">
              <span>{stage.name}</span>
              <span className="text-brand-muted font-tech text-xs">
                {deals.filter((d) => d.stage_id === stage.id).length}
              </span>
            </div>
            {stageTotal(stage.id) > 0 && (
              <div className="text-xs text-brand-ice font-tech mb-3">
                ${stageTotal(stage.id).toLocaleString()}
              </div>
            )}
            <div className="space-y-2 mt-2">
              {deals
                .filter((d) => d.stage_id === stage.id)
                .map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}
                    onClick={() => setSelectedDealId(deal.id)}
                    className="bg-brand-bg border border-brand-border rounded-lg p-3 cursor-pointer hover:border-brand-violet transition"
                  >
                    <div className="text-sm font-manrope font-medium">{deal.title}</div>
                    {deal.companies?.name && (
                      <div className="text-xs text-brand-muted mt-1">{deal.companies.name}</div>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      {Number(deal.value) > 0 && (
                        <span className="text-xs text-brand-ice font-tech">
                          {deal.currency} {Number(deal.value).toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs text-brand-muted font-tech">{deal.probability}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <DealDetailPanel
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onChanged={() => loadDeals(pipelineId)}
      />
    </div>
  );
}
