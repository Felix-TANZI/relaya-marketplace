// Routes du groupe ADM-12 (Fraude, journal, rôles, pays et comptes) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-12',
  routes: [
    { route: 'fraude', ecran: 'ADM-P30', titre: 'Fraude et anneaux', statut: 'repris', composant: () => import('./Fraude'), parent: 'menu' },
    { route: 'journal', ecran: 'ADM-P31', titre: 'Journal d’audit', statut: 'repris', composant: () => import('./Journal'), parent: 'menu' },
    { route: 'roles', ecran: 'ADM-P32', titre: 'Équipe et accès', statut: 'repris', composant: () => import('./Roles'), parent: 'menu' },
    { route: 'pays', ecran: 'ADM-P33', titre: 'Espaces pays', statut: 'repris', composant: () => import('./Pays'), parent: 'menu' },
    { route: 'comptes', ecran: 'ADM-P34', titre: 'Création de comptes multi-rôles et agents terrain', statut: 'repris', composant: () => import('./Comptes'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
