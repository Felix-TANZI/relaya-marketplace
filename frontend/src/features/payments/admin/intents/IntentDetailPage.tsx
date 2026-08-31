// frontend/src/features/payments/admin/intents/IntentDetailPage.tsx
// Le detail d'un paiement : plan de repartition, tentatives, sequestres.

import { useNavigate, useParams } from 'react-router-dom';

import { adminFinanceApi } from '../../api/admin-finance.api';
import { useAdminIntent } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import EmptyState from '../../shared/EmptyState';
import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import TransactionReference from '../../shared/TransactionReference';
import { FT } from '../../shared/tokens';
import { formatDay } from '../../shared/dates';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface IntentDetailPageProps {
  basePath?: string;
}

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
        textAlign: 'right', maxWidth: '62%',
      }}>
        {value}
      </span>
    </div>
  );
}

export default function IntentDetailPage({
  basePath = '/admin/finance',
}: IntentDetailPageProps) {
  const { reference = '' } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { data: intention, loading, error, reload } = useAdminIntent(reference);
  const action = useFinanceAction(reload);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !intention) {
    return (
      <EmptyState
        icon="file-off"
        title="Paiement introuvable"
        description={error ?? undefined}
      />
    );
  }

  const enAttente = ['PROCESSING', 'REQUIRES_ACTION'].includes(
    intention.status,
  );

  return (
    <AdminPageShell
      title="Paiement"
      subtitle={intention.reference}
      backTo={`${basePath}/intents`}
      backLabel="Paiements"
      maxWidth={760}
      actions={enAttente ? (
        <button
          type="button"
          disabled={action.running}
          onClick={() => {
            void action.run(
              () => adminFinanceApi.pollIntent(reference),
              'Prestataire interrogé.',
            );
          }}
          style={{ fontSize: 12.5, padding: '7px 14px' }}
        >
          {action.running ? 'Interrogation…' : 'Interroger le prestataire'}
        </button>
      ) : undefined}
    >
      <AdminCard>
        <div style={{
          padding: '1.25rem', borderBottom: `0.5px solid ${FT.border}`,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <TransactionReference value={intention.reference} size={14} />
            <p style={{ fontSize: 12, margin: '3px 0 0', color: FT.muted }}>
              {formatDay(intention.created_at)} · {intention.buyer_username}
            </p>
          </div>
          <Money value={intention.amount_xaf} size={22} />
        </div>

        <div style={{ padding: '0.25rem 1.25rem' }}>
          <Ligne label="État" value={intention.status_label} />
          <Ligne
            label="Payeur"
            value={`${intention.payer_msisdn_masked} · ${
              intention.payer_operator}`}
          />
          {/* En diaspora, un payeur tiers est le cas NOMINAL. */}
          {intention.payer_relationship && (
            <Ligne
              label="Relation payeur"
              value={intention.payer_relationship === 'SELF'
                ? "l'acheteur lui-même"
                : 'un tiers'}
            />
          )}
          <Ligne
            label="Commandes"
            value={intention.orders.length > 0
              ? intention.orders.map((id) => `#${id}`).join(', ')
              : '—'}
          />
          {intention.risk_score > 0 && (
            <Ligne label="Score de risque" value={intention.risk_score} />
          )}
          {intention.needs_reallocation && (
            <Ligne
              label="Réallocation due"
              value={(
                <span style={{ color: FT.amberD }}>
                  une part attend son bénéficiaire réel
                </span>
              )}
            />
          )}
          {intention.failure_reason && (
            <Ligne
              label="Motif d'échec"
              value={<span style={{ color: FT.redD }}>
                {intention.failure_reason}
              </span>}
            />
          )}
        </div>
      </AdminCard>

      {intention.escrow_holds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <AdminCard title="Séquestres">
            {intention.escrow_holds.map((hold, index) => (
              <div
                key={hold.reference}
                onClick={() => navigate(`${basePath}/escrow/${hold.reference}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 1.25rem', cursor: 'pointer',
                  borderTop: `0.5px solid ${FT.border}`,
                  borderBottom: index === intention.escrow_holds.length - 1
                    ? 'none' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, margin: 0,
                    color: 'var(--text-primary, #1A1209)',
                  }}>
                    {hold.order_id
                      ? `Commande #${hold.order_id}`
                      : hold.component_label}
                    <span style={{ color: FT.faint }}>
                      {' · '}{hold.payee.display_label || hold.payee.payee_code}
                    </span>
                  </p>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge
                      domain="escrow"
                      status={hold.status}
                      label={hold.status_label}
                      guidance={hold.guidance}
                      size="sm"
                    />
                  </div>
                </div>
                <Money value={hold.payable_xaf} size={14} />
              </div>
            ))}
          </AdminCard>
        </div>
      )}

      {intention.attempts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <AdminCard title="Tentatives">
            {intention.attempts.map((tentative) => (
              <div
                key={tentative.external_reference}
                style={{
                  padding: '12px 1.25rem',
                  borderTop: `0.5px solid ${FT.border}`,
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', gap: 12,
                }}>
                  <span style={{
                    fontSize: 12.5, color: 'var(--text-primary, #1A1209)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {tentative.external_reference}
                  </span>
                  <span style={{ fontSize: 12, color: FT.muted }}>
                    {tentative.status_label}
                  </span>
                </div>
                {tentative.error_code && (
                  <p style={{
                    fontSize: 11.5, margin: '4px 0 0', color: FT.redD,
                  }}>
                    {tentative.error_code}
                  </p>
                )}
                <p style={{ fontSize: 11.5, margin: '3px 0 0', color: FT.faint }}>
                  {formatDay(tentative.created_at)}
                </p>
              </div>
            ))}
          </AdminCard>
        </div>
      )}
    </AdminPageShell>
  );
}