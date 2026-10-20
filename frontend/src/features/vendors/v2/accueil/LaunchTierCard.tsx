// frontend/src/features/vendors/v2/accueil/LaunchTierCard.tsx
// Carte "Plus vous publiez, plus vous gardez" (Premier jour, ACC-15/21).
// GET /seller/onboarding (VD-D05.A15, seuils lus du serveur) n'existe pas :
// les seuils 15/40/80 viennent de §2.3 du dossier et sont en dur dans
// useAccueilData.ts, à remplacer dès que l'endpoint existe.

import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import type { LaunchTierInfo } from './types';

const TIER_LABEL_KEYS: Record<LaunchTierInfo['current'], string> = {
  BRONZE: 'sl6_accueil.tier_bronze',
  ARGENT: 'sl6_accueil.tier_silver',
  OR: 'sl6_accueil.tier_gold',
  PLATINE: 'sl6_accueil.tier_platinum',
};

export default function LaunchTierCard({ tier }: { tier: LaunchTierInfo }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const progress = tier.nextThreshold ? Math.min(1, tier.activeProducts / tier.nextThreshold) : 1;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Award size={18} color={p.orange} />
        <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl6_accueil.tier_title')}</p>
      </div>
      <p className="mb-2" style={{ fontSize: 12, color: p.textMuted }}>
        {t('sl6_accueil.tier_current', { tier: t(TIER_LABEL_KEYS[tier.current]) })}
      </p>
      <div className="w-full rounded-full mb-1.5 overflow-hidden" style={{ height: 8, background: p.cardAlt }}>
        <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: p.orange }} />
      </div>
      <p className="mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>
        {tier.nextThreshold
          ? t('sl6_accueil.tier_progress', { active: tier.activeProducts, next: tier.nextThreshold })
          : t('sl6_accueil.tier_max')}
      </p>
      <details>
        <summary className="font-semibold cursor-pointer" style={{ fontSize: 12, color: p.orange }}>
          {t('sl6_accueil.tier_how_it_works')}
        </summary>
        <ul className="mt-2 space-y-1 list-none" style={{ fontSize: 11.5, color: p.textMuted }}>
          <li>{t('sl6_accueil.tier_row_bronze')}</li>
          <li>{t('sl6_accueil.tier_row_silver', { n: tier.thresholds.argent })}</li>
          <li>{t('sl6_accueil.tier_row_gold', { n: tier.thresholds.or })}</li>
          <li>{t('sl6_accueil.tier_row_platinum', { n: tier.thresholds.platine })}</li>
        </ul>
      </details>
    </div>
  );
}
