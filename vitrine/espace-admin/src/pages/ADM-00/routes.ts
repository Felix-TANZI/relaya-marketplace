// Routes du groupe ADM-00 (socle) : le Menu (navigation complète) et le Profil (l'agent connecté : rôles cumulés,
// « Agir en tant que », zones, appareils, second facteur, préférences ; ouvert par l'avatar), distincts.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-00',
  routes: [
    { route: 'menu', ecran: 'socle', titre: 'Menu', statut: 'repris', composant: () => import('./Menu'), onglet: 'menu', etroit: true },
    { route: 'profil', ecran: 'socle', titre: 'Mon profil', statut: 'repris', composant: () => import('./Profil'), parent: 'menu', onglet: 'menu', etroit: true },
  ],
} satisfies RoutesGroupe
