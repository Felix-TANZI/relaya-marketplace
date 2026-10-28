// Routes du groupe ENT-05 (prix et délais, paquets, acceptation et affectation : ENT-P09 à P12) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// Les quatre écrans sont repris. Rôles (ENT-02-R64, R65) : paquets, détail et affectation pour le propriétaire et
// le répartiteur ; le comptable lit les prix et délais seulement.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-05',
  routes: [
    { route: 'sla', ecran: 'ENT-P09', titre: 'Prix et délais', statut: 'repris', composant: () => import('./Sla'), parent: 'menu' },
    { route: 'paquets', ecran: 'ENT-P10', titre: 'Paquets disponibles', statut: 'repris', composant: () => import('./Paquets'), onglet: 'paquets', roles: ['proprietaire', 'repartiteur'] },
    { route: 'paquet', ecran: 'ENT-P11', titre: 'Détail du paquet', statut: 'repris', composant: () => import('./Paquet'), parent: 'paquets', roles: ['proprietaire', 'repartiteur'] },
    { route: 'affectation', ecran: 'ENT-P12', titre: 'Affecter un livreur', statut: 'repris', composant: () => import('./Affectation'), parent: 'paquets', roles: ['proprietaire', 'repartiteur'] },
  ],
} satisfies RoutesGroupe
