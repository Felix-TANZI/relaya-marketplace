// Routes du groupe ENT-06 (missions et carte, incidents, colis et preuves : ENT-P13 à P16) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// Les quatre écrans sont repris. Rôles (ENT-02-R66, R67) : propriétaire et répartiteur ; le comptable n'a ni le
// suivi des missions, ni les incidents, ni les colis, ni les preuves.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-06',
  routes: [
    { route: 'missions', ecran: 'ENT-P13', titre: 'Missions et carte', statut: 'repris', composant: () => import('./Missions'), onglet: 'missions', roles: ['proprietaire', 'repartiteur'] },
    { route: 'incidents', ecran: 'ENT-P14', titre: 'Incidents à valider', statut: 'repris', composant: () => import('./Incidents'), parent: 'menu', roles: ['proprietaire', 'repartiteur'] },
    { route: 'colis', ecran: 'ENT-P15', titre: 'Colis', statut: 'repris', composant: () => import('./Colis'), parent: 'menu', roles: ['proprietaire', 'repartiteur'] },
    { route: 'preuves', ecran: 'ENT-P16', titre: 'Preuves', statut: 'repris', composant: () => import('./Preuves'), parent: 'menu', roles: ['proprietaire', 'repartiteur'] },
  ],
} satisfies RoutesGroupe
