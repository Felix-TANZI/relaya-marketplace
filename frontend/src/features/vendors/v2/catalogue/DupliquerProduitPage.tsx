// frontend/src/features/vendors/v2/catalogue/DupliquerProduitPage.tsx
// Écran "Dupliquer un produit" — VD-08 §3.1 (DUP-01 à DUP-04).
// Réutilise le vrai endpoint POST /api/vendors/products/{id}/duplicate/
// (vendorsApi.duplicateProduct, déjà backé : fiche, photos de référence,
// catégorie, gabarit, poids, dimensions, délai, paiement au retrait copiés ;
// stock=0, inactif — voir backend/apps/vendors, doc VD-08 DUP-01). Le brouillon
// n'est créé qu'au clic sur "Créer le brouillon" (jamais avant, DUP-03) ; le
// stock et le prix se saisissent ensuite, une seule fois, en réutilisant les
// mêmes étapes que la Nouvelle offre (StepStockPrix/StepRecap).
//
// Résolution d'axe (couleur → variant réel) hors périmètre de ce lot — voir
// la même note dans NouvelleOffreWizardPage.tsx : la couleur choisie est
// tracée dans seller_note en attendant variantsApi.findOrCreate.
//
// La carte "Depuis : ..." (Dupliquer.jpg) n'affiche que des champs réels du
// produit source (image, titre, prix, état). Le message "le vert existe déjà
// au catalogue : votre offre y sera rattachée" de la maquette n'est PAS
// reproduit : duplicateProduct() crée toujours un nouveau produit indépendant,
// il n'existe aucun mécanisme de rattachement à une variante déjà publiée
// (MANQUE BACKEND) — l'afficher tel quel aurait été trompeur.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, RefreshCw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  vendorsApi, type MasterFiche, type ProductCondition, type VendorProduct, type VendorProfile,
} from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, CenterState, Collapsible, PageHeader, Pill, PrimaryButton } from './ui';
import { fmtXAF, MIN_PUBLISHABLE_PRICE_XAF, parsePriceInput, primaryImageOf, tierToCommissionTier } from './helpers';
import { emptyDraft, type NewOfferDraft } from './types';
import StepPhotos from './steps/StepPhotos';
import StepStockPrix from './steps/StepStockPrix';
import StepRecap from './steps/StepRecap';
import OffreEnvoyeeScreen from './OffreEnvoyeeScreen';

const COLOR_CHIPS = ['Noir', 'Blanc', 'Bleu', 'Rouge', 'Gris'];

type Phase = 'pick' | 'price' | 'recap' | 'sent';

