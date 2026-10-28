// Connecteurs du domaine « incidents » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Incidents'

export const ROUTES_INCIDENTS: ConnecteursDe<'incidents'> = {
  'incidents.liste': c(D, 'branche', 'GET /api/company/incidents?status=', '→ Incident[]', 'types du livreur traduits (genre, famille) ; sécurité d’abord, puis l’échéance ; passé ENT-INCIDENT-DELAI : escalade'),
  'incidents.decider': c(D, 'branche', 'POST /api/company/incidents/{id}/decision {decision, motif} (Idempotency-Key)', '→ Resultat<object, motif|deja_decide|securite>', 'refus motivé (longueur_min_motif_refus) ; décision tardive refusée (l’opérateur de zone décide)'),
  'incidents.transferer': c(D, 'branche', 'POST /api/company/packages/{id}/transfer {versLivreurId} (Idempotency-Key)', '→ Resultat<{transfert}, non_eligible|statut>', 'après ramassage ; garde transférée au dernier scan'),
  'incidents.transferts': c(D, 'branche', 'GET /api/company/transfers', '→ Transfert[]'),
}
