// Routes du groupe PR-06 · Stock (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: 'PR-06',
  routes: [
    { route: 'stock', ecran: 'Stock', titre: "Stock et emplacements", entete: 'racine', barre: true, onglet: 'stock', statut: 'repris', charger: () => import('./Stock') },
    { route: 'colis', ecran: 'ColisDetail', titre: "Fiche colis", entete: 'enfant', retour: 'stock', barre: true, statut: 'repris', charger: () => import('./ColisDetail') },
    { route: 'inventaire', ecran: 'Inventaire', titre: "Inventaire des étagères", entete: 'enfant', retour: 'stock', barre: true, statut: 'repris', charger: () => import('./Inventaire') },
    { route: 'departs', ecran: 'Departs', titre: "À faire partir", entete: 'enfant', retour: 'accueil', barre: true, statut: 'repris', charger: () => import('./Departs') },
  ],
}
export default groupe
