// Importar facturas desde PDF o CSV. Flujo: subir → revisar en una tabla (se puede corregir cada celda; los avisos
// de lo raro del documento quedan a la vista, nada se corrige en silencio) → importar. Repetir la importación es
// seguro: lo que ya existe se omite.
import { useRef, useState } from 'react';
import { FileUp, FileText, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Download, X, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, selectCls, primaryBtn, ghostBtn } from './Modal';
import { SOURCE_ACCOUNTS, CURRENCIES } from '../lib/invoiceMeta';
import { csvToInvoices, INVOICE_CSV_TEMPLATE } from '../lib/invoiceCsv';

const PDF_BATCH = 10;
const ESTADOS = {
  nueva: { label: 'Nueva', cls: 'bg-green-500/15 text-green-300' },
  existe: { label: 'Ya existe', cls: 'bg-brand-muted/20 text-brand-muted' },
  duplicada: { label: 'Repetida', cls: 'bg-yellow-500/15 text-yellow-300' },
  error: { label: 'Error', cls: 'bg-red-500/15 text-red-300' },
};
const cell = 'w-full px-2 py-1.5 rounded-lg bg-brand-bg border border-brand-border text-xs font-tech focus:outline-none focus:border-brand-violet';

const toBase64 = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
  fr.onerror = () => reject(new Error('no se pudo leer el archivo'));
  fr.readAsDataURL(file);
});

// Lo que se manda al servidor de cada fila (el servidor recalcula avisos y estado)
const payloadRow = (r) => ({
  archivo: r.archivo, numero: r.numero, numero_impreso: r.numero_impreso, cliente: r.cliente, rnc: r.rnc, ncf: r.ncf, monto: r.monto,
  moneda: r.moneda, fecha: r.fecha, servicio: r.servicio, descripcion: r.descripcion, cantidad: r.cantidad, precio_unitario: r.precio_unitario,
  cobrada: !!r.cobrada, incluir: r.incluir !== false, avisos: r.avisos || [],
});

