// Connecteurs du domaine « missions » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Missions'

export const ROUTES_MISSIONS: ConnecteursDe<'missions'> = {
  'missions.liste': c(D, 'branche', 'GET /api/company/missions?tab=', '→ Mission[]', 'a_affecter | affectees | en_cours | deposees | closes | incidents ; marge = heure limite − heure estimée ; montant null pour le répartiteur'),
  'missions.mission': c(D, 'branche', 'GET /api/company/missions/{id}', '→ Mission ; 404 → null', 'MS-… ou PQ-…'),
  'missions.compteurs': c(D, 'branche', 'GET /api/company/missions/counts', '→ Record<OngletMissions, number>'),
  'missions.appeler': c(D, 'branche', 'POST /api/company/missions/{id}/calls {canal} (Idempotency-Key)', '→ Resultat<{appel}, ligne_fermee>', 'ligne masquée BelivaY, jamais le vrai numéro ; métadonnées journalisées'),
  'missions.raccrocher': c(D, 'branche', 'POST /api/company/calls/{id}/hangup', '→ 204'),
  'missions.noterAppel': c(D, 'branche', 'POST /api/company/calls/{id}/note {note}', '→ 204 ; 404', 'ce que l’entreprise retient de l’appel (≤ 500 caractères, vide : retirée), jamais son contenu ; rendue par GET …/calls (note) ; journalisée avec l’appel (call.noted)'),
  'missions.appels': c(D, 'branche', 'GET /api/company/missions/{id}/calls', '→ Appel[]'),
  'missions.relancer': c(D, 'branche', 'POST /api/company/missions/{id}/remind {sujet}', '→ Resultat<{envoyeLe}, trop_tot>', 'notification au livreur, une par sujet et par intervalle'),
}
