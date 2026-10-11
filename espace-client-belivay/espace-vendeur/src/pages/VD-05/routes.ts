// Routes du groupe VD-05 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-05',
  routes: [
    { route: 'commandes', statut: 'repris', ecran: () => import('./Commandes') },
    { route: 'commande', statut: 'repris', ecran: () => import('./Commande') },
    { route: 'rupture', statut: 'repris', ecran: () => import('./Rupture') },
    { route: 'delai', statut: 'repris', ecran: () => import('./Delai') },
    { route: 'bon', statut: 'repris', ecran: () => import('./Bon') },
    { route: 'journal', statut: 'repris', ecran: () => import('./Journal') },
  ],
} satisfies RoutesGroupe
