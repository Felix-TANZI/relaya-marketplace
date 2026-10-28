// Routes du groupe PR-07 · Incidents (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-07',
  routes: [
    { route: 'litiges', ecran: 'Litiges', titre: "Constats et retours", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Litiges') },
    // Page ajoutée : un dossier (étapes, demande de BelivaY, décision et contestation, fil) ; droits de « litiges ».
    { route: 'dossier-litige', ecran: 'Litiges', titre: "Dossier", entete: 'enfant', retour: 'litiges', barre: true, statut: 'repris', charger: () => import('./Dossier') },
    { route: 'fermeture', ecran: 'Fermeture', titre: "Fermeture exceptionnelle", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Fermeture') },
    { route: 'historique', ecran: 'Historique', titre: "Historique", entete: 'enfant', retour: 'menu', barre: true, statut: 'repris', charger: () => import('./Historique') },
  ],
}
export default groupe
