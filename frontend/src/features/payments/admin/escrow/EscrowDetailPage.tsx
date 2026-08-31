// frontend/src/features/payments/admin/escrow/EscrowDetailPage.tsx
// Le detail d'un sequestre — et ses freres.
//
// ─────────────────────────────────────────────────────────────────────────
// LES FRERES SONT LE SUJET DE CET ECRAN
//
// Geler celui-ci ne gele PAS les autres du meme paiement. C'est ce que la
// cle a quatre dimensions rend possible, et un operateur doit le VOIR :
// sans cette liste, il croirait avoir bloque tout le paiement.
// ─────────────────────────────────────────────────────────────────────────

import { useNavigate, useParams } from 'react-router-dom';

import { useAdminEscrowDetail } from '../../hooks/useFinanceAdmin';
import EmptyState from '../../shared/EmptyState';
import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import TransactionReference from '../../shared/TransactionReference';
import { statusMeta, TONE } from '../../model/status';
import { FT } from '../../shared/tokens';
import { formatDay } from '../../shared/dates';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface EscrowDetailPageProps {
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

export default function EscrowDetailPage({
  basePath = '/admin/finance',
}: EscrowDetailPageProps) {
  const { reference = '' } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { data: hold, loading, error } = useAdminEscrowDetail(reference);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !hold) {
    return (
      <EmptyState
        icon="file-off"
        title="Séquestre introuvable"
        description={error ?? undefined}
      />
    );
  }

  return (
    <AdminPageShell
      title="Séquestre"
      subtitle={hold.reference}
      backTo={`${basePath}/escrow`}
      backLabel="Séquestres"
      maxWidth={760}
    >
      <AdminCard>
        <div style={{
          padding: '1.25rem', borderBottom: `0.5px solid ${FT.border}`,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <TransactionReference value={hold.reference} size={14} />
            <p style={{ fontSize: 12, margin: '3px 0 0', color: FT.muted }}>
              {hold.order_id
                ? `Commande #${hold.order_id}`
                : hold.component_label}
              {' · '}{hold.payee.display_label || hold.payee.payee_code}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Money value={hold.payable_xaf} size={22} />
            <div style={{ marginTop: 5 }}>
              <StatusBadge
                domain="escrow"
                status={hold.status}
                label={hold.status_label}
                guidance={hold.guidance}
                size="sm"
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '0.25rem 1.25rem' }}>
          <Ligne
            label="Paiement"
            value={(
              <button
                type="button"
                onClick={() => navigate(
                  `${basePath}/intents/${hold.intent_reference}`,
                )}
                style={{
                  fontSize: 13, padding: 0, border: 'none',
                  background: 'none', color: '#993C1D',
                }}
              >
                {hold.intent_reference}
              </button>
            )}
          />
          <Ligne label="Montant brut" value={
            <Money value={hold.gross_amount_xaf} size={13} />
          } />
          <Ligne label="Commission" value={
            <Money value={-hold.commission_xaf} size={13} tone="muted" />
          } />
          <Ligne label="Net au partenaire" value={
            <Money value={hold.net_amount_xaf} size={13} />
          } />
          {hold.refunded_amount_xaf > 0 && (
            <Ligne label="Remboursé" value={
              <Money value={-hold.refunded_amount_xaf} size={13} />
            } />
          )}
          <Ligne label="Déclencheur" value={hold.release_trigger} />
          {hold.auto_confirm_at && (
            <Ligne
              label="Auto-confirmation"
              value={formatDay(hold.auto_confirm_at)}
            />
          )}
          {hold.release_at && (
            <Ligne label="Libération" value={formatDay(hold.release_at)} />
          )}
          {hold.frozen_reason && (
            <Ligne
              label="Motif du gel"
              value={<span style={{ color: FT.redD }}>
                {hold.frozen_reason}
              </span>}
            />
          )}
          {hold.settlement_batch_ref && (
            <Ligne label="Lot de règlement" value={hold.settlement_batch_ref} />
          )}
        </div>
      </AdminCard>

      {hold.siblings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <AdminCard title="Autres séquestres du même paiement">
            <div style={{
              padding: '0 1.25rem 10px', borderTop: `0.5px solid ${FT.border}`,
              paddingTop: 12,
            }}>
              <p style={{
                fontSize: 12, margin: 0, lineHeight: 1.6, color: FT.muted,
              }}>
                Geler celui-ci ne gèlera pas ceux-là. Chaque séquestre suit
                son propre parcours.
              </p>
            </div>
            {hold.siblings.map((frere) => {
              const meta = statusMeta('escrow', frere.status);
              return (
                <div
                  key={frere.reference}
                  onClick={() => navigate(
                    `${basePath}/escrow/${frere.reference}`,
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 1.25rem', cursor: 'pointer',
                    borderTop: `0.5px solid ${FT.border}`,
                  }}
                >
                  <span aria-hidden="true" style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: TONE[meta.tone].dot, flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 13,
                    color: 'var(--text-primary, #1A1209)',
                  }}>
                    {frere.order_id
                      ? `Commande #${frere.order_id}`
                      : frere.component}
                    <span style={{ color: FT.faint }}>
                      {' · '}{frere.payee_code}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: FT.muted }}>
                    {meta.label}
                  </span>
                  <Money value={frere.net_amount_xaf} size={13} />
                </div>
              );
            })}
          </AdminCard>
        </div>
      )}
    </AdminPageShell>
  );
}