export default function InvoiceImportModal({ onClose, onImported }) {
  const [origen, setOrigen] = useState('Bithub SRL');
  const [step, setStep] = useState('subir'); // subir | revisar | listo
  const [rows, setRows] = useState([]);
  const [huecos, setHuecos] = useState([]);
  const [archivosError, setArchivosError] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [abiertas, setAbiertas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [hayCsv, setHayCsv] = useState(false);
  const inputRef = useRef(null);

  const revisarLote = async (lista) => {
    const r = await api.post('/api/invoices/import/preview', { source_account: origen, rows: lista.map(payloadRow) });
    setRows(r.rows);
    setHuecos(r.huecos || []);
  };

  const procesar = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setError(''); setArchivosError([]);
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    const csvs = files.filter((f) => /\.csv$/i.test(f.name) || f.type === 'text/csv');
    const otros = files.filter((f) => !pdfs.includes(f) && !csvs.includes(f));
    const errores = otros.map((f) => ({ archivo: f.name, error: 'solo se aceptan PDF y CSV' }));
    let todas = [];
    try {
      for (let i = 0; i < pdfs.length; i += PDF_BATCH) {
        setBusy(`Leyendo PDFs… ${Math.min(i + PDF_BATCH, pdfs.length)} de ${pdfs.length}`);
        const lote = pdfs.slice(i, i + PDF_BATCH);
        const archivos = await Promise.all(lote.map(async (f) => ({ name: f.name, data: await toBase64(f) })));
        const r = await api.post('/api/invoices/import/parse', { source_account: origen, files: archivos });
        todas = todas.concat(r.rows || []);
        errores.push(...(r.archivos_con_error || []));
      }
      for (const f of csvs) {
        setBusy(`Leyendo ${f.name}…`);
        const { rows: filas, faltantes } = csvToInvoices(await f.text(), f.name);
        if (faltantes.length) errores.push({ archivo: f.name, error: `faltan las columnas: ${faltantes.join(', ')}` });
        todas = todas.concat(filas);
      }
      setHayCsv(csvs.length > 0 && pdfs.length === 0);
      setArchivosError(errores);
      if (!todas.length) { setBusy(''); if (!errores.length) setError('No encontré facturas en esos archivos.'); return; }
      setBusy('Revisando el lote completo…');
      await revisarLote(todas);
      setStep('revisar');
    } catch (err) {
      setError(err.message || 'No se pudieron leer los archivos.');
    }
    setBusy('');
  };

  const editar = (n, campo, valor) => setRows((prev) => prev.map((r) => (r.n === n ? { ...r, [campo]: valor } : r)));
  const alSalir = async () => { try { await revisarLote(rows); } catch (e) { /* se queda como está */ } };

  const importables = rows.filter((r) => r.estado === 'nueva' && r.incluir !== false);
  const conAviso = rows.filter((r) => r.estado === 'nueva' && (r.avisos || []).length);
  const cuenta = (e) => rows.filter((r) => r.estado === e).length;

  const importar = async () => {
    setBusy(`Importando ${importables.length} facturas…`); setError('');
    try {
      const r = await api.post('/api/invoices/import/commit', { source_account: origen, origen: hayCsv ? 'csv' : 'pdf', rows: rows.map(payloadRow) });
      setResultado(r); setStep('listo'); onImported?.(r);
    } catch (err) {
      setError(err.message || 'No se pudo importar.');
    }
    setBusy('');
  };

  const descargarPlantilla = () => {
    const blob = new Blob([INVOICE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'plantilla-facturas.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const pie = step === 'revisar' ? (
    <>
      <button type="button" onClick={importar} disabled={!!busy || importables.length === 0} className={primaryBtn}>
        {busy ? 'Importando…' : `Importar ${importables.length} ${importables.length === 1 ? 'factura' : 'facturas'}`}
      </button>
      <button type="button" onClick={() => { setStep('subir'); setRows([]); setError(''); }} className={ghostBtn}>Empezar de nuevo</button>
      {error && <span className="basis-full text-xs text-red-300">{error}</span>}
    </>
  ) : step === 'listo' ? (
    <button type="button" onClick={onClose} className={primaryBtn}>Cerrar y ver las facturas</button>
  ) : (
    <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
  );

  return (
    <Modal title="Importar facturas" subtitle="Sube PDFs o un CSV, revísalos y confirma" icon={FileUp} onClose={onClose} width="max-w-6xl" footer={pie}>
      {step === 'subir' && (
        <div className="space-y-5">
          <Field label="Empresa que facturó (origen)" hint="Todas las facturas de este lote quedan con este origen.">
            <select aria-label="Empresa que facturó" value={origen} onChange={(e) => setOrigen(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }}>
              {SOURCE_ACCOUNTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); procesar(e.dataTransfer.files); }}
            onClick={() => !busy && inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition ${arrastrando ? 'border-brand-violet bg-brand-violet/10' : 'border-brand-border hover:border-brand-muted'}`}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.csv,application/pdf,text/csv" aria-label="Archivos de facturas" className="hidden" onChange={(e) => { procesar(e.target.files); e.target.value = ''; }} />
            {busy ? (
              <div className="flex flex-col items-center gap-3 text-brand-ice"><Loader2 size={28} className="animate-spin" /><span className="text-sm">{busy}</span></div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-violet/15 flex items-center justify-center"><FileUp size={22} className="text-brand-ice" /></div>
                <p className="font-medium">Arrastra aquí los PDFs o el CSV</p>
                <p className="text-brand-muted text-sm mt-1">o haz clic para elegirlos · puedes subir muchos a la vez</p>
              </>
            )}
          </div>
          {error && <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
          {archivosError.length > 0 && <ErroresArchivos lista={archivosError} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-brand-muted">
            <div className="flex gap-2.5 rounded-xl border border-brand-border bg-brand-bg/50 p-3.5"><FileText size={16} className="text-brand-ice flex-shrink-0 mt-0.5" /><span><b className="text-brand-white">PDF.</b> Hoy leo las facturas de BITHUB, SRL (sus dos plantillas). Si el PDF es de otro formato, avisa cuál no pudo leer y no inventa datos.</span></div>
            <div className="flex gap-2.5 rounded-xl border border-brand-border bg-brand-bg/50 p-3.5"><FileSpreadsheet size={16} className="text-brand-ice flex-shrink-0 mt-0.5" /><span><b className="text-brand-white">CSV</b> para cualquier otra empresa o plantilla. Columnas: numero, cliente, fecha, total (y opcionales: moneda, ncf, rnc, servicio, descripcion, cobrada). <button type="button" onClick={descargarPlantilla} className="text-brand-ice hover:underline inline-flex items-center gap-1"><Download size={11} /> Descargar plantilla</button></span></div>
          </div>
        </div>
      )}

      {step === 'revisar' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border">{rows.length} leídas</span>
            <span className="px-2.5 py-1 rounded-full bg-green-500/15 text-green-300">{importables.length} se importarán</span>
            {conAviso.length > 0 && <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-300 flex items-center gap-1"><AlertTriangle size={11} /> {conAviso.length} con aviso</span>}
            {cuenta('existe') > 0 && <span className="px-2.5 py-1 rounded-full bg-brand-muted/20 text-brand-muted">{cuenta('existe')} ya existen</span>}
            {cuenta('duplicada') > 0 && <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-300">{cuenta('duplicada')} repetidas</span>}
            {cuenta('error') > 0 && <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-300">{cuenta('error')} con error</span>}
            <span className="text-brand-muted ml-auto">Origen: <b className="text-brand-white">{origen}</b></span>
          </div>

          {huecos.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-brand-border bg-brand-bg/50 px-3.5 py-2.5 text-xs text-brand-muted">
              <Info size={14} className="text-brand-ice mt-0.5 flex-shrink-0" />
              <span>Faltan números en la secuencia (entre el menor y el mayor de este lote y lo ya cargado): <b className="text-brand-white font-tech">{huecos.join(', ')}</b>. Si deberían existir, súbelos también.</span>
            </div>
          )}
          {archivosError.length > 0 && <ErroresArchivos lista={archivosError} />}

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button type="button" onClick={() => setRows((p) => p.map((r) => (r.estado === 'nueva' ? { ...r, incluir: !(r.avisos || []).length } : r)))} className="px-3 py-1.5 rounded-lg border border-brand-border hover:border-brand-violet transition">Importar solo las que no tienen aviso</button>
            <button type="button" onClick={() => setRows((p) => p.map((r) => (r.estado === 'nueva' ? { ...r, incluir: true } : r)))} className="px-3 py-1.5 rounded-lg border border-brand-border hover:border-brand-violet transition">Incluir todas las nuevas</button>
            <button type="button" onClick={() => setRows((p) => { const todas = p.filter((r) => r.estado === 'nueva').every((r) => r.cobrada); return p.map((r) => (r.estado === 'nueva' ? { ...r, cobrada: !todas } : r)); })} className="px-3 py-1.5 rounded-lg border border-brand-border hover:border-brand-violet transition">Marcar todas como cobradas</button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-brand-border">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="text-left text-[10px] font-tech uppercase tracking-wide text-brand-muted border-b border-brand-border bg-brand-bg/40">
                  <th className="px-3 py-2.5 w-10" aria-label="Incluir" />
                  <th className="px-2 py-2.5 font-normal">Estado</th>
                  <th className="px-2 py-2.5 font-normal w-28">N.º</th>
                  <th className="px-2 py-2.5 font-normal">Cliente</th>
                  <th className="px-2 py-2.5 font-normal w-36">Fecha</th>
                  <th className="px-2 py-2.5 font-normal w-28">Total</th>
                  <th className="px-2 py-2.5 font-normal w-20">Moneda</th>
                  <th className="px-2 py-2.5 font-normal">NCF</th>
                  <th className="px-2 py-2.5 font-normal text-center w-16">Cobrada</th>
                  <th className="px-2 py-2.5 font-normal w-16">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = ESTADOS[r.estado] || ESTADOS.nueva;
                  const detalles = [...(r.errores || []), ...(r.avisos || [])];
                  const abierta = !!abiertas[r.n];
                  const bloqueada = r.estado !== 'nueva';
                  return (
                    <FilaFactura key={r.n} r={r} e={e} detalles={detalles} abierta={abierta} bloqueada={bloqueada}
                      onToggle={() => setAbiertas((p) => ({ ...p, [r.n]: !p[r.n] }))} editar={editar} alSalir={alSalir} />
                  );
                })}
              </tbody>
            </table>
          </div>
          {busy && <p className="text-xs text-brand-ice flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> {busy}</p>}
        </div>
      )}

      {step === 'listo' && resultado && (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/15 flex items-center justify-center"><CheckCircle2 size={28} className="text-green-300" /></div>
          <h3 className="font-headline text-xl font-semibold">{resultado.creadas} {resultado.creadas === 1 ? 'factura importada' : 'facturas importadas'}</h3>
          <p className="text-brand-muted text-sm mt-2">
            {resultado.total != null && <>Por <span className="text-brand-ice font-tech">{Number(resultado.total).toLocaleString()}</span> en total. </>}
            {resultado.omitidas > 0 && <>{resultado.omitidas} se omitieron (ya existían, repetidas o desmarcadas). </>}
            {resultado.con_empresa != null && <>{resultado.con_empresa} quedaron ligadas a una empresa del CRM.</>}
          </p>
          <p className="text-brand-muted text-xs mt-4">Las que traían avisos llevan «Revisar:» en su nota, por si quieres consultarlas con tu contador.</p>
        </div>
      )}
    </Modal>
  );
}

function ErroresArchivos({ lista }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
      <p className="font-medium mb-1 flex items-center gap-1.5"><X size={12} /> No pude leer {lista.length === 1 ? 'este archivo' : `estos ${lista.length} archivos`}:</p>
      <ul className="space-y-0.5 list-disc pl-5">{lista.map((a, i) => <li key={i}><span className="font-tech">{a.archivo}</span>: {a.error}</li>)}</ul>
    </div>
  );
}

function FilaFactura({ r, e, detalles, abierta, bloqueada, onToggle, editar, alSalir }) {
  const dim = bloqueada ? 'opacity-60' : '';
  return (
    <>
      <tr className={`border-b border-brand-border/60 ${r.incluir === false && !bloqueada ? 'opacity-50' : ''}`}>
        <td className="px-3 py-2"><input type="checkbox" aria-label={`Incluir ${r.numero} ${r.cliente}`} disabled={bloqueada} checked={r.incluir !== false && !bloqueada} onChange={(ev) => editar(r.n, 'incluir', ev.target.checked)} /></td>
        <td className="px-2 py-2"><span className={`text-[10px] font-tech uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${e.cls}`}>{e.label}</span></td>
        <td className={`px-2 py-2 ${dim}`}><input aria-label="N.º de factura" className={cell} value={r.numero} disabled={bloqueada && r.estado !== 'error'} onChange={(ev) => editar(r.n, 'numero', ev.target.value)} onBlur={alSalir} /></td>
        <td className={`px-2 py-2 ${dim}`}><input aria-label="Cliente" className={cell} value={r.cliente} disabled={bloqueada && r.estado !== 'error'} onChange={(ev) => editar(r.n, 'cliente', ev.target.value)} onBlur={alSalir} /></td>
        <td className={`px-2 py-2 ${dim}`}><input aria-label="Fecha" type="date" className={cell} style={{ colorScheme: 'dark' }} value={r.fecha || ''} disabled={bloqueada && r.estado !== 'error'} onChange={(ev) => editar(r.n, 'fecha', ev.target.value)} onBlur={alSalir} /></td>
        <td className={`px-2 py-2 ${dim}`}><input aria-label="Total" type="number" step="any" className={cell} value={r.monto ?? ''} disabled={bloqueada && r.estado !== 'error'} onChange={(ev) => editar(r.n, 'monto', ev.target.value === '' ? null : Number(ev.target.value))} onBlur={alSalir} /></td>
        <td className={`px-2 py-2 ${dim}`}>
          <select aria-label="Moneda" className={cell} style={{ colorScheme: 'dark' }} value={r.moneda || 'USD'} disabled={bloqueada} onChange={(ev) => editar(r.n, 'moneda', ev.target.value)} onBlur={alSalir}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </td>
        <td className="px-2 py-2 text-xs font-tech text-brand-muted whitespace-nowrap">{r.ncf || '—'}</td>
        <td className="px-2 py-2 text-center"><input type="checkbox" aria-label={`Cobrada ${r.numero}`} disabled={bloqueada} checked={!!r.cobrada} onChange={(ev) => editar(r.n, 'cobrada', ev.target.checked)} /></td>
        <td className="px-2 py-2">
          {detalles.length > 0 ? (
            <button type="button" onClick={onToggle} aria-expanded={abierta} aria-label={`Ver ${detalles.length} avisos de ${r.numero}`} className={`flex items-center gap-1 text-xs ${(r.errores || []).length ? 'text-red-300' : 'text-yellow-300'}`}>
              {abierta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}<AlertTriangle size={12} />{detalles.length}
            </button>
          ) : <span className="text-brand-muted/50 text-xs">—</span>}
        </td>
      </tr>
      {abierta && detalles.length > 0 && (
        <tr className="border-b border-brand-border/60 bg-brand-bg/50">
          <td />
          <td colSpan={9} className="px-3 py-2.5">
            <ul className="space-y-1 text-xs">
              {(r.errores || []).map((d, i) => <li key={`e${i}`} className="text-red-300 flex gap-1.5"><X size={12} className="mt-0.5 flex-shrink-0" />{d}</li>)}
              {(r.avisos || []).map((d, i) => <li key={`a${i}`} className="text-yellow-200/90 flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />{d}</li>)}
              {r.archivo && <li className="text-brand-muted font-tech">Archivo: {r.archivo}</li>}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
