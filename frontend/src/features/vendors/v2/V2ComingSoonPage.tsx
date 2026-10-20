// frontend/src/features/vendors/v2/V2ComingSoonPage.tsx
// Placeholder générique pour les écrans du Menu (VD-11) pas encore construits.
// Un seul composant, route dynamique /seller/v2/:screen — voir comingSoonScreens.ts.

import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SellerPageComingSoon from '@/features/vendors/SellerPageComingSoon';
import { COMING_SOON_TITLE_KEYS, type ComingSoonScreen } from './comingSoonScreens';

export default function V2ComingSoonPage() {
  const { screen } = useParams<{ screen: string }>();
  const { t } = useTranslation();
  const key = (screen && screen in COMING_SOON_TITLE_KEYS ? screen : null) as ComingSoonScreen | null;

  return (
    <SellerPageComingSoon
      title={key ? t(COMING_SOON_TITLE_KEYS[key]) : t('sl5_fondations.screen_generic')}
      description={t('sl5_fondations.screen_generic_desc')}
    />
  );
}
