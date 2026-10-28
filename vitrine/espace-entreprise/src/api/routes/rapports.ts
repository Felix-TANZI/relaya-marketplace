// Connecteurs du domaine « rapports » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Rapports'

export const ROUTES_RAPPORTS: ConnecteursDe<'rapports'> = {
  'rapports.rapport': c(D, 'branche', 'GET /api/company/reports?from=&to=&zone=&courier=&type=', '→ Rapport ; 400 invalid', 'période et période précédente ; par jour, zone, type, livreur ; montants null pour le répartiteur ; aucune donnée de client'),
  'rapports.exporter': c(D, 'branche', 'GET /api/company/reports.csv?from=&to= · GET /api/company/reports.pdf?from=&to=', '→ Resultat<{nom, contenu, type}, peu_de_donnees>', 'journalisé ; refusé sous ENT-RAPPORT-MIN-MISSIONS missions'),
  'rapports.rapportPilote': c(D, 'branche', 'GET /api/company/reports/pilot', '→ Resultat<{nom, contenu, type}, pilote_en_cours>', 'au dernier jour du pilote'),
  'rapports.programme': c(D, 'branche', 'GET /api/company/reports/schedule', '→ ProgrammeRapport', 'rapport du vendredi : actif, heure, format, destinataire interne, prochain envoi'),
  'rapports.programmer': c(D, 'branche', 'PUT /api/company/reports/schedule {active, hour, format, recipient}', '→ Resultat<{prochain}, heure | destinataire | role>', 'propriétaire et comptable ; journalisé ; envoi par e-mail chaque vendredi'),
}
