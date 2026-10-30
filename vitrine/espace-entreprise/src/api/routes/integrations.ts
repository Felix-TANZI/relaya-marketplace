// Connecteurs du domaine « intégrations » (backend-kit/apps/entreprise_session).
import { c, type ConnecteursDe } from './types'

const D = 'Intégrations'

export const ROUTES_INTEGRATIONS: ConnecteursDe<'integrations'> = {
  'integrations.etat': c(D, 'branche', 'GET /api/company/integrations', '→ EtatIntegrations ; 403 role_forbidden', 'propriétaire ; fermées au lancement (integrations_actives), debit_par_cle, ENT-WEBHOOK-REESSAIS'),
  'integrations.espace': c(D, 'branche', 'GET /api/company/integrations/space', '→ EspaceIntegrations', 'clés masquées, rappels, journal des appels (test), débit par minute'),
  'integrations.creerCle': c(D, 'branche', 'POST /api/company/integrations/keys {env}', '→ Resultat<{valeur}, fermee | existe>', 'production refusée tant que integrations_actives = non ; journalisé'),
  'integrations.revelerCle': c(D, 'branche', 'POST /api/company/integrations/keys/{id}/reveal', '→ Resultat<{valeur}, introuvable>', 'journalisé ; l’écran masque de nouveau'),
  'integrations.regenererCle': c(D, 'branche', 'POST /api/company/integrations/keys/{id}/rotate', '→ Resultat<{valeur}, introuvable>', 'l’ancienne valeur cesse aussitôt ; journalisé'),
  'integrations.ajouterRappel': c(D, 'branche', 'POST /api/company/integrations/webhooks {url, events}', '→ Resultat<{}, url | evenements | existe>', 'https seulement ; rappels signés'),
  'integrations.retirerRappel': c(D, 'branche', 'DELETE /api/company/integrations/webhooks/{id}', '→ Resultat<{}, introuvable>'),
  'integrations.essayerRappel': c(D, 'branche', 'POST /api/company/integrations/webhooks/{id}/test', '→ Resultat<{statut}, introuvable>', 'envoi signé d’essai, journalisé'),
  'integrations.appelDeTest': c(D, 'branche', 'POST /api/company/integrations/sandbox/call {path}', '→ Resultat<{statut}, sans_cle | quota>', 'compte dans debit_par_cle ; 429 au-delà'),
}
