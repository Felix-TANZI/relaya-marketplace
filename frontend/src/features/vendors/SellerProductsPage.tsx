// frontend/src/features/vendors/SellerProductsPage.tsx
// Page gestion des produits — espace vendeur BelivaY.
//
// Sections :
//   A. KPIs : total produits, actifs, en rupture, CA du mois
//   B. Alertes stock (produits sous seuil)
//   C. Barre d'outils : recherche + filtre catégorie + filtre stock + tri
//   D. Barre sélection multiple (bulk) : Pause / Supprimer
//   E. Liste produits : image, nom, SKU, tags, stock inline, timer promo, actions
//   F. Import CSV / Export CSV / Télécharger fiche PDF

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Download, Upload, RefreshCw,
  AlertTriangle, Package, CheckCircle,
  Copy, Pencil, FileText, Trash2,
  BarChart2, Clock,
} from 'lucide-react';
import { vendorsApi, type VendorProduct, type VendorProductEnriched } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
  violet: '#7C3AED', violetL: 'rgba(124,58,237,0.10)',
  sidebar: '#1C1209',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Timer promo : retourne { days, hours, mins } ou null si expiré / pas de date
function usePromoTimer(endDate: string | null | undefined) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; mins: number } | null>(null);

  useEffect(() => {
    if (!endDate) return;
    const update = () => {
      const diff = new Date(endDate).getTime() + 86400000 - Date.now(); // fin de journée
      if (diff <= 0) { setRemaining(null); return; }
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000) / 60000);
      setRemaining({ days, hours, mins });
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [endDate]);

  return remaining;
}

type SellerProductRow = Omit<VendorProduct, 'category'> & {
  category: VendorProduct['category'] | VendorProductEnriched['category'];
  stock_threshold?: number | null;
  discount?: number;
  discount_percent?: number;
  compare_at_price?: number | null;
  promo_end_date?: string | null;
  sku?: string;
  rating_average?: number | null;
  reviews_count?: number;
};

function getCategoryName(category: SellerProductRow['category']): string {
  return typeof category === 'object' && category !== null && 'name' in category ? category.name : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ ico, value, label, sublabel, color, bg }: {
  ico: React.ReactNode; value: string; label: string; sublabel?: string;
  color: string; bg: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <span style={{ color }}>{ico}</span>
        </div>
        <p className="text-[12px] font-semibold" style={{ color: T.muted }}>{label}</p>
      </div>
      <p className="font-black text-[22px] leading-none" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{value}</p>
      {sublabel && <p className="text-[11px]" style={{ color: T.mutedL }}>{sublabel}</p>}
    </div>
  );
}

// Timer promo affiché sur la carte produit
function PromoTimer({ endDate }: { endDate: string }) {
  const r = usePromoTimer(endDate);
  if (!r) return null;
  return (
    <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: T.amberL, color: T.amber }}>
      <Clock size={10} />
      {r.days > 0 ? `${r.days}j ` : ''}{r.hours}h {r.mins}m
    </span>
  );
}

