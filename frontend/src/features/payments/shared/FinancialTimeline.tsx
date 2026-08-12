// frontend/src/features/payments/shared/FinancialTimeline.tsx
// Le parcours de l'argent, d'un bout a l'autre.
//
// ─────────────────────────────────────────────────────────────────────────
// L'ACHETEUR A BESOIN D'ETRE RASSURE, PAS INFORME
//
// Ce fil montre ou en est son argent et surtout OU IL S'ARRETE : sur lui.
// L'etape courante porte un cercle creux plus grand — elle dit « c'est
// votre tour » sans une ligne de texte.
// ─────────────────────────────────────────────────────────────────────────

import { FT } from './tokens';

export interface TimelineStep {
  label: string;
  done: boolean;
  current?: boolean;
}

interface FinancialTimelineProps {
  steps: TimelineStep[];
}

export default function FinancialTimeline({ steps }: FinancialTimelineProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        {steps.map((etape, index) => {
          const precedenteFaite = index === 0 || steps[index - 1].done;
          return (
            <span key={etape.label} style={{ display: 'contents' }}>
              {index > 0 && (
                <span style={{
                  flex: 1, height: 1.5,
                  background: etape.current
                    ? FT.coral
                    : precedenteFaite && etape.done
                      ? FT.green
                      : FT.border,
                }} />
              )}
              <span
                aria-hidden="true"
                style={{
                  width: etape.current ? 13 : 9,
                  height: etape.current ? 13 : 9,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: etape.current
                    ? 'var(--surface-2, #FFFFFF)'
                    : etape.done ? FT.green : FT.border,
                  border: etape.current ? `2.5px solid ${FT.coral}` : 'none',
                }}
              />
            </span>
          );
        })}
      </div>

      <div style={{ display: 'flex' }}>
        {steps.map((etape, index) => (
          <span
            key={etape.label}
            style={{
              flex: 1, fontSize: 11.5,
              color: etape.current ? FT.coral : 'var(--text-muted, #B4B2A9)',
              textAlign: index === 0
                ? 'left'
                : index === steps.length - 1 ? 'right' : 'center',
            }}
          >
            {etape.label}
          </span>
        ))}
      </div>
    </div>
  );
}