// Connecteurs du domaine « litiges » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Litiges'

export const ROUTES_LITIGES: ConnecteursDe<'litiges'> = {
  'litiges.liste': c(D, 'branche', 'GET /api/company/disputes?stage=', '→ Litige[]', 'ouvert | examen | decide ; preuves de la mission jointes d’office ; montants null pour le répartiteur'),
  'litiges.preparer': c(D, 'branche', 'POST /api/company/disputes/{id}/draft {genre, texte, piece?}', '→ Resultat<object, RefusLitige>', 'répartiteur ou propriétaire (comptable : 403)'),
  'litiges.repondre': c(D, 'branche', 'POST /api/company/disputes/{id}/response {genre, texte, piece?} (Idempotency-Key)', '→ Resultat<object, RefusLitige>', 'propriétaire seul ; échéance passée : delai ; arrangement ≥ ENT-LITIGE-ARRANGEMENT-MIN caractères : sinon texte'),
  'litiges.completer': c(D, 'branche', 'POST /api/company/disputes/{id}/complement {texte} (Idempotency-Key)', '→ Resultat<object, RefusLitige>', 'pendant l’examen'),
  'litiges.recours': c(D, 'branche', 'POST /api/company/disputes/{id}/appeal {element} (Idempotency-Key)', '→ Resultat<object, RefusLitige>', 'propriétaire ; une fois, sous LIT-RECOURS-H, élément nouveau ; retenues suspendues'),
}
