// frontend/src/features/payments/payee/components/SettlementBreakdown.tsx
// Le detail d'un reglement, ligne par ligne.
//
// ─────────────────────────────────────────────────────────────────────────
// UN DOCUMENT, PAS UN TABLEAU DE BORD
//
// L'agregation est FINANCIERE, pas informationnelle : un lot regroupe N
// sequestres en UN versement, mais le releve reste detaille — c'est ce qui
// permet a un partenaire de verifier.
//
// La commission est visible mais discrete, en gris : elle est due, elle
// n'est pas le sujet. Le net est en noir.
// ─────────────────────────────────────────────────────────────────────────

import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import type { Adjustment } from '../../model/adjustment.types';
import type { SettlementLine } from '../../model/settlement.types';

interface SettlementBreakdownProps {
  lines: SettlementLine[];
  adjustments: Adjustment[];
  netAmountXaf: number;
}

export default function SettlementBreakdown({
  lines, adjustments, netAmountXaf,
}: SettlementBreakdownProps) {
  return (
    <>
      <div style={{ padding: '0.25rem 1.25rem' }}>
        {lines.map((ligne) => (
          <div
            key={ligne.reference}
            style={{
              display: 'flex', padding: '11px 0', alignItems: 'baseline',
              borderBottom: `0.5px solid ${FT.border}`,
            }}
          >
            <span style={{ fontSize: 12.5, flex: 1, color: FT.muted }}>
              {ligne.order_id ? `Commande #${ligne.order_id}` : ligne.component}
            </span>
            {ligne.commission_xaf > 0 && (
              <span style={{ width: 90, textAlign: 'right' }}>
                <Money value={-ligne.commission_xaf} size={12} tone="muted" />
              </span>
            )}
            <span style={{ width: 80, textAlign: 'right' }}>
              <Money value={ligne.net_xaf} size={13.5} />
            </span>
          </div>
        ))}

        {adjustments.map((ajustement) => (
          <div
            key={ajustement.reference}
            style={{
              display: 'flex', padding: '11px 0', alignItems: 'baseline',
              borderBottom: `0.5px solid ${FT.border}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12.5, margin: 0, color: FT.muted }}>
                {ajustement.category_label}
              </p>
              {/* Une retenue sans explication est indefendable. */}
              <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
                {ajustement.reason}
              </p>
            </div>
            <span style={{ width: 80, textAlign: 'right' }}>
              <Money
                value={ajustement.direction === 'CREDIT'
                  ? -ajustement.amount_xaf
                  : ajustement.amount_xaf}
                size={13.5}
              />
            </span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '0.75rem 1.25rem', borderTop: `0.5px solid ${FT.border}`,
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', background: 'var(--surface-1, #F5F0E8)',
      }}>
        <span style={{
          fontSize: 12, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: FT.muted,
        }}>
          Net versé
        </span>
        <Money value={netAmountXaf} size={16} showCurrency />
      </div>
    </>
  );
}