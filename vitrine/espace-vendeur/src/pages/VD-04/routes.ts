// Routes du groupe VD-04 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-04',
  routes: [
    // Accueil (écran de référence de la méthode) et ses états : repris, logiques et testés (tests/VD-04.gestes.spec.ts).
    { route: 'accueil', statut: 'repris', ecran: () => import('./Accueil') },
    { route: 'accueil_calme', statut: 'repris', ecran: () => import('./AccueilCalme') },
    { route: 'premier_jour', statut: 'repris', ecran: () => import('./PremierJour') },
    { route: 'horsligne', statut: 'repris', ecran: () => import('./Horsligne') },
    { route: 'suspendu', statut: 'repris', ecran: () => import('./Suspendu') },
  ],
} satisfies RoutesGroupe