export default function DupliquerProduitPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const sourceId = Number(id);

  const [source, setSource] = useState<VendorProduct | null>(null);
  const [siblings, setSiblings] = useState<VendorProduct[]>([]);
  const [conditions, setConditions] = useState<ProductCondition[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [color, setColor] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [phase, setPhase] = useState<Phase>('pick');
  const [draft, setDraft] = useState<NewOfferDraft>(emptyDraft());
  const [newProductId, setNewProductId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      vendorsApi.getProducts(),
      vendorsApi.listConditions().catch(() => []),
      vendorsApi.getProfile().catch(() => null),
    ]).then(([prods, conds, prof]) => {
      const found = prods.find((prod) => prod.id === sourceId) ?? null;
      setSource(found);
      setSiblings(found ? prods.filter((prod) => prod.master && prod.master === found.master && prod.id !== found.id) : []);
      setConditions(conds);
      setProfile(prof);
    }).finally(() => setLoading(false));
  }, [sourceId]);

  const tier = tierToCommissionTier(profile?.certification_tier);
  const chosenColor = color === 'other' ? customColor.trim() : color;

  async function createDraft() {
    if (!source) return;
    setBusy(true);
    try {
      const created = await vendorsApi.duplicateProduct(source.id);
      for (let i = 0; i < draft.photos.length; i++) {
        await vendorsApi.uploadImage(created.id, draft.photos[i].file, i === 0).catch(() => null);
      }
      setNewProductId(created.id);
      // Adapte le récap (title) : duplicateProduct() renvoie un
      // VendorProductEnriched (pas de champ master exposé) — seul le titre
      // sert ici, l'id n'est jamais réutilisé pour un appel API.
      const virtualMaster: MasterFiche = {
        id: 0,
        title: source.title,
        slug: '',
        brand: '',
        category: created.category.id,
        category_name: created.category.name,
      };
      setDraft((d) => ({ ...d, master: virtualMaster, color: chosenColor, conditionId: source.condition ?? null }));
      setPhase('price');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function finalize(publish: boolean) {
    if (!newProductId) return;
    setBusy(true);
    try {
      const price = parsePriceInput(draft.priceXaf);
      const stock = parseInt(draft.stockQuantity, 10) || 0;
      const sellerNote = draft.color.trim() ? t('sl10_catalogue.seller_note_color', { color: draft.color.trim() }) : '';
      await vendorsApi.updateProduct(newProductId, {
        condition: draft.conditionId,
        price_xaf: price,
        stock_quantity: stock,
        is_active: publish,
        seller_note: sellerNote,
      });
      if (publish) {
        setPhase('sent');
      } else {
        showToast(t('sl10_catalogue.toast_draft_saved'), 'success');
        navigate('/seller/v2/produits');
      }
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const answerBefore = useMemo(
    () => new Date(Date.now() + 48 * 3600_000).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
    [],
  );

  if (loading) return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl10_catalogue.loading')} p={p} />;
  if (!source) return <CenterState icon={<Package size={22} color={p.red} />} title={t('sl10_catalogue.offer_not_found')} p={p} />;

  if (phase === 'sent') {
    return (
      <OffreEnvoyeeScreen
        productTitle={source.title}
        answerBeforeLabel={answerBefore}
        onSeeProducts={() => navigate('/seller/v2/produits')}
        onAddColor={() => navigate(`/seller/v2/produits/dupliquer/${source.id}`)}
        theme={theme}
        t={t}
      />
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl10_catalogue.duplicate_title')}
        onBack={() => (phase === 'pick' ? navigate(-1) : setPhase('pick'))}
        backLabel={t('sl10_catalogue.back')}
        p={p}
      />

      {phase === 'pick' ? (
        <>
          <p className="font-black mb-3" style={{ fontSize: 19, color: p.text }}>{t('sl10_catalogue.duplicate_heading')}</p>
          <p className="mb-3" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl10_catalogue.duplicate_intro')}</p>

          {/* Carte "Depuis : ..." (Dupliquer.jpg) : produit source, prix et état réels. */}
          <div className="mb-4">
            <Card p={p}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: p.cardAlt }}>
                  {primaryImageOf(source) ? (
                    <img src={primaryImageOf(source)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} color={p.textMuted} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate" style={{ fontSize: 13.5, color: p.text }}>
                    {t('sl10_catalogue.duplicate_from', { title: source.title })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontSize: 12, color: p.textMuted }}>{fmtXAF(source.price_xaf)}</span>
                    <Pill
                      label={source.is_active ? t('sl10_catalogue.state_selling') : t('sl10_catalogue.state_paused')}
                      tone={source.is_active ? 'green' : 'muted'}
                      p={p}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <p className="font-semibold mb-2 uppercase" style={{ fontSize: 10.5, color: p.textMuted, letterSpacing: '0.04em' }}>{t('sl10_catalogue.duplicate_pick_variant')}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {COLOR_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="rounded-full font-semibold"
                style={{
                  padding: '7px 14px', fontSize: 12,
                  background: color === c ? p.orange : p.cardAlt,
                  color: color === c ? '#fff' : p.text,
                  border: `1px solid ${color === c ? p.orange : p.border}`,
                }}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setColor('other')}
              className="rounded-full font-semibold"
              style={{
                padding: '7px 14px', fontSize: 12,
                background: color === 'other' ? p.orange : p.cardAlt,
                color: color === 'other' ? '#fff' : p.text,
                border: `1px solid ${color === 'other' ? p.orange : p.border}`,
              }}
            >
              {t('sl10_catalogue.duplicate_other_variant')}
            </button>
          </div>
          {color === 'other' ? (
            <input
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder={t('sl10_catalogue.field_color_example')}
              className="w-full rounded-xl mb-3"
              style={{ padding: '10px 12px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
            />
          ) : null}

          {siblings.length > 0 ? (
            <div className="mb-4">
              <p className="mb-1.5" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl10_catalogue.duplicate_already_created')}</p>
              <div className="flex flex-wrap gap-1.5">
                {siblings.map((s) => (
                  <Pill key={s.id} label={s.title} tone="muted" p={p} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Photos réelles de la variante — jamais copiées (DUP-01) */}
          <StepPhotos
            photos={draft.photos}
            onChange={(photos) => setDraft((d) => ({ ...d, photos }))}
            onShowToast={(msg) => showToast(msg, 'info')}
            p={p}
            t={t}
          />
          <p className="mt-1.5" style={{ fontSize: 11, color: p.textMuted }}>{t('sl10_catalogue.duplicate_photos_never_copied')}</p>

          <div className="mt-4">
            <PrimaryButton p={p} disabled={busy || !chosenColor} onClick={createDraft}>
              {busy ? t('sl10_catalogue.saving') : t('sl10_catalogue.duplicate_cta_create_draft')}
            </PrimaryButton>
          </div>

          <div className="mt-4">
            <Collapsible title={t('sl10_catalogue.duplicate_what_is_kept')} p={p}>
              {t('sl10_catalogue.duplicate_what_is_kept_detail')}
            </Collapsible>
          </div>
        </>
      ) : null}

      {phase === 'price' ? (
        <>
          <StepStockPrix draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} conditions={conditions} tier={tier} p={p} t={t} />
          <div className="mt-4">
            <PrimaryButton
              p={p}
              disabled={!draft.conditionId || parsePriceInput(draft.priceXaf) < MIN_PUBLISHABLE_PRICE_XAF}
              onClick={() => setPhase('recap')}
            >
              {t('sl10_catalogue.cta_continue')}
            </PrimaryButton>
          </div>
        </>
      ) : null}

      {phase === 'recap' ? (
        <StepRecap
          draft={draft}
          conditions={conditions}
          tier={tier}
          busy={busy}
          onPublish={() => finalize(true)}
          onSaveDraft={() => finalize(false)}
          p={p}
          t={t}
        />
      ) : null}
    </div>
  );
}
