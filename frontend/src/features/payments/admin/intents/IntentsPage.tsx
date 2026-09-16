// frontend/src/features/payments/admin/intents/IntentsPage.tsx
// Paiements — consultation.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { ListParams } from '../../api/admin-finance.api';
import { useAdminIntents } from '../../hooks/useFinanceAdmin';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import Pagination from '../../shared/Pagination';
import SearchBar from '../../shared/SearchBar';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface IntentsPageProps {
  basePath?: string;
}

const FILTRES: Record<string, string> = {
  succeeded: 'SUCCEEDED',
  pending: 'PROCESSING,REQUIRES_ACTION',
  failed: 'FAILED,EXPIRED',
  all: '',
};

/** Les états, avec leur teinte. */
const TEINTES: Record<string, string> = {
  SUCCEEDED: FT.green,
  PROCESSING: FT.amber,
  REQUIRES_ACTION: FT.amber,
  FAILED: FT.red,
  EXPIRED: FT.faint,
  CANCELLED: FT.faint,
  REFUNDED: FT.faint,
  PARTIALLY_REFUNDED: FT.coralL,
  DRAFT: FT.faint,
};

export default function IntentsPage({
  basePath = '/admin/finance',
}: IntentsPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);

  const requete = useMemo<ListParams>(() => {
    const params: ListParams = { page };
    const statut = FILTRES[filtre] ?? '';
    if (statut) params.status = statut;
    if (recherche) params.q = recherche;
    return params;
  }, [filtre, recherche, page]);

  const { data, loading, error } = useAdminIntents(requete);
  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'all', label: t('pm1_intents.tab_all') },
    { key: 'succeeded', label: t('pm1_intents.tab_succeeded') },
    { key: 'pending', label: t('pm1_intents.tab_pending') },
    { key: 'failed', label: t('pm1_intents.tab_failed') },
  ];

  return (
    <AdminPageShell
      title={t('pm1_intents.title')}
      subtitle={t((data?.count ?? 0) > 1
        ? 'pm1_intents.intent_count_plural'
        : 'pm1_intents.intent_count', { count: data?.count ?? 0 })}
      backTo={basePath}
      actions={(
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <SearchBar
            value={recherche}
            onChange={(valeur) => { setRecherche(valeur); setPage(1); }}
            placeholder={t('pm1_intents.search_placeholder')}
          />
          <FilterTabs
            tabs={onglets}
            active={filtre}
            onChange={(cle) => { setFiltre(cle); setPage(1); }}
          />
        </div>
      )}
    >
      <AdminCard>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_intents.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_intents.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState icon="credit-card" title={t('pm1_intents.empty_title')} />
        )}

        {!loading && !error && lignes.map((intention, index) => (
          <div
            key={intention.reference}
            onClick={() => navigate(
              `${basePath}/intents/${intention.reference}`,
            )}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 1.25rem', cursor: 'pointer',
              borderBottom: index < lignes.length - 1
                ? `0.5px solid ${FT.border}` : 'none',
            }}
          >
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: TEINTES[intention.status] ?? FT.faint,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, margin: 0,
                color: 'var(--text-primary, #1A1209)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {intention.reference}
              </p>
              <p style={{
                fontSize: 11.5, margin: '2px 0 0', color: FT.faint,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {/* Le payeur tiers est le cas NOMINAL en diaspora : on
                    l'affiche sans le signaler comme une anomalie. */}
                {t(intention.payer_relationship === 'THIRD_PARTY'
                  ? 'pm1_intents.payment_meta_line_third_party'
                  : 'pm1_intents.payment_meta_line', {
                  date: formatShortDate(intention.created_at),
                  buyer: intention.buyer_username,
                  operator: intention.payer_operator,
                  msisdn: intention.payer_msisdn_masked,
                })}
              </p>
            </div>

            <span style={{
              fontSize: 11.5, width: 92, textAlign: 'right', color: FT.muted,
            }}>
              {intention.status_label}
            </span>

            <span style={{ width: 88, textAlign: 'right' }}>
              <Money value={intention.amount_xaf} size={15} />
            </span>
          </div>
        ))}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            count={data.count}
            onChange={setPage}
            label={t('pm1_intents.pagination_label')}
          />
        )}
      </AdminCard>
    </AdminPageShell>
  );
}