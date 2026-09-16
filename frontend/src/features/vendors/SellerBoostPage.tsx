// frontend/src/features/vendors/SellerBoostPage.tsx
// Page stub — à implémenter dans les phases suivantes.
import { useTranslation } from "react-i18next";
import SellerPageComingSoon from "./SellerPageComingSoon";

export default function SellerBoostPage() {
  const { t } = useTranslation();
  return (
    <SellerPageComingSoon
      title={t('sl2_boost.title')}
      description={t('sl2_boost.description')}
    />
  );
}
