// frontend/src/features/payments/admin/payouts/PayoutDetailPage.tsx
// Le detail d'un versement, avec sa piste d'audit.
//
// ─────────────────────────────────────────────────────────────────────────
// L'HISTORIQUE NOMINATIF EST LE SUJET
//
// Qui a demande, qui a approuve, avec quel commentaire. C'est ce qui rend
// la separation des roles VERIFIABLE apres coup, pas seulement au moment du
// clic.
//
// Sur une issue inconnue, la seule action offerte est d'INTERROGER le
// prestataire — elle ne deplace aucun argent.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import { useAdminPayout } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import ApprovalDialog from '../../shared/ApprovalDialog';
import EmptyState from '../../shared/EmptyState';
import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import TransactionReference from '../../shared/TransactionReference';
import { FT } from '../../shared/tokens';
import { formatDay } from '../../shared/dates';

interface PayoutDetailPageProps {
  basePath?: string;
}

type Dialogue = 'approve' | 'reject' | 'execute' | null;

function Ligne({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', padding: '11px 0',
      borderBottom: `0.5px solid ${FT.border}`,
    }}>
      <span style={{ fontSize: 12.5, color: FT.muted }}>{label}</span>
      <span style={{
        fontSize: 13, color: 'var(--text-primary, #1A1209)',
        textAlign: 'right', maxWidth: '60%',
      }}>
        {value}
      </span>
    </div>
  );
}

