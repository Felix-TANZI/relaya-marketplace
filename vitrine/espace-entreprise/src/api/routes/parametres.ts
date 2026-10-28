// Connecteurs du domaine « paramètres » (backend-kit/apps/entreprise_session).
import { c, type ConnecteursDe } from './types'

const D = 'Paramètres'

export const ROUTES_PARAMETRES: ConnecteursDe<'parametres'> = {
  'parametres.utilisateurs': c(D, 'branche', 'GET /api/company/users', '→ UtilisateurInterne[]', 'un autre rôle ne voit que son accès ; numéros masqués sauf le sien'),
  'parametres.inviter': c(D, 'branche', 'POST /api/company/users {nom, telephone, email, role} (Idempotency-Key)', '→ Resultat<object, nom|telephone|email|role|limite|doublon> ; 403 role_forbidden', 'propriétaire ; acces_internes_max accès ; SMS avec lien à usage unique (ENT-INVITATION-EXPIRE jours)'),
  'parametres.retirer': c(D, 'branche', 'DELETE /api/company/users/{id}', '→ Resultat<object, soi> ; 403 role_forbidden', 'propriétaire ; sessions révoquées sur le champ ; jamais soi-même'),
  'parametres.reglages': c(D, 'branche', 'GET /api/company/settings', '→ ReglagesEntreprise', 'journal des modifications signé (auteur, date)'),
  'parametres.modifierStockage': c(D, 'branche', 'PUT /api/company/settings/storage {adresse, consignes}', '→ Resultat<object, adresse> ; 403 role_forbidden', 'propriétaire'),
  'parametres.appareils': c(D, 'branche', 'GET /api/company/me/devices', '→ Appareil[]', 'alimentés à la connexion ; « actuel » : l’appareil du jeton'),
  'parametres.deconnecterAppareil': c(D, 'branche', 'DELETE /api/company/me/devices/{id}', '→ {ok}', 'jetons de cet appareil en liste noire'),
  'parametres.changerMotDePasse': c(D, 'branche', 'POST /api/company/me/password {actuel, nouveau}', '→ Resultat<object, mot_de_passe|faible>', 'MDP-LONG ; autres appareils déconnectés'),
  'parametres.notifications': c(D, 'branche', 'GET /api/company/notification-preferences', '→ PreferencesNotifications'),
  'parametres.reglerNotifications': c(D, 'branche', 'PUT /api/company/notification-preferences {zones, matrice, resumeQuotidien, plageCalme}', '→ Resultat<object, adresse>', 'alertes verrouillées gardées (alertes_verrouillees)'),
  'parametres.demanderExport': c(D, 'branche', 'POST /api/company/me/export', '→ {defi, codeDemo: null}', 'code SMS au numéro de l’accès (DED-31)'),
  'parametres.exporter': c(D, 'branche', 'POST /api/company/me/export/confirm {defi, code}', '→ Resultat<{nom, contenu}, code>'),
}
