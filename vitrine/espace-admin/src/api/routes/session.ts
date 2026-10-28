// Connecteurs du domaine « session » (backend-kit/apps/console : vues_admin2.Session ; connexion des agents :
// connexion_agent.py, vues_connexion.py).
import { c, type ConnecteursDe } from './types'

const D = 'Session'
const AUTH = 'connexion des agents au kit (connexion_agent.py) : routes publiques limitées en débit par adresse IP ; l’appareil (identifiant opaque) part dans le corps'

export const ROUTES_SESSION: ConnecteursDe<'session'> = {
  'session.session': c(D, 'branche', 'GET /api/console/vues/session?appareil=', '→ SessionAdmin', 'sans jeton, 401 (session fermée) ou 404 (compte qui n’est pas agent) : connecte false ; téléphone masqué, second facteur, appareils connus (courant : cet appareil), rôle affiché (agir en tant que), astreinte de la Direction, compteurs des files visibles'),
  'session.blocage': c(D, 'branche', 'GET /api/console/auth/blocage?appareil=', '→ {jusqua, echecs}', `${AUTH} ; identifiants essayés depuis cet appareil`),
  'session.connecter': c(D, 'branche', 'POST /api/console/auth/login {identifiant, motDePasse, appareil}', '→ ResultatIdentifiants (+ jeton d’étape gardé dans l’onglet) ; invalide (restants), bloque (jusqua), suspendu', `${AUTH} ; echecs_avant_blocage échecs → blocage duree_blocage minutes, journalisé`),
  'session.verifierCode': c(D, 'branche', 'POST /api/console/auth/code {etape, code, appareil}', '→ ResultatCode ; jetons {access, refresh} gardés par le client', `${AUTH} ; code de l’application d’authentification (TOTP) ou code de secours par SMS ; ADM-2FA-CODES-FAUX codes faux → retour à l’étape 1 ; nouvel appareil signalé (journal, e-mail, alerte)`),
  'session.envoyerCodeSms': c(D, 'branche', 'POST /api/console/auth/code/sms {etape}', '→ {ok, telephone} | sans_etape_1 | application_obligatoire', `${AUTH} ; Finance, Direction, Accès et personnel : application seulement ; le serveur d’essai relit le code par /api/_essai/codes`),
  'session.deconnecter': c(D, 'branche', 'POST /api/console/auth/deconnexion {refresh}', '→ void', 'session de l’appareil fermée (sid), jeton de rafraîchissement en liste noire ; journalisé ; jetons effacés sur l’appareil'),
  'session.agirEnTantQue': c(D, 'branche', 'POST /api/console/vues/session/role {role}', '→ {ok} | role_non_tenu', 'ADM-ROL-02 : rôle affiché parmi les rôles effectifs de l’agent, gardé au kit et journalisé (console.agir_en_tant_que)'),
  'session.changerRole': c(D, 'demo', 'démonstration : se connecter comme l’agent d’un rôle', undefined, 'en production, chaque agent se connecte avec son accès nominatif'),
  'session.agentsDemo': c(D, 'demo', 'démonstration : agents proposés à la connexion'),
  'session.changerAgent': c(D, 'demo', 'démonstration : se connecter comme un employé précis', undefined, 'en production, chaque agent se connecte avec son accès nominatif'),
  'session.comptesDemo': c(D, 'demo', 'démonstration : employés proposés à la connexion, par équipe'),
  'session.invitation': c(D, 'branche', 'GET /api/console/activation/{jeton}', '→ ResultatInvitation', 'lien d’activation d’un employé invité (ADM-INVITATION-H) : lecture publique limitée en débit'),
  'session.activer': c(D, 'branche', 'POST /api/console/activation/{jeton}', '→ ResultatActivation', 'mot de passe (MDP-LONG), second facteur enrôlé, charte acceptée ; journalisé'),
}
