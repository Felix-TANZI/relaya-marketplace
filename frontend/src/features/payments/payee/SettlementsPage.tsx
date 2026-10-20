// frontend/src/features/payments/payee/SettlementsPage.tsx
// Tous mes releves de reglement.

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useSettlements } from '../hooks/useSettlements';
import EmptyState from '../shared/EmptyState';
import { FT } from '../shared/tokens';
import SettlementRow from './components/SettlementRow';

interface SettlementsPageProps {
  basePath?: string;
}

export default function SettlementsPage({
  basePath = '/seller',
}: SettlementsPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useSettlements();
  const lots = data ?? [];

  return (
    <div style={{ maxWidth: 880 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        {t('sl2_payee_settlements.page_title')}
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        {t('sl2_payee_settlements.page_subtitle')}
      </p>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('sl2_payee_settlements.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('sl2_payee_settlements.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lots.length === 0 && (
          <EmptyState
            icon="receipt"
            title={t('sl2_payee_settlements.empty_title')}
            description={t('sl2_payee_settlements.empty_description')}
          />
        )}

        {!loading && !error && lots.map((lot, index) => (
          <SettlementRow
            key={lot.reference}
            batch={lot}
            showBorder={index < lots.length - 1}
            onClick={() => navigate(`${basePath}/payments/${lot.reference}`)}
          />
        ))}
      </div>
    </div>
  );
}