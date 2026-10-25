// Connecteurs du domaine « paquets » (backend-kit/apps/livreur_tournee). Le livreur n'accepte ni ne refuse un paquet :
// aucune route accept / decline / claim (DP-63).
import { c, type ConnecteursDe } from './types'

const D = 'Paquets'

export const ROUTES_PAQUETS: ConnecteursDe<'paquets'> = {
  'paquets.paquet': c(D, 'branche', 'GET /api/courier/packages/{id} · GET /api/courier/packages/current', '→ Paquet ; 404 → null', 'sans id : le paquet en cours, sinon le prochain affecté ; valeur totale face au plafond du palier, jamais celle d’un colis'),
  'paquets.marquerRelu': c(D, 'branche', 'POST /api/courier/packages/{id}/read {version}', '→ 204 ; 404 not_found'),
  'paquets.demarrer': c(D, 'branche', 'POST /api/courier/packages/{id}/start {origine} (Idempotency-Key)', '→ Resultat kit_insuffisant | deja_demarre | a_relire | autre_paquet_avant | bloque | retire ; 404 not_found'),
  'paquets.impossible': c(D, 'branche', 'POST /api/courier/packages/{id}/cannot-do {motif, origine} (Idempotency-Key)', '→ Resultat deja_ramasse | non_rendable ; 422 invalid', 'avant le premier ramassage seulement : le paquet revient à l’entreprise ; après, incident'),
  'paquets.telecharger': c(D, 'branche', 'GET /api/courier/packages/{id}/offline-bundle', '→ Resultat {le} ; 404 not_found', 'jamais un code (vendeur, client) téléchargé'),
}
