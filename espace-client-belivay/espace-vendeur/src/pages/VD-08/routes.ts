// Routes du groupe VD-08 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-08',
  routes: [
    { route: 'produits', statut: 'repris', ecran: () => import('./Produits') },
    { route: 'offre_detail', statut: 'repris', ecran: () => import('./OffreDetail') },
    { route: 'offre1', statut: 'repris', ecran: () => import('./Offre1') },
    { route: 'fiche', statut: 'repris', ecran: () => import('./Fiche') },
    { route: 'offre2', statut: 'repris', ecran: () => import('./Offre2') },
    { route: 'camera', statut: 'repris', ecran: () => import('./Camera') },
    { route: 'offre3', statut: 'repris', ecran: () => import('./Offre3') },
    { route: 'offre4', statut: 'repris', ecran: () => import('./Offre4') },
    { route: 'offre_publiee', statut: 'repris', ecran: () => import('./OffrePubliee') },
    { route: 'dupliquer', statut: 'repris', ecran: () => import('./Dupliquer') },
  ],
} satisfies RoutesGroupe
