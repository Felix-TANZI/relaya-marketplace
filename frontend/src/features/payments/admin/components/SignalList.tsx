// frontend/src/features/payments/admin/components/SignalList.tsx
// Les points d'attention, avec leur action.
//
// ─────────────────────────────────────────────────────────────────────────
// EN PREMIER, TOUJOURS
//
// Un operateur qui ouvre cet ecran le matin veut savoir s'il doit agir. La
// tresorerie vient apres — c'est du contexte, pas une consigne.
//
// Chaque signal porte SON BOUTON. Le backend ecrit deja l'action
// recommandee ; l'interface la rend cliquable.
// ─────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';

import FinancialAlert from '../../shared/FinancialAlert';
import { FT } from '../../shared/tokens';
import type { FinanceSignal } from '../../model/finance.types';

interface SignalListProps {
  signals: FinanceSignal[];
  basePath: string;
}

/**
 * Ou mene chaque signal.
 *
 * Le backend decrit le probleme ; le frontend sait ou on le traite.
 */
const DESTINATIONS: Array<{ motif: RegExp; path: string; label: string }> = [
  { motif: /inconnue?/i, path: '/reconciliation', label: 'Réconcilier' },
  { motif: /approbation/i, path: '/payouts?status=PENDING_APPROVAL',
    label: 'Traiter' },
  { motif: /tache|ordonnanceur/i, path: '/scheduler', label: 'Ordonnanceur' },
  { motif: /ecart|écart/i, path: '/reconciliation', label: 'Voir les écarts' },
  { motif: /invariant|balance/i, path: '/integrity', label: 'Vérifier' },
  { motif: /sequestre|séquestre/i, path: '/escrow', label: 'Séquestres' },
  { motif: /hors cycle/i, path: '/settlements', label: 'Règlements' },
];

export default function SignalList({ signals, basePath }: SignalListProps) {
  const navigate = useNavigate();

  if (signals.length === 0) {
    return (
      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`, borderRadius: 16,
        padding: '1rem 1.25rem', display: 'flex',
        alignItems: 'center', gap: 12,
      }}>
        <span aria-hidden="true" style={{
          width: 7, height: 7, borderRadius: '50%',
          background: FT.green, flexShrink: 0,
        }} />
        <p style={{
          fontSize: 14, margin: 0, color: 'var(--text-primary, #1A1209)',
        }}>
          Aucun point d’attention
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      {signals.map((signal, index) => {
        const destination = DESTINATIONS.find(
          (entree) => entree.motif.test(signal.titre),
        );
        return (
          <div
            key={`${signal.gravite}-${signal.titre}`}
            style={{
              borderBottom: index < signals.length - 1
                ? `0.5px solid ${FT.border}` : 'none',
            }}
          >
            <FinancialAlert
              severity={signal.gravite}
              title={signal.titre}
              detail={signal.detail}
              action={signal.action}
              actionLabel={destination?.label}
              onAction={destination
                ? () => navigate(`${basePath}${destination.path}`)
                : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}