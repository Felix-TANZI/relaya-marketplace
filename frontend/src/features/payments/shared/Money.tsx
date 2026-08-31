// frontend/src/features/payments/shared/Money.tsx
// Un montant en francs CFA.
//
// ─────────────────────────────────────────────────────────────────────────
// UN MONTANT AFFICHE DIFFEREMMENT SUR DEUX ECRANS EROSE LA CONFIANCE PLUS
// VITE QU'UN BUG
//
// D'ou un composant unique : espace insecable comme separateur de milliers,
// chasse tabulaire, et le SENS encode par la couleur — un du en vert, une
// retenue en rouge avec son signe.
//
// Sans le signe, un partenaire lit « 12 000 » sans savoir si c'est en sa
// faveur.
// ─────────────────────────────────────────────────────────────────────────

import { formatXaf } from './format';
import { FT, NUM } from './tokens';

export type MoneyTone = 'neutral' | 'positive' | 'negative' | 'muted';

interface MoneyProps {
  value: number;
  tone?: MoneyTone;
  /** Taille du nombre en pixels. La devise suit automatiquement. */
  size?: number;
  showCurrency?: boolean;
  /** Force le signe, meme sur un montant positif. */
  showSign?: boolean;
  className?: string;
}

const COULEURS: Record<MoneyTone, string> = {
  neutral:  'var(--text-primary, #1A1209)',
  positive: FT.greenD,
  negative: FT.redD,
  muted:    FT.muted,
};

export default function Money({
  value,
  tone = 'neutral',
  size = 15,
  showCurrency = false,
  showSign = false,
  className,
}: MoneyProps) {
  const negatif = value < 0;
  const signe = negatif ? '\u2212' : showSign && value > 0 ? '+' : '';
  const teinte = tone === 'neutral' && negatif ? 'negative' : tone;

  return (
    <span
      className={className}
      style={{ ...NUM, fontSize: size, color: COULEURS[teinte], whiteSpace: 'nowrap' }}
    >
      {signe}
      {formatXaf(value)}
      {showCurrency && (
        <span style={{ fontSize: Math.max(11, size * 0.5), color: FT.muted, marginLeft: 4 }}>
          FCFA
        </span>
      )}
    </span>
  );
}