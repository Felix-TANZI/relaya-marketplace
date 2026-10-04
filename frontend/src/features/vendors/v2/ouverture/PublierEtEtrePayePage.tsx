// frontend/src/features/vendors/v2/ouverture/PublierEtEtrePayePage.tsx
// Écran « Publier et être payé » — étapes 2 et 3 (VD-03 §1.1, VD-D04.A11 à A14).
// Étape 2 : capture KYC (KycCaptureFlow) → écran « vérification en cours ».
// Étape 3 : contrat en cinq lignes (ContractCard) → signature (locale, voir
// api.ts) → redirection vers /seller/dashboard.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Hourglass, PlusCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { VendorProfile } from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, PrimaryButton } from '../commandes/ui';
import OnboardingSteps from './OnboardingSteps';
import OuvertureAppBar from './OuvertureAppBar';
import KycCaptureFlow from './KycCaptureFlow';
import ContractCard from './ContractCard';
import { DarkCard, DARK_HERO_TEXT, DARK_HERO_TEXT_MUTED } from './DarkCard';
import { finalizeShopApplication, readShopDraft, signContractLocally } from './api';

const SELLER_HOME_PATH = '/seller/v2/accueil';
const OPEN_SHOP_PATH = '/vendeur/ouvrir-boutique';
const ADD_PRODUCTS_PATH = '/seller/v2/produits/nouveau';

type Phase = 'kyc' | 'pending' | 'contract';

function answerBeforeLabel(): string {
  const d = new Date(Date.now() + 48 * 3600_000);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function PublierEtEtrePayePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('kyc');
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [signing, setSigning] = useState(false);

  const draft = readShopDraft();

  useEffect(() => {
    if (!draft) navigate(OPEN_SHOP_PATH, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return null;

  const handleKycDone = async (kycNote: string) => {
    setSubmitting(true);
    setSubmitError(false);
    try {
      const created = await finalizeShopApplication(draft, kycNote);
      setProfile(created);
      setPhase('pending');
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSign = (isRegistered: boolean, rccmNiu: string) => {
    setSigning(true);
    if (profile) signContractLocally(profile.id, isRegistered, rccmNiu);
    window.setTimeout(() => {
      setSigning(false);
      navigate(SELLER_HOME_PATH, { replace: true });
    }, 400);
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: p.bg }}>
      <div className="w-full max-w-[440px] mx-auto">
        <OuvertureAppBar p={p} />
        <OnboardingSteps current={phase === 'contract' ? 'paid' : 'publish'} p={p} />

        {phase === 'kyc' ? (
          submitting ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 mx-auto rounded-full border-2 animate-spin" style={{ borderColor: p.border, borderTopColor: p.orange }} />
              <p className="mt-3" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.sending')}</p>
            </div>
          ) : (
            <>
              <h1 className="font-black" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.kyc_title')}</h1>
              {submitError ? (
                <p className="mb-3 mt-1" style={{ fontSize: 12, color: p.red }}>{t('sl9_ouverture.kyc_submit_error')}</p>
              ) : null}
              <KycCaptureFlow p={p} onAllDone={handleKycDone} onSkipForNow={() => navigate(ADD_PRODUCTS_PATH)} />
            </>
          )
        ) : phase === 'pending' ? (
          <div>
            <h1 className="font-black" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.pending_title')}</h1>
            <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.pending_delay_usual')}</p>

            <DarkCard className="p-4 mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Hourglass size={13} color="#F0C04C" />
                <span className="font-black uppercase" style={{ fontSize: 10.5, letterSpacing: '.08em', color: '#F0C04C' }}>
                  {t('sl9_ouverture.pending_worst_case_label')}
                </span>
              </div>
              <p className="font-black" style={{ fontSize: 18, color: DARK_HERO_TEXT, lineHeight: 1.3 }}>
                {answerBeforeLabel()}
              </p>
              <p className="mt-2" style={{ fontSize: 12, color: DARK_HERO_TEXT_MUTED, lineHeight: 1.5 }}>
                {t('sl9_ouverture.pending_delay_worst_case_detail')}
              </p>
            </DarkCard>

            <Card p={p}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} color={p.green} className="flex-shrink-0" />
                <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600 }}>{t('sl9_ouverture.pending_sent_summary')}</span>
              </div>
            </Card>

            <div className="mt-3">
              <Card p={p}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1F` }}>
                    <PlusCircle size={16} color={p.orange} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl9_ouverture.pending_drafts_note')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ADD_PRODUCTS_PATH)}
                  className="w-full rounded-xl font-bold"
                  style={{ padding: '10px 14px', fontSize: 12.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
                >
                  {t('sl9_ouverture.kyc_skip_add_products')}
                </button>
              </Card>
            </div>

            <div className="mt-4">
              <PrimaryButton p={p} onClick={() => setPhase('contract')}>
                {t('sl9_ouverture.pending_continue_to_contract')}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <ContractCard p={p} onSign={handleSign} signing={signing} />
        )}
      </div>
    </div>
  );
}
