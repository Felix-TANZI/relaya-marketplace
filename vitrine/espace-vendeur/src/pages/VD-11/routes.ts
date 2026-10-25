// Routes du groupe VD-11 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-11',
  routes: [
    { route: 'menu', statut: 'repris', ecran: () => import('./Menu') },
    { route: 'boutique', statut: 'repris', ecran: () => import('./Boutique') },
    { route: 'horaires', statut: 'repris', ecran: () => import('./Horaires') },
    { route: 'emplacement', statut: 'repris', ecran: () => import('./Emplacement') },
    { route: 'equipe', statut: 'repris', ecran: () => import('./Equipe') },
    { route: 'parametres', statut: 'repris', ecran: () => import('./Parametres') },
    { route: 'securite', statut: 'repris', ecran: () => import('./Securite') },
    { route: 'notifications', statut: 'repris', ecran: () => import('./Notifications') },
    { route: 'avis', statut: 'repris', ecran: () => import('./Avis') },
    { route: 'messages', statut: 'repris', ecran: () => import('./Messages') },
    { route: 'aide', statut: 'repris', ecran: () => import('./Aide') },
  ],
} satisfies RoutesGroupe
