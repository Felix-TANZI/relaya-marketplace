import { c, type ConnecteursDe } from './types'

const D = 'Argent'

export const ROUTES_ARGENT: ConnecteursDe<'argent'> = {
  'argent.resume': c(D, 'branche', 'GET /api/vendors/money/summary', '→ ResumeArgent ; 403 owner_only', 'cinq états du moteur argent_vendeur (gardé figé au paiement) ; en circulation = à verser + se libère + en cours + gelé ; arrêté du jeudi exécuté avant la lecture'),
  'argent.seLibere': c(D, 'branche', 'GET /api/vendors/money/releasing', '→ SeLibere ; 403 owner_only', 'palier du Trust Score ; carte, Apple, Google, USD, EUR : délai carte (VD-LIB-CARTE)'),
  'argent.gele': c(D, 'branche', 'GET /api/vendors/money/frozen', '→ Gele ; 403 owner_only', 'litige, retour, recours ; remboursement automatique lu au registre (LIT-AUTO-*)'),
  'argent.gains': c(D, 'branche', 'GET /api/vendors/money/earnings?month=', '→ Gains ; 400 invalid ; 403 owner_only', 'month = AAAA-MM ; reprises en lignes négatives'),
  'argent.documents': c(D, 'branche', 'GET /api/vendors/documents', '→ Documents ; 403 owner_only', 'factures d’abonnement et de visibilité lues dans vendeur_croissance'),
  'argent.document': c(D, 'branche', 'GET /api/vendors/documents/content?type=&periode=', '→ ContenuDocument ; 400 invalid ; 403 owner_only', 'type = releve | facture (periode AAAA-MM) | contrat | versements (periode 3 | 12 | tout) ; même contenu en PDF et CSV (DOC-02)'),
}
