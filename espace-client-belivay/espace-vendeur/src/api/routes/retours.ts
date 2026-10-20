// Connecteurs du domaine « retours » (backend-kit/apps/vendeur_litiges).
import { c, type ConnecteursDe } from './types'

const D = 'Retours'

export const ROUTES_RETOURS: ConnecteursDe<'retours'> = {
  'retours.liste': c(D, 'branche', 'GET /api/vendors/returns?state=', '→ Retour[]', 'a_decider | en_route | clos'),
  'retours.compteurs': c(D, 'branche', 'GET /api/vendors/returns/counts', '→ CompteursRetours'),
  'retours.detail': c(D, 'branche', 'GET /api/vendors/returns/{id}', '→ Retour ; 404 → null', 'couts.livraisonRetour : part de livraison du colis (moteur des frais) ; gele et couts null pour l’accès Préparation'),
  'retours.recevoir': c(D, 'branche', 'POST /api/vendors/returns/{id}/receive (Idempotency-Key)', '→ Resultat<{inspecterAvant}, deja_recu|introuvable>', 'heure réelle de la remise : lance RET-INSPECT-H (Q-72)'),
  'retours.ajouterPhoto': c(D, 'branche', 'POST /api/vendors/returns/{id}/photos {photo} (Idempotency-Key)', '→ Resultat<{piece}, deja_inspecte|introuvable> ; 400 photo_invalide'),
  'retours.retirerPhoto': c(D, 'branche', 'DELETE /api/vendors/returns/{id}/photos/{photoId}', '→ 204'),
  'retours.garderBrouillon': c(D, 'branche', 'PUT /api/vendors/returns/{id}/draft {controles, verdict}', '→ 204'),
  'retours.inspecter': c(D, 'branche', 'POST /api/vendors/returns/{id}/inspection {verdict: conforme|non_conforme, controles} (Idempotency-Key)', '→ Resultat<{}, RefusInspection>', '2 photos au moins (INP-01) ; non conforme : médiation'),
  'retours.proposer': c(D, 'branche', 'POST /api/vendors/returns/{id}/replacement {choix: remplacer|rembourser} (Idempotency-Key)', '→ Resultat<{expedierAvant?}, RefusChoix>', 'propriétaire (raison reserve_proprietaire) ; remplacer réserve une unité du stock'),
  'retours.remplacementPret': c(D, 'branche', 'POST /api/vendors/returns/{id}/replacement/ready (Idempotency-Key)', '→ Resultat<{}, introuvable>'),
}
