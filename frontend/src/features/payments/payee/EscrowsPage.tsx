// frontend/src/features/payments/payee/EscrowsPage.tsx
// Mes fonds en attente.
//
// ─────────────────────────────────────────────────────────────────────────
// LE TITRE COMPTE AUTANT QUE LE CONTENU
//
// « Mes séquestres » est un mot de juriste. Un vendeur veut savoir quel
// argent l'attend et quand — d'ou « Mes fonds en attente », et un
// sous-titre qui explique le principe en une phrase.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePartnerEscrow } from '../hooks/usePartnerEscrow';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import EscrowCard from './components/EscrowCard';

const ACTIFS = ['HELD', 'RELEASE_SCHEDULED', 'FROZEN'];

export default function EscrowsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = usePartnerEscrow();

  const { actifs, total, geles } = useMemo(() => {
    const tous = data ?? [];
    const vivants = tous.filter((h) => ACTIFS.includes(h.status));
    return {
      actifs: vivants,
      total: vivants.reduce((somme, h) => somme + h.payable_xaf, 0),
      geles: vivants.filter((h) => h.status === 'FROZEN').length,
    };
  }, [data]);

  return (
    <div style={{ maxWidth: 880 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        {t('sl2_payee_escrow.page_title')}
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        {t('sl2_payee_escrow.page_subtitle')}
      </p>

      {!loading && !error && actifs.length > 0 && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          padding: '1.25rem', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{
              fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: FT.faint,
            }}>
              {t('sl2_payee_escrow.total_pending')}
            </p>
            <Money value={total} size={28} showCurrency />
          </div>
          <p style={{ fontSize: 12.5, margin: 0, color: FT.muted }}>
            {t(actifs.length > 1 ? 'sl2_payee_escrow.orders_count_plural' : 'sl2_payee_escrow.orders_count', { count: actifs.length })}
            {geles > 0 && (
              <span style={{ color: FT.redD }}>
                {' · '}{t(geles > 1 ? 'sl2_payee_escrow.in_dispute_plural' : 'sl2_payee_escrow.in_dispute', { count: geles })}
              </span>
            )}
          </p>
        </div>
      )}

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('sl2_payee_escrow.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('sl2_payee_escrow.error_title')}
            description={error}
          />
        )}

        {!loading && !error && actifs.length === 0 && (
          <EmptyState
            icon="wallet"
            title={t('sl2_payee_escrow.empty_title')}
            description={t('sl2_payee_escrow.empty_description')}
          />
        )}

        {!loading && !error && actifs.map((hold, index) => (
          <EscrowCard
            key={hold.reference}
            hold={hold}
            showBorder={index < actifs.length - 1}
          />
        ))}
      </div>
    </div>
  );
}