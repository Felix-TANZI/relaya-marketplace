// Routes du groupe ENT-07 (litiges, règlements, relevés et score qualité : ENT-P17 à P20) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générique du socle (../Provisoire.tsx : ce que l'extraction attend de l'écran) ;
// « repris » : écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-07',
  routes: [
    { route: 'litiges', ecran: 'ENT-P17', titre: 'Litiges', statut: 'repris', composant: () => import('./Litiges'), parent: 'menu' },
    { route: 'reglements', ecran: 'ENT-P18', titre: 'Règlements', statut: 'repris', composant: () => import('./Reglements'), parent: 'menu', roles: ['proprietaire', 'comptable'] },
    { route: 'releves', ecran: 'ENT-P19', titre: 'Relevés et factures', statut: 'repris', composant: () => import('./Releves'), parent: 'menu', roles: ['proprietaire', 'comptable'] },
    { route: 'score', ecran: 'ENT-P20', titre: 'Score qualité', statut: 'repris', composant: () => import('./Score'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
