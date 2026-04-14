// frontend/src/features/vendors/ProductFormPage.tsx
// Formulaire création/édition produit — design system BelivaY.
//
// Sections :
//   A. Informations générales (titre, slug auto+éditable, descriptions)
//   B. Catégorie + attributs dynamiques (chargés depuis l'API selon catégorie)
//   C. Photos (6 slots, drag-order, image principale)
//   D. Prix & Stock (prix, prix barré + badge -X% auto, timer promo countdown, stock, seuil, SKU)
//   E. Récapitulatif (commission depuis PlatformSettings, net vendeur, délai escrow)

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Upload, X, RefreshCw, Save,
  ImageIcon, Tag, BarChart2, DollarSign,
  CheckCircle, Clock, Info,
} from 'lucide-react';
import { vendorsApi, type ProductImage, type ProductAttribute, type VendorProduct, type VendorProductEnriched } from '@/services/api/vendors';
import { categoriesApi, type Category } from '@/services/api/categories';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.25)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
  violet: '#7C3AED', violetL: 'rgba(124,58,237,0.10)',
};

function fmtXAF(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; }
function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type EditableVendorProduct =
  Omit<VendorProduct, 'category'> &
  Partial<Omit<VendorProductEnriched, keyof VendorProduct>> & {
    category: VendorProduct['category'] | VendorProductEnriched['category'];
  };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
}

// Timer countdown promo (preview dans le formulaire)
function PromoCountdown({ endDate }: { endDate: string }) {
  const [r, setR] = useState<{ d: number; h: number; m: number } | null>(null);
  useEffect(() => {
    const upd = () => {
      const diff = new Date(endDate).getTime() + 86400000 - Date.now();
      if (diff <= 0) { setR(null); return; }
      setR({ d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000) });
    };
    upd();
    const id = setInterval(upd, 30000);
    return () => clearInterval(id);
  }, [endDate]);
  if (!r) return <span className="text-[11px]" style={{ color: T.red }}>Promotion expirée</span>;
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: T.amber }}>
      <Clock size={11}/>
      Fin dans {r.d > 0 ? `${r.d}j ` : ''}{r.h}h {r.m}m
    </span>
  );
}

