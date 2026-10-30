// Routes du groupe PR-08 · Communication (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
// Pages ajoutées (surplus des règles) : « aide-fiche » (fiche du comptoir), « appel » (appel masqué, DP-61), « mode-papier »
// (registre papier d'une panne générale, AID-04).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-08',
  routes: [
    { route: 'notifications', ecran: 'Notifications', titre: "Notifications", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Notifications') },
    { route: 'messagerie', ecran: 'Messagerie', titre: "Messagerie", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Messagerie') },
    { route: 'aide', ecran: 'Aide', titre: "Aide", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Aide') },
    { route: 'aide-fiche', ecran: 'Aide', titre: "Fiche du comptoir", entete: 'enfant', retour: 'aide', barre: true, statut: 'repris', charger: () => import('./FicheAide') },
    { route: 'appel', ecran: 'Messagerie', titre: "Appel masqué", entete: 'enfant', retour: 'messagerie', barre: true, statut: 'repris', charger: () => import('./Appel') },
    { route: 'mode-papier', ecran: 'Aide', titre: "Mode papier", entete: 'enfant', retour: 'aide', barre: true, statut: 'repris', charger: () => import('./ModePapier') },
  ],
}
export default groupe
