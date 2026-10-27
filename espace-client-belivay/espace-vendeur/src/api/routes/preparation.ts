// Connecteurs du domaine « preparation » (backend-kit/apps/vendeur_commandes).
import { c, type ConnecteursDe } from './types'

const D = 'Préparation'

export const ROUTES_PREPARATION: ConnecteursDe<'preparation'> = {
  'preparation.cestPret': c(D, 'branche', 'POST /api/vendors/orders/{id}/ready {a?} (Idempotency-Key)', '→ Resultat<{preteA}, deja_prete|annulee|introuvable> ; 422 action_expiree', 'a : heure d’origine d’une action hors connexion (72 h au plus) ; avance le colis du client, génère le code de remise'),
  'preparation.signalerRupture': c(D, 'branche', 'POST /api/vendors/orders/{id}/stockout {stockAZero} (Idempotency-Key)', '→ Resultat<{}, introuvable|deja_prete>', 'vendeur suivant (au plus 2 tentatives, DP-01), sinon remboursement intégral du colis'),
  'preparation.optionsDelai': c(D, 'branche', 'GET /api/vendors/orders/{id}/extend', '→ OptionsDelai ; 404 → null'),
  'preparation.demanderDelai': c(D, 'branche', 'POST /api/vendors/orders/{id}/extend {choix: +1h|+2h|demain}', '→ Resultat<{echeance}, deja_prolongee|au_dela_de_24h|deja_prete|introuvable>', 'une fois ; le ramassage suit (P-6)'),
  'preparation.bon': c(D, 'branche', 'GET /api/vendors/orders/{id}/slip', '→ BonPreparation ; 404 → null', 'aucune donnée du client, jamais le code'),
  'preparation.ouvrirBon': c(D, 'branche', 'POST /api/vendors/orders/{id}/slip/open', '→ 204 ; 404 not_found', 'journal une fois par membre et par jour'),
  'preparation.cocher': c(D, 'branche', 'POST /api/vendors/orders/{id}/slip/checks {i, fait}', '→ BonPreparation ; 404 → null'),
  'preparation.verifierReference': c(D, 'branche', 'POST /api/vendors/orders/{id}/slip/verify {lu}', '→ Resultat<{bon}, autre_reference|introuvable>', 'SKU scanné ou tapé ; coche « bon modèle »'),
}
