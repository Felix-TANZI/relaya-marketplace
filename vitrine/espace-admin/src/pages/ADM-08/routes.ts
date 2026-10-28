// Routes du groupe ADM-08 (Relais, entreprises, livreurs et paquets) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-08',
  routes: [
    { route: 'relais', ecran: 'ADM-P17', titre: 'Points relais', statut: 'repris', composant: () => import('./Relais'), parent: 'menu' },
    { route: 'entreprises', ecran: 'ADM-P18', titre: 'Entreprises de livraison', statut: 'repris', composant: () => import('./Entreprises'), parent: 'menu' },
    { route: 'livreurs', ecran: 'ADM-P19', titre: 'Livreurs', statut: 'repris', composant: () => import('./Livreurs'), parent: 'menu' },
    { route: 'paquets', ecran: 'ADM-P20', titre: 'Paquets et dispatch', statut: 'repris', composant: () => import('./Paquets'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
