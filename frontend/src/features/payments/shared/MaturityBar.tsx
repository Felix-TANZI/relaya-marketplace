// frontend/src/features/payments/shared/MaturityBar.tsx
// La barre de maturite — le composant qui raconte le modele.
//
// ─────────────────────────────────────────────────────────────────────────
// L'ARGENT D'UN PARTENAIRE N'EST PAS UN SOLDE, C'EST UN FLUX QUI MURIT
//
//   gris    sous sequestre     la commande est vivante, l'acheteur peut
//                              encore etre rembourse — CE N'EST PAS SON
//                              ARGENT
//   corail  en reglement       le lot est en preparation
//   vert    acquis             il lui revient au prochain cycle
//
// Une seule ligne de six pixels dit tout ce qu'une liste de montants ne
// disait pas : le mouvement.
// ─────────────────────────────────────────────────────────────────────────

import { FT } from './tokens';
import { formatXaf } from './format';

export interface MaturitySegment {
  label: string;
  hint: string;
  amount: number;
  color: string;
}

interface MaturityBarProps {
  segments: MaturitySegment[];
  showLegend?: boolean;
}

export default function MaturityBar({
  segments, showLegend = true,
}: MaturityBarProps) {
  const total = segments.reduce((somme, s) => somme + Math.max(0, s.amount), 0);

  return (
    <div>
      <div style={{
        display: 'flex', height: 6, borderRadius: 999,
        overflow: 'hidden', background: 'var(--border, #E8E2D9)',
      }}>
        {total > 0 && segments.map((segment) => (
          <div
            key={segment.label}
            title={`${segment.label} — ${segment.hint}`}
            style={{
              width: `${(Math.max(0, segment.amount) / total) * 100}%`,
              background: segment.color,
            }}
          />
        ))}
      </div>

      {showLegend && (
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 14 }}>
          {segments.map((segment) => (
            <div key={segment.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span aria-hidden="true" style={{
                  width: 7, height: 7, borderRadius: '50%', background: segment.color,
                }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary, #7C6E5A)' }}>
                  {segment.label}
                </span>
              </div>
              <p style={{
                fontSize: 16, margin: '0 0 1px 14px',
                color: 'var(--text-primary, #1A1209)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatXaf(segment.amount)}
              </p>
              <p style={{ fontSize: 11, margin: '0 0 0 14px', color: FT.faint }}>
                {segment.hint}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}