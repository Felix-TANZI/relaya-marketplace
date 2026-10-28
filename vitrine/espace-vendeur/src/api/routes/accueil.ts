import { c, type ConnecteursDe } from './types'

const D = 'Accueil'

export const ROUTES_ACCUEIL: ConnecteursDe<'accueil'> = {
  'accueil.aujourdhui': c(D, 'branche', 'GET /api/vendors/seller/today', '→ Aujourdhui', 'préparer, puis litiges, puis retours, chacun par échéance ; alerte avant un seuil (paliers.alerte_de_seuil) propriétaire seulement ; montants null pour l’accès Préparation'),
  'accueil.masquerAlerte': c(D, 'branche', 'POST /api/vendors/seller/today/hide-alert', '→ 204', 'une fois par seuil et par semaine (alerte_a_envoyer)'),
  'accueil.calme': c(D, 'branche', 'GET /api/vendors/seller/calm', '→ Calme', 'argent null pour l’accès Préparation ; idée du jour lue dans vendeur_croissance'),
  'accueil.premierJour': c(D, 'branche', 'GET /api/vendors/seller/onboarding', '→ PremierJour', 'palier de lancement (paliers.palier_de_lancement) ; offre de découverte'),
  'accueil.suspension': c(D, 'branche', 'GET /api/vendors/seller/suspension?example=', '→ Suspension ; 404 → null', 'lue dans vendeur_croissance ; example=1 sur une boutique non suspendue : exemple marqué exemple: true (valeurs du registre)'),
  'accueil.file': c(D, 'branche', 'GET /api/vendors/offline-queue', '→ FileHorsLigne', 'une action de plus de 72 h est « expiree »'),
  'accueil.noterReseau': c(D, 'branche', 'PUT /api/vendors/offline-queue/network {horsLigneDepuis}', '→ 204'),
  'accueil.mettreEnFile': c(D, 'branche', 'POST /api/vendors/offline-queue {type, objet, detail?, origine?, lieu?} (Idempotency-Key)', '→ ActionEnFile ; 400 invalid', 'origine : heure d’origine du geste (ms), jamais dans le futur'),
  'accueil.envoyerFile': c(D, 'branche', 'POST /api/vendors/offline-queue/send (Idempotency-Key)', '→ FileHorsLigne.dernierEnvoi', 'rejouée dans l’ordre : « C’est prêt » par vendeur_commandes, stock, masquer, fermer, rouvrir ; refus notifié avec son motif'),
  'accueil.retirer': c(D, 'branche', 'DELETE /api/vendors/offline-queue/{id}', '→ 204 ; 404 not_found'),
}
