// Connecteurs du domaine « kit » (backend-kit/apps/livreur_journee) : stock calculé depuis les mouvements, rouleau
// d'étiquettes, remise de l'entreprise, fin de journée.
import { c, type ConnecteursDe } from './types'

const D = 'Kit'

export const ROUTES_KIT: ConnecteursDe<'kit'> = {
  'kit.lire': c(D, 'branche', 'GET /api/courier/kit', '→ Kit', 'stock = reçu − lié − abîmé, jamais saisi ; couverture des paquets à venir'),
  'kit.confirmerReception': c(D, 'branche', 'POST /api/courier/kit/receipts {quantites, accessoires, premiereEtiquette, origine} (Idempotency-Key)', '→ Resultat plage_differente | sans_remise ; 422 quantites', 'remise de l’entreprise confirmée ; un écart remonte à l’entreprise'),
  'kit.demanderReassort': c(D, 'branche', 'POST /api/courier/kit/restock-request {formats, paquetId, origine} (Idempotency-Key)', '→ Resultat deja_demande | rien_a_demander'),
  'kit.declarerAbimee': c(D, 'branche', 'POST /api/courier/kit/damage {format, origine} (Idempotency-Key)', '→ Resultat plus_de_stock ; 422 format', 'au-delà de KIT-ABIME-SEUIL % dans la semaine : l’entreprise est alertée'),
  'kit.declarerRouleauPerdu': c(D, 'branche', 'POST /api/courier/kit/label-rolls/current/lost {origine} (Idempotency-Key)', '→ Resultat deja_perdu | sans_rouleau', 'la plage est invalidée'),
  'kit.lierEtiquette': c(D, 'branche', 'POST /api/courier/kit/labels/{numero}/link {format, paquetId, origine} (Idempotency-Key)', '→ Resultat hors_plage | deja_liee | plage_perdue | plus_de_stock ; 404 not_found', 'la liaison du ramassage à un colis est POST /api/courier/parcels/{id}/label'),
  'kit.declarerRendu': c(D, 'branche', 'POST /api/courier/kit/return {rendu, origine} (Idempotency-Key)', '→ Resultat ; 422 quantites'),
  'kit.declarerMotifEcart': c(D, 'branche', 'POST /api/courier/kit/gaps/{format} {motif, origine} (Idempotency-Key)', '→ Resultat sans_ecart ; 422 motif'),
}
