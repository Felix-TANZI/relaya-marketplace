// Connecteurs du domaine « incidents » (backend-kit/apps/livreur_tournee).
import { c, type ConnecteursDe } from './types'

const D = 'Incidents'

export const ROUTES_INCIDENTS: ConnecteursDe<'incidents'> = {
  'incidents.catalogue': c(D, 'branche', 'GET /api/courier/incidents/catalogue', '→ CatalogueIncidents'),
  'incidents.liste': c(D, 'branche', 'GET /api/courier/incidents', '→ Incident[]', 'plus les incidents en file sur le téléphone (état en_file)'),
  'incidents.incident': c(D, 'branche', 'GET /api/courier/incidents/{id}', '→ Incident ; 404 → null'),
  'incidents.declarer': c(D, 'branche', 'POST /api/courier/incidents {famille, type, note, photos, arretId, origine} (Idempotency-Key)', '→ Resultat {id} note_trop_courte | photos_manquantes | type_inconnu ; 409 hors_mission', 'photos : identifiants des preuves déposées d’abord par l’écran (POST media, nature incident). Hors connexion : photos et incident mis en file dans l’ordre, identifiants provisoires remplacés par le serveur'),
}
