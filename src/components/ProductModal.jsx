// Crear o editar un producto/servicio del catálogo. El catálogo es la fuente única de «Producto» en los
// tratos y en las métricas, así que esta ventana avisa si el nombre ya existe y qué pedirá en los tratos.
import { useEffect, useRef, useState } from 'react';
import { Package, Wrench, PackagePlus, Pencil, AlertTriangle, Info, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, inputCls, selectCls, primaryBtn, ghostBtn } from './Modal';
import { productIcon, CURRENCIES } from '../lib/productMeta';
import { familyOf } from '../lib/productCatalog';

const TYPES = [
  { key: 'producto', label: 'Producto', icon: Package, desc: 'Lo que se vende o se suscribe: Bit WiFi, equipos, licencias.' },
  { key: 'servicio', label: 'Servicio', icon: Wrench, desc: 'Trabajo profesional: implementación, comisiones, soporte.' },
];
const BILLING = [
  { key: 'mensual', label: 'Mensual', desc: 'Cobro cada mes' },
  { key: 'anual', label: 'Anual', desc: 'Cobro cada año' },
  { key: 'unico', label: 'Único', desc: 'Un solo cobro' },
];
const FAMILY_LABEL = { wifi: 'WiFi', music: 'Music', signage: 'Signage / Neomedia' };

const card = (on) => `text-left rounded-xl border px-3.5 py-3 transition ${on ? 'bg-brand-violet/20 border-brand-violet' : 'border-brand-border hover:border-brand-muted'}`;

