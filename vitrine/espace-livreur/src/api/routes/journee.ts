// Connecteurs du domaine « journee » (backend-kit/apps/livreur_journee) : contrôle de clôture, clôture, stockage.
import { c, type ConnecteursDe } from './types'

const D = 'Journée'

export const ROUTES_JOURNEE: ConnecteursDe<'journee'> = {
  'journee.controle': c(D, 'branche', 'GET /api/courier/day/closure-check', '→ ControleCloture', 'colis sous garde et incident bloquant : clôture refusée ; preuves manquantes : « preuves à envoyer »'),
  'journee.cloturer': c(D, 'branche', 'POST /api/courier/day/close {kit, enLigne, origine} (Idempotency-Key)', '→ Resultat blocages | ecart_sans_motif | photo_manquante | deja_cloturee', 'kit rendu au point de stockage ; statut hors service ; bilan à l’entreprise'),
  'journee.deposerAuStockage': c(D, 'branche', 'POST /api/courier/custody/storage-drop {origine} (Idempotency-Key)', '→ Resultat {colis} tournee_en_cours | rien_a_deposer'),
}
