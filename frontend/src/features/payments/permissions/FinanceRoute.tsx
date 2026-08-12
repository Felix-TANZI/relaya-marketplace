// frontend/src/features/payments/permissions/FinanceRoute.tsx
// Garde de l'espace financier.
//
// ─────────────────────────────────────────────────────────────────────────
// CE GARDE N'EST PAS UN CONTROLE D'ACCES
//
// La verite est cote SERVEUR : `IsFinanceStaff` refuse toute route non
// habilitee, et aucun appel ne passe sans le groupe `finance`.
//
// Ce composant evite seulement d'afficher un ecran qui se remplirait
// d'erreurs 403. Masquer un lien est de la courtoisie, pas de la securite —
// et il ne faut jamais confondre les deux.
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

import { useIsFinanceStaff } from '../hooks/useIsFinanceStaff';
import EmptyState from '../shared/EmptyState';

interface FinanceRouteProps {
  children: ReactNode;
}

export default function FinanceRoute({ children }: FinanceRouteProps) {
  const { allowed, loading } = useIsFinanceStaff();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted, #B4B2A9)' }}>
          Vérification des habilitations…
        </span>
      </div>
    );
  }

  if (!allowed) {
    return (
      <EmptyState
        icon="lock"
        title="Espace réservé"
        description={
          "L'espace financier est réservé aux membres habilités. "
          + 'Demandez votre rattachement au groupe « finance ».'
        }
      />
    );
  }

  return <>{children}</>;
}