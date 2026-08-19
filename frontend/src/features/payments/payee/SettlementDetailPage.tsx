// frontend/src/features/payments/payee/SettlementDetailPage.tsx
// Le detail d'un releve — un document que le partenaire peut verifier.

import { useNavigate, useParams } from 'react-router-dom';

import { useSettlement } from '../hooks/useSettlements';
import EmptyState from '../shared/EmptyState';
import StatusBadge from '../shared/StatusBadge';
import TransactionReference from '../shared/TransactionReference';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import { formatPeriod, formatShortDate } from '../shared/dates';
import SettlementBreakdown from './components/SettlementBreakdown';

interface SettlementDetailPageProps {
  basePath?: string;
}

export default function SettlementDetailPage({
  basePath = '/seller',
}: SettlementDetailPageProps) {
  const { reference = '' } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { data: lot, loading, error } = useSettlement(reference);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <EmptyState
        icon="file-off"
        title="Relevé introuvable"
        description={error ?? 'Ce relevé n’existe pas ou ne vous concerne pas.'}
      />
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <button
        type="button"
        onClick={() => navigate(`${basePath}/payments`)}
        style={{
          fontSize: 12.5, padding: '6px 12px', marginBottom: '1.25rem',
        }}
      >
        <i
          className="ti ti-arrow-left"
          aria-hidden="true"
          style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
        />
        Mes règlements
      </button>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.25rem 1rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, borderBottom: `0.5px solid ${FT.border}`,
        }}>
          <div>
            <TransactionReference value={lot.reference} size={14} />
            <p style={{ fontSize: 12, margin: '3px 0 0', color: FT.muted }}>
              {formatPeriod(lot.period_start, lot.period_end)}
              {lot.lines.length > 0 && ` · ${lot.lines.length} commande${
                lot.lines.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Money value={lot.net_amount_xaf} size={22} />
            <div style={{ marginTop: 5 }}>
              {lot.payout?.settled_at ? (
                <span style={{ fontSize: 11.5, color: FT.muted }}>
                  versé le {formatShortDate(lot.payout.settled_at)}
                </span>
              ) : (
                <StatusBadge
                  domain="settlement"
                  status={lot.status}
                  label={lot.status_label}
                  size="sm"
                />
              )}
            </div>
          </div>
        </div>

        <SettlementBreakdown
          lines={lot.lines}
          adjustments={lot.adjustments}
          netAmountXaf={lot.net_amount_xaf}
        />
      </div>

      {lot.payout && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`,
          borderRadius: 16, padding: '1rem 1.25rem', marginTop: 12,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 12.5, margin: 0, color: FT.muted }}>
              Versé sur
            </p>
            <p style={{
              fontSize: 13.5, margin: '3px 0 0',
              color: 'var(--text-primary, #1A1209)',
            }}>
              {lot.payout.msisdn_masked} · {lot.payout.operator}
            </p>
          </div>
          <StatusBadge
            domain="payout"
            status={lot.payout.status}
            label={lot.payout.status_label}
          />
        </div>
      )}
    </div>
  );
}