// frontend/src/features/vendors/v2/catalogue/ModifierOffrePage.tsx
// Écran "Modifier l'offre" — comble le manque relevé dans UneOffrePage.tsx :
// ses 3 boutons ("Modifier le prix", "Modifier", "Faire une promotion")
// renvoyaient vers l'ancien ProductFormPage, hors espace v2. Aucune maquette
// dédiée n'existe pour cet écran dans le lot VD-08 : page unique (pas
// d'assistant en étapes) qui réutilise directement StepStockPrix/StepPhotos
// (déjà construits, testés et traduits pour "Nouvelle offre") plutôt que de
// dupliquer un second formulaire — même principe de réutilisation que
// DupliquerProduitPage.tsx.
//
// Mise à jour réelle : PATCH via vendorsApi.updateProduct(id, payload) — le
// même endpoint déjà utilisé par l'ancien ProductFormPage.tsx et par
// NouvelleOffreWizardPage.tsx/DupliquerProduitPage.tsx (pas de nouvel
// endpoint inventé). La gestion des photos déjà en ligne (suppression /
// photo principale) est également réelle (vendorsApi.deleteImage /
// setPrimaryImage, déjà utilisés par ProductFormPage.tsx) : ces appels
// mutent immédiatement côté serveur, indépendamment du bouton "Enregistrer"
// qui ne couvre que prix/stock/état/couleur/nouvelles photos.
//
// Couleur (seller_note) : VendorProduct n'expose qu'un champ seller_note en
// texte libre, jamais structuré en "couleur" côté backend (MANQUE BACKEND,
// même limite documentée dans NouvelleOffreWizardPage.tsx et
// DupliquerProduitPage.tsx). On ne tente donc pas de reparser la note
// existante pour repréremplir le champ couleur : elle est affichée telle
// quelle à titre d'information sous le formulaire, et n'est écrasée que si
// le vendeur saisit une nouvelle couleur.
//
// "Faire une promotion" (UneOffrePage.tsx) arrive ici avec ?focus=price : un
// bandeau rappelle pourquoi le vendeur est là et l'écran défile jusqu'au
// champ prix — aucune fonctionnalité de campagne réelle n'est dupliquée ici
// (vendorsApi.requestProductCampaign reste hors périmètre de ce lot).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  vendorsApi, type ProductCondition, type ProductImage, type VendorProduct, type VendorProfile,
} from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, CenterState, PageHeader, PrimaryButton } from './ui';
import {
  MAX_PHOTOS, MIN_PHOTOS, MIN_PUBLISHABLE_PRICE_XAF, parsePriceInput, tierToCommissionTier,
} from './helpers';
import { emptyDraft, type NewOfferDraft } from './types';
import StepStockPrix from './steps/StepStockPrix';
import StepPhotos from './steps/StepPhotos';

