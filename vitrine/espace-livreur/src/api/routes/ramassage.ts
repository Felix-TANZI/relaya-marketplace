// Connecteurs du domaine « ramassage » (backend-kit/apps/livreur_tournee) : maillon C1. Le code de remise du vendeur
// n'est jamais rendu (codeDemo absent en API).
import { c, type ConnecteursDe } from './types'

const D = 'Ramassage'

export const ROUTES_RAMASSAGE: ConnecteursDe<'ramassage'> = {
  'ramassage.ramassage': c(D, 'branche', 'GET /api/courier/stops/{id}/pickup', '→ Ramassage ; 404 → null', 'article tel que la fiche le décrit, jamais son prix'),
  'ramassage.relancer': c(D, 'branche', 'POST /api/courier/stops/{id}/remind {origine} (Idempotency-Key)', '→ Resultat deja_relance ; 409 order_imposed'),
  'ramassage.pasPret': c(D, 'branche', 'POST /api/courier/stops/{id}/not-ready {origine} (Idempotency-Key)', '→ Resultat trop_tot ; 409 order_imposed'),
  'ramassage.boutiqueFermee': c(D, 'branche', 'POST /api/courier/stops/{id}/shop-closed {photo, note, origine} (Idempotency-Key)', '→ Resultat note_trop_courte ; 422 preuve_manquante ; 409 order_imposed'),
  'ramassage.controler': c(D, 'branche', 'POST /api/courier/parcels/{id}/control {cases, boiteScellee, photo1, classeDepassee, serieIllisible, origine} (Idempotency-Key)', '→ Resultat {suite} cases_incompletes | photo_manquante ; 409 arrivee_manquante'),
  'ramassage.auditer': c(D, 'branche', 'POST /api/courier/parcels/{id}/audit {verifs, photos, origine} (Idempotency-Key)', '→ Resultat {suite} incomplet ; 409 state_changed'),
  'ramassage.lierEtiquette': c(D, 'branche', 'POST /api/courier/parcels/{id}/label {numero, origine} (Idempotency-Key)', '→ Resultat {numero} deja_liee | hors_plage | illisible ; 409 state_changed'),
  'ramassage.emballer': c(D, 'branche', 'POST /api/courier/parcels/{id}/seal {format, motifFormat, scelle, photo2, origine} (Idempotency-Key)', '→ Resultat etiquette_manquante | scelle_incomplet | motif_manquant ; 422 preuve_manquante'),
  'ramassage.emballageManquant': c(D, 'branche', 'POST /api/courier/parcels/{id}/packaging-missing {origine} (Idempotency-Key)', '→ Resultat'),
  'ramassage.validerCode': c(D, 'branche', 'POST /api/courier/stops/{id}/handover-code {code, origine} (Idempotency-Key)', '→ Resultat {garde} code_faux | bloque | controle_incomplet ; 409 order_imposed', 'photo 1 ∧ photo 2 ∧ étiquette ∧ code : la garde passe à l’entreprise'),
  'ramassage.refuser': c(D, 'branche', 'POST /api/courier/parcels/{id}/refuse {motif, photo, note, origine} (Idempotency-Key)', '→ Resultat {dossier} note_trop_courte | photo_manquante ; 422 invalid'),
  'ramassage.corrigerSurPlace': c(D, 'branche', 'POST /api/courier/parcels/{id}/correct {origine} (Idempotency-Key)', '→ Resultat ; 409 state_changed'),
  'ramassage.recuperer': c(D, 'branche', 'POST /api/courier/parcels/{id}/collected {par, photo, origine} (Idempotency-Key)', '→ Resultat photo_manquante | inconnu ; 409 order_imposed ; 422 invalid', 'liste groupée du vendeur : une photo par colis gardée (R66), la première reste la preuve ; sur place à l’arrêt en cours (livreur_tournee.gestes.recuperer)'),
  'ramassage.colisManquant': c(D, 'branche', 'POST /api/courier/parcels/{id}/missing {choix, origine} (Idempotency-Key)', '→ Resultat {jusqua?} inconnu ; 409 order_imposed ; 422 invalid', 'attendre (ATTENTE-VENDEUR-MIN) ou partir avec les autres (colis retiré du paquet ; entreprise, vendeur et client prévenus ; BelivaY décide du repassage)'),
}
