// frontend/src/features/vendors/v2/accueil/GesturesCard.tsx
// Carte "Trois gestes pour commencer" (Premier jour, ACC-14/21). Le geste
// suivant non fait porte le seul bouton plein ; les autres sont des lignes
// cliquables ; un geste fait reste visible, coché vert (ACC-16, proposé).

import { CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import type { OnboardingGesture } from './types';

const LABEL_KEYS: Record<OnboardingGesture['key'], string> = {
  add_product: 'sl6_accueil.gesture_add_product',
  set_hours: 'sl6_accueil.gesture_set_hours',
  verify_payout: 'sl6_accueil.gesture_verify_payout',
};

export default function GesturesCard({ gestures }: { gestures: OnboardingGesture[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const nextIndex = gestures.findIndex((g) => !g.done);

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <p className="font-bold mb-3" style={{ fontSize: 14, color: p.text }}>
        {t('sl6_accueil.gestures_title')}
      </p>
      {gestures.map((g, i) => {
        const isNext = i === nextIndex;
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => navigate(g.path)}
            className="w-full flex items-center gap-2.5 text-left mb-2 last:mb-0 rounded-xl"
            style={{
              minHeight: 44,
              padding: isNext ? '11px 14px' : '6px 2px',
              background: isNext ? p.orange : 'transparent',
            }}
          >
            {g.done ? (
              <CheckCircle2 size={18} color={isNext ? '#fff' : p.green} />
            ) : (
              <Circle size={18} color={isNext ? '#fff' : p.textMuted} />
            )}
            <span className="font-semibold" style={{ fontSize: 13, color: isNext ? '#fff' : p.text }}>
              {t(LABEL_KEYS[g.key])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
