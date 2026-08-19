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
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !versement) {
    return (
      <EmptyState
        icon="file-off"
        title="Versement introuvable"
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
        'Versement approuvé.',
      );
    } else if (dialogue === 'reject') {
      void action.run(
        () => adminFinanceApi.rejectPayout(reference, motif),
        'Versement rejeté.',
      );
    } else if (dialogue === 'execute') {
      void action.run(
        () => adminFinanceApi.executePayout(reference),
        'Versement émis.',
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
        Versements
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
              {versement.payee.display_label || versement.payee.payee_code}
              {' · demandé par '}{versement.requested_by_username}
              {' le '}{formatDay(versement.requested_at)}
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
            label="État"
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
            label="Destinataire"
            value={`${versement.payee_msisdn_masked} · ${
              versement.payee_operator}`}
          />
          <Ligne
            label="Référence prestataire"
            value={versement.provider_reference || '—'}
          />
          <Ligne
            label="Référence externe émise"
            value={versement.provider_external_reference || '—'}
          />
          <Ligne
            label="Lot d'origine"
            value={versement.batch_reference || '—'}
          />
          {versement.justification && (
            <Ligne label="Justification" value={versement.justification} />
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
            Historique
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
            <span style={{ fontSize: 11.5, color: FT.faint, width: 96 }}>
              {formatDay(versement.requested_at)}
            </span>
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              Demandé par {versement.requested_by_username}
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
                Approuvé par {approbation.by}
                {approbation.comment && ` — « ${approbation.comment} »`}
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
                  ? 'Émission — délai dépassé, issue inconnue'
                  : `Émission — ${versement.status_label.toLowerCase()}`}
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
                'Réconciliation lancée.',
              );
            }}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            {action.running ? 'En cours…' : 'Interroger le prestataire'}
          </button>
        )}
        {aApprouver && (
          <>
            <button
              type="button"
              onClick={() => setDialogue('reject')}
              style={{ fontSize: 12.5, padding: '7px 14px' }}
            >
              Rejeter
            </button>
            <button
              type="button"
              onClick={() => setDialogue('approve')}
              style={{
                fontSize: 12.5, padding: '7px 14px',
                borderColor: FT.green, color: FT.greenD,
              }}
            >
              Approuver
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
            Exécuter le versement
          </button>
        )}
      </div>

      <ApprovalDialog
        open={dialogue !== null}
        title={{
          approve: 'Approuver ce versement',
          reject: 'Rejeter ce versement',
          execute: 'Exécuter ce versement',
        }[dialogue ?? 'approve']}
        amountXaf={versement.amount_xaf}
        fields={[
          {
            label: 'Bénéficiaire',
            value: versement.payee.display_label || versement.payee.payee_code,
          },
          {
            label: 'Destinataire',
            value: `${versement.payee_msisdn_masked} · ${
              versement.payee_operator}`,
          },
          { label: 'Demandé par', value: versement.requested_by_username },
        ]}
        confirmLabel={{
          approve: 'Approuver', reject: 'Rejeter', execute: 'Exécuter',
        }[dialogue ?? 'approve']}
        // Rejeter, c'est s'ecarter du cours normal : ca doit s'expliquer.
        reasonRequired={dialogue === 'reject'}
        reasonPlaceholder={dialogue === 'reject'
          ? 'Motif du rejet…'
          : 'Vérifié : relevé conforme au lot.'}
        danger={dialogue === 'reject'}
        warning={dialogue === 'execute'
          ? 'Une fois émis, ce versement ne peut pas être annulé.'
          : dialogue === 'approve'
            ? 'Le demandeur ne peut pas approuver sa propre demande.'
            : undefined}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}