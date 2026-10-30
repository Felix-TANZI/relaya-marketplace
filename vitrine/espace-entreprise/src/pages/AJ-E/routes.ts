// Pages ajoutées à l'espace entreprise (préfixe AJ-E ; ENRICHISSEMENTS.md, partie 2) : ce qui ne rentre dans aucun bloc
// du prototype va dans une page à part, liée depuis le bon endroit (BRIEF-PROTOTYPE). Le Profil (la personne) reste
// ENT-00/Profil.tsx, ouvert par l'avatar.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-E',
  routes: [
    { route: 'recherche', ecran: 'AJ-E', titre: 'Rechercher partout', statut: 'repris', composant: () => import('./Recherche'), parent: 'menu', onglet: 'menu', etroit: true },
    { route: 'securite', ecran: 'AJ-E', titre: 'Sécurité du compte', statut: 'repris', composant: () => import('./Securite'), parent: 'profil', onglet: 'menu' },
    { route: 'roles', ecran: 'AJ-E', titre: 'Rôles et accès', statut: 'repris', composant: () => import('./Roles'), parent: 'profil', onglet: 'menu' },
    { route: 'planning', ecran: 'AJ-E', titre: 'Planning des livreurs', statut: 'repris', composant: () => import('./Planning'), parent: 'flotte' },
    { route: 'apprendre', ecran: 'AJ-E', titre: 'Apprendre', statut: 'repris', composant: () => import('./Apprendre'), parent: 'menu', onglet: 'menu' },
    { route: 'activite', ecran: 'AJ-E', titre: 'Activité de l’équipe', statut: 'repris', composant: () => import('./Activite'), parent: 'menu', onglet: 'menu' },
  ],
} satisfies RoutesGroupe
