// frontend/src/features/vendors/v2/catalogue/NouvelleOffreWizardPage.tsx
// "Nouvelle offre" en 4 étapes (VD-08 §3.1, NOF-04/offerSteps) + les deux
// écrans qui s'y raccrochent (Demander une fiche, Offre envoyée). Un seul
// composant orchestre les 4 étapes par état interne plutôt que par sous-routes
// (aucune route /seller/v2/produits/nouveau/* n'est encore câblée dans
// router.tsx, fichier hors du périmètre de ce lot) : voir la recommandation
// de routes dans le rapport de livraison de ce lot.
//
// Le produit n'est créé côté serveur qu'à "Publier" ou "Garder en brouillon"
// (REC-01/DUP-03) : tant que le vendeur navigue dans les 4 étapes, rien n'est
// persisté — seuls les fichiers photo et le texte saisi vivent en mémoire.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  vendorsApi, type MasterFiche, type ProductCondition, type VendorProfile,
} from '@/services/api/vendors';
import { palette } from '../theme';
import { PageHeader, StepsBar } from './ui';
import {
  MIN_PHOTOS, MIN_PUBLISHABLE_PRICE_XAF, oversizeFieldsRequired, parsePriceInput, tierToCommissionTier,
} from './helpers';
import { emptyDraft, type NewOfferDraft } from './types';
import StepProduit from './steps/StepProduit';
import StepPhotos from './steps/StepPhotos';
import StepStockPrix from './steps/StepStockPrix';
import StepRecap from './steps/StepRecap';
import DemanderFicheScreen from './DemanderFicheScreen';
import OffreEnvoyeeScreen from './OffreEnvoyeeScreen';

type View = 'step1' | 'sheet_request' | 'step2' | 'step3' | 'step4' | 'sent';

