// Connecteurs du domaine « paquets » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Paquets'

export const ROUTES_PAQUETS: ConnecteursDe<'paquets'> = {
  'paquets.disponibles': c(D, 'branche', 'GET /api/company/packages', '→ Disponibles', 'paquets publiés visibles (fenêtre de priorité du premier rang, zone, plafond du palier) ; capacités par zone ; rendus sur 7 jours ; remuneration null pour le répartiteur ; comptable : 403 role_forbidden'),
  'paquets.paquet': c(D, 'branche', 'GET /api/company/packages/{id}', '→ DetailPaquet ; 404 → null', 'nom de boutique null avant l’acceptation, jamais de nom à domicile ; lignes vides pour le répartiteur'),
  'paquets.accepter': c(D, 'branche', 'POST /api/company/packages/{id}/accept (Idempotency-Key)', '→ Resultat<{paquet}, pris|expire|capacite|plafond|aucun_livreur> ; 409 company_state', 'premier arrivé (verrou) ; rémunération figée'),
  'paquets.ignorer': c(D, 'branche', 'POST /api/company/packages/{id}/ignore', '→ Resultat'),
  'paquets.rendre': c(D, 'branche', 'POST /api/company/packages/{id}/return {motif?}', '→ Resultat<object, deja_ramasse|statut>', 'avant tout ramassage ; pénalité propre au Trust Score'),
  'paquets.alertes': c(D, 'branche', 'GET /api/company/packages/alerts', '→ ReglageAlerte[]', 'propres à l’utilisateur, activées par défaut'),
  'paquets.reglerAlerte': c(D, 'branche', 'PATCH /api/company/packages/alerts {zone, quoi, on}', '→ 204'),
}
