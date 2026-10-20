// frontend/src/features/vendors/SellerAnalyticsPage.tsx
// Page stub — à implémenter dans les phases suivantes.
import { useTranslation } from "react-i18next";
import SellerPageComingSoon from "./SellerPageComingSoon";

export default function SellerAnalyticsPage() {
  const { t } = useTranslation();
  return (
    <SellerPageComingSoon
      title={t('sl2_analytics.title')}
      description={t('sl2_analytics.description')}
    />
  );
}
