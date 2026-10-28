// Connecteurs du domaine « session » (backend-kit/apps/entreprise_session). Appareil : champ `appareil` du corps
// (identifiant gardé dans localStorage « blv_e_appareil ») ; le jeton porte l'appareil (session de duree_session heures).
import { c, type ConnecteursDe } from './types'

const D = 'Session'

export const ROUTES_SESSION: ConnecteursDe<'session'> = {
  'session.session': c(D, 'branche', 'GET /api/company/session', '→ SessionEntreprise', 'sans jeton : connecte false ; badges réels (paquets visibles, missions, incidents, litiges, non lus) ; au-delà de duree_session : connecte false, expiree true'),
  'session.connecter': c(D, 'branche', 'POST /api/company/auth/login {identifiant, motDePasse, appareil}', '→ ResultatConnexion + jetons {access, refresh}', 'numéro +237 ou e-mail ; echecs_avant_blocage puis duree_blocage (propriétaire prévenu) ; code SMS : propriétaire et comptable toujours, répartiteur sur un appareil nouveau'),
  'session.verifierCode': c(D, 'branche', 'POST /api/company/auth/verify {defi, code}', '→ ResultatCode + jetons', 'ENT-CODE-SMS-LONGUEUR chiffres ; au bout des essais le défi tombe et la connexion se bloque'),
  'session.renvoyerCode': c(D, 'branche', 'POST /api/company/auth/verify/resend {defi}', '→ ResultatRenvoi', 'delai_renvoi_code_sms ; ENT-RENVOIS-AVANT-SUPPORT renvois puis support'),
  'session.oublie': c(D, 'branche', 'POST /api/company/auth/password/forgot {identifiant}', '→ EnvoiCode', 'même réponse que le compte existe ou non (un e-mail ne montre jamais de chiffres)'),
  'session.reinitialiser': c(D, 'branche', 'POST /api/company/auth/password/reset {defi, code, motDePasse}', '→ ResultatReinitialisation', 'MDP-LONG ; toutes les sessions révoquées'),
  'session.invitation': c(D, 'branche', 'GET /api/company/auth/invitations/{jeton}', '→ InvitationAcces ; 404 → null'),
  'session.creerAcces': c(D, 'branche', 'POST /api/company/auth/invitations/{jeton} {motDePasse, appareil}', '→ {ok, defi, destination, renvoiDans} | {ok: false, raison: expiree|utilisee|mot_de_passe}', 'usage unique ; le code SMS confirme le numéro, verifierCode ouvre la session'),
  'session.deconnecter': c(D, 'branche', 'POST /api/company/auth/logout {refresh}', '→ {ok}', 'jetons effacés sur l’appareil quoi qu’il arrive'),
  'session.changerRole': c(D, 'demo', 'démonstration : voir l’espace avec un autre rôle', undefined, 'en production, chaque utilisateur se connecte avec son accès nominatif'),
}
