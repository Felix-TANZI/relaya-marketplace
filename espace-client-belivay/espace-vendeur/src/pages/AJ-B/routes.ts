// Routes du groupe AJ-B (DP-58, pages ajoutées) : Mon profil, Rechercher, Ramassages, Apprendre, Activité de la
// boutique, Mes ajustements (vue réelle, liée depuis Mon argent). La seule liste de routage du groupe (METHODE.md
// § 4.7) ; titre et retour donnent leur fiche et leur coque (npm run inventaire : pages.json, etats.json).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-B',
  routes: [
    { route: 'profil', statut: 'repris', titre: 'Mon profil', retour: '#menu', ecran: () => import('./Profil') },
    { route: 'recherche', statut: 'repris', titre: 'Rechercher', retour: '#menu', ecran: () => import('./Recherche') },
    { route: 'ramassages', statut: 'repris', titre: 'Ramassages', retour: '#commandes', ecran: () => import('./Ramassages') },
    { route: 'apprendre', statut: 'repris', titre: 'Apprendre', retour: '#menu', ecran: () => import('./Apprendre') },
    { route: 'activite', statut: 'repris', titre: 'Activité de la boutique', retour: '#menu', ecran: () => import('./Activite') },
    { route: 'ajustements', statut: 'repris', titre: 'Mes ajustements', retour: '#argent', ecran: () => import('./Ajustements') },
  ],
} satisfies RoutesGroupe
