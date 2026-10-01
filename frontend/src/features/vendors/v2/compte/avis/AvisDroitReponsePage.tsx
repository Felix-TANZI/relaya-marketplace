// frontend/src/features/vendors/v2/compte/avis/AvisDroitReponsePage.tsx
// Écran "Avis et droit de réponse" — VD-11 §AVI, MSG, Fig.11.
// Affiche les avis vérifiés, leur poids dans le Trust Score (20 %, canonique
// SCO), et la réponse privée via le support (jamais de réponse publique
// signée, jamais de suppression par le vendeur — AVI-01).
//
// Pas de pont API listé (GET /reviews, POST /reviews/{id}/private-reply) :
// liste vide honnête tant que l'endpoint n'est pas branché.

import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';

export default function AvisDroitReponsePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const reviews: never[] = [];

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.reviews_title')} />

      <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-center gap-1 mb-1">
          {[...Array(5)].map((_, i) => <Star key={i} size={16} color={p.border} fill={p.border} />)}
        </div>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.reviews_no_data_yet')}</p>
        <p className="mt-1 font-semibold" style={{ fontSize: 11.5, color: p.text }}>{t('sl11_compte.reviews_weight_note')}</p>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {reviews.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.reviews_empty')}</p>
        ) : null}
      </div>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p className="mb-1">{t('sl11_compte.reviews_how_1')}</p>
        <p>{t('sl11_compte.reviews_how_2')}</p>
      </Collapsible>
    </div>
  );
}
