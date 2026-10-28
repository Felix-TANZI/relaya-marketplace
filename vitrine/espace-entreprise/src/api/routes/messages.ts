// Connecteurs du domaine « messages » (backend-kit/apps/entreprise_session).
import { c, type ConnecteursDe } from './types'

const D = 'Messages'

export const ROUTES_MESSAGES: ConnecteursDe<'messages'> = {
  'messages.fils': c(D, 'branche', 'GET /api/company/threads?group=', '→ Fil[]', 'groupes belivay, livreurs, incidents ; jamais un client, un vendeur ni un gérant (ENT-ANO-01)'),
  'messages.lire': c(D, 'branche', 'POST /api/company/threads/{id}/read', '→ {ok} ; 404'),
  'messages.envoyer': c(D, 'branche', 'POST /api/company/threads/{id}/messages {texte, piece} (Idempotency-Key)', '→ Resultat<{masque}, vide|ferme|piece> ; 404', 'numéros et liens masqués à l’enregistrement ; le livreur est prévenu'),
  'messages.nouveauSupport': c(D, 'branche', 'POST /api/company/threads {sujet, ref, texte} (Idempotency-Key)', '→ Resultat<{id}, vide|ref>', 'rattaché à un dossier de l’entreprise (litige, paquet, versement, relevé, compte)'),
}
