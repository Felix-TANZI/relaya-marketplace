// frontend/src/features/vendors/v2/catalogue/OffreEnvoyeeScreen.tsx
// Écran "Offre envoyée" — VD-08 §3.1 (A31). POST /offers {publish:true} ne
// renvoie pas encore best_price/perks/answer_before (aucun endpoint /offers
// ni GET /offers/{id}/price-advice) : la carte "Meilleur prix" n'est PAS
// affichée (PUB-01 : avantages réels et vérifiables seulement) — on ne peut
// pas savoir honnêtement si l'offre est au meilleur prix aujourd'hui.

import { CheckCircle2 } from 'lucide-react';
import { palette } from '../theme';
import { Card, PrimaryButton, SecondaryButton } from './ui';

export default function OffreEnvoyeeScreen({
  productTitle, answerBeforeLabel, onSeeProducts, onAddColor, theme, t,
}: {
  productTitle: string;
  answerBeforeLabel: string;
  onSeeProducts: () => void;
  onAddColor: () => void;
  theme: 'light' | 'dark';
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const p = palette(theme);
  return (
    <div className="pb-24 pt-6 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: `${p.green}1F` }}>
        <CheckCircle2 size={30} color={p.green} />
      </div>
      <h1 className="font-black mb-1" style={{ fontSize: 19, color: p.text }}>{t('sl10_catalogue.sent_title')}</h1>
      <p className="mb-1" style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>{productTitle}</p>
      <p className="mb-6" style={{ fontSize: 12.5, color: p.textMuted }}>
        {t('sl10_catalogue.sent_answer_before', { when: answerBeforeLabel })}
      </p>

      <div className="w-full flex flex-col gap-2">
        <PrimaryButton p={p} onClick={onSeeProducts}>{t('sl10_catalogue.sent_cta_see_products')}</PrimaryButton>
        <SecondaryButton p={p} onClick={onAddColor}>{t('sl10_catalogue.sent_cta_add_color')}</SecondaryButton>
      </div>

      <div className="w-full mt-4">
        <Card p={p}>
          <p style={{ fontSize: 11.5, color: p.textMuted, lineHeight: 1.5 }}>{t('sl10_catalogue.sent_note')}</p>
        </Card>
      </div>
    </div>
  );
}
