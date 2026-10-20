// frontend/src/features/vendors/SellerProductsPage.tsx
// Page Mes Produits — espace vendeur BelivaY.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Download, Upload, RefreshCw, AlertTriangle,
  Package, CheckCircle, Copy, Pencil, FileText, Trash2,
  Clock, Filter, ChevronRight, Tag, Layers,
  TrendingDown, X,
} from 'lucide-react';
import { vendorsApi, type VendorProduct, type VendorProductEnriched } from '@/services/api/vendors';
import { productsApi, type Category } from '@/services/api/products';
import { useToast } from '@/context/ToastContext';

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.15)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
  sidebar: '#1C1209',
};

type StockFilter = '' | 'ok' | 'low' | 'out';
type SortKey    = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'created';
type ProductListItem = Omit<VendorProduct, 'category'> &
  Partial<Omit<VendorProductEnriched, 'category'>> & {
    category: VendorProduct['category'] | VendorProductEnriched['category'];
  };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function categoryId(category: ProductListItem['category']) {
  return typeof category === 'number' ? category : category.id;
}

function categoryName(category: ProductListItem['category']) {
  return typeof category === 'number' ? '' : category.name;
}

function usePromoTimer(end: string | null | undefined) {
  const [r, setR] = useState<{ d: number; h: number; m: number } | null>(null);
  useEffect(() => {
    if (!end) return;
    const upd = () => {
      const diff = new Date(end).getTime() + 86400000 - Date.now();
      if (diff <= 0) { setR(null); return; }
      setR({ d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000) });
    };
    upd(); const id = setInterval(upd, 60000); return () => clearInterval(id);
  }, [end]);
  return r;
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────────────────────

function PromoTimer({ end }: { end: string }) {
  const r = usePromoTimer(end);
  if (!r) return null;
  // Note: "j/h/m" (jours/heures/minutes) countdown units left as compact abbreviations —
  // not extracted, same treatment as similarly-styled timers elsewhere in the app.
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: T.amberL, color: T.amber }}>
      <Clock size={9}/>{r.d > 0 ? `${r.d}j ` : ''}{r.h}h{r.m}m
    </span>
  );
}

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const { t } = useTranslation();
  if (qty === 0) return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: T.redL, color: T.red }}>
      <X size={9}/> {t('sl3_products.badge_out_of_stock')}
    </span>
  );
  if (qty <= threshold) return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: T.amberL, color: T.amber }}>
      <AlertTriangle size={9}/> {t('sl3_products.badge_low_stock', { qty })}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: T.greenL, color: T.green }}>
      <CheckCircle size={9}/> {t('sl3_products.badge_in_stock', { qty })}
    </span>
  );
}

