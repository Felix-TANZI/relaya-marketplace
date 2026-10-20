// frontend/src/features/payments/admin/refunds/RefundsPage.tsx
// Remboursements — approbation et execution.
//
// ─────────────────────────────────────────────────────────────────────────
// LE GARDE-FOU CONTRE LA FRAUDE PAR LITIGE
//
// Un litige tranche cree une demande, il ne fait PAS sortir l'argent. Sans
// cette barriere, ouvrir un litige, le faire trancher et encaisser
// suffirait.
//
// Comme pour les versements : le demandeur ne peut pas approuver. Ici le
// demandeur est souvent `belivay-system`, un compte technique INACTIF —
// donc structurellement incapable d'approuver.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminRefunds } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import ApprovalDialog from '../../shared/ApprovalDialog';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import type { AdminRefundRow } from '../../model/finance.types';

interface AdminRefundsPageProps {
  basePath?: string;
}

type Dialogue =
  | { mode: 'approve' | 'reject' | 'execute'; refund: AdminRefundRow }
  | null;

const FILTRES: Record<string, string> = {
  pending: 'PENDING_APPROVAL',
  approved: 'APPROVED',
  incidents: 'UNKNOWN,FAILED',
  all: '',
};

export default function AdminRefundsPage({
  basePath = '/admin/finance',
}: AdminRefundsPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtre = params.get('filter') ?? 'pending';
  const [dialogue, setDialogue] = useState<Dialogue>(null);

  const requete = useMemo<ListParams>(() => {
    // Le client HTTP n'accepte pas `undefined` : on OMET la cle plutot que
    // de lui donner une valeur vide, sinon l'URL porterait
    // `?status=undefined`.
    const statut = FILTRES[filtre] ?? '';
    const params: ListParams = {};
    if (statut) params.status = statut;
    return params;
  }, [filtre]);

  const { data, loading, error, reload } = useAdminRefunds(requete);
  const action = useFinanceAction(() => {
    reload();
    setDialogue(null);
  });

  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'pending', label: t('pm1_refunds.tab_pending'), urgent: true },
    { key: 'approved', label: t('pm1_refunds.tab_approved') },
    { key: 'incidents', label: t('pm1_refunds.tab_incidents') },
    { key: 'all', label: t('pm1_refunds.tab_all') },
  ];

  const confirmer = (motif: string) => {
    if (!dialogue) return;
    const reference = dialogue.refund.reference;
    if (dialogue.mode === 'approve') {
      void action.run(
        () => adminFinanceApi.approveRefund(reference),
        t('pm1_refunds.toast_approved'),
      );
    } else if (dialogue.mode === 'reject') {
      void action.run(
        () => adminFinanceApi.rejectRefund(reference, motif),
        t('pm1_refunds.toast_rejected'),
      );
    } else {
      void action.run(
        () => adminFinanceApi.executeRefund(reference),
        t('pm1_refunds.toast_executed'),
      );
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <button
        type="button"
        onClick={() => navigate(basePath)}
        style={{ fontSize: 12.5, padding: '6px 12px', marginBottom: 10 }}
      >
        <i
          className="ti ti-arrow-left"
          aria-hidden="true"
          style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
        />
        {t('pm1_refunds.back_label')}
      </button>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: '1rem',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 19, margin: 0, color: 'var(--text-primary, #1A1209)',
          }}>
            {t('pm1_refunds.title')}
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            {t('pm1_refunds.subtitle')}
          </p>
        </div>
        <FilterTabs
          tabs={onglets}
          active={filtre}
          onChange={(cle) => setParams({ filter: cle })}
        />
      </div>

      {action.success && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          padding: '0.9rem 1.25rem', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span aria-hidden="true" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: FT.green, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary, #1A1209)' }}>
            {action.success}
          </span>
        </div>
      )}

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_refunds.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_refunds.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState
            icon="arrow-back-up"
            title={filtre === 'pending'
              ? t('pm1_refunds.empty_pending')
              : t('pm1_refunds.empty_all')}
          />
        )}

        {!loading && !error && lignes.map((remboursement, index) => {
          const inconnu = remboursement.status === 'UNKNOWN';
          const aApprouver = remboursement.status === 'PENDING_APPROVAL';
          const aExecuter = remboursement.status === 'APPROVED';

          return (
            <div
              key={remboursement.reference}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < lignes.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {remboursement.reason_label}
                  {remboursement.detail && ` — ${remboursement.detail}`}
                </p>
                <div style={{ marginTop: 5 }}>
                  <StatusBadge
                    domain="refund"
                    status={remboursement.status}
                    label={remboursement.status_label}
                    guidance={remboursement.guidance}
                    size="sm"
                  />
                </div>
                <p style={{ fontSize: 11.5, margin: '5px 0 0', color: FT.faint }}>
                  {t('pm1_refunds.meta_line', {
                    reference: remboursement.reference,
                    date: formatShortDate(remboursement.created_at),
                    payer: remboursement.payer_msisdn_masked,
                    requester: remboursement.requested_by_username,
                  })}
                </p>
              </div>

              <span style={{ width: 88, textAlign: 'right', paddingTop: 2 }}>
                <Money value={remboursement.amount_xaf} size={15} />
              </span>

              <div style={{ width: 100, textAlign: 'right', paddingTop: 2 }}>
                {inconnu ? (
                  <span style={{ fontSize: 11.5, color: FT.redD }}>
                    {t('pm1_refunds.do_not_retry')}
                  </span>
                ) : aApprouver ? (
                  <button
                    type="button"
                    onClick={() => setDialogue({
                      mode: 'approve', refund: remboursement,
                    })}
                    style={{
                      fontSize: 12, padding: '5px 12px',
                      borderColor: FT.green, color: FT.greenD,
                    }}
                  >
                    {t('pm1_refunds.approve')}
                  </button>
                ) : aExecuter ? (
                  <button
                    type="button"
                    onClick={() => setDialogue({
                      mode: 'execute', refund: remboursement,
                    })}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    {t('pm1_refunds.execute')}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <ApprovalDialog
        open={dialogue !== null}
        title={{
          approve: t('pm1_refunds.dialog_title_approve'),
          reject: t('pm1_refunds.dialog_title_reject'),
          execute: t('pm1_refunds.dialog_title_execute'),
        }[dialogue?.mode ?? 'approve']}
        amountXaf={dialogue?.refund.amount_xaf ?? 0}
        fields={dialogue ? [
          { label: t('pm1_refunds.field_reason'), value: dialogue.refund.reason_label },
          { label: t('pm1_refunds.field_to'), value: dialogue.refund.payer_msisdn_masked },
          { label: t('pm1_refunds.field_requested_by'), value: dialogue.refund.requested_by_username },
        ] : []}
        confirmLabel={{
          approve: t('pm1_refunds.approve'),
          reject: t('pm1_refunds.reject'),
          execute: t('pm1_refunds.execute'),
        }[dialogue?.mode ?? 'approve']}
        reasonRequired={dialogue?.mode === 'reject'}
        reasonPlaceholder={dialogue?.mode === 'reject'
          ? t('pm1_refunds.reject_reason_placeholder') : ''}
        danger={dialogue?.mode === 'reject'}
        warning={dialogue?.mode === 'execute'
          ? t('pm1_refunds.warning_execute')
          : dialogue?.mode === 'reject'
            ? t('pm1_refunds.warning_reject')
            : t('pm1_refunds.warning_approve')}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}