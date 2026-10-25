// Routes du groupe EQUIPE (logique-metier/ACCES-CONSOLE.md) : fiche d'un membre, « Mon équipe » du Responsable
// d'équipe, descentes terrain (planification des Opérations, « Mes descentes » de l'agent terrain). « Équipe et accès »
// garde la route « roles » de l'écran ADM-P32 (ADM-12).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'EQUIPE',
  routes: [
    { route: 'membre', ecran: 'AJ-A', titre: 'Fiche d’un membre', statut: 'repris', composant: () => import('./Membre'), parent: 'roles', nav: 'roles' },
    { route: 'mon-equipe', ecran: 'AJ-A', titre: 'Mon équipe', statut: 'repris', composant: () => import('./MonEquipe'), parent: 'menu' },
    { route: 'descentes', ecran: 'AJ-A', titre: 'Descentes terrain', statut: 'repris', composant: () => import('./Descentes'), parent: 'menu' },
    { route: 'mes-descentes', ecran: 'AJ-A', titre: 'Mes descentes', statut: 'repris', composant: () => import('./MesDescentes'), parent: 'menu', etroit: true },
  ],
} satisfies RoutesGroupe
