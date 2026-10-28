// Routes du groupe ENT-00 (socle) : le Menu (navigation complète, comme le prototype) et le Profil (la personne
// connectée : préférences, rôle, déconnexion ; page ajoutée, ouverte par l'avatar), distincts comme dans le prototype.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-00',
  routes: [
    { route: 'menu', ecran: 'socle', titre: 'Menu', statut: 'repris', composant: () => import('./Menu'), onglet: 'menu', etroit: true },
    { route: 'profil', ecran: 'socle', titre: 'Mon entreprise', statut: 'repris', composant: () => import('./Profil'), parent: 'menu', onglet: 'menu', etroit: true },
  ],
} satisfies RoutesGroupe
