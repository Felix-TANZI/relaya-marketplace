// Connecteurs du domaine « historique » (backend-kit/apps/livreur_journee).
import { c, type ConnecteursDe } from './types'

const D = 'Historique'

export const ROUTES_HISTORIQUE: ConnecteursDe<'historique'> = {
  'historique.liste': c(D, 'branche', 'GET /api/courier/history?from=&to=', '→ Historique ; 422 jour', 'LIV-PREUVES-VISIBLES-J jours ; après la remise : numéro de commande et zone seulement'),
  'historique.mission': c(D, 'branche', 'GET /api/courier/history/{id}', '→ DetailMission ; 404 → null', 'étapes : heure du téléphone et heure du serveur ; dossier sans identité du client ni montant'),
  'historique.rechercher': c(D, 'branche', 'GET /api/courier/history/search?label=', '→ MissionResume[]', 'numéro complet ou ses 4 derniers chiffres'),
}
