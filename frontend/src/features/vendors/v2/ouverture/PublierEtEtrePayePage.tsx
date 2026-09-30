// frontend/src/features/vendors/v2/ouverture/PublierEtEtrePayePage.tsx
// Écran « Publier et être payé » — étapes 2 et 3 (VD-03 §1.1, VD-D04.A11 à A14).
// Étape 2 : capture KYC (KycCaptureFlow) → écran « vérification en cours ».
// Étape 3 : contrat en cinq lignes (ContractCard) → signature (locale, voir
// api.ts) → redirection vers /seller/dashboard.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, PlusCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { VendorProfile } from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, PrimaryButton } from '../commandes/ui';
import OnboardingSteps from './OnboardingSteps';
import KycCaptureFlow from './KycCaptureFlow';
import ContractCard from './ContractCard';
import { finalizeShopApplication, readShopDraft, signContractLocally } from './api';

const SELLER_HOME_PATH = '/seller/dashboard';
const OPEN_SHOP_PATH = '/vendeur/ouvrir-boutique';

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
        <div className="rounded-2xl p-5" style={{ background: p.card, border: `1px solid ${p.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
          <OnboardingSteps current={phase === 'contract' ? 'paid' : 'publish'} p={p} />

          {phase === 'kyc' ? (
            submitting ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 mx-auto rounded-full border-2 animate-spin" style={{ borderColor: p.border, borderTopColor: p.orange }} />
                <p className="mt-3" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.sending')}</p>
              </div>
            ) : (
              <>
                {submitError ? (
                  <p className="mb-3" style={{ fontSize: 12, color: p.red }}>{t('sl9_ouverture.kyc_submit_error')}</p>
                ) : null}
                <KycCaptureFlow p={p} onAllDone={handleKycDone} onSkipForNow={() => navigate('/seller/products/new')} />
              </>
            )
          ) : phase === 'pending' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.amber}1F` }}>
                  <Clock size={20} color={p.amber} />
                </div>
                <div>
                  <h1 className="font-black" style={{ fontSize: 16, color: p.text }}>{t('sl9_ouverture.pending_title')}</h1>
                  <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.pending_subtitle')}</p>
                </div>
              </div>
              <Card p={p}>
                <p style={{ fontSize: 12.5, color: p.text, lineHeight: 1.5 }}>
                  {t('sl9_ouverture.pending_delay_usual')}
                </p>
                <p className="mt-2" style={{ fontSize: 12, color: p.textMuted }}>
                  {t('sl9_ouverture.pending_delay_worst_case', { date: answerBeforeLabel() })}
                </p>
              </Card>
              <div className="mt-3">
                <Card p={p}>
                  <div className="flex items-center gap-2.5">
                    <PlusCircle size={16} color={p.orange} />
                    <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600 }}>{t('sl9_ouverture.pending_drafts_note')}</span>
                  </div>
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
    </div>
  );
}
