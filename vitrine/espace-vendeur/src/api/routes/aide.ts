// Connecteurs du domaine « aide » (backend-kit/apps/vendeur_boutique).
import { c, type ConnecteursDe } from './types'

const D = 'Aide'

export const ROUTES_AIDE: ConnecteursDe<'aide'> = {
  'aide.questions': c(D, 'branche', 'GET /api/vendors/help/questions?q=', '→ QuestionAide[]', 'montants calculés par le moteur de commission ; sans l’argent pour l’accès Préparation'),
  'aide.produitsInterdits': c(D, 'branche', 'GET /api/vendors/help/forbidden-products', '→ string[]'),
  'aide.contacts': c(D, 'branche', 'GET /api/vendors/help/contacts', '→ ContactsAide', 'registre (CONTACT-*, SUP-WA, SUP-HORAIRES, SUP-DELAI) sinon coordonnées officielles'),
  'aide.conseil': c(D, 'branche', 'GET /api/vendors/help/tip', '→ {titre, texte, publieLe}'),
}
