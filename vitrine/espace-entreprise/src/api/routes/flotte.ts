// Connecteurs du domaine « flotte » (backend-kit/apps/entreprise_flotte). Application du livreur :
// flotte.invitation_par_jeton, flotte.ouvrir_invitation, flotte.activer_si_pret ; console : flotte.mettre_en_liste_noire.
import { c, type ConnecteursDe } from './types'

const D = 'Flotte'

export const ROUTES_FLOTTE: ConnecteursDe<'flotte'> = {
  'flotte.resume': c(D, 'branche', 'GET /api/company/fleet', '→ ResumeFlotte'),
  'flotte.invitations': c(D, 'branche', 'GET /api/company/courier-invitations', '→ Invitation[]', 'suivi lu sur le livreur créé (charte, pièces, certification, approbation) ; activées et abandonnées sorties du suivi'),
  'flotte.inviter': c(D, 'branche', 'POST /api/company/courier-invitations {nom, telephone, details?} (Idempotency-Key)', '→ Resultat<{invitation}, telephone|doublon|nom|autre_entreprise|refuse|zones|capacite|plaque> ; 403 role_forbidden', 'SMS avec lien, valable expiration_invitation_livreur jours tant qu’il n’est pas ouvert ; liste noire : refus générique, console alertée'),
  'flotte.renvoyer': c(D, 'branche', 'POST /api/company/courier-invitations/{id}/resend', '→ Resultat<{invitation}, statut|trop_tot>', 'après delai_renvoi_code_sms ; pièce refusée : le livreur est invité à la renvoyer'),
  'flotte.abandonner': c(D, 'branche', 'POST /api/company/courier-invitations/{id}/cancel', '→ Resultat<object, statut>'),
  'flotte.approuver': c(D, 'branche', 'POST /api/company/courier-invitations/{id}/approve', '→ Resultat<{livreurId}, pas_pret>', 'charte, pièces vérifiées par BelivaY et certification d’abord ; l’accès s’active aussitôt'),
}
