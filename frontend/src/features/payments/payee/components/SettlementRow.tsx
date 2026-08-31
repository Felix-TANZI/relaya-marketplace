// frontend/src/features/payments/payee/components/SettlementRow.tsx
// Une ligne de reglement dans une liste.

import Money from '../../shared/Money';
import { statusMeta, TONE } from '../../model/status';
import { FT } from '../../shared/tokens';
import { formatPeriod, formatShortDate } from '../../shared/dates';
import type { SettlementBatch } from '../../model/settlement.types';

interface SettlementRowProps {
  batch: SettlementBatch;
  onClick?: () => void;
  showBorder?: boolean;
}

export default function SettlementRow({
  batch, onClick, showBorder = true,
}: SettlementRowProps) {
  const meta = statusMeta('settlement', batch.status);
  const verse = batch.payout?.settled_at ?? null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 1.25rem',
        borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        aria-hidden="true"
        title={meta.meaning}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: TONE[meta.tone].dot, flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, margin: 0, color: 'var(--text-primary, #1A1209)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {batch.reference}
        </p>
        <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
          {formatPeriod(batch.period_start, batch.period_end)}
          {batch.lines.length > 0 && ` · ${batch.lines.length} commande${
            batch.lines.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <span style={{
        fontSize: 11.5, width: 96, textAlign: 'right', color: FT.muted,
      }}>
        {verse ? `versé le ${formatShortDate(verse)}` : meta.label}
      </span>

      <span style={{ width: 82, textAlign: 'right' }}>
        <Money value={batch.net_amount_xaf} size={15} />
      </span>
    </div>
  );
}