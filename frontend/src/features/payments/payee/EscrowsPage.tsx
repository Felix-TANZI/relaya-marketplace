// frontend/src/features/payments/payee/EscrowsPage.tsx
// Mes fonds en attente.
//
// ─────────────────────────────────────────────────────────────────────────
// LE TITRE COMPTE AUTANT QUE LE CONTENU
//
// « Mes séquestres » est un mot de juriste. Un vendeur veut savoir quel
// argent l'attend et quand — d'ou « Mes fonds en attente », et un
// sous-titre qui explique le principe en une phrase.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';

import { usePartnerEscrow } from '../hooks/usePartnerEscrow';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import EscrowCard from './components/EscrowCard';

const ACTIFS = ['HELD', 'RELEASE_SCHEDULED', 'FROZEN'];

export default function EscrowsPage() {
  const { data, loading, error } = usePartnerEscrow();

  const { actifs, total, geles } = useMemo(() => {
    const tous = data ?? [];
    const vivants = tous.filter((h) => ACTIFS.includes(h.status));
    return {
      actifs: vivants,
      total: vivants.reduce((somme, h) => somme + h.payable_xaf, 0),
      geles: vivants.filter((h) => h.status === 'FROZEN').length,
    };
  }, [data]);

  return (
    <div style={{ maxWidth: 880 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        Mes fonds en attente
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        BelivaY conserve ces montants jusqu’à la confirmation de chaque
        commande.
      </p>

      {!loading && !error && actifs.length > 0 && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          padding: '1.25rem', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{
              fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: FT.faint,
            }}>
              Total en attente
            </p>
            <Money value={total} size={28} showCurrency />
          </div>
          <p style={{ fontSize: 12.5, margin: 0, color: FT.muted }}>
            {actifs.length} commande{actifs.length > 1 ? 's' : ''}
            {geles > 0 && (
              <span style={{ color: FT.redD }}>
                {' · '}{geles} en litige
              </span>
            )}
          </p>
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
            title="Impossible d'afficher vos fonds"
            description={error}
          />
        )}

        {!loading && !error && actifs.length === 0 && (
          <EmptyState
            icon="wallet"
            title="Aucun fonds en attente"
            description={
              'Les montants de vos prochaines commandes apparaîtront ici '
              + 'dès leur paiement.'
            }
          />
        )}

        {!loading && !error && actifs.map((hold, index) => (
          <EscrowCard
            key={hold.reference}
            hold={hold}
            showBorder={index < actifs.length - 1}
          />
        ))}
      </div>
    </div>
  );
}