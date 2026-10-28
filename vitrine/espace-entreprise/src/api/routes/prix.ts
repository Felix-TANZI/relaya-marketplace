// Connecteurs du domaine « prix » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Prix'

export const ROUTES_PRIX: ConnecteursDe<'prix'> = {
  'prix.grille': c(D, 'branche', 'GET /api/company/price-grid', '→ Grille', 'grille d’achat en lecture seule ; chaque ligne contrôlée sous le plafond de sa classe (moteurs) : ok, ecrete, au_dessus ; propriétaire et comptable'),
  'prix.delais': c(D, 'branche', 'GET /api/company/sla', '→ Delais', 'registre ENT-*'),
  'prix.supplements': c(D, 'branche', 'GET /api/company/price-grid/supplements', '→ Supplement[]', 'propriétaire et comptable'),
  'prix.paliers': c(D, 'branche', 'GET /api/company/price-grid/tiers', '→ {actuel, plafonds}', 'plafond de valeur par palier (null : Or sans plafond), seuils du Trust Score'),
  'prix.demanderRevision': c(D, 'branche', 'POST /api/company/price-grid/revision-requests {texte} (Idempotency-Key)', '→ Resultat<{filId}, texte>', 'un fil de messages avec BelivaY (sujet grid_revision), jamais une écriture de la grille'),
  'prix.alertesDelais': c(D, 'branche', 'GET /api/company/sla/alerts', '→ AlertesDelais', 'alertes avant échéance (acceptation, ramassage) et leurs bornes lues au registre (seuil_anneau_rouge ≤ N ≤ ENT-T-ACCEPT ou délai de ramassage) ; tous les rôles'),
  'prix.reglerAlertesDelais': c(D, 'branche', 'PUT /api/company/sla/alerts {acceptationMin, ramassageMin} (Idempotency-Key)', '→ Resultat<{}, bornes>', 'propriétaire et répartiteur ; journalisé avec l’auteur (journal des paramètres)'),
}
