// Connecteurs du domaine « colis » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Colis'

export const ROUTES_COLIS: ConnecteursDe<'colis'> = {
  'colis.file': c(D, 'branche', 'GET /api/company/parcels?queue=', '→ Colis[]', 'a_ramasser | sous_garde | remis (historique_remis jours) ; aucune donnée du client au-delà du quartier ; valeur déclarée null pour le comptable ; alertes garde_longue, introuvable'),
  'colis.compteurs': c(D, 'branche', 'GET /api/company/parcels/counts', '→ Record<FileColis, number>'),
  'colis.relancer': c(D, 'branche', 'POST /api/company/parcels/remind {cle}', '→ {envoyeLe}', 'étiquette ou paquet ; une relance par intervalle'),
}