// Input stock inline éditable
function StockInput({ product, onUpdate }: { product: SellerProductRow; onUpdate: (id: number, qty: number) => void }) {
  const [val, setVal] = useState(String(product.stock_quantity));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty < 0 || qty === product.stock_quantity) return;
    try {
      setSaving(true);
      await vendorsApi.updateProductStock(product.id, qty);
      onUpdate(product.id, qty);
    } catch { setVal(String(product.stock_quantity)); }
    finally { setSaving(false); }
  };

  const stockNum = parseInt(val, 10) || 0;
  const threshold = product.stock_threshold ?? 5;
  const stockColor = stockNum === 0 ? T.red : stockNum <= threshold ? T.amber : T.green;

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] font-semibold" style={{ color: T.muted }}>Stock :</p>
      <input
        type="number" min={0} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="w-16 text-center rounded-lg py-1 text-[12.5px] font-bold outline-none"
        style={{ background: `${stockColor}18`, border: `1px solid ${stockColor}40`, color: stockColor }}
      />
      {saving && <RefreshCw size={11} className="animate-spin" style={{ color: T.muted }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'created';
type StockFilter = '' | 'ok' | 'low' | 'out';

export default function SellerProductsPage() {
  const { showToast } = useToast();

  const [products,    setProducts]    = useState<SellerProductRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [sortKey,     setSortKey]     = useState<SortKey>('name');
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [importing,   setImporting]   = useState(false);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProducts((await vendorsApi.getProducts()) as SellerProductRow[]);
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Catégories distinctes pour le filtre
  const categories = [...new Set(products.map(p => getCategoryName(p.category)).filter(Boolean))];

  // KPIs
  const total    = products.length;
  const actifs   = products.filter(p => p.is_active).length;
  const ruptures = products.filter(p => p.stock_quantity === 0).length;
  const threshold_default = 5;
  const stockFaible = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= threshold_default);

  // Filtrage + tri
  const filtered = products
    .filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && getCategoryName(p.category) !== catFilter) return false;
      if (stockFilter === 'ok')  return p.stock_quantity > threshold_default;
      if (stockFilter === 'low') return p.stock_quantity > 0 && p.stock_quantity <= threshold_default;
      if (stockFilter === 'out') return p.stock_quantity === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'price_asc')  return a.price_xaf - b.price_xaf;
      if (sortKey === 'price_desc') return b.price_xaf - a.price_xaf;
      if (sortKey === 'stock')      return a.stock_quantity - b.stock_quantity;
      if (sortKey === 'created')    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.title.localeCompare(b.title);
    });

  // Sélection
  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selectAll  = () => setSelected(new Set(filtered.map(p => p.id)));
  const clearSel   = () => setSelected(new Set());
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  // Mise à jour stock inline
  const handleStockUpdate = (id: number, qty: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: qty } : p));
  };

  // Duplication
  const handleDuplicate = async (id: number) => {
    try {
      setDuplicating(id);
      await vendorsApi.duplicateProduct(id);
      showToast('Produit dupliqué — inactif par défaut', 'success');
      await load();
    } catch { showToast('Erreur lors de la duplication', 'error'); }
    finally { setDuplicating(null); }
  };

  // Suppression
  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Supprimer "${title}" définitivement ?`)) return;
    try {
      setDeleting(id);
      await vendorsApi.deleteProduct(id);
      showToast('Produit supprimé', 'success');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { showToast('Erreur lors de la suppression', 'error'); }
    finally { setDeleting(null); }
  };

  // Bulk pause (désactiver)
  const handleBulkPause = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    for (const id of ids) {
      try { await vendorsApi.updateProduct(id, { is_active: false }); } catch { /* continue */ }
    }
    showToast(`${ids.length} produit(s) mis en pause`, 'success');
    clearSel();
    await load();
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Supprimer ${selected.size} produit(s) définitivement ?`)) return;
    const ids = [...selected];
    for (const id of ids) {
      try { await vendorsApi.deleteProduct(id); } catch { /* continue */ }
    }
    showToast(`${ids.length} produit(s) supprimé(s)`, 'success');
    clearSel();
    await load();
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const blob = await vendorsApi.exportProductsCSV();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `belivay_produits_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export CSV téléchargé', 'success');
    } catch { showToast('Erreur export CSV', 'error'); }
  };

  // Import CSV
  const handleImportCSV = async (file: File) => {
    try {
      setImporting(true);
      const result = await vendorsApi.importProductsCSV(file);
      showToast(result.message, result.created > 0 ? 'success' : 'error');
      if (result.errors.length > 0) {
        console.warn('Erreurs import CSV :', result.errors);
      }
      await load();
    } catch { showToast("Erreur lors de l'import", 'error'); }
    finally { setImporting(false); }
  };

  // Fiche PDF
  const handleProductSheet = async (id: number) => {
    try {
      await vendorsApi.openProductSheet(id);
    } catch { showToast('Erreur génération fiche', 'error'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }} />
    </div>
  );

  return (
    <div className="space-y-5 pb-10">

      {/* ═══ EN-TÊTE ═══ */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-[22px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>Mes Produits</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {total} produit{total > 1 ? 's' : ''} · {ruptures} en rupture
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Import CSV */}
          <input type="file" ref={fileRef} className="hidden" accept=".csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            {importing ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            Importer CSV
          </button>
          <button type="button" onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <Download size={13} />Exporter
          </button>
          <Link to="/seller/products/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: T.orange, boxShadow: '0 2px 8px rgba(244,121,32,0.35)' }}>
            <Plus size={14} />Nouveau produit
          </Link>
        </div>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard ico={<Package size={16}/>}    value={String(total)}   label="Total produits"   sublabel={`${actifs} actifs`}                  color={T.orange} bg={T.orangeL}/>
        <KpiCard ico={<CheckCircle size={16}/>} value={String(actifs)}  label="Produits actifs"  sublabel={`${total - actifs} inactifs`}        color={T.green}  bg={T.greenL}/>
        <KpiCard ico={<AlertTriangle size={16}/>} value={String(ruptures)} label="En rupture"    sublabel="Stock = 0"                          color={ruptures > 0 ? T.red : T.muted} bg={ruptures > 0 ? T.redL : T.creamAlt}/>
        <KpiCard ico={<BarChart2 size={16}/>}  value={String(stockFaible.length)} label="Stock faible" sublabel={`Sous le seuil d'alerte`}    color={T.amber}  bg={T.amberL}/>
      </div>

      {/* ═══ ALERTES STOCK ═══ */}
      {stockFaible.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.3)` }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color: T.amber }}/>
            <p className="font-bold text-[13px]" style={{ color: T.amber }}>
              {stockFaible.length} produit{stockFaible.length > 1 ? 's' : ''} sous le seuil d'alerte
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stockFaible.slice(0, 8).map(p => (
              <Link key={p.id} to={`/seller/products/${p.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold"
                style={{ background: T.white, border: `1px solid rgba(217,119,6,0.25)`, color: T.amber }}>
                {p.title.slice(0, 25)}{p.title.length > 25 ? '…' : ''} · <strong>{p.stock_quantity} unités</strong>
              </Link>
            ))}
            {stockFaible.length > 8 && (
              <span className="text-[11px] self-center" style={{ color: T.amber }}>+{stockFaible.length - 8} autres</span>
            )}
          </div>
        </div>
      )}

      {/* ═══ BARRE RECHERCHE + FILTRES + TRI ═══ */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        {/* Filtre catégorie */}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: catFilter ? T.text : T.muted }}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Filtre stock */}
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}
          className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: stockFilter ? T.text : T.muted }}>
          <option value="">Tous stocks</option>
          <option value="ok">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
        {/* Tri */}
        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
          className="rounded-xl px-3 py-2.5 text-[12.5px] outline-none"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <option value="name">Trier : Nom</option>
          <option value="price_desc">Prix ↓</option>
          <option value="price_asc">Prix ↑</option>
          <option value="stock">Stock ↑</option>
          <option value="created">Plus récents</option>
        </select>
        <button type="button" onClick={load}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-[12.5px]"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <RefreshCw size={12}/>
        </button>
      </div>

      {/* ═══ BARRE SÉLECTION MULTIPLE ═══ */}
      {selected.size > 0 && (
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: T.sidebar, border: `1px solid rgba(255,255,255,0.08)` }}>
          <p className="text-[12.5px] font-bold text-white">{selected.size} produit{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</p>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button type="button" onClick={handleBulkPause}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
              Mettre en pause
            </button>
            <button type="button" onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: T.redL, color: T.red }}>
              <Trash2 size={11}/>Supprimer
            </button>
            <button type="button" onClick={clearSel}
              className="px-3 py-1.5 rounded-xl text-[12px]"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ═══ LISTE PRODUITS ═══ */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <Package size={40} className="mx-auto mb-3" style={{ color: T.mutedL }}/>
          <p className="font-bold text-[16px] mb-1" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {products.length === 0 ? 'Aucun produit' : 'Aucun produit trouvé'}
          </p>
          <p className="text-[13px] mb-4" style={{ color: T.muted }}>
            {products.length === 0 ? 'Ajoutez votre premier produit pour commencer à vendre.' : 'Essayez d\'autres filtres.'}
          </p>
          {products.length === 0 && (
            <Link to="/seller/products/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-[13px]"
              style={{ background: T.orange }}>
              <Plus size={14}/>Ajouter un produit
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
          {/* Header liste */}
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.cream }}>
            <input type="checkbox" checked={allSelected} onChange={allSelected ? clearSel : selectAll}
              className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
            <p className="text-[12px] font-semibold" style={{ color: T.muted }}>
              {filtered.length} produit{filtered.length > 1 ? 's' : ''}
            </p>
          </div>

          {filtered.map((p, idx) => {
            const isSelected  = selected.has(p.id);
            const discountPct = p.discount_percent || p.discount || 0;
            const compareAt   = p.compare_at_price;
            const promoEnd    = p.promo_end_date;
            const primaryImg  = p.images?.find(i => i.is_primary) || p.images?.[0];
            const sku         = p.sku || `BLV-${p.id}`;
            const catName     = getCategoryName(p.category);
            const rating      = p.rating_average;
            const reviews     = p.reviews_count || 0;

            return (
              <div key={p.id}
                className="flex items-start gap-4 px-5 py-4 transition-all"
                style={{
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: isSelected ? T.orangeL : T.white,
                }}>

                {/* Checkbox */}
                <div className="flex items-center pt-1 flex-shrink-0">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                    className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
                </div>

                {/* Image */}
                <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: T.creamAlt }}>
                  {primaryImg?.image_url
                    ? <img src={primaryImg.image_url} alt={p.title} className="w-full h-full object-cover"/>
                    : <Package size={22} style={{ color: T.mutedL }}/>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-bold text-[14px] leading-tight" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                      {p.title}
                    </p>
                    {p.is_active
                      ? <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.greenL, color: T.green }}>Actif</span>
                      : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>Modération</span>
                    }
                  </div>
                  <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
                    {catName} · SKU : <span style={{ fontFamily: 'monospace' }}>{sku}</span>
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {discountPct > 0 && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.orangeL, color: T.orange }}>
                        -{discountPct}%
                      </span>
                    )}
                    {compareAt && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: T.cream, color: T.muted }}>
                        Barré : {compareAt.toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                    {promoEnd && <PromoTimer endDate={promoEnd}/>}
                    {rating && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>
                        ★ {rating} ({reviews} avis)
                      </span>
                    )}
                  </div>

                  {/* Stock inline */}
                  <div className="mt-2.5">
                    <StockInput product={p} onUpdate={handleStockUpdate}/>
                  </div>
                </div>

                {/* Prix + actions */}
                <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-black text-[16px]" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
                      {p.price_xaf.toLocaleString('fr-FR')} FCFA
                    </p>
                    {compareAt && (
                      <p className="text-[11px] line-through" style={{ color: T.mutedL }}>
                        {compareAt.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button type="button" onClick={() => handleProductSheet(p.id)} title="Fiche produit"
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                      <FileText size={13} style={{ color: T.muted }}/>
                    </button>
                    <button type="button" onClick={() => handleDuplicate(p.id)} title="Dupliquer"
                      disabled={duplicating === p.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                      {duplicating === p.id ? <RefreshCw size={12} className="animate-spin" style={{ color: T.muted }}/> : <Copy size={13} style={{ color: T.muted }}/>}
                    </button>
                    <Link to={`/seller/products/${p.id}/edit`} title="Modifier"
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                      <Pencil size={13} style={{ color: T.blue }}/>
                    </Link>
                    <button type="button" onClick={() => handleDelete(p.id, p.title)} title="Supprimer"
                      disabled={deleting === p.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)` }}>
                      {deleting === p.id ? <RefreshCw size={12} className="animate-spin" style={{ color: T.red }}/> : <Trash2 size={13} style={{ color: T.red }}/>}
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
