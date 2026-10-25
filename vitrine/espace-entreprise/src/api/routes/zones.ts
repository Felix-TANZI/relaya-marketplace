// Connecteurs du domaine « zones » (backend-kit/apps/entreprise_flotte).
import { c, type ConnecteursDe } from './types'

const D = 'Zones'

export const ROUTES_ZONES: ConnecteursDe<'zones'> = {
  'zones.zones': c(D, 'branche', 'GET /api/company/zones', '→ ZoneEntreprise[]', 'état recalculé à la lecture : bloquée (aucun livreur actif ou véhicule valide) et sa raison ; santé sur la fenêtre d’alerte_zone'),
  'zones.carte': c(D, 'branche', 'GET /api/company/zones/map', '→ ZoneCarte[]', 'les douze zones (polygone, centre, relais) ; exploitées : ZONES-EXPLOITEES'),
  'zones.quartiers': c(D, 'branche', 'GET /api/company/zones/neighbourhoods', '→ Quartier[]'),
  'zones.declarer': c(D, 'branche', 'POST /api/company/zones {code, capacite, debut, fin, livreurs} (Idempotency-Key)', '→ Resultat<{zone}, pas_ouverte|deja|aucun_livreur|capacite|horaires|inconnue> ; 403 role_forbidden', 'propriétaire et répartiteur ; capacité honnête ; heures dans ENT-HEURES-SERVICE ; une zone non exploitée se déclare mais ne reçoit rien (DED-23)'),
  'zones.modifier': c(D, 'branche', 'PATCH /api/company/zones/{code} {capacite, debut, fin, livreurs}', '→ Resultat<{zone}, aucun_livreur|capacite|horaires|inconnue> ; 403 role_forbidden', 'jamais sous les colis déjà acceptés ; livreurs rattachés = Livreur.zones (journal et notification)'),
  'zones.mettreEnPause': c(D, 'branche', 'POST /api/company/zones/{code}/pause {pause}', '→ Resultat<object, inconnue> ; 403 role_forbidden', 'les paquets acceptés restent dus'),
}
