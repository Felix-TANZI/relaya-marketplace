// Connecteurs du domaine « affectation » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Affectation'

export const ROUTES_AFFECTATION: ConnecteursDe<'affectation'> = {
  'affectation.eligibles': c(D, 'branche', 'GET /api/company/packages/{id}/eligible-couriers', '→ Eligibilite ; 404', 'raisons de non-éligibilité (zone, véhicule, certification, suspendu, activation, en mission ; DP-67 : preavis à partir du dernier jour du préavis de départ, photo quand la nouvelle photo n’est pas validée dans PHOTO-REVERIF-J) ; distance depuis la dernière position connue ; kit manquant ; une distance inconnue jamais devant ; missionsDuJour (charge du jour) et certifieJusqua de chaque éligible ; suggere : affectation suggérée (Trust Score, charge, distance, zone ; BelivaY propose, l’entreprise affecte)'),
  'affectation.affecter': c(D, 'branche', 'POST /api/company/packages/{id}/assign {livreurId} (Idempotency-Key)', '→ Resultat<{creneau}, non_eligible|conflit|deja_ramasse>', 'affecter ou réaffecter avant le premier code de remise ; créneau annoncé au vendeur ; 422 COURIER_NOT_ELIGIBLE aussi pour preavis et photo (DP-67)'),
}
