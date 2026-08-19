// frontend/src/features/payments/shared/StatusBadge.tsx
// Un etat : un point colore, un texte neutre.
//
// ─────────────────────────────────────────────────────────────────────────
// LA COULEUR INFORME, ELLE NE DECORE PAS
//
// Des pilules pleines transforment un ecran de trente lignes en sapin de
// Noel. Un point de sept pixels suffit a distinguer, et le texte reste
// lisible.
//
// L'EXPLICATION est portee au survol : « issue inconnue » ne veut pas dire
// « erreur », mais « on ignore si l'argent est parti, ne jamais retenter ».
// La phrase vient de l'API quand elle est fournie, du catalogue local sinon.
// ─────────────────────────────────────────────────────────────────────────

import { statusMeta, TONE } from '../model/status';
import type { StatusDomain } from '../model/status';
import type { Guidance } from '../model/finance.types';

interface StatusBadgeProps {
  domain: StatusDomain;
  status: string;
  /** Libelle serveur, prioritaire sur le catalogue local. */
  label?: string;
  /** Explication serveur, prioritaire elle aussi. */
  guidance?: Guidance;
  size?: 'sm' | 'md';
}

export default function StatusBadge({
  domain, status, label, guidance, size = 'md',
}: StatusBadgeProps) {
  const meta = statusMeta(domain, status);
  const teinte = TONE[meta.tone];

  const sens = guidance?.meaning || meta.meaning;
  const action = guidance?.action || meta.action || '';
  const titre = [sens, action].filter(Boolean).join(' ');

  const diametre = size === 'sm' ? 6 : 7;

  return (
    <span
      title={titre || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: size === 'sm' ? 12 : 13,
        color: 'var(--text-primary, #1A1209)',
        cursor: titre ? 'help' : 'default',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: diametre, height: diametre, borderRadius: '50%',
          background: teinte.dot, flexShrink: 0,
        }}
      />
      {label || meta.label}
    </span>
  );
}