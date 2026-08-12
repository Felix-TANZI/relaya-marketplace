// frontend/src/features/payments/buyer/PaymentDetailPage.tsx
// Le detail d'un paiement.

import { useNavigate, useParams } from 'react-router-dom';

import { useFinanceAction } from '../hooks/useFinanceAction';
import { useMyPayment } from '../hooks/useMyPayments';
import { paymentsApi } from '../api/payments.api';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import TransactionReference from '../shared/TransactionReference';
import { FT } from '../shared/tokens';
import { formatDay } from '../shared/dates';
import PaymentBreakdown from './components/PaymentBreakdown';

interface PaymentDetailPageProps {
  basePath?: string;
  ordersPath?: string;
}

const EN_ATTENTE = ['PROCESSING', 'REQUIRES_ACTION'];

export default function PaymentDetailPage({
  basePath = '/payments',
  ordersPath = '/orders',
}: PaymentDetailPageProps) {
  const { reference = '' } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { data: paiement, loading, error, reload } = useMyPayment(reference);
  const action = useFinanceAction(reload);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !paiement) {
    return (
      <EmptyState
        icon="file-off"
        title="Paiement introuvable"
        description={error ?? 'Ce paiement n’existe pas ou ne vous concerne pas.'}
      />
    );
  }

  const enAttente = EN_ATTENTE.includes(paiement.status);

  return (
    <div style={{ maxWidth: 640 }}>
      <button
        type="button"
        onClick={() => navigate(basePath)}
        style={{ fontSize: 12.5, padding: '6px 12px', marginBottom: '1.25rem' }}
      >
        <i
          className="ti ti-arrow-left"
          aria-hidden="true"
          style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
        />
        Mes paiements
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
            <TransactionReference value={paiement.reference} size={14} />
            <p style={{ fontSize: 12, margin: '3px 0 0', color: FT.muted }}>
              {formatDay(paiement.created_at)}
              {paiement.payer_msisdn_masked
                && ` · ${paiement.payer_operator} ${paiement.payer_msisdn_masked}`}
            </p>
          </div>
          <Money value={paiement.amount_xaf} size={22} />
        </div>

        <PaymentBreakdown breakdown={paiement.breakdown} />
      </div>

      {enAttente && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          padding: '1rem 1.25rem', marginTop: 12,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span aria-hidden="true" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: FT.amber, flexShrink: 0, marginTop: 6,
          }} />
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13.5, margin: 0,
              color: 'var(--text-primary, #1A1209)',
            }}>
              Composez votre code secret sur votre téléphone
            </p>
            <p style={{
              fontSize: 12.5, margin: '3px 0 0', lineHeight: 1.55,
              color: FT.muted,
            }}>
              {/* Le prestataire fait foi : on l'interroge plutot que de se
                  fier a l'etat local. */}
              Une fois validé, actualisez pour vérifier auprès de votre
              opérateur.
            </p>
            {action.error && (
              <p style={{ fontSize: 12, margin: '8px 0 0', color: FT.redD }}>
                {action.error}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={action.running}
            onClick={() => {
              void action.run(() => paymentsApi.check(paiement.reference));
            }}
            style={{ fontSize: 12, padding: '6px 13px', whiteSpace: 'nowrap' }}
          >
            {action.running ? 'Vérification…' : 'Actualiser'}
          </button>
        </div>
      )}

      {paiement.orders.length > 0 && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          marginTop: 12, overflow: 'hidden',
        }}>
          <p style={{
            fontSize: 11, margin: 0, padding: '1rem 1.25rem 0.5rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: FT.faint,
          }}>
            Commandes couvertes
          </p>
          {paiement.orders.map((orderId, index) => (
            <div
              key={orderId}
              onClick={() => navigate(`${ordersPath}/${orderId}`)}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 1.25rem',
                cursor: 'pointer',
                borderTop: index === 0
                  ? `0.5px solid ${FT.border}`
                  : `0.5px solid ${FT.border}`,
              }}
            >
              <span style={{
                fontSize: 13, color: 'var(--text-primary, #1A1209)',
              }}>
                Commande #{orderId}
              </span>
              <i
                className="ti ti-chevron-right"
                aria-hidden="true"
                style={{ fontSize: 15, color: FT.faint }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}