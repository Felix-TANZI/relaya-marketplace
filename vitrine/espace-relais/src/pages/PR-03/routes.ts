// Routes du groupe PR-03 · Accès (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
// Pas de barre du bas sur les écrans d'accès tant que le relais n'est pas actif (ARL-27) : connexion, invitation,
// inscription et installation n'en ont pas ; activation, statut et convention la montrent seulement pour un relais
// actif (l'écran passe barre={…}). Pages ajoutées : « decision » (une décision de BelivaY et sa contestation) et
// « convention » (la convention à lire avant d'accepter, à relire et télécharger).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-03',
  routes: [
    { route: 'connexion', ecran: 'Connexion', titre: "Connexion", entete: 'aucun', barre: false, sansSession: true, statut: 'repris', charger: () => import('./Connexion') },
    { route: 'invitation', ecran: 'Invitation', titre: "Rejoindre un relais", entete: 'enfant', retour: 'connexion', barre: false, sansSession: true, statut: 'repris', charger: () => import('./Invitation') },
    { route: 'inscription', ecran: 'Inscription', titre: "Devenir point relais", entete: 'enfant', retour: 'connexion', barre: false, sansSession: true, statut: 'repris', charger: () => import('./Inscription') },
    { route: 'activation', ecran: 'Activation', titre: "Activation et partenariat", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Activation') },
    { route: 'installer', ecran: 'Installer', titre: "Installer l’application", entete: 'enfant', retour: 'connexion', barre: false, sansSession: true, statut: 'repris', charger: () => import('./Installer') },
    { route: 'statut-relais', ecran: 'StatutRelais', titre: "Statut du relais", entete: 'enfant', retour: 'accueil', barre: true, statut: 'repris', charger: () => import('./StatutRelais') },
    { route: 'decision', ecran: 'StatutRelais', titre: "Décision de BelivaY", entete: 'enfant', retour: 'statut-relais', barre: true, statut: 'repris', charger: () => import('./Decision') },
    { route: 'convention', ecran: 'Activation', titre: "Convention de partenariat", entete: 'enfant', retour: 'inscription', barre: false, sansSession: true, statut: 'repris', charger: () => import('./Convention') },
  ],
}
export default groupe
