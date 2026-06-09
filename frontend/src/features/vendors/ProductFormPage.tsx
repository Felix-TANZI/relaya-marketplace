// frontend/src/features/vendors/ProductFormPage.tsx
// Formulaire création/édition produit — design system BelivaY.
//
// Champs retirés : Slug URL (auto-géré backend), SKU (auto-généré backend)
// Obligatoires   : Titre, Catégorie, Description courte, Description complète,
//                  Prix, Stock, Seuil alerte stock
// Sous-catégorie : apparaît après sélection d'une catégorie parente

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Upload, X, RefreshCw, Save,
  ImageIcon, Tag, BarChart2, DollarSign,
  CheckCircle, Clock, Info, ChevronRight, Layers,
} from 'lucide-react';
import {
  vendorsApi,
  type ProductImage,
  type ProductAttribute,
  type VendorProduct,
  type VendorProductEnriched,
  type MasterFiche,
} from '@/services/api/vendors';
import { productsApi, type Category } from '@/services/api/products';
import { useToast } from '@/context/ToastContext';

const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.25)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
};

function fmtXAF(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; }

// Timer countdown promo
function PromoCountdown({ end }: { end: string }) {
  const [r, setR] = useState<{ d:number; h:number; m:number }|null>(null);
  useEffect(() => {
    const upd = () => {
      const diff = new Date(end).getTime() + 86400000 - Date.now();
      if (diff <= 0) { setR(null); return; }
      setR({ d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000) });
    };
    upd(); const id = setInterval(upd, 30000); return () => clearInterval(id);
  }, [end]);
  if (!r) return <span className="text-[11px]" style={{ color: T.red }}>Promotion expirée</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: T.amber }}>
      <Clock size={11}/> Fin dans {r.d>0?`${r.d}j `:''}{r.h}h {r.m}m
    </span>
  );
}

// Carte section
function Section({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${accent ? T.orange : T.border}`, boxShadow: '0 1px 6px rgba(28,18,9,0.06)' }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: accent ? T.orangeL : T.cream, borderBottom: `1px solid ${accent ? T.orangeB : T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent ? T.orangeB : 'rgba(28,18,9,0.06)' }}>
          <span style={{ color: accent ? T.orange : T.muted }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: error ? T.red : T.text }}>
        {label}{required && <span style={{ color: T.red }}>*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-semibold" style={{ color: T.red }}>{error}</p>}
      {!error && hint && <p className="text-[11px]" style={{ color: T.mutedL }}>{hint}</p>}
    </div>
  );
}

const iBase: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none', width: '100%',
};
const iErr: React.CSSProperties = { ...iBase, border: `1.5px solid ${T.red}` };

type ProductFormItem = Omit<VendorProduct, 'category'> &
  Partial<Omit<VendorProductEnriched, 'category'>> & {
    category: VendorProduct['category'] | VendorProductEnriched['category'];
  };

type ProductAttributeSelection = {
  attribute: Pick<ProductAttribute, 'id'>;
  selected_values: string[];
};

type ProductPayload = Partial<VendorProduct> & {
  short_description: string;
  compare_at_price: number | null;
  promo_end_date: string | null;
  stock_threshold: number;
  master: number | null;
};

