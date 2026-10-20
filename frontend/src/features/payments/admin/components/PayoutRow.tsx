// frontend/src/features/payments/admin/components/PayoutRow.tsx
// Une demande de versement dans la file.
//
// ─────────────────────────────────────────────────────────────────────────
// UNE ISSUE INCONNUE N'A PAS DE BOUTON
//
// A sa place, une mention : « ne pas rejouer ». C'est delibere — un bouton,
// meme intitule « reessayer », finirait par etre clique un jour de rush.
//
// L'ABSENCE D'ACTION EST LA PROTECTION. La seule voie est d'interroger le
// prestataire depuis le detail, ce qui ne deplace aucun argent.
// ─────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';

import Money from '../../shared/Money';
import { statusMeta, TONE } from '../../model/status';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import type { AdminPayoutRow as PayoutRowData } from '../../model/finance.types';

interface PayoutRowProps {
  payout: PayoutRowData;
  showBorder?: boolean;
  onOpen?: () => void;
  onApprove?: () => void;
  onExecute?: () => void;
}

export default function PayoutRow({
  payout, showBorder = true, onOpen, onApprove, onExecute,
}: PayoutRowProps) {
  const { t } = useTranslation();
  const meta = statusMeta('payout', payout.status, t);
  const inconnu = payout.status === 'UNKNOWN';
  const aApprouver = payout.status === 'PENDING_APPROVAL';
  const aExecuter = payout.status === 'APPROVED';
  const acheve = payout.status === 'PAID';

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 1.25rem', gap: 12,
      borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
    }}>
      <div
        onClick={onOpen}
        style={{ flex: 1, minWidth: 0, cursor: onOpen ? 'pointer' : 'default' }}
      >
        <p style={{
          fontSize: 13.5, margin: 0,
          color: acheve ? FT.muted : 'var(--text-primary, #1A1209)',
        }}>
          {payout.payee.display_label || payout.payee.payee_code}
        </p>
        <p style={{
          fontSize: 11.5, margin: '2px 0 0', color: FT.faint,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {payout.reference}
          {payout.settled_at
            ? t('pm1_payout_row.settled_on', { date: formatShortDate(payout.settled_at) })
            : ` · ${payout.payee_msisdn_masked} ${payout.payee_operator}`}
        </p>
      </div>

      <div style={{
        width: 132, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span
          aria-hidden="true"
          title={`${meta.meaning} ${payout.guidance?.action ?? ''}`.trim()}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: TONE[meta.tone].dot, flexShrink: 0,
          }}
        />
        <span style={{
          fontSize: 12.5,
          color: acheve ? FT.muted : 'var(--text-primary, #1A1209)',
        }}>
          {aApprouver
            ? t('pm1_payout_row.approvals_count', {
                count: payout.approvals_count,
                required: payout.required_approvals,
              })
            : meta.label}
        </span>
      </div>

      <span style={{ width: 92, textAlign: 'right' }}>
        <Money
          value={payout.amount_xaf}
          size={15}
          tone={acheve ? 'muted' : 'neutral'}
        />
      </span>

      <div style={{ width: 100, textAlign: 'right' }}>
        {inconnu ? (
          // Pas de bouton. La mention remplace l'action.
          <span style={{ fontSize: 11.5, color: FT.redD }}>
            {t('pm1_payout_row.do_not_retry')}
          </span>
        ) : aApprouver && onApprove ? (
          <button
            type="button"
            onClick={onApprove}
            style={{
              fontSize: 12, padding: '5px 12px',
              borderColor: FT.green, color: FT.greenD,
            }}
          >
            {t('pm1_payout_row.approve')}
          </button>
        ) : aExecuter && onExecute ? (
          <button
            type="button"
            onClick={onExecute}
            style={{ fontSize: 12, padding: '5px 12px' }}
          >
            {t('pm1_payout_row.execute')}
          </button>
        ) : null}
      </div>
    </div>
  );
}