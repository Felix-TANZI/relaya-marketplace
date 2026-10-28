// Connecteurs du domaine « remise » (backend-kit/apps/vendeur_commandes).
import { c, type ConnecteursDe } from './types'

const D = 'Remise'

export const ROUTES_REMISE: ConnecteursDe<'remise'> = {
  'remise.remise': c(D, 'branche', 'GET /api/vendors/orders/{id}/handover', '→ Remise ; 404 → null', 'sans le code ; montants et suite null pour l’accès Préparation'),
  'remise.aRemettre': c(D, 'branche', 'GET /api/vendors/handovers?state=a_remettre', '→ Remise[]'),
  'remise.toutes': c(D, 'branche', 'GET /api/vendors/handovers', '→ Remise[]', 'la plus récente d’abord'),
  'remise.afficherCode': c(D, 'branche', 'GET /api/vendors/orders/{id}/handover-code', '→ Resultat<{code}, pas_prete|bloquee|remise|annulee|introuvable>', 'au toucher seulement ; journalisé (handover_code.viewed)'),
  'remise.nouveauCode': c(D, 'branche', 'POST /api/vendors/orders/{id}/handover-code/renew (Idempotency-Key)', '→ Resultat<{marcheA}, pas_bloquee|introuvable>', 'annule l’ancien code (DP-56, Q-20)'),
  'remise.saisieLivreur': c(D, 'demo', 'application du livreur (handover.completed)', undefined, 'serveur d’essai : vendeur_commandes.services.saisie_livreur(ref, code)'),
  'remise.simuler': c(D, 'demo', 'application du livreur · annulation du client', undefined, 'serveur d’essai : services.livreur_absent(ref) · services.annulation_client(ref)'),
  'remise.recu': c(D, 'branche', 'GET /api/vendors/orders/{id}/receipt', '→ Recu ; 404 → null ; 403 owner_only'),
  'remise.recus': c(D, 'branche', 'GET /api/vendors/receipts', '→ RecuResume[] ; 403 owner_only'),
}