// Input stock inline
function StockInput({ product, onUpdate }: { product: ProductListItem; onUpdate: (id: number, qty: number) => void }) {
  const { t } = useTranslation();
  const [val, setVal]    = useState(String(product.stock_quantity));
  const [saving, setSav] = useState(false);
  const commit = async () => {
    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty < 0 || qty === product.stock_quantity) return;
    try { setSav(true); await vendorsApi.updateProductStock(product.id, qty); onUpdate(product.id, qty); }
    catch { setVal(String(product.stock_quantity)); }
    finally { setSav(false); }
  };
  const threshold = product.stock_threshold ?? 5;
  const n = parseInt(val, 10) || 0;
  const c = n === 0 ? T.red : n <= threshold ? T.amber : T.green;
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10.5px] font-semibold" style={{ color: T.muted }}>{t('sl3_products.stock_label')}</label>
      <input type="number" min={0} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit} onKeyDown={e => e.key==='Enter' && commit()}
        className="w-16 text-center rounded-lg py-1 text-[12.5px] font-bold outline-none"
        style={{ background: `${c}18`, border: `1.5px solid ${c}50`, color: c }}/>
      {saving && <RefreshCw size={10} className="animate-spin" style={{ color: T.muted }}/>}
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerProductsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [products,    setProducts]    = useState<ProductListItem[]>([]);
  const [allCats,     setAllCats]     = useState<Category[]>([]);   // toutes les catégories
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [catId,       setCatId]       = useState('');               // catégorie parent sélectionnée
  const [subCatId,    setSubCatId]    = useState('');               // sous-catégorie sélectionnée
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [sortKey,     setSortKey]     = useState<SortKey>('name');
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [importing,   setImporting]   = useState(false);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Catégories parent (parent === null ou undefined)
  const parentCats = allCats.filter(c => !c.parent);

  // ── Sous-catégories du parent sélectionné
  const subCats = catId
    ? allCats.filter(c => c.parent === parseInt(catId, 10))
    : [];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prods, catsResp] = await Promise.all([
        vendorsApi.getProducts(),
        productsApi.listCategories({ page_size: 200 }),
      ]);
      setProducts(prods);
      setAllCats(catsResp.results || []);
    } catch { showToast(t('sl3_products.toast_load_error'),'error'); }
    finally { setLoading(false); }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  // Reset sous-catégorie quand catégorie change
  useEffect(() => { setSubCatId(''); }, [catId]);

  const THRESHOLD_DEFAULT = 5;

  // ── Filtrage + tri ──────────────────────────────────────────────────────────
  const filtered = products
    .filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;

      const pCatId   = categoryId(p.category);
      const pParent  = allCats.find(c => c.id === pCatId)?.parent;

      // Filtre catégorie parent
      if (catId) {
        const parentId = parseInt(catId, 10);
        // Le produit est dans la catégorie parent OU dans une de ses sous-catégories
        const isDirectParent  = pCatId === parentId;
        const isChildOfParent = pParent === parentId;
        if (!isDirectParent && !isChildOfParent) return false;
      }

      // Filtre sous-catégorie
      if (subCatId && pCatId !== parseInt(subCatId, 10)) return false;

      const qty = p.stock_quantity;
      const thr = p.stock_threshold ?? THRESHOLD_DEFAULT;
      if (stockFilter === 'ok')  return qty > thr;
      if (stockFilter === 'low') return qty > 0 && qty <= thr;
      if (stockFilter === 'out') return qty === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'price_asc')  return a.price_xaf - b.price_xaf;
      if (sortKey === 'price_desc') return b.price_xaf - a.price_xaf;
      if (sortKey === 'stock')      return a.stock_quantity - b.stock_quantity;
      if (sortKey === 'created')    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.title.localeCompare(b.title);
    });

  // ── Breadcrumb sous-catégorie ───────────────────────────────────────────────
  const activeCat    = parentCats.find(c => c.id === parseInt(catId, 10));
  const activeSubCat = subCats.find(c => c.id === parseInt(subCatId, 10));
  const showBreadcrumb = activeCat && activeSubCat;

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const total    = products.length;
  const actifs   = products.filter(p => p.is_active).length;
  const ruptures = products.filter(p => p.stock_quantity === 0).length;
  const stockFaible = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= THRESHOLD_DEFAULT);

  // ── Sélection ──────────────────────────────────────────────────────────────
  const toggleSel  = (id: number) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };
  const selectAll  = () => setSelected(new Set(filtered.map(p => p.id)));
  const clearSel   = () => setSelected(new Set());
  const allSel     = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const handleStockUpdate = (id: number, qty: number) => setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: qty } : p));

  const handleDuplicate = async (id: number) => {
    try { setDuplicating(id); await vendorsApi.duplicateProduct(id); showToast(t('sl3_products.toast_duplicated'),'success'); await load(); }
    catch { showToast(t('sl3_products.toast_duplicate_error'),'error'); } finally { setDuplicating(null); }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(t('sl3_products.confirm_delete_one', { title }))) return;
    try { setDeleting(id); await vendorsApi.deleteProduct(id); showToast(t('sl3_products.toast_deleted'),'success'); setProducts(prev => prev.filter(p => p.id !== id)); }
    catch { showToast(t('sl3_products.toast_delete_error'),'error'); } finally { setDeleting(null); }
  };

  const handleBulkPause = async () => {
    if (!selected.size) return;
    let failures = 0;
    for (const id of selected) {
      try { await vendorsApi.updateProduct(id, { is_active: false }); }
      catch { failures += 1; }
    }
    if (failures > 0) showToast(t('sl3_products.toast_bulk_pause_fail', { count: failures }),'error');
    showToast(t('sl3_products.toast_bulk_pause_success', { count: selected.size }),'success'); clearSel(); await load();
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !window.confirm(t('sl3_products.confirm_delete_bulk', { count: selected.size }))) return;
    let failures = 0;
    for (const id of selected) {
      try { await vendorsApi.deleteProduct(id); }
      catch { failures += 1; }
    }
    if (failures > 0) showToast(t('sl3_products.toast_bulk_delete_fail', { count: failures }),'error');
    showToast(t('sl3_products.toast_bulk_delete_success', { count: selected.size }),'success'); clearSel(); await load();
  };

  const handleExportCSV = async () => {
    try {
      const blob = await vendorsApi.exportProductsCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `belivay_produits_${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url); showToast(t('sl3_products.toast_export_success'),'success');
    } catch { showToast(t('sl3_products.toast_export_error'),'error'); }
  };

  const handleImportCSV = async (file: File) => {
    try {
      setImporting(true);
      const result = await vendorsApi.importProductsCSV(file);
      showToast(result.message, result.created > 0 ? 'success' : 'error'); await load();
    } catch { showToast(t("sl3_products.toast_import_error"),'error'); } finally { setImporting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">

      {/* ═══ EN-TÊTE ═══ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 font-black text-[22px]"
            style={{ color: T.text }}>
            <Package size={20} style={{ color: T.orange }}/> {t('sl3_products.title')}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {t(total > 1 ? 'sl3_products.count_summary_plural' : 'sl3_products.count_summary', { count: total, ruptures })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <input type="file" ref={fileRef} className="hidden" accept=".csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); e.target.value = ''; }}/>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:opacity-80"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            {importing ? <RefreshCw size={13} className="animate-spin"/> : <Upload size={13}/>} {t('sl3_products.import')}
          </button>
          <button type="button" onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:opacity-80"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <Download size={13}/> {t('sl3_products.export')}
          </button>
          <Link to="/seller/products/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: T.orange, boxShadow: '0 4px 12px rgba(244,121,32,0.35)' }}>
            <Plus size={14}/> {t('sl3_products.new_product')}
          </Link>
        </div>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { ico: <Layers size={16}/>,       color: T.orange, bg: T.orangeL,   val: String(total),              label: t('sl3_products.kpi_total_label'),  sub: t('sl3_products.kpi_total_sub', { count: actifs }) },
          { ico: <CheckCircle size={16}/>,   color: T.green,  bg: T.greenL,    val: String(actifs),             label: t('sl3_products.kpi_active_label'), sub: t('sl3_products.kpi_active_sub', { count: total-actifs }) },
          { ico: <TrendingDown size={16}/>,  color: ruptures>0?T.red:T.muted,  bg: ruptures>0?T.redL:T.creamAlt, val: String(ruptures), label: t('sl3_products.kpi_out_label'), sub: t('sl3_products.kpi_out_sub') },
          { ico: <AlertTriangle size={16}/>, color: T.amber,  bg: T.amberL,    val: String(stockFaible.length), label: t('sl3_products.kpi_low_label'),    sub: t('sl3_products.kpi_low_sub') },
        ].map((k,i) => (
          <div key={i} className="rounded-2xl p-4 space-y-2"
            style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 6px rgba(28,18,9,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <span style={{ color: k.color }}>{k.ico}</span>
            </div>
            <p className="font-black text-[22px] leading-none" style={{ color: T.text }}>{k.val}</p>
            <div>
              <p className="text-[12px] font-semibold" style={{ color: T.text }}>{k.label}</p>
              <p className="text-[11px]" style={{ color: T.mutedL }}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ ALERTES STOCK ═══ */}
      {stockFaible.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FFF8E7)', border: `1px solid rgba(217,119,6,0.25)` }}>
          <p className="flex items-center gap-2 font-bold text-[13px] mb-3" style={{ color: T.amber }}>
            <AlertTriangle size={14}/> {t(stockFaible.length > 1 ? 'sl3_products.low_stock_alert_plural' : 'sl3_products.low_stock_alert', { count: stockFaible.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            {stockFaible.slice(0, 8).map(p => (
              <Link key={p.id} to={`/seller/products/${p.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all hover:opacity-80"
                style={{ background: T.white, border: `1px solid rgba(217,119,6,0.3)`, color: T.amber }}>
                {p.title.slice(0,22)}{p.title.length>22?'…':''} · <strong>{p.stock_quantity}</strong>
              </Link>
            ))}
            {stockFaible.length > 8 && <span className="text-[11px] self-center" style={{ color: T.amber }}>{t('sl3_products.low_stock_more', { count: stockFaible.length-8 })}</span>}
          </div>
        </div>
      )}

      {/* ═══ FILTRES ═══ */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <p className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: T.muted }}>
          <Filter size={12}/> {t('sl3_products.filters_title')}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[160px] max-w-[240px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('sl3_products.search_placeholder')}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
              style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}/>
          </div>

          {/* Catégorie parent */}
          <select value={catId} onChange={e => setCatId(e.target.value)}
            className="rounded-xl px-3 py-2 text-[12.5px] outline-none"
            style={{ background: T.cream, border: `1px solid ${catId ? T.orange : T.border}`, color: catId ? T.text : T.muted }}>
            <option value="">{t('sl3_products.all_categories')}</option>
            {parentCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Sous-catégorie — visible seulement si une catégorie parent est sélectionnée */}
          {catId && subCats.length > 0 && (
            <select value={subCatId} onChange={e => setSubCatId(e.target.value)}
              className="rounded-xl px-3 py-2 text-[12.5px] outline-none"
              style={{ background: subCatId ? T.orangeL : T.cream, border: `1px solid ${subCatId ? T.orange : T.border}`, color: subCatId ? T.orange : T.muted }}>
              <option value="">{t('sl3_products.all_subcategories')}</option>
              {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Stock */}
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}
            className="rounded-xl px-3 py-2 text-[12.5px] outline-none"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: stockFilter ? T.text : T.muted }}>
            <option value="">{t('sl3_products.all_stocks')}</option>
            <option value="ok">{t('sl3_products.stock_ok')}</option>
            <option value="low">{t('sl3_products.stock_low')}</option>
            <option value="out">{t('sl3_products.stock_out')}</option>
          </select>

          {/* Tri */}
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="rounded-xl px-3 py-2 text-[12.5px] outline-none"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <option value="name">{t('sl3_products.sort_name')}</option>
            <option value="price_desc">{t('sl3_products.sort_price_desc')}</option>
            <option value="price_asc">{t('sl3_products.sort_price_asc')}</option>
            <option value="stock">{t('sl3_products.sort_stock')}</option>
            <option value="created">{t('sl3_products.sort_created')}</option>
          </select>

          <button type="button" onClick={load}
            className="px-3 py-2 rounded-xl" style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <RefreshCw size={12}/>
          </button>
        </div>

        {/* Breadcrumb sous-catégorie */}
        {showBreadcrumb && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: T.orangeL, border: `1px solid ${T.orangeB}` }}>
            <Tag size={12} style={{ color: T.orange }}/>
            <p className="text-[12px] font-semibold" style={{ color: T.orange }}>
              {activeCat.name}
              <ChevronRight size={11} className="inline mx-1"/>
              {activeSubCat.name}
              <span className="ml-1.5 text-[11px] font-normal" style={{ color: T.muted }}>
                {t(filtered.length > 1 ? 'sl3_products.breadcrumb_count_plural' : 'sl3_products.breadcrumb_count', { count: filtered.length })}
              </span>
            </p>
            <button type="button" onClick={() => { setSubCatId(''); setCatId(''); }}
              className="ml-auto" style={{ color: T.orange }}>
              <X size={12}/>
            </button>
          </div>
        )}
      </div>

      {/* ═══ BARRE BULK ═══ */}
      {selected.size > 0 && (
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: T.sidebar }}>
          <p className="text-[12.5px] font-bold text-white">
            {t(selected.size > 1 ? 'sl3_products.bulk_selected_plural' : 'sl3_products.bulk_selected', { count: selected.size })}
          </p>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button type="button" onClick={handleBulkPause}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
              {t('sl3_products.bulk_pause')}
            </button>
            <button type="button" onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: T.redL, color: T.red }}>
              <Trash2 size={11}/> {t('sl3_products.bulk_delete')}
            </button>
            <button type="button" onClick={clearSel} className="px-3 py-1.5 rounded-xl text-[12px]"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('sl3_products.bulk_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ LISTE PRODUITS ═══ */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <Package size={44} className="mx-auto mb-4" style={{ color: T.mutedL }}/>
          <p className="font-bold text-[16px] mb-1" style={{ color: T.text }}>
            {products.length === 0 ? t('sl3_products.empty_none_title') : t('sl3_products.empty_filtered_title')}
          </p>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            {products.length === 0 ? t('sl3_products.empty_none_desc') : t('sl3_products.empty_filtered_desc')}
          </p>
          {products.length === 0 && (
            <Link to="/seller/products/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-[13px]"
              style={{ background: T.orange }}>
              <Plus size={14}/> {t('sl3_products.empty_add_product')}
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 2px 8px rgba(28,18,9,0.06)' }}>
          {/* Header liste */}
          <div className="flex items-center gap-3 px-5 py-3" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
            <input type="checkbox" checked={allSel} onChange={allSel ? clearSel : selectAll}
              className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
            <p className="text-[12px] font-semibold flex-1" style={{ color: T.muted }}>
              {t(filtered.length > 1 ? 'sl3_products.list_count_plural' : 'sl3_products.list_count', { count: filtered.length })}
              {search || catId || subCatId || stockFilter ? t('sl3_products.list_filtered_of', { total }) : ''}
            </p>
          </div>

          {filtered.map((p, idx) => {
            const thr     = p.stock_threshold ?? THRESHOLD_DEFAULT;
            const isSel   = selected.has(p.id);
            const discPct = p.discount_percent || p.discount || 0;
            const cmpAt   = p.compare_at_price;
            const promoEnd = p.promo_end_date;
            const img     = p.images?.find(i => i.is_primary) || p.images?.[0];
            const catName = categoryName(p.category);
            const rating  = p.rating_average;
            const reviews = p.reviews_count || 0;

            return (
              <div key={p.id}
                className="flex items-start gap-4 px-5 py-4 group transition-all"
                style={{
                  borderBottom: idx < filtered.length-1 ? `1px solid ${T.border}` : 'none',
                  background:   isSel ? T.orangeL : T.white,
                }}>

                {/* Checkbox */}
                <div className="flex items-center pt-1 flex-shrink-0">
                  <input type="checkbox" checked={isSel} onChange={() => toggleSel(p.id)}
                    className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
                </div>

                {/* Image */}
                <div className="w-[72px] h-[72px] rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: T.creamAlt }}>
                  {img?.image_url
                    ? <img src={img.image_url} alt={p.title} className="w-full h-full object-cover"/>
                    : <Package size={24} style={{ color: T.mutedL }}/>
                  }
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Titre + badge statut */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[14px]" style={{ color: T.text }}>
                      {p.title}
                    </p>
                    {p.is_active
                      ? <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.greenL, color: T.green }}>{t('sl3_products.status_active')}</span>
                      : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>{t('sl3_products.status_moderation')}</span>
                    }
                  </div>

                  {/* Catégorie */}
                  <p className="text-[11.5px]" style={{ color: T.muted }}>
                    <Tag size={10} className="inline mr-1 mb-0.5" style={{ color: T.mutedL }}/>{catName}
                  </p>

                  {/* Tags pills */}
                  <div className="flex flex-wrap gap-1.5">
                    <StockBadge qty={p.stock_quantity} threshold={thr}/>
                    {discPct > 0 && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.orangeL, color: T.orange }}>
                        -{discPct}%
                      </span>
                    )}
                    {promoEnd && <PromoTimer end={promoEnd}/>}
                    {rating && reviews > 0 && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>
                        ★ {rating} ({reviews})
                      </span>
                    )}
                  </div>

                  {/* Stock inline */}
                  <StockInput product={p} onUpdate={handleStockUpdate}/>
                </div>

                {/* Prix + actions */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-black text-[17px]" style={{ color: T.orange }}>
                      {p.price_xaf.toLocaleString('fr-FR')} FCFA
                    </p>
                    {cmpAt && (
                      <p className="text-[11px] line-through" style={{ color: T.mutedL }}>
                        {cmpAt.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => vendorsApi.openProductSheet(p.id)} title={t('sl3_products.action_sheet')}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                      <FileText size={13} style={{ color: T.muted }}/>
                    </button>
                    <button type="button" onClick={() => handleDuplicate(p.id)} title={t('sl3_products.action_duplicate')} disabled={duplicating===p.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                      {duplicating===p.id ? <RefreshCw size={12} className="animate-spin" style={{color:T.muted}}/> : <Copy size={13} style={{color:T.muted}}/>}
                    </button>
                    <Link to={`/seller/products/${p.id}/edit`} title={t('sl3_products.action_edit')}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                      <Pencil size={13} style={{ color: T.blue }}/>
                    </Link>
                    <button type="button" onClick={() => handleDelete(p.id, p.title)} disabled={deleting===p.id} title={t('sl3_products.action_delete')}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)` }}>
                      {deleting===p.id ? <RefreshCw size={12} className="animate-spin" style={{color:T.red}}/> : <Trash2 size={13} style={{color:T.red}}/>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