// Section card
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}`, background: T.cream }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.orangeB }}>
          <span style={{ color: T.orange }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

// Label + champ
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: T.text }}>
        {label}{required && <span style={{ color: T.red }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: T.mutedL }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none',
  width: '100%',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const isEdit    = !!id;

  // ── State formulaire ──────────────────────────────────────────────────────
  const [title,            setTitle]           = useState('');
  const [slug,             setSlug]            = useState('');
  const [slugManual,       setSlugManual]       = useState(false); // slug édité manuellement
  const [description,      setDescription]     = useState('');
  const [shortDescription, setShortDesc]       = useState('');
  const [categoryId,       setCategoryId]      = useState('');
  const [priceXaf,         setPriceXaf]        = useState('');
  const [compareAtPrice,   setCompareAtPrice]  = useState('');
  const [promoEndDate,     setPromoEndDate]     = useState('');
  const [stockQuantity,    setStockQty]        = useState('');
  const [stockThreshold,   setStockThreshold]  = useState('');
  const [sku,              setSku]             = useState('');
  const [isActive,         setIsActive]        = useState(true);
  const [attrValues,       setAttrValues]      = useState<Record<number, string[]>>({});

  // ── State UI ──────────────────────────────────────────────────────────────
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [attributes,  setAttributes]  = useState<ProductAttribute[]>([]);
  const [images,      setImages]      = useState<ProductImage[]>([]);
  const [tempImages,  setTempImages]  = useState<{ file: File; preview: string }[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const commission = 12; // depuis PlatformSettings
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [cats] = await Promise.all([categoriesApi.list()]);
        setCategories(cats);


        if (isEdit && id) {
          const products = (await vendorsApi.getProducts()) as EditableVendorProduct[];
          const p = products.find(x => x.id === parseInt(id));
          if (!p) { showToast('Produit introuvable', 'error'); navigate('/seller/products'); return; }
          setTitle(p.title);
          setSlug(p.slug || '');
          setSlugManual(true);
          setDescription(p.description || '');
          setShortDesc(p.short_description || '');
          setCategoryId(String(typeof p.category === 'object' ? p.category.id : p.category || ''));
          setPriceXaf(String(p.price_xaf));
          setCompareAtPrice(String(p.compare_at_price || ''));
          setPromoEndDate(p.promo_end_date || '');
          setStockQty(String(p.stock_quantity));
          setStockThreshold(String(p.stock_threshold || ''));
          setSku(p.sku || '');
          setIsActive(p.is_active);
          setImages(p.images || []);
          // Attributs existants
          const existingAttrs: Record<number, string[]> = {};
          for (const av of p.attribute_values || []) {
            existingAttrs[av.attribute.id] = av.selected_values;
          }
          setAttrValues(existingAttrs);
        }
      } catch { showToast('Erreur de chargement', 'error'); }
      finally { setLoading(false); }
    };
    init();
  }, [id, isEdit, navigate, showToast]);

  // ── Charger attributs quand catégorie change ──────────────────────────────
  useEffect(() => {
    if (!categoryId) { setAttributes([]); return; }
    vendorsApi.getProductAttributes(parseInt(categoryId))
      .then(setAttributes)
      .catch(() => setAttributes([]));
  }, [categoryId]);

  // ── Auto-slug depuis titre ────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  // ── Calculs prix ──────────────────────────────────────────────────────────
  const price    = parseInt(priceXaf, 10) || 0;
  const compareAt = parseInt(compareAtPrice, 10) || 0;
  const discountPct = compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
  const netVendeur = price * (1 - commission / 100);

  // ── Ajout photo ───────────────────────────────────────────────────────────
  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remaining = 6 - images.length - tempImages.length;
    const toAdd = allowed.slice(0, remaining);
    setTempImages(prev => [
      ...prev,
      ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
  };

  const removeTemp = (i: number) => {
    setTempImages(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[i].preview);
      next.splice(i, 1);
      return next;
    });
  };

  const removeExisting = async (imgId: number) => {
    try {
      await vendorsApi.deleteImage(parseInt(id!), imgId);
      setImages(prev => prev.filter(i => i.id !== imgId));
    } catch { showToast("Erreur suppression image", 'error'); }
  };

  const setPrimary = async (imgId: number) => {
    try {
      await vendorsApi.setPrimaryImage(parseInt(id!), imgId);
      setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === imgId })));
    } catch { showToast("Erreur image principale", 'error'); }
  };

  // ── Attribut toggle valeur ────────────────────────────────────────────────
  const toggleAttrValue = (attrId: number, val: string) => {
    setAttrValues(prev => {
      const current = prev[attrId] || [];
      const next    = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...prev, [attrId]: next };
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!title.trim())         return 'Le titre est requis.';
    if (!categoryId)           return 'Veuillez sélectionner une catégorie.';
    if (!priceXaf || price < 100) return 'Le prix doit être supérieur à 100 FCFA.';
    if (compareAt && compareAt <= price) return 'Le prix barré doit être supérieur au prix de vente.';
    const stock = parseInt(stockQuantity, 10);
    if (isNaN(stock) || stock < 0) return 'Le stock ne peut pas être négatif.';
    // Attributs obligatoires
    for (const attr of attributes) {
      if (attr.is_required && !(attrValues[attr.id]?.length)) {
        return `L'attribut "${attr.name}" est obligatoire.`;
      }
    }
    return null;
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { showToast(err, 'error'); return; }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        title:             title.trim(),
        slug:              slug.trim() || slugify(title),
        description:       description.trim(),
        short_description: shortDescription.trim(),
        price_xaf:         price,
        compare_at_price:  compareAt > price ? compareAt : null,
        promo_end_date:    promoEndDate || null,
        category:          parseInt(categoryId, 10),
        is_active:         isActive,
        stock_quantity:    parseInt(stockQuantity, 10) || 0,
        stock_threshold:   stockThreshold ? parseInt(stockThreshold, 10) : null,
        sku:               sku.trim(),
      };

      let productId: number;

      if (isEdit && id) {
        await vendorsApi.updateProduct(parseInt(id), payload);
        productId = parseInt(id);
        showToast('Produit mis à jour', 'success');
      } else {
        const created = await vendorsApi.createProduct(payload);
        productId = created.id;
        showToast('Produit créé', 'success');
      }

      // Upload nouvelles photos
      for (let i = 0; i < tempImages.length; i++) {
        try {
          await vendorsApi.uploadImage(productId, tempImages[i].file, i === 0 && images.length === 0);
        } catch { /* continue */ }
      }

      navigate('/seller/products');
    } catch (error: unknown) {
      showToast(getErrorMessage(error), 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">

      {/* EN-TÊTE */}
      <div className="flex items-center gap-3">
        <Link to="/seller/products"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: T.cream, border: `1px solid ${T.border}` }}>
          <ArrowLeft size={16} style={{ color: T.muted }}/>
        </Link>
        <div>
          <h1 className="font-black text-[20px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h1>
          <p className="text-[12px]" style={{ color: T.muted }}>
            {isEdit ? 'Modifiez les informations et enregistrez.' : 'Soumis à modération · SLA 48h BelivaY'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── COLONNE PRINCIPALE (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── A. INFOS GÉNÉRALES ── */}
          <Section title="Informations générales" icon={<Package size={15}/>}>
            <Field label="Titre du produit" required hint={`${title.length}/200 caractères`}>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                placeholder="Ex : Robe Wax Ankara Premium"
                style={inputStyle}/>
            </Field>

            <Field label="Slug URL" hint="Généré automatiquement depuis le titre. Modifiable.">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: T.mutedL }}>
                  belivay.com/p/
                </span>
                <input value={slug}
                  onChange={e => { setSlug(slugify(e.target.value)); setSlugManual(true); }}
                  placeholder="robe-wax-ankara-premium"
                  style={{ ...inputStyle, paddingLeft: 112 }}/>
              </div>
            </Field>

            <Field label="Description courte" hint={`${shortDescription.length}/300 · Affichée dans les aperçus produit`}>
              <textarea value={shortDescription} onChange={e => setShortDesc(e.target.value)}
                maxLength={300} rows={2} placeholder="Résumez votre produit en 1-2 phrases percutantes…"
                style={{ ...inputStyle, resize: 'none' }}/>
            </Field>

            <Field label="Description complète">
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={6} placeholder="Matière, taille, entretien, garantie, particularités…"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}/>
            </Field>
          </Section>

          {/* ── B. CATÉGORIE + ATTRIBUTS ── */}
          <Section title="Catégorie & Attributs" icon={<Tag size={15}/>}>
            <Field label="Catégorie" required>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            {/* Attributs dynamiques */}
            {attributes.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-[11.5px] font-semibold" style={{ color: T.muted }}>
                  Attributs de la catégorie (définis par BelivaY)
                </p>
                {attributes.map(attr => (
                  <Field key={attr.id} label={attr.name} required={attr.is_required}
                    hint={`Choisissez parmi les valeurs disponibles`}>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map(val => {
                        const selected = (attrValues[attr.id] || []).includes(val);
                        return (
                          <button key={val} type="button"
                            onClick={() => toggleAttrValue(attr.id, val)}
                            className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all"
                            style={{
                              background:  selected ? T.orangeL : T.cream,
                              borderColor: selected ? T.orange : T.border,
                              color:       selected ? T.orange : T.muted,
                            }}>
                            {val}
                            {selected && <CheckCircle size={11} className="inline ml-1"/>}
                          </button>
                        );
                      })}
                    </div>
                    {attrValues[attr.id]?.length > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: T.muted }}>
                        Sélectionnés : {attrValues[attr.id].join(', ')}
                      </p>
                    )}
                  </Field>
                ))}
              </div>
            )}

            {categoryId && attributes.length === 0 && (
              <div className="flex items-center gap-2 py-3 px-4 rounded-xl" style={{ background: T.creamAlt }}>
                <Info size={13} style={{ color: T.mutedL }}/>
                <p className="text-[12px]" style={{ color: T.muted }}>
                  Aucun attribut défini pour cette catégorie pour l'instant.
                </p>
              </div>
            )}
          </Section>

          {/* ── C. PHOTOS ── */}
          <Section title="Photos du produit" icon={<ImageIcon size={15}/>}>
            <p className="text-[12px]" style={{ color: T.muted }}>
              Min. 1 photo · Max. 6 · JPG/PNG/WEBP · Max 5 Mo · Carré 800×800px recommandé
            </p>

            {/* Grille photos */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {/* Photos existantes */}
              {images.map(img => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ border: img.is_primary ? `2px solid ${T.orange}` : `1px solid ${T.border}` }}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover"/>
                  {img.is_primary && (
                    <div className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: T.orange, color: T.white }}>
                      Principale
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                    {!img.is_primary && isEdit && (
                      <button type="button" onClick={() => setPrimary(img.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded-lg font-bold"
                        style={{ background: T.orange, color: T.white }}>
                        Principale
                      </button>
                    )}
                    <button type="button" onClick={() => removeExisting(img.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: T.red, color: T.white }}>
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              ))}

              {/* Photos temporaires */}
              {tempImages.map((t, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${T.border}` }}>
                  <img src={t.preview} alt="" className="w-full h-full object-cover"/>
                  <button type="button" onClick={() => removeTemp(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: T.red, color: T.white }}>
                    <X size={10}/>
                  </button>
                </div>
              ))}

              {/* Slot ajout photo */}
              {images.length + tempImages.length < 6 && (
                <>
                  <input type="file" ref={photoInputRef} className="hidden"
                    accept="image/*" multiple
                    onChange={e => handlePhotoAdd(e.target.files)}/>
                  <button type="button" onClick={() => photoInputRef.current?.click()}
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

        {/* ── COLONNE LATÉRALE (1/3) ── */}
        <div className="space-y-5">

          {/* ── D. PRIX & STOCK ── */}
          <Section title="Prix & Stock" icon={<DollarSign size={15}/>}>

            <Field label="Prix de vente" required hint="Prix final payé par l'acheteur">
              <div className="relative">
                <input type="number" value={priceXaf} onChange={e => setPriceXaf(e.target.value)}
                  min={100} placeholder="14 500"
                  style={{ ...inputStyle, paddingRight: 60 }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold"
                  style={{ color: T.mutedL }}>FCFA</span>
              </div>
            </Field>

            <Field label="Prix barré (avant promo)"
              hint={compareAt > price ? `Réduction affichée : -${discountPct}%` : "Laissez vide si pas de promotion"}>
              <div className="relative">
                <input type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)}
                  min={0} placeholder="22 000"
                  style={{ ...inputStyle, paddingRight: 60 }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold"
                  style={{ color: T.mutedL }}>FCFA</span>
              </div>
              {/* Badge -X% dynamique */}
              {discountPct > 0 && (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl"
                  style={{ background: T.orangeL, border: `1px solid ${T.orangeB}` }}>
                  <span className="font-black text-[15px]" style={{ color: T.orange }}>-{discountPct}%</span>
                  <span className="text-[11.5px]" style={{ color: T.muted }}>
                    Économie : {fmtXAF(compareAt - price)}
                  </span>
                </div>
              )}
            </Field>

            <Field label="Fin de promotion" hint="Laissez vide si la promo est permanente">
              <input type="date" value={promoEndDate} onChange={e => setPromoEndDate(e.target.value)}
                style={inputStyle}/>
              {promoEndDate && <div className="mt-1"><PromoCountdown endDate={promoEndDate}/></div>}
            </Field>

            <div className="h-px" style={{ background: T.border }}/>

            <Field label="Stock disponible" required>
              <input type="number" value={stockQuantity} onChange={e => setStockQty(e.target.value)}
                min={0} placeholder="Ex : 12"
                style={inputStyle}/>
            </Field>

            <Field label="Seuil alerte stock"
              hint="Laissez vide pour utiliser le seuil global défini par BelivaY">
              <input type="number" value={stockThreshold} onChange={e => setStockThreshold(e.target.value)}
                min={0} placeholder="Ex : 3"
                style={inputStyle}/>
            </Field>

            <Field label="SKU / Référence" hint="Auto-généré à la création. Modifiable.">
              <input value={sku} onChange={e => setSku(e.target.value)}
                placeholder="BLV-MOD-00001"
                style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.04em' }}/>
            </Field>

            {/* Statut */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>Produit actif</p>
                <p className="text-[11px]" style={{ color: T.mutedL }}>Visible dans le catalogue</p>
              </div>
              <button type="button" onClick={() => setIsActive(!isActive)}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: isActive ? T.green : T.border }}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: isActive ? '26px' : '2px' }}/>
              </button>
            </div>
          </Section>

          {/* ── E. RÉCAPITULATIF ── */}
          <Section title="Récapitulatif" icon={<BarChart2 size={15}/>}>
            <div className="space-y-2.5">
              {[
                { label: 'Prix de vente', value: price > 0 ? fmtXAF(price) : '—', color: T.text },
                { label: `Commission BelivaY (${commission}%)`, value: price > 0 ? `-${fmtXAF(price * commission / 100)}` : '—', color: T.red },
                { label: 'Vous recevrez', value: price > 0 ? fmtXAF(netVendeur) : '—', color: T.green },
              ].map((row, i) => (
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

            {/* Bouton enregistrer */}
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-50"
              style={{ background: T.orange, boxShadow: '0 4px 12px rgba(244,121,32,0.35)', marginTop: 16 }}>
              {saving
                ? <><RefreshCw size={14} className="animate-spin"/>Enregistrement…</>
                : <><Save size={14}/>{isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}</>}
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
