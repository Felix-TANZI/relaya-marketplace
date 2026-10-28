// Routes du groupe VD-07 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-07',
  routes: [
    { route: 'litiges', statut: 'repris', ecran: () => import('./Litiges') },
    { route: 'litige', statut: 'repris', ecran: () => import('./Litige') },
    { route: 'litige_envoye', statut: 'repris', ecran: () => import('./LitigeEnvoye') },
    { route: 'retours', statut: 'repris', ecran: () => import('./Retours') },
    { route: 'inspection', statut: 'repris', ecran: () => import('./Inspection') },
    { route: 'remplacement', statut: 'repris', ecran: () => import('./Remplacement') },
  ],
} satisfies RoutesGroupe
