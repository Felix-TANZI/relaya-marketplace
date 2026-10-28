// Navigation groupée de l'espace entreprise (outil de travail d'un responsable de flotte, ordinateur d'abord ; groupes
// du prototype, APP.nav, réorganisés en espaces : ORGANISATION.md) : Aujourd’hui, Paquets, Missions, Livreurs, Équipe, Argent,
// Qualité, Mon entreprise, Aide. Une seule liste, lue
// par la barre latérale de l'ordinateur, le tiroir de la tablette et le Menu du téléphone (composants/coque.tsx).
// Une entrée dont la route est réservée à d'autres rôles (fiche de la route : roles) disparaît (ENT-RG-R25).
// badge : compteur de la session affiché à droite de l'entrée ; ton : sa couleur (alerte : orange BelivaY).
import type { Badges } from '../donnees/domaines/session'

export interface EntreeNav {
  route: string
  titre: string
  icone: string
  badge?: keyof Badges
  ton?: 'alerte' | 'info'
}
export interface GroupeNav {
  titre: string
  entrees: EntreeNav[]
}

export const NAVIGATION: GroupeNav[] = [
  // Espaces de travail, dans l'ordre d'une journée (ORGANISATION.md) : le premier maillon du fil d'Ariane.
  { titre: 'Aujourd’hui', entrees: [{ route: 'tableau', titre: 'Tableau de bord', icone: 'layout-dashboard' }] },
  {
    titre: 'Paquets',
    entrees: [
      { route: 'paquets', titre: 'Paquets disponibles', icone: 'boxes', badge: 'paquets', ton: 'alerte' },
      { route: 'colis', titre: 'Colis', icone: 'package' },
      { route: 'preuves', titre: 'Preuves', icone: 'camera' },
    ],
  },
  {
    titre: 'Missions',
    entrees: [
      { route: 'missions', titre: 'Missions et carte', icone: 'map', badge: 'missions', ton: 'info' },
      { route: 'incidents', titre: 'Incidents à valider', icone: 'triangle-alert', badge: 'incidents', ton: 'alerte' },
    ],
  },
  {
    titre: 'Livreurs',
    entrees: [
      { route: 'flotte', titre: 'Livreurs', icone: 'users', badge: 'demandes', ton: 'alerte' },
      { route: 'vehicules', titre: 'Véhicules', icone: 'bike' },
      { route: 'emballages', titre: 'Emballages', icone: 'package-open' },
    ],
  },
  {
    // L'entreprise employeur (DP-66, DP-67) : registre, pièces du dossier, horaires et absences.
    titre: 'Équipe',
    entrees: [
      { route: 'equipe', titre: 'Registre du personnel', icone: 'briefcase' },
      { route: 'pieces', titre: 'Pièces des livreurs', icone: 'id-card', badge: 'pieces', ton: 'alerte' },
      { route: 'planning', titre: 'Planning des livreurs', icone: 'calendar-days' },
    ],
  },
  {
    titre: 'Argent',
    entrees: [
      { route: 'reglements', titre: 'Règlements', icone: 'banknote' },
      { route: 'releves', titre: 'Relevés et factures', icone: 'file-text' },
      { route: 'rapports', titre: 'Rapports', icone: 'chart-column' },
    ],
  },
  {
    titre: 'Qualité',
    entrees: [
      { route: 'score', titre: 'Score qualité', icone: 'gauge' },
      { route: 'litiges', titre: 'Litiges', icone: 'scale', badge: 'litiges', ton: 'alerte' },
    ],
  },
  {
    titre: 'Mon entreprise',
    entrees: [
      { route: 'contrat', titre: 'Contrat et documents', icone: 'file-signature' },
      { route: 'zones', titre: 'Zones et capacité', icone: 'map-pinned' },
      { route: 'sla', titre: 'Prix et délais', icone: 'timer' },
      { route: 'roles', titre: 'Rôles et accès', icone: 'shield-check' },
      { route: 'parametres', titre: 'Paramètres', icone: 'settings' },
      { route: 'integrations', titre: 'Intégrations', icone: 'plug' },
      { route: 'etat', titre: 'État du compte', icone: 'badge-check' },
    ],
  },
  { titre: 'Aide', entrees: [{ route: 'messages', titre: 'Messages', icone: 'message-circle', badge: 'messages', ton: 'info' }] },
]

/** Routes qui sont une entrée de navigation (page « de premier niveau » : pas de flèche de retour à l'ordinateur). */
export const ENTREES = new Set(NAVIGATION.flatMap((g) => g.entrees.map((e) => e.route)))