function categoryId(category: ProductFormItem['category']) {
  return typeof category === 'number' ? category : category.id;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const isEdit    = !!id;

  // ── Formulaire ──
  const [title,         setTitle]       = useState('');
  const [description,   setDesc]        = useState('');
  const [shortDesc,     setShortDesc]   = useState('');
  const [parentCatId,   setParentCatId] = useState('');   // catégorie parent
  const [subCatId,      setSubCatId]    = useState('');   // sous-catégorie (optionnel)
  const [priceXaf,      setPriceXaf]    = useState('');
  const [compareAt,     setCompareAt]   = useState('');
  const [promoEnd,      setPromoEnd]    = useState('');
  const [stockQty,      setStockQty]    = useState('');
  const [stockThreshold,setThreshold]   = useState('');   // OBLIGATOIRE
  const [isActive,      setIsActive]    = useState(true);
  const [attrVals,      setAttrVals]    = useState<Record<number, string[]>>({});

  // ── Fiche produit (rattachement) ──
  const [masterMode,     setMasterMode]     = useState<'new' | 'existing'>('new');
  const [masterQuery,    setMasterQuery]    = useState('');
  const [masterResults,  setMasterResults]  = useState<MasterFiche[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<MasterFiche | null>(null);
  const [masterLoading,  setMasterLoading]  = useState(false);

  // ── UI ──
  const [allCats,    setAllCats]    = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [images,     setImages]     = useState<ProductImage[]>([]);
  const [tempImgs,   setTempImgs]   = useState<{ file: File; preview: string }[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const commission = 12;
  const photoRef = useRef<HTMLInputElement>(null);

  // Catégories parent et sous-catégories
  const parentCats = allCats.filter(c => !c.parent);
  const subCats    = parentCatId
    ? allCats.filter(c => c.parent === parseInt(parentCatId, 10))
    : [];

  // ID catégorie effectif pour l'API (sous-cat si choisie, sinon parent)
  const effectiveCatId = subCatId || parentCatId;

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const catsResp = await productsApi.listCategories({ page_size: 200 });
        setAllCats(catsResp.results || []);

        if (isEdit && id) {
          const prods = await vendorsApi.getProducts();
          const p = prods.find(x => x.id === parseInt(id));
          if (!p) { showToast('Produit introuvable','error'); navigate('/seller/products'); return; }

          const product = p as ProductFormItem;
          const pCatId = categoryId(product.category);
          const pCat   = (catsResp.results || []).find(c => c.id === pCatId);

          if (pCat?.parent) {
            setParentCatId(String(pCat.parent));
            setSubCatId(String(pCat.id));
          } else {
            setParentCatId(String(pCatId || ''));
          }

          setTitle(p.title);
          setDesc(p.description || '');
          setShortDesc(product.short_description || '');
          setPriceXaf(String(p.price_xaf));
          setCompareAt(String(product.compare_at_price || ''));
          setPromoEnd(product.promo_end_date || '');
          setStockQty(String(p.stock_quantity));
          setThreshold(String(product.stock_threshold || ''));
          setIsActive(p.is_active);
          setImages(p.images || []);
          const ea: Record<number,string[]> = {};
          for (const av of product.attribute_values || [] as ProductAttributeSelection[]) ea[av.attribute.id] = av.selected_values;
          setAttrVals(ea);
        }
      } catch { showToast('Erreur de chargement','error'); }
      finally { setLoading(false); }
    };
    init();
  }, [id, isEdit, navigate, showToast]);

  // Charger attributs quand catégorie effective change
  useEffect(() => {
    if (!effectiveCatId) { setAttributes([]); return; }
    vendorsApi.getProductAttributes(parseInt(effectiveCatId))
      .then(setAttributes).catch(() => setAttributes([]));
  }, [effectiveCatId]);

  // Reset sous-cat si parent change
  useEffect(() => { setSubCatId(''); }, [parentCatId]);

  // Recherche de fiches (debounce 300 ms) en mode "fiche existante"
  useEffect(() => {
    if (masterMode !== 'existing') return;
    const q = masterQuery.trim();
    const handle = window.setTimeout(async () => {
      try {
        setMasterLoading(true);
        setMasterResults(await vendorsApi.searchMasters(q));
      } catch { setMasterResults([]); }
      finally { setMasterLoading(false); }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [masterQuery, masterMode]);

  const price   = parseInt(priceXaf, 10) || 0;
  const compare = parseInt(compareAt, 10) || 0;
  const discPct = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const net     = price * (1 - commission / 100);

  // ── Photos ────────────────────────────────────────────────────────────────
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const rem = 6 - images.length - tempImgs.length;
    const toAdd = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, rem);
    setTempImgs(prev => [...prev, ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };
  const rmTemp = (i: number) => setTempImgs(prev => { const n=[...prev]; URL.revokeObjectURL(n[i].preview); n.splice(i,1); return n; });
  const rmExisting = async (imgId: number) => {
    try { await vendorsApi.deleteImage(parseInt(id!), imgId); setImages(prev => prev.filter(i => i.id !== imgId)); }
    catch { showToast('Erreur suppression image','error'); }
  };
  const setPrimary = async (imgId: number) => {
    try { await vendorsApi.setPrimaryImage(parseInt(id!), imgId); setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === imgId }))); }
    catch { showToast('Erreur image principale','error'); }
  };

  const toggleAttr = (attrId: number, val: string) => {
    setAttrVals(prev => {
      const cur = prev[attrId] || [];
      return { ...prev, [attrId]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string,string> = {};
    if (!title.trim())                              e.title       = 'Le titre est requis.';
    if (!parentCatId)                               e.parentCatId = 'Veuillez sélectionner une catégorie.';
    if (shortDesc.trim().length < 10)               e.shortDesc   = 'Description courte requise (min 10 caractères).';
    if (description.trim().length < 20)             e.description = 'Description complète requise (min 20 caractères).';
    if (!priceXaf || price < 100)                   e.priceXaf    = 'Prix minimum : 100 FCFA.';
    if (compare && compare <= price)                e.compareAt   = 'Le prix barré doit être supérieur au prix de vente.';
    const sq = parseInt(stockQty, 10);
    if (isNaN(sq) || sq < 0)                        e.stockQty    = 'Stock invalide.';
    if (!stockThreshold.trim())                     e.threshold   = 'Seuil alerte stock requis.';
    else if (parseInt(stockThreshold,10) < 0)       e.threshold   = 'Seuil invalide.';
    for (const attr of attributes) {
      if (attr.is_required && !(attrVals[attr.id]?.length))
        e[`attr_${attr.id}`] = `"${attr.name}" est obligatoire.`;
    }
    if (!isEdit && masterMode === 'existing' && !selectedMaster)
      e.master = 'Choisissez une fiche dans la liste, ou créez une nouvelle fiche.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Soumission ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) { showToast('Corrigez les erreurs avant de continuer.','error'); return; }
    try {
      setSaving(true);
      const payload: ProductPayload = {
        title:             title.trim(),
        description:       description.trim(),
        short_description: shortDesc.trim(),
        price_xaf:         price,
        compare_at_price:  compare > price ? compare : null,
        promo_end_date:    promoEnd || null,
        category:          parseInt(effectiveCatId, 10),
        is_active:         isActive,
        stock_quantity:    parseInt(stockQty, 10) || 0,
        stock_threshold:   parseInt(stockThreshold, 10),
        master:            masterMode === 'existing' && selectedMaster ? selectedMaster.id : null,
      };

      let productId: number;
      if (isEdit && id) {
        await vendorsApi.updateProduct(parseInt(id), payload);
        productId = parseInt(id);
        showToast('Produit mis à jour','success');
      } else {
        const created = await vendorsApi.createProduct(payload);
        productId = created.id;
        showToast('Produit créé — en attente de modération','success');
      }
      for (let i = 0; i < tempImgs.length; i++) {
        try { await vendorsApi.uploadImage(productId, tempImgs[i].file, i===0 && images.length===0); }
        catch { showToast("Une image n'a pas pu être envoyée",'error'); }
      }
      navigate('/seller/products');
    } catch (e: unknown) {
      showToast(getErrorMessage(e),'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* EN-TÊTE */}
      <div className="flex items-center gap-3">
        <Link to="/seller/products"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{ background: T.cream, border: `1px solid ${T.border}` }}>
          <ArrowLeft size={16} style={{ color: T.muted }}/>
        </Link>
        <div>
          <h1 className="font-black text-[20px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h1>
          <p className="text-[12px]" style={{ color: T.muted }}>
            {isEdit ? 'Modifiez et enregistrez.' : 'Soumis à modération BelivaY · SLA 48h'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── COLONNE GAUCHE (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* INFOS GÉNÉRALES */}
          <Section title="Informations générales" icon={<Package size={15}/>}>
            <Field label="Titre du produit" required error={errors.title} hint={`${title.length}/200`}>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                placeholder="Ex : Robe Wax Ankara Premium"
                style={errors.title ? iErr : iBase}/>
            </Field>
            <Field label="Description courte" required error={errors.shortDesc}
              hint={`${shortDesc.length}/300 · Affichée dans les aperçus`}>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)}
                maxLength={300} rows={2}
                placeholder="Ex : Robe en wax authentique, coupe évasée, toutes tailles disponibles."
                style={errors.shortDesc ? { ...iErr, resize:'none' } : { ...iBase, resize:'none' }}/>
            </Field>
            <Field label="Description complète" required error={errors.description}>
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={6}
                placeholder="Matière, taille, entretien, garantie, particularités…"
                style={errors.description ? { ...iErr, resize:'vertical', minHeight:120 } : { ...iBase, resize:'vertical', minHeight:120 }}/>
            </Field>
          </Section>

          {/* FICHE PRODUIT (rattachement) */}
          <Section title="Fiche produit" icon={<Tag size={15}/>}>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setMasterMode('new'); setSelectedMaster(null); }}
                className="flex-1 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all"
                style={{
                  background:  masterMode === 'new' ? T.orangeL : T.cream,
                  borderColor: masterMode === 'new' ? T.orange : T.border,
                  color:       masterMode === 'new' ? T.orange : T.text,
                }}>
                Nouvelle fiche
              </button>
              <button type="button" onClick={() => setMasterMode('existing')}
                className="flex-1 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all"
                style={{
                  background:  masterMode === 'existing' ? T.orangeL : T.cream,
                  borderColor: masterMode === 'existing' ? T.orange : T.border,
                  color:       masterMode === 'existing' ? T.orange : T.text,
                }}>
                Rattacher à une fiche existante
              </button>
            </div>

            {masterMode === 'new' && (
              <p className="text-[11px]" style={{ color: T.mutedL }}>
                Une nouvelle fiche sera créée pour ce produit (soumise à validation).
              </p>
            )}

            {masterMode === 'existing' && (
              <div className="space-y-2">
                <input value={masterQuery} onChange={e => setMasterQuery(e.target.value)}
                  placeholder="Rechercher une fiche (ex : iPhone 15)…" style={iBase}/>
                {masterLoading && <p className="text-[11px]" style={{ color: T.mutedL }}>Recherche…</p>}
                {!masterLoading && masterResults.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                    {masterResults.map(m => (
                      <button key={m.id} type="button"
                        onClick={() => { setSelectedMaster(m); setMasterResults([]); setMasterQuery(m.title); }}
                        className="w-full text-left px-3 py-2 text-[12.5px] transition-all"
                        style={{ background: selectedMaster?.id === m.id ? T.orangeL : T.white,
                                 color: T.text, borderBottom: `1px solid ${T.border}` }}>
                        <span className="font-semibold">{m.title}</span>
                        <span style={{ color: T.mutedL }}> · {m.category_name}{m.brand ? ` · ${m.brand}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedMaster && (
                  <p className="text-[11.5px] font-semibold" style={{ color: T.orange }}>
                    Fiche choisie : {selectedMaster.title}
                  </p>
                )}
                {isEdit && !selectedMaster && (
                  <p className="text-[11px]" style={{ color: T.mutedL }}>
                    Laissez tel quel pour conserver la fiche actuelle.
                  </p>
                )}
                {errors.master && (
                  <p className="text-[11px] font-semibold" style={{ color: T.red }}>{errors.master}</p>
                )}
              </div>
            )}
          </Section>

          {/* CATÉGORIE + SOUS-CATÉGORIE + ATTRIBUTS */}
          <Section title="Catégorie & Attributs" icon={<Tag size={15}/>}>

            <Field label="Catégorie" required error={errors.parentCatId}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {parentCats.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => setParentCatId(String(c.id))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left border-2 transition-all text-[12.5px] font-semibold"
                    style={{
                      background:  parentCatId === String(c.id) ? T.orangeL : T.cream,
                      borderColor: parentCatId === String(c.id) ? T.orange : T.border,
                      color:       parentCatId === String(c.id) ? T.orange : T.muted,
                    }}>
                    <Layers size={12} style={{ flexShrink: 0 }}/>
                    <span className="truncate">{c.name}</span>
                    {parentCatId === String(c.id) && <CheckCircle size={11} style={{ flexShrink: 0, marginLeft: 'auto' }}/>}
                  </button>
                ))}
              </div>
            </Field>

            {/* Sous-catégorie — visible seulement si le parent a des enfants */}
            {parentCatId && subCats.length > 0 && (
              <Field label="Sous-catégorie"
                hint="Optionnel. Choisissez une sous-catégorie pour plus de précision.">
                <div className="flex items-center gap-2 mb-1.5" style={{ color: T.muted }}>
                  <ChevronRight size={12}/>
                  <span className="text-[11.5px] font-semibold">
                    Sous-catégories de « {parentCats.find(c => c.id === parseInt(parentCatId))?.name} »
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Bouton "Aucune" */}
                  <button type="button" onClick={() => setSubCatId('')}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 transition-all"
                    style={{ background: !subCatId ? T.creamAlt : T.cream, borderColor: !subCatId ? T.border : T.border, color: !subCatId ? T.text : T.muted }}>
                    Catégorie principale
                  </button>
                  {subCats.map(c => (
                    <button key={c.id} type="button" onClick={() => setSubCatId(String(c.id))}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 transition-all"
                      style={{
                        background:  subCatId === String(c.id) ? T.orangeL : T.cream,
                        borderColor: subCatId === String(c.id) ? T.orange : T.border,
                        color:       subCatId === String(c.id) ? T.orange : T.muted,
                      }}>
                      {c.name}
                      {subCatId === String(c.id) && <CheckCircle size={10} className="inline ml-1"/>}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Attributs dynamiques */}
            {attributes.length > 0 && (
              <div className="space-y-4 pt-1">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: T.muted }}>
                  <Info size={11}/> Attributs définis par BelivaY pour cette catégorie
                </p>
                {attributes.map(attr => (
                  <Field key={attr.id} label={attr.name} required={attr.is_required}
                    error={errors[`attr_${attr.id}`]}>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map(val => {
                        const sel = (attrVals[attr.id] || []).includes(val);
                        return (
                          <button key={val} type="button" onClick={() => toggleAttr(attr.id, val)}
                            className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all"
                            style={{ background: sel?T.orangeL:T.cream, borderColor: sel?T.orange:T.border, color: sel?T.orange:T.muted }}>
                            {val}{sel && <CheckCircle size={10} className="inline ml-1"/>}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                ))}
              </div>
            )}

            {parentCatId && attributes.length === 0 && (
              <div className="flex items-center gap-2 py-3 px-4 rounded-xl" style={{ background: T.creamAlt }}>
                <Info size={12} style={{ color: T.mutedL }}/>
                <p className="text-[12px]" style={{ color: T.muted }}>
                  Aucun attribut défini pour cette catégorie pour l'instant.
                </p>
              </div>
            )}
          </Section>

          {/* PHOTOS */}
          <Section title="Photos du produit" icon={<ImageIcon size={15}/>}>
            <p className="text-[12px]" style={{ color: T.muted }}>
              Min. 1 photo · Max. 6 · JPG / PNG / WEBP · Max 5 Mo · 800×800px recommandé
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {images.map(img => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ border: img.is_primary ? `2px solid ${T.orange}` : `1px solid ${T.border}` }}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover"/>
                  {img.is_primary && (
                    <div className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: T.orange, color: T.white }}>Principale</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                    {!img.is_primary && isEdit && (
                      <button type="button" onClick={() => setPrimary(img.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold" style={{ background: T.orange, color: T.white }}>
                        Principale
                      </button>
                    )}
                    <button type="button" onClick={() => rmExisting(img.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: T.red, color: T.white }}>
                      <X size={11}/>
                    </button>
                  </div>
                </div>
              ))}
              {tempImgs.map((t, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${T.border}` }}>
                  <img src={t.preview} alt="" className="w-full h-full object-cover"/>
                  <button type="button" onClick={() => rmTemp(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: T.red, color: T.white }}>
                    <X size={10}/>
                  </button>
                </div>
              ))}
              {images.length + tempImgs.length < 6 && (
                <>
                  <input type="file" ref={photoRef} className="hidden" accept="image/*" multiple
                    onChange={e => addPhotos(e.target.files)}/>
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:border-orange-300"
                    style={{ borderColor: T.border, background: T.cream }}>
                    <Upload size={18} style={{ color: T.mutedL }}/>
                    <span className="text-[10px]" style={{ color: T.mutedL }}>Ajouter</span>
                  </button>
                </>
              )}
            </div>
          </Section>
        </div>

        {/* ── COLONNE DROITE (1/3) ── */}
        <div className="space-y-5">

          {/* PRIX & STOCK */}
          <Section title="Prix & Stock" icon={<DollarSign size={15}/>} accent>
            <Field label="Prix de vente" required error={errors.priceXaf} hint="Prix final payé par l'acheteur">
              <div className="relative">
                <input type="number" value={priceXaf} onChange={e => setPriceXaf(e.target.value)} min={100} placeholder="14 500"
                  style={{ ...(errors.priceXaf ? iErr : iBase), paddingRight: 60 }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold" style={{ color: T.mutedL }}>FCFA</span>
              </div>
            </Field>

            <Field label="Prix barré (avant promo)" error={errors.compareAt}
              hint={discPct > 0 ? `Réduction : -${discPct}%` : 'Laissez vide si pas de promotion'}>
              <div className="relative">
                <input type="number" value={compareAt} onChange={e => setCompareAt(e.target.value)} min={0} placeholder="22 000"
                  style={{ ...(errors.compareAt ? iErr : iBase), paddingRight: 60 }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold" style={{ color: T.mutedL }}>FCFA</span>
              </div>
              {discPct > 0 && (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl"
                  style={{ background: T.orangeL, border: `1px solid ${T.orangeB}` }}>
                  <span className="font-black text-[16px]" style={{ color: T.orange }}>-{discPct}%</span>
                  <span className="text-[11.5px]" style={{ color: T.muted }}>
                    Économie : {fmtXAF(compare - price)}
                  </span>
                </div>
              )}
            </Field>

            <Field label="Fin de promotion" hint="Timer affiché sur la fiche produit">
              <input type="date" value={promoEnd} onChange={e => setPromoEnd(e.target.value)} style={iBase}/>
              {promoEnd && <div className="mt-1"><PromoCountdown end={promoEnd}/></div>}
            </Field>

            <div className="h-px" style={{ background: T.border }}/>

            <Field label="Stock disponible" required error={errors.stockQty}>
              <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} min={0} placeholder="Ex : 12" style={errors.stockQty?iErr:iBase}/>
            </Field>

            <Field label="Seuil alerte stock" required error={errors.threshold}
              hint="En dessous de ce nombre, une alerte s'affiche dans votre espace">
              <input type="number" value={stockThreshold} onChange={e => setThreshold(e.target.value)}
                min={0} placeholder="Ex : 3"
                style={errors.threshold?iErr:iBase}/>
            </Field>

            {/* Statut */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>Produit actif</p>
                <p className="text-[11px]" style={{ color: T.mutedL }}>Visible dans le catalogue</p>
              </div>
              <button type="button" onClick={() => setIsActive(!isActive)}
                className="w-12 h-6 rounded-full transition-all relative" style={{ background: isActive ? T.green : T.border }}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: isActive ? '26px' : '2px' }}/>
              </button>
            </div>
          </Section>

          {/* RÉCAPITULATIF */}
          <Section title="Récapitulatif" icon={<BarChart2 size={15}/>}>
            <div className="space-y-2.5">
              {[
                { label: 'Prix de vente',             value: price > 0 ? fmtXAF(price) : '—',                       color: T.text  },
                { label: `Commission BelivaY (${commission}%)`, value: price > 0 ? `-${fmtXAF(price*commission/100)}` : '—', color: T.red   },
                { label: 'Vous recevrez',              value: price > 0 ? fmtXAF(net) : '—',                         color: T.green },
              ].map((row,i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-[12.5px]" style={{ color: T.muted }}>{row.label}</p>
                  <p className="font-bold text-[13px]" style={{ color: row.color }}>{row.value}</p>
                </div>
              ))}
              <div className="h-px" style={{ background: T.border }}/>
              <p className="text-[11px] leading-relaxed" style={{ color: T.mutedL }}>
                Versé 24h après confirmation acheteur ou 48h auto (Escrow BelivaY).
              </p>
            </div>

            <button type="button" onClick={handleSubmit} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-50 mt-4"
              style={{ background: T.orange, boxShadow: '0 4px 14px rgba(244,121,32,0.40)' }}>
              {saving
                ? <><RefreshCw size={14} className="animate-spin"/>Enregistrement…</>
                : <><Save size={14}/>{isEdit ? 'Enregistrer' : 'Créer le produit'}</>}
            </button>
            <Link to="/seller/products"
              className="block text-center text-[12.5px] font-semibold mt-2"
              style={{ color: T.muted }}>
              Annuler
            </Link>
          </Section>

        </div>
      </div>
    </div>
  );
}
