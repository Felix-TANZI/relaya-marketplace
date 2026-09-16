// frontend/src/features/payments/admin/settlements/SettlementsPage.tsx
// Lots de reglement — construction et confirmation.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminSettlements } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import Pagination from '../../shared/Pagination';
import StatusBadge from '../../shared/StatusBadge';
import { FT } from '../../shared/tokens';
import { formatPeriod } from '../../shared/dates';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface SettlementsPageProps {
  basePath?: string;
}

const FILTRES: Record<string, string> = {
  draft: 'DRAFT',
  confirmed: 'CONFIRMED,PAYOUT_REQUESTED',
  paid: 'PAID',
  all: '',
};

export default function AdminSettlementsPage({
  basePath = '/admin/finance',
}: SettlementsPageProps) {
  const { t } = useTranslation();
  const [filtre, setFiltre] = useState('all');
  const [page, setPage] = useState(1);

  const requete = useMemo<ListParams>(() => {
    const params: ListParams = { page };
    const statut = FILTRES[filtre] ?? '';
    if (statut) params.status = statut;
    return params;
  }, [filtre, page]);

  const { data, loading, error, reload } = useAdminSettlements(requete);
  const action = useFinanceAction(reload);
  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'all', label: t('pm1_settlements.tab_all') },
    { key: 'draft', label: t('pm1_settlements.tab_draft') },
    { key: 'confirmed', label: t('pm1_settlements.tab_confirmed') },
    { key: 'paid', label: t('pm1_settlements.tab_paid') },
  ];

  return (
    <AdminPageShell
      title={t('pm1_settlements.title')}
      subtitle={t(
        (data?.count ?? 0) > 1
          ? 'pm1_settlements.subtitle_count_plural'
          : 'pm1_settlements.subtitle_count',
        { count: data?.count ?? 0 },
      )}
      backTo={basePath}
      actions={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterTabs
            tabs={onglets}
            active={filtre}
            onChange={(cle) => { setFiltre(cle); setPage(1); }}
          />
          <button
            type="button"
            disabled={action.running}
            onClick={() => {
              void action.run(
                () => adminFinanceApi.buildSettlements({ confirm: true }),
                t('pm1_settlements.build_success'),
              );
            }}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            {action.running ? t('pm1_settlements.building') : t('pm1_settlements.build_cycle')}
          </button>
        </div>
      )}
    >
      {action.success && (
        <div style={{ marginBottom: 12 }}>
          <AdminCard padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: FT.green, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 13, color: 'var(--text-primary, #1A1209)',
              }}>
                {action.success}
              </span>
            </div>
          </AdminCard>
        </div>
      )}

      {action.error && (
        <p style={{ fontSize: 12.5, margin: '0 0 12px', color: FT.redD }}>
          {action.error}
        </p>
      )}

      <AdminCard>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_settlements.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_settlements.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState
            icon="receipt"
            title={t('pm1_settlements.empty_title')}
            description={t('pm1_settlements.empty_description')}
          />
        )}

        {!loading && !error && lignes.map((lot, index) => (
          <div
            key={lot.reference}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 1.25rem',
              borderBottom: index < lignes.length - 1
                ? `0.5px solid ${FT.border}` : 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, margin: 0,
                color: 'var(--text-primary, #1A1209)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {lot.reference}
              </p>
              <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
                {formatPeriod(lot.period_start, lot.period_end)}
                {/* La liste admin ne porte pas `lines` : seul le detail les
                    expose (AdminBatchDetailSerializer). On n'affiche donc le
                    compte que lorsqu'il est reellement disponible. */}
                {!!lot.lines?.length && t(
                  lot.lines.length > 1
                    ? 'pm1_settlements.lines_count_plural'
                    : 'pm1_settlements.lines_count',
                  { count: lot.lines.length },
                )}
                {/* Un lot hors cycle est une derogation : elle doit se voir. */}
                {lot.is_exceptional && (
                  <span style={{ color: FT.amberD }}>
                    {' '}
                    {t('pm1_settlements.exceptional_label')}
                  </span>
                )}
              </p>
            </div>

            <div style={{ width: 130 }}>
              <StatusBadge
                domain="settlement"
                status={lot.status}
                label={lot.status_label}
                size="sm"
              />
            </div>

            <span style={{ width: 92, textAlign: 'right' }}>
              <Money value={lot.net_amount_xaf} size={15} />
            </span>

            <div style={{ width: 96, textAlign: 'right' }}>
              {lot.status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={action.running}
                  onClick={() => {
                    void action.run(
                      () => adminFinanceApi.confirmSettlement(lot.reference),
                      t('pm1_settlements.confirm_success'),
                    );
                  }}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  {t('pm1_settlements.confirm_button')}
                </button>
              )}
              {lot.status === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={action.running}
                  onClick={() => {
                    void action.run(
                      () => adminFinanceApi.requestPayout(lot.reference),
                      t('pm1_settlements.payout_requested_success'),
                    );
                  }}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  {t('pm1_settlements.request_button')}
                </button>
              )}
            </div>
          </div>
        ))}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            count={data.count}
            onChange={setPage}
            label={t(
              data.count > 1
                ? 'pm1_settlements.pagination_unit_plural'
                : 'pm1_settlements.pagination_unit',
            )}
          />
        )}
      </AdminCard>
    </AdminPageShell>
  );
}