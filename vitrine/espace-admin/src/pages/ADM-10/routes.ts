// Routes du groupe ADM-10 (Paramétrage, commissions et promotions) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-10',
  routes: [
    { route: 'parametrage', ecran: 'ADM-P24', titre: 'Paramétrage et simulation', statut: 'repris', composant: () => import('./Parametrage'), parent: 'menu' },
    { route: 'commissions', ecran: 'ADM-P25', titre: 'Commissions, grilles et abonnements vendeur', statut: 'repris', composant: () => import('./Commissions'), parent: 'menu' },
    { route: 'promotions', ecran: 'ADM-P26', titre: 'Promotions, ventes flash, sponsorisé et fidélité', statut: 'repris', composant: () => import('./Promotions'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
