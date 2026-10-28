// Connecteurs du domaine « compte » (backend-kit/apps/entreprise_session). L'état est décidé par BelivaY seul (console :
// entreprise_session.services.decider_etat).
import { c, type ConnecteursDe } from './types'

const D = 'Compte'

export const ROUTES_COMPTE: ConnecteursDe<'compte'> = {
  'compte.etat': c(D, 'branche', 'GET /api/company/account/state', '→ EtatDuCompte', 'motif, niveau, dates, effets (zones, plafond, publication), pilote, préavis, lecture seule, colis à terminer, journal account.state_changed'),
  'compte.faireRecours': c(D, 'branche', 'POST /api/company/account/appeal {texte} (Idempotency-Key)', '→ Resultat<object, non_permis|deja_utilise|texte> ; 403 role_forbidden', 'propriétaire ; une fois par décision (restreint, suspendu avec motif) ; fil ouvert avec BelivaY'),
  'compte.activite': c(D, 'branche', 'GET /api/company/activity', '→ LigneActivite[]', 'journal signé des gestes de l’entreprise (DED-17), le plus récent d’abord, sans montant'),
  'compte.scenario': c(D, 'demo', 'démonstration : état posé par la console', undefined, 'serveur d’essai : entreprise_session.services.decider_etat(entreprise, etat, motif, niveau, jusqua, par)'),
}
