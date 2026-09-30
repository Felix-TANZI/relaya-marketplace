// frontend/src/features/vendors/v2/compte/trust-score/LesPaliersPage.tsx
// Écran "Les paliers" — VD-10 §PAL-04, Fig.3.
// Une ligne par palier (médaille, nom, conditions, vitesse de libération,
// support, montant gardé en vert) — Bronze/Argent/Or/Platine UNIQUEMENT.
//
// VD-D11.A01 supprime le palier "Diamant" de l'ancien moteur à points ; si le
// backend renvoie encore une entrée DIAMOND (VendorProfile.certification_tier),
// elle est filtrée ici sans jamais casser l'écran — voir shared/format.ts.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Medal, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type CertificationData } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { TIER_ORDER, TIER_THRESHOLD, TIER_RELEASE_DAYS, TIER_KEEP_BONUS_PCT, mapLegacyTier, type SellerTier } from '../shared/format';

const SUPPORT_BY_TIER: Record<SellerTier, string> = {
  BRONZE: 'support_24h',
  SILVER: 'support_4h',
  GOLD: 'support_2h',
  PLATINUM: 'support_dedicated',
};

export default function LesPaliersPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [cert, setCert] = useState<CertificationData | null>(null);

  useEffect(() => {
    vendorsApi.getCertifications().then(setCert).catch(() => {});
  }, []);

  const currentTier = mapLegacyTier(cert?.current_tier);
  const currentIndex = TIER_ORDER.indexOf(currentTier);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.tiers_title')} />

      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {TIER_ORDER.map((tier, i) => {
          const isCurrent = tier === currentTier;
          const isUnlocked = i <= currentIndex;
          return (
            <div
              key={tier}
              className="flex items-start gap-3"
              style={{ padding: '14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined, background: isCurrent ? `${p.orange}12` : undefined }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isUnlocked ? p.orange : p.border }}
              >
                <Medal size={18} color={isUnlocked ? '#fff' : p.textMuted} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>
                    {t(`sl11_compte.tier_${tier.toLowerCase()}`)}
                  </p>
                  <p className="font-black" style={{ fontSize: 12.5, color: p.green }}>
                    {tier === 'BRONZE' ? t('sl11_compte.tiers_reference') : `+${TIER_KEEP_BONUS_PCT[tier]}%`}
                  </p>
                </div>
                <p style={{ fontSize: 11.5, color: p.textMuted }}>
                  {t('sl11_compte.tiers_threshold', { score: TIER_THRESHOLD[tier] })}
                </p>
                <p style={{ fontSize: 11.5, color: p.textMuted }}>
                  {t('sl11_compte.tiers_release', { days: TIER_RELEASE_DAYS[tier] })} · {t(`sl11_compte.${SUPPORT_BY_TIER[tier]}`)}
                </p>
                {!isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => navigate('/seller/v2/palier')}
                    className="flex items-center gap-1 mt-1"
                    style={{ fontSize: 11.5, color: p.orange, fontWeight: 700 }}
                  >
                    {t('sl11_compte.tiers_missing')} <ChevronRight size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p>{t('sl11_compte.tiers_how')}</p>
      </Collapsible>
    </div>
  );
}