export default function ProductModal({ product = null, existingNames = [], onClose, onSubmit }) {
  const editing = !!product;
  const [name, setName] = useState(product?.name || '');
  const [type, setType] = useState(product?.type || 'producto');
  const [billing, setBilling] = useState(product?.billing_frequency || 'mensual');
  const [price, setPrice] = useState(product ? String(product.price ?? '') : '');
  const [currency, setCurrency] = useState(product?.currency || 'USD');
  const [sku, setSku] = useState(product?.sku || '');
  const [active, setActive] = useState(product ? product.active !== false : true);
  const [rates, setRates] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const nameRef = useRef(null);

  useEffect(() => {
    api.get('/api/exchange-rates')
      .then((r) => setRates(Object.fromEntries((Array.isArray(r) ? r : []).map((x) => [x.currency, Number(x.rate_to_usd)]))))
      .catch(() => setRates({}));
  }, []);

  const trimmed = name.trim();
  const Icon = productIcon(trimmed, type);
  const dup = trimmed && existingNames.some((n) => (n || '').trim().toLowerCase() === trimmed.toLowerCase());
  const priceNum = price === '' ? 0 : Number(price);
  const priceInvalid = price !== '' && (!Number.isFinite(priceNum) || priceNum < 0);
  const usd = currency !== 'USD' && priceNum > 0 && rates[currency] ? priceNum * rates[currency] : null;
  const family = trimmed ? familyOf(trimmed) : null;
  const perLabel = { mensual: ' / mes', anual: ' / año', unico: ' (único)' }[billing];

  const save = async (another) => {
    if (!trimmed || priceInvalid || saving) return;
    setError('');
    setSaving(true);
    try {
      const payload = { name: trimmed, type, billing_frequency: billing, price: priceNum, currency, sku: sku.trim() };
      if (editing) payload.active = active;
      await onSubmit(payload, { another });
      if (another) {
        setName(''); setPrice(''); setSku('');
        setCreatedCount((n) => n + 1);
        setSaving(false);
        setTimeout(() => nameRef.current?.focus(), 0);
      }
    } catch (err) {
      const msg = err?.message || '';
      setError(msg.includes('products_sku_key') ? 'Ese SKU ya lo está usando otro producto.' : (msg || 'No se pudo guardar.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      subtitle={editing ? product.name : createdCount > 0 ? `${createdCount} ${createdCount === 1 ? 'creado' : 'creados'} en esta sesión` : 'Aparece en «Producto» de los tratos y en las métricas'}
      icon={editing ? Pencil : PackagePlus}
      onClose={onClose}
      width="max-w-xl"
      footer={(
        <>
          <button type="button" onClick={() => save(false)} disabled={!trimmed || priceInvalid || saving} className={primaryBtn}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {!editing && (
            <button type="button" onClick={() => save(true)} disabled={!trimmed || priceInvalid || saving} className="whitespace-nowrap px-4 py-2.5 rounded-xl text-sm border border-brand-border hover:border-brand-violet text-brand-ice disabled:opacity-40 transition">
              Crear y añadir otro
            </button>
          )}
          <button type="button" onClick={onClose} className={`${ghostBtn} ml-auto`}>{createdCount > 0 ? 'Listo' : 'Cancelar'}</button>
          {error && <span className="basis-full text-xs text-red-300">{error}</span>}
        </>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="space-y-5">
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
            {TYPES.map(({ key, label, icon: TIcon, desc }) => (
              <button key={key} type="button" role="radio" aria-checked={type === key} onClick={() => setType(key)} className={card(type === key)}>
                <span className="flex items-center gap-2 text-sm font-medium"><TIcon size={15} className="text-brand-ice" /> {label}</span>
                <span className="block text-[11px] text-brand-muted mt-1 leading-snug">{desc}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Nombre">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-brand-violet/15 flex items-center justify-center pointer-events-none"><Icon size={14} className="text-brand-ice" /></span>
            <input ref={nameRef} autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Email Marketing" className={`${inputCls} pl-14 text-base`} />
          </div>
          {dup && (
            <p className="flex items-start gap-1.5 text-[11px] text-yellow-300 mt-2"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> Ya existe un producto con este nombre. Si lo guardas, saldrá repetido en la lista de «Producto» de los tratos.</p>
          )}
        </Field>

        <Field label="Facturación" hint="De esto depende cómo cuenta para MRR/ARR.">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Facturación">
            {BILLING.map(({ key, label, desc }) => (
              <button key={key} type="button" role="radio" aria-checked={billing === key} onClick={() => setBilling(key)} className={card(billing === key)}>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-[11px] text-brand-muted mt-0.5">{desc}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Precio" className="col-span-2">
            <input type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" aria-label="Precio" className={`${inputCls} font-tech [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${priceInvalid ? 'border-red-500/60' : ''}`} />
          </Field>
          <Field label="Moneda">
            <select aria-label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${selectCls} font-tech`} style={{ colorScheme: 'dark' }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        {priceInvalid && <p className="text-[11px] text-red-300 -mt-3">El precio debe ser un número igual o mayor a 0.</p>}
        {!priceInvalid && priceNum > 0 && (
          <p className="text-xs text-brand-muted -mt-3 font-tech">
            {currency} {priceNum.toLocaleString()}{perLabel}{usd ? <span className="text-brand-ice"> · ≈ USD {Math.round(usd).toLocaleString()}</span> : null}
          </p>
        )}

        <Field label={<span>SKU <span className="normal-case text-brand-muted/70">(opcional)</span></span>} hint="Código interno. No puede repetirse entre productos.">
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej. EML-001" className={`${inputCls} font-tech`} />
        </Field>

        {trimmed && (
          <div className="rounded-xl border border-brand-border bg-brand-bg/50 px-3.5 py-3 text-xs text-brand-muted flex items-start gap-2">
            <Info size={14} className="text-brand-ice mt-0.5 flex-shrink-0" />
            <span>
              En los tratos, {family ? <>este producto pedirá <span className="text-brand-ice">tipo de hardware ({FAMILY_LABEL[family.key]})</span>.</> : <>este producto <span className="text-brand-ice">no pedirá hardware</span> (se trata como software/servicio).</>}
            </span>
          </div>
        )}

        {editing && (
          <button type="button" role="switch" aria-checked={active} aria-label="Disponible en los tratos" onClick={() => setActive((v) => !v)}
            className="w-full flex items-center gap-3 rounded-xl border border-brand-border px-3.5 py-3 text-left hover:border-brand-muted transition">
            {active ? <Eye size={16} className="text-green-300" /> : <EyeOff size={16} className="text-brand-muted" />}
            <span className="flex-1">
              <span className="block text-sm">{active ? 'Disponible en los tratos' : 'Archivado'}</span>
              <span className="block text-[11px] text-brand-muted">{active ? 'Aparece en «Producto» y en «Añadir productos».' : 'No aparece al crear tratos; los tratos que ya lo tienen no cambian.'}</span>
            </span>
            <span className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${active ? 'bg-green-500' : 'bg-brand-border'}`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
            </span>
          </button>
        )}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
