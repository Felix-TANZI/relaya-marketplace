// frontend/src/features/payments/admin/payouts/PayoutsPage.tsx
// Versements — la file d'approbation.
//
// ─────────────────────────────────────────────────────────────────────────
// L'ECRAN LE PLUS SENSIBLE DU CENTRE
//
// C'est ici que l'argent sort. Trois protections tiennent, et aucune n'est
// dans cette page :
//
//   1. le service refuse qu'un demandeur approuve sa propre demande
//   2. une contrainte en base refuse la meme chose
//   3. `CanApproveMoney` refuse tout appel non habilite
//
// L'interface ne les REMPLACE pas, elle les rend LISIBLES : le montant en
// grand, qui a demande, et l'irreversibilite dite calmement.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminPayouts } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import ApprovalDialog from '../../shared/ApprovalDialog';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import { FT } from '../../shared/tokens';
import { formatXaf } from '../../shared/format';
import type { AdminPayoutRow } from '../../model/finance.types';
import PayoutRow from '../components/PayoutRow';

interface PayoutsPageProps {
  basePath?: string;
}

type Dialogue =
  | { mode: 'approve'; payout: AdminPayoutRow }
  | { mode: 'execute'; payout: AdminPayoutRow }
  | null;

const FILTRES: Record<string, string> = {
  pending: 'PENDING_APPROVAL',
  approved: 'APPROVED',
  incidents: 'UNKNOWN,FAILED',
  all: '',
};

export default function PayoutsPage({
  basePath = '/admin/finance',
}: PayoutsPageProps) {
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

  const { data, loading, error, reload } = useAdminPayouts(requete);
  const action = useFinanceAction(() => {
    reload();
    setDialogue(null);
  });

  const lignes = data?.results ?? [];
  const total = lignes.reduce((somme, ligne) => somme + ligne.amount_xaf, 0);

  const onglets: FilterTab[] = [
    { key: 'pending', label: t('pm1_payouts.tab_pending'), urgent: true },
    { key: 'approved', label: t('pm1_payouts.tab_approved') },
    { key: 'incidents', label: t('pm1_payouts.tab_incidents') },
    { key: 'all', label: t('pm1_payouts.tab_all') },
  ];

  const confirmer = (motif: string) => {
    if (!dialogue) return;
    const reference = dialogue.payout.reference;
    if (dialogue.mode === 'approve') {
      void action.run(
        () => adminFinanceApi.approvePayout(reference, motif),
        t('pm1_payouts.toast_approved'),
      );
    } else {
      void action.run(
        () => adminFinanceApi.executePayout(reference),
        t('pm1_payouts.toast_executed'),
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
        {t('pm1_payouts.back_to_finance_center')}
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
            {t('pm1_payouts.page_title')}
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            {t((data?.count ?? 0) > 1 ? 'pm1_payouts.request_count_plural' : 'pm1_payouts.request_count', {
              count: data?.count ?? 0,
            })}
            {total > 0 && t('pm1_payouts.total_amount_suffix', { amount: formatXaf(total) })}
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
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_payouts.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_payouts.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState
            icon="send"
            title={filtre === 'pending'
              ? t('pm1_payouts.empty_title_pending')
              : t('pm1_payouts.empty_title_all')}
            description={filtre === 'pending'
              ? t('pm1_payouts.empty_description_pending')
              : undefined}
          />
        )}

        {!loading && !error && lignes.map((ligne, index) => (
          <PayoutRow
            key={ligne.reference}
            payout={ligne}
            showBorder={index < lignes.length - 1}
            onOpen={() => navigate(`${basePath}/payouts/${ligne.reference}`)}
            onApprove={() => setDialogue({ mode: 'approve', payout: ligne })}
            onExecute={() => setDialogue({ mode: 'execute', payout: ligne })}
          />
        ))}
      </div>

      <ApprovalDialog
        open={dialogue !== null}
        title={dialogue?.mode === 'execute'
          ? t('pm1_payouts.dialog_title_execute')
          : t('pm1_payouts.dialog_title_approve')}
        amountXaf={dialogue?.payout.amount_xaf ?? 0}
        fields={dialogue ? [
          {
            label: t('pm1_payouts.label_beneficiary'),
            value: dialogue.payout.payee.display_label
              || dialogue.payout.payee.payee_code,
          },
          {
            label: t('pm1_payouts.label_recipient'),
            value: `${dialogue.payout.payee_msisdn_masked} · ${
              dialogue.payout.payee_operator}`,
          },
          { label: t('pm1_payouts.label_reference'), value: dialogue.payout.reference },
        ] : []}
        confirmLabel={dialogue?.mode === 'execute' ? t('pm1_payouts.action_execute') : t('pm1_payouts.action_approve')}
        reasonPlaceholder={t('pm1_payouts.reason_placeholder_default')}
        warning={dialogue?.mode === 'execute'
          ? t('pm1_payouts.warning_execute_irreversible')
          : t('pm1_payouts.warning_approve_self')}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}