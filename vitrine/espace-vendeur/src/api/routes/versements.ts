import { c, type ConnecteursDe } from './types'

const D = 'Versements'

export const ROUTES_VERSEMENTS: ConnecteursDe<'versements'> = {
  'versements.prochain': c(D, 'branche', 'GET /api/vendors/payouts/next', '→ Prochain ; 404 → null ; 403 owner_only', 'versement arrêté en cours (envoyé, refusé, suspendu) sinon celui du vendredi qui vient ; reporté pendant la revue du numéro'),
  'versements.historique': c(D, 'branche', 'GET /api/vendors/payouts?period=', '→ Historique ; 400 invalid ; 403 owner_only', 'period = 3 | 12 | tout'),
  'versements.signalerNonRecu': c(D, 'branche', 'POST /api/vendors/payouts/{id}/incident (Idempotency-Key)', '→ Resultat<{reponseAvant}, inconnu|deja> ; 403 owner_only', 'réponse du support avant le lundi suivant 12 h'),
  'versements.numero': c(D, 'branche', 'GET /api/vendors/payout-number', '→ NumeroVersement ; 403 owner_only', 'préfixes par opérateur lus au registre (VD-PREFIXES-CM, à ajouter ; sinon constante du serveur)'),
  'versements.demanderCodes': c(D, 'branche', 'POST /api/vendors/payout-number/codes {operateur, numero} (Idempotency-Key)', '→ Resultat<{destination, renvoiSecondes}, prefixe|longueur|meme_numero|operateur|trop_tot> ; 400 invalid ; 403 owner_only', 'un code au nouveau numéro, un au téléphone personnel du propriétaire (apps.otp) ; jamais de codeDemo'),
  'versements.renvoyerCode': c(D, 'branche', 'POST /api/vendors/payout-number/codes/resend {quel: nouveau|personnel} (Idempotency-Key)', '→ Resultat<{renvoiSecondes}, trop_tot|expire> ; 403 owner_only'),
  'versements.confirmerNumero': c(D, 'branche', 'PUT /api/vendors/payout-number {codeNouveau, codePersonnel} (Idempotency-Key)', '→ Resultat<{revueJusqua, premierVersement}, code_nouveau|code_personnel|expire|bloque> ; 403 owner_only', 'revue humaine VD-NUM-REVUE ; le numéro devient actuel à la fin de la revue'),
  'versements.annulerSaisie': c(D, 'branche', 'DELETE /api/vendors/payout-number/codes', '→ 204 ; 403 owner_only'),
}
