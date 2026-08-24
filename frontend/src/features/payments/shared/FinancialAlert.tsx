// frontend/src/features/payments/shared/FinancialAlert.tsx
// Un signal, et ce qu'il faut en faire.
//
// ─────────────────────────────────────────────────────────────────────────
// UNE ALERTE SANS PISTE D'ACTION FINIT IGNOREE
//
// C'est ce qui distingue un tableau de bord utile d'un tableau decoratif.
// Le backend ecrit deja l'action recommandee — « ne jamais retenter, lancer
// resolve_unknown_payouts » — l'interface la rend cliquable.
//
// PAS DE FOND COLORE PLEINE LARGEUR : un encadre rouge crie une fois, puis
// devient invisible. Une ligne sobre reste lisible meme quand il y en a cinq.
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

import { SEVERITY_TONE, TONE } from '../model/status';
import type { Severity } from '../model/finance.types';

interface FinancialAlertProps {
  severity: Severity;
  title: string;
  detail?: string;
  action?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export default function FinancialAlert({
  severity, title, detail, action, actionLabel, onAction, children,
}: FinancialAlertProps) {
  const teinte = TONE[SEVERITY_TONE[severity] ?? 'neutral'];

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '1rem 1.25rem',
    }}>
      <span aria-hidden="true" style={{
        width: 7, height: 7, borderRadius: '50%',
        background: teinte.dot, flexShrink: 0, marginTop: 6,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, margin: 0, color: 'var(--text-primary, #1A1209)' }}>
          {title}
        </p>
        {detail && (
          <p style={{
            fontSize: 12.5, margin: '3px 0 0', lineHeight: 1.5,
            color: 'var(--text-secondary, #7C6E5A)',
          }}>
            {detail}
          </p>
        )}
        {action && !onAction && (
          <p style={{
            fontSize: 12.5, margin: '6px 0 0', lineHeight: 1.5,
            color: 'var(--text-secondary, #7C6E5A)',
          }}>
            {action}
          </p>
        )}
        {children}
      </div>

      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          title={action}
          style={{ fontSize: 12, padding: '6px 13px', whiteSpace: 'nowrap' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}