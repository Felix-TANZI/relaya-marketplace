// Connecteurs du domaine « règlements » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Règlements'

export const ROUTES_REGLEMENTS: ConnecteursDe<'reglements'> = {
  'reglements.prochain': c(D, 'branche', 'GET /api/company/payouts/next', '→ VersementPrevu', 'arrêté jeudi 23 h 59, versé le vendredi avant 12 h ; minoration, retenues, report ; frais 0 ; propriétaire et comptable (répartiteur : 403)'),
  'reglements.historique': c(D, 'branche', 'GET /api/company/payouts', '→ Versement[]'),
  'reglements.indicateurs': c(D, 'branche', 'GET /api/company/payouts/indicators', '→ IndicateursArgent'),
  'reglements.moyen': c(D, 'branche', 'GET /api/company/payment-method', '→ MoyenReglement', 'numéro masqué « ···· 01 »'),
  'reglements.demanderCode': c(D, 'branche', 'POST /api/company/payment-method/code', '→ {defi, destination, codeDemo: null} ; 429 trop_tot', 'propriétaire seul ; code SMS au propriétaire (second facteur)'),
  'reglements.changerMoyen': c(D, 'branche', 'POST /api/company/payment-method {operateur, numero, auNomDeLEntreprise, defi, code} (Idempotency-Key)', '→ Resultat<object, numero|titulaire|code|en_revue>', 'propriétaire seul ; jamais de code secret Mobile Money ; versements bloqués et revue humaine'),
}
