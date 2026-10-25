// Connecteurs du domaine « messages » (backend-kit/apps/vendeur_boutique ; conversations du kit client apps.messaging).
import { c, type ConnecteursDe } from './types'

const D = 'Messages'

export const ROUTES_MESSAGES: ConnecteursDe<'messages'> = {
  'messages.fils': c(D, 'branche', 'GET /api/vendors/threads', '→ Fil[]', 'questions des clients rattachées à la commande ; « Client de BLV-… », jamais le client'),
  'messages.fil': c(D, 'branche', 'GET /api/vendors/threads/{id}', '→ {fil, messages} ; 404 → null'),
  'messages.envoyer': c(D, 'branche', 'POST /api/vendors/threads/{id}/messages {texte} (Idempotency-Key)', '→ Message ; 409 ferme ; 400 vide ; 404 not_found', 'filtré avant l’enregistrement (CMS-04), signé par le membre ; le client lit « Le vendeur »'),
  'messages.lire': c(D, 'branche', 'POST /api/vendors/threads/{id}/read', '→ 204 ; 404 not_found'),
  'messages.filtrer': c(D, 'appareil', '— (sur l’appareil, avant l’envoi)', '→ {propre, filtre}', 'même règle que apps.client_core.masquage.nettoyer_message, que le serveur applique à l’enregistrement (src/api/domaines/messages.ts)'),
  'messages.ecrireAuSupport': c(D, 'branche', 'POST /api/vendors/threads/support {texte, ref?} (Idempotency-Key)', '→ {fil} ; 400 vide', 'accusé de réception du support (Q-47)'),
  'messages.reponsesRapides': c(D, 'branche', 'GET /api/vendors/quick-replies?type=', '→ string[]'),
  'messages.ouvrirFil': c(D, 'branche', 'POST /api/vendors/threads {order_id}', '→ {fil} ; 404 → null', 'conversation de la commande (question du client sur ce produit), créée au besoin (REP-03)'),
}
