// Connecteurs du domaine « remises » (backend-kit/apps/livreur_tournee) : dépôt au relais (QR de dépôt pendant
// l'arrêt en cours), domicile, échec, départs du relais, retour au vendeur. Codes du client et du vendeur jamais rendus.
import { c, type ConnecteursDe } from './types'

const D = 'Remises'

export const ROUTES_REMISES: ConnecteursDe<'remises'> = {
  'remises.depotRelais': c(D, 'branche', 'GET /api/courier/stops/{id}/relay-drop', '→ DepotRelais ; 404 → null', 'qr : arrêt en cours, sur place, avant la confirmation'),
  'remises.accepterConstat': c(D, 'branche', 'POST /api/courier/stops/{id}/relay-drop/parcels/{colis}/accept-report {origine} (Idempotency-Key)', '→ Resultat ; 409 order_imposed'),
  'remises.confirmerDepot': c(D, 'branche', 'POST /api/courier/stops/{id}/relay-drop/confirm {origine} (Idempotency-Key)', '→ Resultat colis_sans_resultat | non_scanne | constat_a_accepter | lot_non_valide ; 409 order_imposed'),
  'remises.relaisFerme': c(D, 'branche', 'POST /api/courier/stops/{id}/relay-closed {photo, origine} (Idempotency-Key)', '→ Resultat ; 422 preuve_manquante'),
  'remises.registrePapier': c(D, 'branche', 'POST /api/courier/stops/{id}/paper-register {photo, origine} (Idempotency-Key)', '→ Resultat ; 422 preuve_manquante'),
  'remises.domicile': c(D, 'branche', 'GET /api/courier/stops/{id}/home', '→ RemiseDomicile ; 404 → null', 'prénom et quartier ; repère pendant l’arrêt en cours ; jamais le code du client'),
  'remises.livrerDomicile': c(D, 'branche', 'POST /api/courier/stops/{id}/home/deliver {code, photo, porteur?, origine} (Idempotency-Key)', '→ Resultat {ecartM} code_faux | bloque ; 422 preuve_manquante ; 409 order_imposed'),
  'remises.constat': c(D, 'branche', 'POST /api/courier/stops/{id}/home/report {photos, note, origine} (Idempotency-Key)', '→ Resultat note_trop_courte'),
  'remises.preuvesEchec': c(D, 'branche', 'GET /api/courier/stops/{id}/home/fail-proofs', '→ PreuvesEchec', 'mesurées par le serveur'),
  'remises.echecDomicile': c(D, 'branche', 'POST /api/courier/stops/{id}/home/fail {motif, photo, note, origine} (Idempotency-Key)', '→ Resultat {suite} preuves_incompletes | note_trop_courte ; 422 invalid'),
  'remises.collecte': c(D, 'branche', 'GET /api/courier/stops/{id}/departures', '→ Collecte ; 404 → null'),
  'remises.confirmerDepart': c(D, 'branche', 'POST /api/courier/stops/{id}/departures/{colis}/confirm {origine} (Idempotency-Key)', '→ Resultat non_presente'),
  'remises.photoScelle': c(D, 'branche', 'POST /api/courier/stops/{id}/departures/{colis}/seal-photo {photo, origine} (Idempotency-Key)', '→ Resultat ; 422 preuve_manquante'),
  'remises.departManquant': c(D, 'branche', 'POST /api/courier/stops/{id}/departures/{colis}/missing {origine} (Idempotency-Key)', '→ Resultat'),
  'remises.terminerCollecte': c(D, 'branche', 'POST /api/courier/stops/{id}/departures/confirm {origine} (Idempotency-Key)', '→ Resultat colis_a_traiter'),
  'remises.retour': c(D, 'branche', 'GET /api/courier/stops/{id}/return', '→ RetourVendeur ; 404 → null', 'jamais le code de réception du vendeur'),
  'remises.remettreRetour': c(D, 'branche', 'POST /api/courier/stops/{id}/return/deliver {code, photo, origine} (Idempotency-Key)', '→ Resultat code_faux | bloque ; 422 preuve_manquante'),
  'remises.retourImpossible': c(D, 'branche', 'POST /api/courier/stops/{id}/return/vendor-absent {raison, photo, origine} (Idempotency-Key)', '→ Resultat {relais} ; 422 preuve_manquante'),
  'remises.simulerScanRelais': c(D, 'demo', 'application du relais (relay.drop.scanned, item_result)', undefined, 'serveur d’essai : livraison_core.tournee.relais_scanner(arret, code) · relais_resultat(arret, etiquette, resultat)'),
  'remises.simulerPresentation': c(D, 'demo', 'application du relais (départs présentés)', undefined, 'serveur d’essai : livraison_core.tournee.relais_presenter(colis)'),
}
