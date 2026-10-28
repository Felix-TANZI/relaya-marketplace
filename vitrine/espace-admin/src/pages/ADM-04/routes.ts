// Routes du groupe ADM-04 (Litiges et commandes) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-04',
  routes: [
    { route: 'litige', ecran: 'ADM-P03', titre: 'Dossier de litige et arbitrage', statut: 'repris', composant: () => import('./Litige'), parent: 'menu' },
    { route: 'commandes', ecran: 'ADM-P04', titre: 'Commandes et fiche commande', statut: 'repris', composant: () => import('./Commandes'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
