// Routes du groupe PR-04 · Guichet 1 (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-04',
  routes: [
    { route: 'accueil', ecran: 'Accueil', titre: "Aujourd’hui", entete: 'racine', barre: true, onglet: 'accueil', statut: 'repris', charger: () => import('./Accueil') },
    { route: 'reception', ecran: 'Reception', titre: "Réception d’un lot", entete: 'racine', barre: true, onglet: 'reception', statut: 'repris', charger: () => import('./Reception') },
    { route: 'camera', ecran: 'Camera', titre: "Appareil photo de preuve", entete: 'aucun', barre: false, statut: 'repris', charger: () => import('./Camera') },
  ],
}
export default groupe
