// Routes du groupe ADM-13 (Rapports, santé, légal et assistant) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
// Assistant IA (FF-IA) : fonction d'après lancement, cachée tant que l'interrupteur est fermé (la route renvoie à l'accueil).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-13',
  routes: [
    { route: 'rapports', ecran: 'ADM-P35', titre: 'Rapports et indicateurs', statut: 'repris', composant: () => import('./Rapports'), parent: 'menu' },
    { route: 'sante', ecran: 'ADM-P36', titre: 'Santé du système et maintenance', statut: 'repris', composant: () => import('./Sante'), parent: 'menu' },
    { route: 'legal', ecran: 'ADM-P37', titre: 'Contenus légaux et produits interdits', statut: 'repris', composant: () => import('./Legal'), parent: 'menu' },
    { route: 'assistant', ecran: 'ADM-P38', titre: 'Assistant IA de la console', statut: 'provisoire', composant: () => import('../Provisoire'), interrupteur: 'FF-IA' },
  ],
} satisfies RoutesGroupe
