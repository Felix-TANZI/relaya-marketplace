// Routes du groupe VD-09 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-09',
  routes: [
    { route: 'argent', statut: 'repris', ecran: () => import('./Argent') },
    { route: 'se_libere', statut: 'repris', ecran: () => import('./SeLibere') },
    { route: 'gele', statut: 'repris', ecran: () => import('./Gele') },
    { route: 'gains', statut: 'repris', ecran: () => import('./Gains') },
    { route: 'documents', statut: 'repris', ecran: () => import('./Documents') },
    { route: 'versements', statut: 'repris', ecran: () => import('./Versements') },
    { route: 'numero_versement', statut: 'repris', ecran: () => import('./NumeroVersement') },
  ],
} satisfies RoutesGroupe
