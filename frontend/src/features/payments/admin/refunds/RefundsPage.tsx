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
    { key: 'pending', label: 'À approuver', urgent: true },
    { key: 'approved', label: 'À exécuter' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'all', label: 'Tous' },
  ];

  const confirmer = (motif: string) => {
    if (!dialogue) return;
    const reference = dialogue.refund.reference;
    if (dialogue.mode === 'approve') {
      void action.run(
        () => adminFinanceApi.approveRefund(reference),
        'Remboursement approuvé.',
      );
    } else if (dialogue.mode === 'reject') {
      void action.run(
        () => adminFinanceApi.rejectRefund(reference, motif),
        'Remboursement rejeté. Le séquestre reste gelé.',
      );
    } else {
      void action.run(
        () => adminFinanceApi.executeRefund(reference),
        'Remboursement émis vers le payeur.',
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
        Centre financier
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
            Remboursements
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            L’argent retourne toujours vers le numéro qui a payé.
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
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher les remboursements"
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState
            icon="arrow-back-up"
            title={filtre === 'pending'
              ? 'Aucun remboursement en attente'
              : 'Aucun remboursement'}
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
                  {remboursement.reference}
                  {' · '}{formatShortDate(remboursement.created_at)}
                  {' · vers '}{remboursement.payer_msisdn_masked}
                  {' · demandé par '}{remboursement.requested_by_username}
                </p>
              </div>

              <span style={{ width: 88, textAlign: 'right', paddingTop: 2 }}>
                <Money value={remboursement.amount_xaf} size={15} />
              </span>

              <div style={{ width: 100, textAlign: 'right', paddingTop: 2 }}>
                {inconnu ? (
                  <span style={{ fontSize: 11.5, color: FT.redD }}>
                    ne pas rejouer
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
                    Approuver
                  </button>
                ) : aExecuter ? (
                  <button
                    type="button"
                    onClick={() => setDialogue({
                      mode: 'execute', refund: remboursement,
                    })}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    Exécuter
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
          approve: 'Approuver ce remboursement',
          reject: 'Rejeter ce remboursement',
          execute: 'Exécuter ce remboursement',
        }[dialogue?.mode ?? 'approve']}
        amountXaf={dialogue?.refund.amount_xaf ?? 0}
        fields={dialogue ? [
          { label: 'Motif', value: dialogue.refund.reason_label },
          { label: 'Vers', value: dialogue.refund.payer_msisdn_masked },
          { label: 'Demandé par', value: dialogue.refund.requested_by_username },
        ] : []}
        confirmLabel={{
          approve: 'Approuver', reject: 'Rejeter', execute: 'Exécuter',
        }[dialogue?.mode ?? 'approve']}
        reasonRequired={dialogue?.mode === 'reject'}
        reasonPlaceholder={dialogue?.mode === 'reject'
          ? 'Motif du rejet…' : ''}
        danger={dialogue?.mode === 'reject'}
        warning={dialogue?.mode === 'execute'
          ? "L'argent partira vers le numéro qui a payé. Irréversible."
          : dialogue?.mode === 'reject'
            ? 'Le séquestre restera gelé : rejeter ne tranche pas le litige.'
            : 'Le demandeur ne peut pas approuver sa propre demande.'}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}