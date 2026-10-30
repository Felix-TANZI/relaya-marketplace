// Routes du groupe ADM-03 (Accès et file d’action) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// Les trois écrans sont repris (Connexion, File, Direct) ; regles.ts (délais et seuils lus), kit.tsx et s1.css servent
// aussi aux écrans d'ADM-04 et aux pages ajoutées du groupe (quatreyeux, recherche).
// « direct » (Vue d'ensemble) est une page ajoutée (AJ-A) tenue par ce groupe : la vie de la plateforme en direct.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-03',
  routes: [
    { route: 'connexion', ecran: 'ADM-P01', titre: 'Connexion et second facteur', statut: 'repris', composant: () => import('./Connexion'), sansSession: true },
    { route: 'activation', ecran: 'AJ-A', titre: 'Activation du compte', statut: 'repris', composant: () => import('./Activation'), sansSession: true },
    { route: 'direct', ecran: 'AJ-A', titre: 'Vue d’ensemble', statut: 'repris', composant: () => import('./Direct'), parent: 'file', onglet: 'file' },
    { route: 'file', ecran: 'ADM-P02', titre: 'File d’action', statut: 'repris', composant: () => import('./File'), onglet: 'file' },
  ],
} satisfies RoutesGroupe