export default function NouvelleOffreWizardPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [view, setView] = useState<View>('step1');
  const [draft, setDraft] = useState<NewOfferDraft>(emptyDraft());
  const [conditions, setConditions] = useState<ProductCondition[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTitle, setSentTitle] = useState('');

  useEffect(() => {
    vendorsApi.listConditions().then(setConditions).catch(() => setConditions([]));
    vendorsApi.getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const tier = tierToCommissionTier(profile?.certification_tier);
  const stepNames: [string, string, string, string] = [
    t('sl10_catalogue.step_name_product'),
    t('sl10_catalogue.step_name_photos'),
    t('sl10_catalogue.step_name_price'),
    t('sl10_catalogue.step_name_publish'),
  ];

  function patch(partial: Partial<NewOfferDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function selectMaster(m: MasterFiche) {
    patch({ master: m });
    setView('step2');
  }

  function validateForSubmit(): string | null {
    if (!draft.master) return t('sl10_catalogue.err_missing_product');
    if (draft.photos.length < MIN_PHOTOS) return t('sl10_catalogue.err_missing_photos', { min: MIN_PHOTOS });
    if (!draft.conditionId) return t('sl10_catalogue.err_missing_condition');
    const stock = parseInt(draft.stockQuantity, 10);
    if (Number.isNaN(stock) || stock < 0) return t('sl10_catalogue.err_missing_stock');
    const price = parsePriceInput(draft.priceXaf);
    if (price < MIN_PUBLISHABLE_PRICE_XAF) return t('sl10_catalogue.err_price_too_low');
    const weight = parseFloat(draft.weightKg) || 0;
    const dim = parseFloat(draft.dimensionsCm) || 0;
    if (oversizeFieldsRequired(weight, dim) && (!draft.weightKg || !draft.dimensionsCm)) {
      return t('sl10_catalogue.err_missing_dimensions');
    }
    return null;
  }

  async function createFromDraft(publish: boolean): Promise<number> {
    const master = draft.master!;
    const price = parsePriceInput(draft.priceXaf);
    const stock = parseInt(draft.stockQuantity, 10) || 0;
    // MANQUE : la résolution d'un variant réel (couleur) demande les axes du
    // master (variantsApi.findOrCreate, voir ProductFormPage.tsx) — hors
    // périmètre de ce lot. La couleur choisie est tracée dans seller_note
    // plutôt que fabriquée en variant, pour rester honnête sur l'état réel.
    const sellerNote = draft.color.trim() ? t('sl10_catalogue.seller_note_color', { color: draft.color.trim() }) : '';
    const created = await vendorsApi.createProduct({
      title: master.title,
      category: master.category,
      master: master.id,
      condition: draft.conditionId,
      price_xaf: price,
      stock_quantity: stock,
      is_active: publish,
      seller_note: sellerNote,
    });
    for (let i = 0; i < draft.photos.length; i++) {
      await vendorsApi.uploadImage(created.id, draft.photos[i].file, i === 0).catch(() => null);
    }
    return created.id;
  }

  async function handlePublish() {
    const error = validateForSubmit();
    if (error) { showToast(error, 'error'); return; }
    setBusy(true);
    try {
      await createFromDraft(true);
      setSentTitle(draft.master!.title);
      setView('sent');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft.master) { showToast(t('sl10_catalogue.err_missing_product'), 'error'); return; }
    setBusy(true);
    try {
      await createFromDraft(false);
      showToast(t('sl10_catalogue.toast_draft_saved'), 'success');
      navigate('/seller/v2/produits');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const answerBefore = new Date(Date.now() + 48 * 3600_000).toLocaleString('fr-FR', {
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  });

  if (view === 'sheet_request') {
    return (
      <DemanderFicheScreen
        initialQuery={draft.searchQuery}
        onBack={() => setView('step1')}
        onSubmitted={() => {
          showToast(t('sl10_catalogue.sheet_sent_toast'), 'success');
          navigate('/seller/v2/produits');
        }}
        theme={theme}
        t={t}
      />
    );
  }

  if (view === 'sent') {
    return (
      <OffreEnvoyeeScreen
        productTitle={sentTitle}
        answerBeforeLabel={answerBefore}
        onSeeProducts={() => navigate('/seller/v2/produits')}
        onAddColor={() => {
          setDraft((d) => ({ ...emptyDraft(), master: d.master }));
          setView('step2');
        }}
        theme={theme}
        t={t}
      />
    );
  }

  const backTargets: Record<Exclude<View, 'sheet_request' | 'sent'>, (() => void) | undefined> = {
    step1: undefined,
    step2: () => setView('step1'),
    step3: () => setView('step2'),
    step4: () => setView('step3'),
  };
  const step = { step1: 1, step2: 2, step3: 3, step4: 4 }[view] as 1 | 2 | 3 | 4;

  return (
    <div className="pb-24 pt-2">
      <PageHeader
        title={t('sl10_catalogue.wizard_title')}
        onBack={backTargets[view] ?? (() => navigate('/seller/v2/produits'))}
        backLabel={t('sl10_catalogue.back')}
        p={p}
      />
      <StepsBar step={step} names={stepNames} p={p} />

      {view === 'step1' ? (
        <StepProduit
          query={draft.searchQuery}
          onQueryChange={(q) => patch({ searchQuery: q })}
          onSelectMaster={selectMaster}
          onRequestSheet={() => setView('sheet_request')}
          onShowToast={(msg) => showToast(msg, 'info')}
          p={p}
          t={t}
        />
      ) : null}

      {view === 'step2' ? (
        <>
          <StepPhotos
            photos={draft.photos}
            onChange={(photos) => patch({ photos })}
            onShowToast={(msg) => showToast(msg, 'info')}
            p={p}
            t={t}
          />
          <div className="mt-4">
            <button
              type="button"
              disabled={draft.photos.length < MIN_PHOTOS}
              onClick={() => setView('step3')}
              className="w-full rounded-2xl font-bold text-white disabled:opacity-50"
              style={{ background: p.orange, padding: '14px', fontSize: 14, minHeight: 48 }}
            >
              {t('sl10_catalogue.cta_continue')}
            </button>
          </div>
        </>
      ) : null}

      {view === 'step3' ? (
        <>
          <StepStockPrix draft={draft} onChange={patch} conditions={conditions} tier={tier} p={p} t={t} />
          <div className="mt-4">
            <button
              type="button"
              disabled={!draft.conditionId || parsePriceInput(draft.priceXaf) < MIN_PUBLISHABLE_PRICE_XAF}
              onClick={() => setView('step4')}
              className="w-full rounded-2xl font-bold text-white disabled:opacity-50"
              style={{ background: p.orange, padding: '14px', fontSize: 14, minHeight: 48 }}
            >
              {t('sl10_catalogue.cta_continue')}
            </button>
          </div>
        </>
      ) : null}

      {view === 'step4' ? (
        <StepRecap
          draft={draft}
          conditions={conditions}
          tier={tier}
          busy={busy}
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          p={p}
          t={t}
        />
      ) : null}
    </div>
  );
}
