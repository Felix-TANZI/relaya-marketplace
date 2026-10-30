// Routes du groupe ADM-06 (KYC, vendeurs, paliers et sanctions) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-06',
  routes: [
    { route: 'kyc', ecran: 'ADM-P09', titre: 'Revue KYC', statut: 'repris', composant: () => import('./Kyc'), parent: 'menu' },
    { route: 'vendeurs', ecran: 'ADM-P10', titre: 'Vendeurs', statut: 'repris', composant: () => import('./Vendeurs'), parent: 'menu' },
    { route: 'paliers', ecran: 'ADM-P11', titre: 'Paliers et Trust Score à valider', statut: 'repris', composant: () => import('./Paliers'), parent: 'menu' },
    { route: 'sanctions', ecran: 'ADM-P12', titre: 'Sanctions et recours', statut: 'repris', composant: () => import('./Sanctions'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
