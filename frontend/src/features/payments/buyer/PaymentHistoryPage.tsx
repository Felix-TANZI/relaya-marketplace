// frontend/src/features/payments/buyer/PaymentHistoryPage.tsx
// Mes paiements.

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useMyPayments } from '../hooks/useMyPayments';
import EmptyState from '../shared/EmptyState';
import { FT } from '../shared/tokens';
import PaymentRow from './components/PaymentRow';

interface PaymentHistoryPageProps {
  basePath?: string;
}

export default function PaymentHistoryPage({
  basePath = '/payments',
}: PaymentHistoryPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useMyPayments();
  const paiements = data ?? [];

  return (
    <div style={{ maxWidth: 760 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        {t('pm2_buyer_history.title')}
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        {t('pm2_buyer_history.subtitle')}
      </p>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>
              {t('pm2_buyer_history.loading')}
            </span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm2_buyer_history.error_title')}
            description={error}
          />
        )}

        {!loading && !error && paiements.length === 0 && (
          <EmptyState
            icon="credit-card"
            title={t('pm2_buyer_history.empty_title')}
            description={t('pm2_buyer_history.empty_description')}
          />
        )}

        {!loading && !error && paiements.map((paiement, index) => (
          <PaymentRow
            key={paiement.reference}
            payment={paiement}
            showBorder={index < paiements.length - 1}
            onClick={() => navigate(`${basePath}/${paiement.reference}`)}
          />
        ))}
      </div>
    </div>
  );
}