export default function PayoutDetailPage({
  basePath = '/admin/finance',
}: PayoutDetailPageProps) {
  const { t } = useTranslation();
  const { reference = '' } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const [dialogue, setDialogue] = useState<Dialogue>(null);

  const { data: versement, loading, error, reload } = useAdminPayout(reference);
  const action = useFinanceAction(() => {
    reload();
    setDialogue(null);
  });

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_payout_detail.loading')}</span>
      </div>
    );
  }

  if (error || !versement) {
    return (
      <EmptyState
        icon="file-off"
        title={t('pm1_payout_detail.not_found_title')}
        description={error ?? undefined}
      />
    );
  }

  const inconnu = versement.status === 'UNKNOWN';
  const aApprouver = versement.status === 'PENDING_APPROVAL';
  const aExecuter = versement.status === 'APPROVED';

  const confirmer = (motif: string) => {
    if (dialogue === 'approve') {
      void action.run(
        () => adminFinanceApi.approvePayout(reference, motif),
        t('pm1_payout_detail.toast_approved'),
      );
    } else if (dialogue === 'reject') {
      void action.run(
        () => adminFinanceApi.rejectPayout(reference, motif),
        t('pm1_payout_detail.toast_rejected'),
      );
    } else if (dialogue === 'execute') {
      void action.run(
        () => adminFinanceApi.executePayout(reference),
        t('pm1_payout_detail.toast_executed'),
      );
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <button
        type="button"
        onClick={() => navigate(`${basePath}/payouts`)}
        style={{ fontSize: 12.5, padding: '6px 12px', marginBottom: '1.25rem' }}
      >
        <i
          className="ti ti-arrow-left"
          aria-hidden="true"
          style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
        />
        {t('pm1_payout_detail.back_to_payouts')}
      </button>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem', borderBottom: `0.5px solid ${FT.border}`,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <TransactionReference value={versement.reference} size={14} />
            <p style={{ fontSize: 12, margin: '3px 0 0', color: FT.muted }}>
              {t('pm1_payout_detail.meta_line', {
                payee: versement.payee.display_label || versement.payee.payee_code,
                requester: versement.requested_by_username,
                date: formatDay(versement.requested_at),
              })}
            </p>
          </div>
          <Money value={versement.amount_xaf} size={22} />
        </div>

        {/* Le guidage du backend, tel quel. */}
        {versement.guidance?.meaning && (
          <div style={{
            padding: '1.25rem', borderBottom: `0.5px solid ${FT.border}`,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              marginTop: 6, background: inconnu ? FT.red : FT.faint,
            }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 13.5, margin: 0,
                color: 'var(--text-primary, #1A1209)',
              }}>
                {versement.guidance.meaning}
              </p>
              {versement.guidance.action && (
                <p style={{
                  fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.6,
                  color: inconnu ? FT.redD : FT.muted,
                }}>
                  {versement.guidance.action}
                </p>
              )}
              {versement.error_message && (
                <p style={{
                  fontSize: 12, margin: '8px 0 0', color: FT.muted,
                }}>
                  {versement.error_message}
                </p>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '0.25rem 1.25rem' }}>
          <Ligne
            label={t('pm1_payout_detail.label_state')}
            value={(
              <StatusBadge
                domain="payout"
                status={versement.status}
                label={versement.status_label}
                guidance={versement.guidance}
                size="sm"
              />
            )}
          />
          <Ligne
            label={t('pm1_payout_detail.label_recipient')}
            value={`${versement.payee_msisdn_masked} · ${
              versement.payee_operator}`}
          />
          <Ligne
            label={t('pm1_payout_detail.label_provider_reference')}
            value={versement.provider_reference || '—'}
          />
          <Ligne
            label={t('pm1_payout_detail.label_external_reference')}
            value={versement.provider_external_reference || '—'}
          />
          <Ligne
            label={t('pm1_payout_detail.label_origin_batch')}
            value={versement.batch_reference || '—'}
          />
          {versement.justification && (
            <Ligne label={t('pm1_payout_detail.label_justification')} value={versement.justification} />
          )}
        </div>

        <div style={{
          padding: '1rem 1.25rem', borderTop: `0.5px solid ${FT.border}`,
          background: 'var(--surface-1, #F5F0E8)',
        }}>
          <p style={{
            fontSize: 11, margin: '0 0 10px', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: FT.faint,
          }}>
            {t('pm1_payout_detail.history_title')}
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
            <span style={{ fontSize: 11.5, color: FT.faint, width: 96 }}>
              {formatDay(versement.requested_at)}
            </span>
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              {t('pm1_payout_detail.history_requested_by', {
                username: versement.requested_by_username,
              })}
            </span>
          </div>
          {versement.approvals.map((approbation) => (
            <div
              key={`${approbation.by}-${approbation.at}`}
              style={{ display: 'flex', gap: 10, marginBottom: 9 }}
            >
              <span style={{ fontSize: 11.5, color: FT.faint, width: 96 }}>
                {formatDay(approbation.at)}
              </span>
              <span style={{ fontSize: 12.5, color: FT.muted }}>
                {t(approbation.comment
                  ? 'pm1_payout_detail.history_approved_by_comment'
                  : 'pm1_payout_detail.history_approved_by', {
                  username: approbation.by,
                  comment: approbation.comment,
                })}
              </span>
            </div>
          ))}
          {versement.executed_at && (
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: FT.faint, width: 96 }}>
                {formatDay(versement.executed_at)}
              </span>
              <span style={{
                fontSize: 12.5, color: inconnu ? FT.redD : FT.muted,
              }}>
                {inconnu
                  ? t('pm1_payout_detail.emission_unknown')
                  : t('pm1_payout_detail.emission_status', {
                    status: versement.status_label.toLowerCase(),
                  })}
              </span>
            </div>
          )}
        </div>
      </div>

      {action.error && (
        <p style={{ fontSize: 12.5, margin: '12px 0 0', color: FT.redD }}>
          {action.error}
        </p>
      )}

      <div style={{
        display: 'flex', gap: 8, marginTop: '1.25rem', flexWrap: 'wrap',
      }}>
        {inconnu && (
          // La SEULE action offerte : elle ne deplace aucun argent.
          <button
            type="button"
            disabled={action.running}
            onClick={() => {
              void action.run(
                () => adminFinanceApi.runReconciliation('unknown_payouts'),
                t('pm1_payout_detail.toast_reconciliation_launched'),
              );
            }}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            {action.running ? t('pm1_payout_detail.running_ellipsis') : t('pm1_payout_detail.query_provider')}
          </button>
        )}
        {aApprouver && (
          <>
            <button
              type="button"
              onClick={() => setDialogue('reject')}
              style={{ fontSize: 12.5, padding: '7px 14px' }}
            >
              {t('pm1_payout_detail.action_reject')}
            </button>
            <button
              type="button"
              onClick={() => setDialogue('approve')}
              style={{
                fontSize: 12.5, padding: '7px 14px',
                borderColor: FT.green, color: FT.greenD,
              }}
            >
              {t('pm1_payout_detail.action_approve')}
            </button>
          </>
        )}
        {aExecuter && (
          <button
            type="button"
            onClick={() => setDialogue('execute')}
            style={{
              fontSize: 12.5, padding: '7px 14px',
              borderColor: FT.coral, color: '#993C1D',
            }}
          >
            {t('pm1_payout_detail.execute_payout_button')}
          </button>
        )}
      </div>

      <ApprovalDialog
        open={dialogue !== null}
        title={t({
          approve: 'pm1_payout_detail.dialog_title_approve',
          reject: 'pm1_payout_detail.dialog_title_reject',
          execute: 'pm1_payout_detail.dialog_title_execute',
        }[dialogue ?? 'approve'])}
        amountXaf={versement.amount_xaf}
        fields={[
          {
            label: t('pm1_payout_detail.label_beneficiary'),
            value: versement.payee.display_label || versement.payee.payee_code,
          },
          {
            label: t('pm1_payout_detail.label_recipient'),
            value: `${versement.payee_msisdn_masked} · ${
              versement.payee_operator}`,
          },
          { label: t('pm1_payout_detail.label_requested_by'), value: versement.requested_by_username },
        ]}
        confirmLabel={t({
          approve: 'pm1_payout_detail.action_approve',
          reject: 'pm1_payout_detail.action_reject',
          execute: 'pm1_payout_detail.action_execute',
        }[dialogue ?? 'approve'])}
        // Rejeter, c'est s'ecarter du cours normal : ca doit s'expliquer.
        reasonRequired={dialogue === 'reject'}
        reasonPlaceholder={dialogue === 'reject'
          ? t('pm1_payout_detail.reason_placeholder_reject')
          : t('pm1_payout_detail.reason_placeholder_default')}
        danger={dialogue === 'reject'}
        warning={dialogue === 'execute'
          ? t('pm1_payout_detail.warning_execute_irreversible')
          : dialogue === 'approve'
            ? t('pm1_payout_detail.warning_approve_self')
            : undefined}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}