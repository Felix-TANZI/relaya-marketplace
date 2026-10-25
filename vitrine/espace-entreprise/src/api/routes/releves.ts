// Connecteurs du domaine « relevés » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Relevés'

export const ROUTES_RELEVES: ConnecteursDe<'releves'> = {
  'releves.liste': c(D, 'branche', 'GET /api/company/statements?period=', '→ Releve[]', 'semaine (arrêtée le jeudi 23 h 59) | mois ; provisoire puis définitif ; propriétaire et comptable'),
  'releves.mentions': c(D, 'branche', 'GET /api/company/statements/mentions', '→ MentionsReleve'),
  'releves.fichier': c(D, 'branche', 'GET /api/company/statements/{id}.pdf · GET /api/company/statements/{id}.csv', '→ Resultat<{nom, contenu, type}, provisoire>', 'CSV UTF-8 « ; » ; journalisé ; aucune donnée de client'),
  'releves.televerserFacture': c(D, 'branche', 'POST /api/company/statements/{id}/invoice {nom, taille, type} (Idempotency-Key)', '→ Resultat<object, provisoire|format|taille|autofacturation>', 'PDF ≤ taille_max_piece Mo'),
}
