// frontend/src/features/payments/embeds/OrderProtectionPanel.tsx
// La promesse de BelivaY, dans le detail d'une commande.
//
// ─────────────────────────────────────────────────────────────────────────
// LE SEUL ECRAN ACHETEUR QUI COMPTE VRAIMENT
//
// Les autres sont consultatifs. Celui-ci se lit au moment ou l'acheteur se
// demande « et si le produit n'arrive pas ? ». Il repond en une phrase,
// montre ou en est son argent, et met le bouton d'action la ou il regarde.
//
// IL S'INSERE dans une page existante — d'ou le dossier `embeds/`, qui rend
// la frontiere avec l'existant explicite.
//
// SILENCIEUX PAR DEFAUT : une commande anterieure au module financier n'a
// aucun sequestre. Afficher une erreur sur une vieille commande serait
// inquietant sans raison — le composant ne rend simplement rien.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';

import { useOrderProtection } from '../hooks/useOrderProtection';
import FinancialTimeline from '../shared/FinancialTimeline';
import type { TimelineStep } from '../shared/FinancialTimeline';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import { formatShortDate, relativeDays } from '../shared/dates';
import type { BuyerEscrowHold } from '../model/escrow.types';

interface OrderProtectionPanelProps {
  orderId: number;
  /** Statut logistique de la commande, pour situer l'etape « livre ». */
  fulfillmentStatus?: string;
  onConfirmReceipt?: () => void;
  onOpenDispute?: () => void;
}

const LIVRE = [
  'DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR',
];

function etapes(
  hold: BuyerEscrowHold, fulfillmentStatus?: string,
): TimelineStep[] {
  const livre = LIVRE.includes(fulfillmentStatus ?? '')
    || hold.status === 'RELEASE_SCHEDULED'
    || hold.status === 'RELEASED';
  const libere = hold.status === 'RELEASED';
  const aConfirmer = livre && !libere;

  return [
    { label: 'Payé', done: true },
    { label: 'Livré', done: livre },
    { label: 'À vous de confirmer', done: libere, current: aConfirmer },
    { label: 'Vendeur payé', done: libere },
  ];
}

export default function OrderProtectionPanel({
  orderId, fulfillmentStatus, onConfirmReceipt, onOpenDispute,
}: OrderProtectionPanelProps) {
  const { data, loading } = useOrderProtection(orderId);

  const marchandise = useMemo(
    () => (data ?? []).find((hold) => hold.component === 'GOODS') ?? null,
    [data],
  );

  // Silence total tant qu'on ne sait rien, et sur les commandes sans
  // sequestre.
  if (loading || !marchandise) return null;

  const gele = marchandise.status === 'FROZEN';
  const protege = marchandise.protection.funds_protected;

  if (!protege && !gele) {
    // Sequestre solde : la commande est close, le panneau n'a plus rien a
    // dire.
    return null;
  }

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.5rem',
    }}>
      {gele ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            flex: 1, minWidth: 240,
          }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: FT.red, flexShrink: 0, marginTop: 6,
            }} />
            <div>
              <p style={{
                fontSize: 14, margin: '0 0 4px',
                color: 'var(--text-primary, #1A1209)',
              }}>
                Votre argent reste bloqué
              </p>
              {/* Le fil disparait : il n'a plus de sens quand le parcours
                  est suspendu. */}
              <p style={{
                fontSize: 12.5, margin: 0, lineHeight: 1.55, color: FT.muted,
              }}>
                Tant que votre litige n’est pas tranché, BelivaY ne verse
                rien au vendeur.
              </p>
              {marchandise.status === 'FROZEN' && (
                <p style={{
                  fontSize: 12.5, margin: '10px 0 0', color: FT.muted,
                }}>
                  {marchandise.protection.message}
                </p>
              )}
            </div>
          </div>
          <Money value={marchandise.gross_amount_xaf} size={24} showCurrency />
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '1.5rem',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{
                fontSize: 14, margin: '0 0 4px',
                color: 'var(--text-primary, #1A1209)',
              }}>
                Votre argent est conservé par BelivaY
              </p>
              <p style={{ fontSize: 12.5, margin: 0, color: FT.muted }}>
                Il ne sera versé au vendeur qu’après votre confirmation.
              </p>
            </div>
            <Money value={marchandise.gross_amount_xaf} size={24} showCurrency />
          </div>

          <FinancialTimeline steps={etapes(marchandise, fulfillmentStatus)} />

          <div style={{
            borderTop: `0.5px solid ${FT.border}`, paddingTop: '1rem',
            marginTop: '1.25rem', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            gap: 16, flexWrap: 'wrap',
          }}>
            {marchandise.auto_confirm_at && (
              // On l'ecrit en clair : cacher une echeance qui joue en
              // faveur du vendeur serait deloyal.
              <p style={{
                fontSize: 12.5, margin: 0, flex: 1, minWidth: 210,
                lineHeight: 1.55, color: FT.muted,
              }}>
                Sans action de votre part, la commande sera confirmée
                automatiquement le{' '}
                <span style={{ color: 'var(--text-primary, #1A1209)' }}>
                  {formatShortDate(marchandise.auto_confirm_at)}
                </span>
                {' — '}{relativeDays(marchandise.auto_confirm_at)}.
              </p>
            )}

            {(onOpenDispute || onConfirmReceipt) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {onOpenDispute && (
                  <button
                    type="button"
                    onClick={onOpenDispute}
                    style={{ fontSize: 12.5, padding: '7px 14px' }}
                  >
                    Signaler un problème
                  </button>
                )}
                {onConfirmReceipt && (
                  <button
                    type="button"
                    onClick={onConfirmReceipt}
                    style={{
                      fontSize: 12.5, padding: '7px 14px',
                      borderColor: FT.coral, color: '#993C1D',
                    }}
                  >
                    J’ai bien reçu
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}