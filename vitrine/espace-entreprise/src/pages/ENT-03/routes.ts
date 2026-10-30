// Routes du groupe ENT-03 (accès, tableau de bord, contrat et documents, états du compte : ENT-P01 à P03, P27) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générique du socle (../Provisoire.tsx : ce que l'extraction attend de l'écran) ;
// « repris » : écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus.
// Connexion : pleine largeur à l'ordinateur (visuel à gauche, formulaire à droite, ENT-03-R03).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-03',
  routes: [
    { route: 'connexion', ecran: 'ENT-P01', titre: 'Connexion', statut: 'repris', composant: () => import('./Connexion'), sansSession: true },
    { route: 'candidature', ecran: 'ENT-P01', titre: 'Candidature de votre entreprise', statut: 'repris', composant: () => import('./Candidature'), sansSession: true },
    { route: 'tableau', ecran: 'ENT-P02', titre: 'Tableau de bord', statut: 'repris', composant: () => import('./Tableau'), onglet: 'tableau' },
    { route: 'contrat', ecran: 'ENT-P03', titre: 'Contrat et documents', statut: 'repris', composant: () => import('./Contrat'), parent: 'menu' },
    { route: 'etat', ecran: 'ENT-P27', titre: 'État du compte', statut: 'repris', composant: () => import('./Etat'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
