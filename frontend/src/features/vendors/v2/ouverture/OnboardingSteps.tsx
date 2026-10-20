// frontend/src/features/vendors/v2/ouverture/OnboardingSteps.tsx
// Composant OnboardingSteps(cur) — VD-D04.A07/OUV-05 : même barre des trois
// étapes (Ouvrir → Publier → Être payé) sur chaque écran du parcours.

import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { primaryGradient, type VendorPalette } from '../theme';
import type { OnboardingStepKey } from './types';

const STEPS: OnboardingStepKey[] = ['open', 'publish', 'paid'];

const LABEL_KEY: Record<OnboardingStepKey, string> = {
  open: 'sl9_ouverture.step_open',
  publish: 'sl9_ouverture.step_publish',
  paid: 'sl9_ouverture.step_paid',
};

export default function OnboardingSteps({ current, p }: { current: OnboardingStepKey; p: VendorPalette }) {
  const { t } = useTranslation();
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="flex items-center gap-2 mb-5" role="list" aria-label={t('sl9_ouverture.steps_label')}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex-1 flex flex-col gap-1.5" role="listitem">
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 5, background: p.border }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: done || active ? '100%' : '0%',
                  background: done ? p.green : primaryGradient(p),
                }}
              />
            </div>
            <span
              className="flex items-center gap-1 font-bold"
              style={{ fontSize: 10.5, color: active ? p.text : done ? p.green : p.textMuted }}
            >
              {done ? <Check size={11} strokeWidth={3} /> : null}
              {t(LABEL_KEY[step])}
            </span>
          </div>
        );
      })}
    </div>
  );
}
