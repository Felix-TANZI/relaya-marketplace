// frontend/src/features/vendors/v2/compte/messagerie/MessageriePage.tsx
// Écran "Messagerie" — VD-11 §MSG, Fig.12/Fig.13.
// Fils rattachés à une commande, anonymes (BOU-03/MSG-01) : le vendeur lit
// « Client de BLV-… », jamais de nom ni de numéro.
//
// Pas de pont API listé (GET /threads) : liste vide honnête tant que
// l'endpoint n'est pas branché.

import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';

export default function MessageriePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const threads: never[] = [];

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.messaging_title')} />

      <div className="rounded-2xl p-6 text-center mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <MessageCircle size={28} color={p.textMuted} className="mx-auto mb-2" />
        {threads.length === 0 ? (
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl11_compte.messaging_empty')}</p>
        ) : null}
      </div>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p>{t('sl11_compte.messaging_how')}</p>
      </Collapsible>
    </div>
  );
}