export default function ModifierOffrePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const focusPrice = searchParams.get('focus') === 'price';
  const productId = Number(id);

  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [conditions, setConditions] = useState<ProductCondition[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<NewOfferDraft>(emptyDraft());
  const priceFieldRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, prof, conds] = await Promise.all([
        vendorsApi.getProducts(),
        vendorsApi.getProfile().catch(() => null),
        vendorsApi.listConditions().catch(() => []),
      ]);
      const found = prods.find((prod) => prod.id === productId) ?? null;
      setProduct(found);
      setExistingImages(found?.images ?? []);
      setProfile(prof);
      setConditions(conds);
      if (found) {
        setDraft((d) => ({
          ...d,
          stockQuantity: String(found.stock_quantity),
          conditionId: found.condition ?? null,
          priceXaf: String(found.price_xaf),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (focusPrice && !loading) {
      priceFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusPrice, loading]);

  const tier = tierToCommissionTier(profile?.certification_tier);

  async function deleteExisting(imgId: number) {
    if (!product) return;
    try {
      await vendorsApi.deleteImage(product.id, imgId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imgId));
    } catch {
      showToast(t('sl10_catalogue.toast_image_delete_error'), 'error');
    }
  }

  async function setPrimary(imgId: number) {
    if (!product) return;
    try {
      await vendorsApi.setPrimaryImage(product.id, imgId);
      setExistingImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imgId })));
    } catch {
      showToast(t('sl10_catalogue.toast_primary_image_error'), 'error');
    }
  }

  function onPhotosChange(photos: NewOfferDraft['photos']) {
    const room = Math.max(MAX_PHOTOS - existingImages.length, 0);
    if (photos.length > room) {
      showToast(t('sl10_catalogue.modify_offer_photo_limit', { max: MAX_PHOTOS }), 'info');
      setDraft((d) => ({ ...d, photos: photos.slice(0, room) }));
      return;
    }
    setDraft((d) => ({ ...d, photos }));
  }

  async function handleSave() {
    if (!product) return;
    if (!draft.conditionId) { showToast(t('sl10_catalogue.err_missing_condition'), 'error'); return; }
    const stock = parseInt(draft.stockQuantity, 10);
    if (Number.isNaN(stock) || stock < 0) { showToast(t('sl10_catalogue.err_missing_stock'), 'error'); return; }
    const price = parsePriceInput(draft.priceXaf);
    if (price < MIN_PUBLISHABLE_PRICE_XAF) { showToast(t('sl10_catalogue.err_price_too_low'), 'error'); return; }

    setBusy(true);
    try {
      const sellerNote = draft.color.trim()
        ? t('sl10_catalogue.seller_note_color', { color: draft.color.trim() })
        : (product.seller_note ?? '');
      const updated = await vendorsApi.updateProduct(product.id, {
        price_xaf: price,
        stock_quantity: stock,
        condition: draft.conditionId,
        seller_note: sellerNote,
      });
      for (let i = 0; i < draft.photos.length; i++) {
        await vendorsApi.uploadImage(
          product.id,
          draft.photos[i].file,
          existingImages.length === 0 && i === 0,
        ).catch(() => null);
      }
      setProduct(updated);
      showToast(t('sl10_catalogue.toast_offer_updated'), 'success');
      navigate(`/seller/v2/produits/${product.id}`);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl10_catalogue.loading')} p={p} />;
  }
  if (!product) {
    return <CenterState icon={<Package size={22} color={p.red} />} title={t('sl10_catalogue.offer_not_found')} p={p} />;
  }

  const totalPhotos = existingImages.length + draft.photos.length;
  const canAddMorePhotos = existingImages.length < MAX_PHOTOS;

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl10_catalogue.modify_offer_title')}
        subtitle={t('sl10_catalogue.modify_offer_subtitle')}
        onBack={() => navigate(`/seller/v2/produits/${product.id}`)}
        backLabel={t('sl10_catalogue.back')}
        p={p}
      />

      {focusPrice ? (
        <div className="mb-3">
          <Card p={p} accent={p.orange}>
            <p style={{ fontSize: 12.5, color: p.text, lineHeight: 1.5 }}>{t('sl10_catalogue.modify_offer_promo_banner')}</p>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div ref={priceFieldRef}>
          <StepStockPrix
            draft={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            conditions={conditions}
            tier={tier}
            p={p}
            t={t}
          />
        </div>

        {product.seller_note ? (
          <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: -8 }}>
            {t('sl10_catalogue.modify_offer_current_note', { note: product.seller_note })}
          </p>
        ) : null}

        <Card p={p}>
          <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{t('sl10_catalogue.modify_offer_current_photos')}</p>
          <div className="grid grid-cols-3 gap-2">
            {existingImages.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-xl overflow-hidden group"
                style={{ border: img.is_primary ? `2px solid ${p.orange}` : `1px solid ${p.border}` }}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                {img.is_primary ? (
                  <div
                    className="absolute top-1 left-1 font-bold rounded-full"
                    style={{ fontSize: 9, padding: '2px 6px', background: p.orange, color: '#fff' }}
                  >
                    {t('sl10_catalogue.image_primary_label')}
                  </div>
                ) : null}
                <div
                  className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  {!img.is_primary ? (
                    <button
                      type="button"
                      onClick={() => setPrimary(img.id)}
                      className="rounded-full flex items-center justify-center"
                      style={{ width: 24, height: 24, background: p.orange, color: '#fff' }}
                      title={t('sl10_catalogue.cta_set_primary')}
                    >
                      <Star size={12} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteExisting(img.id)}
                    className="rounded-full flex items-center justify-center"
                    style={{ width: 24, height: 24, background: p.red, color: '#fff' }}
                    title={t('sl10_catalogue.cta_delete_photo')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPhotos < MIN_PHOTOS ? (
            <p className="mt-2" style={{ fontSize: 11, color: p.amber }}>{t('sl10_catalogue.err_missing_photos', { min: MIN_PHOTOS })}</p>
          ) : null}
        </Card>

        {canAddMorePhotos ? (
          <Card p={p}>
            <p className="mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>
              {t('sl10_catalogue.modify_offer_photos_room', {
                existing: existingImages.length,
                room: Math.max(MAX_PHOTOS - existingImages.length, 0),
              })}
            </p>
            <StepPhotos
              photos={draft.photos}
              onChange={onPhotosChange}
              onShowToast={(msg) => showToast(msg, 'info')}
              p={p}
              t={t}
            />
          </Card>
        ) : (
          <Card p={p} accent={p.amber}>
            <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl10_catalogue.modify_offer_photos_full', { max: MAX_PHOTOS })}</p>
          </Card>
        )}

        <PrimaryButton p={p} disabled={busy} onClick={handleSave}>
          {busy ? t('sl10_catalogue.saving') : t('sl10_catalogue.cta_save_changes')}
        </PrimaryButton>
      </div>
    </div>
  );
}
