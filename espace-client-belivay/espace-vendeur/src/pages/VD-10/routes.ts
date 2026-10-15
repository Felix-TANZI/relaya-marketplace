// Routes du groupe VD-10 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-10',
  routes: [
    { route: 'palier', statut: 'repris', ecran: () => import('./Palier') },
    { route: 'score', statut: 'repris', ecran: () => import('./Score') },
    { route: 'paliers', statut: 'repris', ecran: () => import('./Paliers') },
    { route: 'sanctions', statut: 'repris', ecran: () => import('./Sanctions') },
    { route: 'contester', statut: 'repris', ecran: () => import('./Contester') },
    { route: 'plans_liste', statut: 'repris', ecran: () => import('./PlansListe') },
    { route: 'plans', statut: 'repris', ecran: () => import('./Plans') },
    { route: 'visibilite', statut: 'repris', ecran: () => import('./Visibilite') },
    { route: 'services', statut: 'repris', ecran: () => import('./Services') },
    { route: 'chiffres', statut: 'repris', ecran: () => import('./Chiffres') },
    { route: 'demande', statut: 'repris', ecran: () => import('./Demande') },
  ],
} satisfies RoutesGroupe
