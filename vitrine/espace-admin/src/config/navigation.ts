// Navigation groupée de la console (APP.nav du prototype, ordinateur d'abord) : Travail du jour, Argent, Acteurs et
// confiance, Catalogue, Logistique, Pilotage, Gouvernance — même ordre, mêmes icônes, mêmes compteurs (« Fraude et
// anneaux » sous Gouvernance, comme le fil d'Ariane d'ADM-12) — avec, en plus,
// « Vue d'ensemble » en tête du Travail du jour et le groupe « Console » des pages ajoutées. Une seule liste, lue par la
// barre latérale, le tiroir de la tablette et le Menu ; une entrée fermée au rôle (config/droits.ts) ou à un
// interrupteur (assistant : FF-IA fermé) disparaît. badge : compteur de la session ; ton alerte : orange BelivaY.
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
  {
    titre: 'Travail du jour',
    entrees: [
      { route: 'direct', titre: 'Vue d’ensemble', icone: 'layout-dashboard' },
      { route: 'file', titre: 'File d’action', icone: 'inbox', badge: 'file', ton: 'alerte' },
      { route: 'litige', titre: 'Litiges', icone: 'scale', badge: 'litige', ton: 'info' },
      { route: 'postes', titre: 'Postes de décision', icone: 'clipboard-check' },
      { route: 'commandes', titre: 'Commandes', icone: 'shopping-bag' },
      { route: 'support', titre: 'Support', icone: 'life-buoy', badge: 'support', ton: 'info' },
    ],
  },
  {
    titre: 'Argent',
    entrees: [
      { route: 'escrow', titre: 'Escrow et registre', icone: 'landmark' },
      { route: 'remboursements', titre: 'Remboursements', icone: 'undo-2', badge: 'remboursements', ton: 'info' },
      { route: 'versements', titre: 'Versements du vendredi', icone: 'banknote', badge: 'versements', ton: 'info' },
      { route: 'rapprochement', titre: 'Rapprochement', icone: 'scale-3d' },
      { route: 'wallet', titre: 'Suivi du Wallet', icone: 'wallet' },
      { route: 'remb-auto', titre: 'Remboursements automatiques', icone: 'repeat' },
      { route: 'frais-paiement', titre: 'Frais de paiement du mois', icone: 'receipt' },
    ],
  },
  {
    titre: 'Acteurs et confiance',
    entrees: [
      { route: 'kyc', titre: 'Revue KYC', icone: 'id-card', badge: 'kyc', ton: 'info' },
      { route: 'vendeurs', titre: 'Vendeurs', icone: 'store' },
      { route: 'clients', titre: 'Clients et IFA', icone: 'users' },
      { route: 'abonnements', titre: 'Abonnements des clients', icone: 'repeat' },
      { route: 'paliers', titre: 'Paliers et Trust Score', icone: 'gauge', badge: 'paliers', ton: 'info' },
      { route: 'qualite', titre: 'Qualité des acteurs', icone: 'activity' },
      { route: 'sanctions', titre: 'Sanctions et recours', icone: 'gavel', badge: 'sanctions', ton: 'info' },
    ],
  },
  {
    titre: 'Catalogue',
    entrees: [
      { route: 'catalogue', titre: 'Fiches maîtres', icone: 'library' },
      { route: 'moderation', titre: 'Modération des offres', icone: 'badge-check', badge: 'moderation', ton: 'info' },
      { route: 'avis', titre: 'Avis', icone: 'star' },
    ],
  },
  {
    titre: 'Logistique',
    entrees: [
      { route: 'relais', titre: 'Points relais', icone: 'package-check' },
      { route: 'entreprises', titre: 'Entreprises de livraison', icone: 'truck' },
      { route: 'livreurs', titre: 'Livreurs', icone: 'bike' },
      { route: 'paquets', titre: 'Paquets et dispatch', icone: 'boxes', badge: 'paquets', ton: 'alerte' },
      { route: 'zones', titre: 'Pilotage des zones', icone: 'map-pinned' },
      { route: 'carte', titre: 'Carte opérationnelle', icone: 'map' },
      { route: 'emballages', titre: 'Emballages et étiquettes', icone: 'package-open' },
      { route: 'descentes', titre: 'Descentes terrain', icone: 'map-pinned' },
      { route: 'mes-descentes', titre: 'Mes descentes', icone: 'footprints' },
    ],
  },
  {
    titre: 'Pilotage',
    entrees: [
      { route: 'parametrage', titre: 'Paramétrage et simulation', icone: 'sliders-horizontal', badge: 'parametrage', ton: 'alerte' },
      { route: 'commissions', titre: 'Commissions et abonnements', icone: 'percent' },
      { route: 'promotions', titre: 'Promotions et fidélité', icone: 'megaphone' },
      { route: 'contenu-site', titre: 'Contenu du site', icone: 'image' },
      { route: 'messagerie', titre: 'Messagerie et notifications', icone: 'send', badge: 'messagerie', ton: 'alerte' },
      { route: 'panne', titre: 'Panne et mode papier', icone: 'siren', badge: 'panne', ton: 'alerte' },
      { route: 'rapports', titre: 'Rapports et indicateurs', icone: 'chart-column' },
      { route: 'sante', titre: 'Santé du système', icone: 'activity' },
    ],
  },
  {
    titre: 'Gouvernance',
    entrees: [
      { route: 'fraude', titre: 'Fraude et anneaux', icone: 'shield-alert', badge: 'fraude', ton: 'alerte' },
      { route: 'journal', titre: 'Journal d’audit', icone: 'scroll-text' },
      { route: 'roles', titre: 'Équipe et accès', icone: 'key-round', badge: 'equipe', ton: 'info' },
      { route: 'mon-equipe', titre: 'Mon équipe', icone: 'users' },
      { route: 'comptes', titre: 'Comptes et agents terrain', icone: 'user-plus' },
      { route: 'pays', titre: 'Espaces pays', icone: 'globe' },
      { route: 'legal', titre: 'Contenus légaux', icone: 'file-check' },
      { route: 'assistant', titre: 'Assistant IA', icone: 'sparkles' },
    ],
  },
  {
    titre: 'Console',
    entrees: [
      { route: 'quatreyeux', titre: 'Quatre yeux en attente', icone: 'users', badge: 'quatreyeux', ton: 'alerte' },
      { route: 'candidatures', titre: 'Candidatures des partenaires', icone: 'user-plus', badge: 'candidatures', ton: 'info' },
      { route: 'export', titre: 'Export comptable', icone: 'file-text' },
      { route: 'interrupteurs', titre: 'Interrupteurs de fonctions', icone: 'sliders-horizontal' },
      { route: 'modeles', titre: 'Modèles de messages', icone: 'message-circle' },
      { route: 'taches', titre: 'Tâches planifiées', icone: 'timer' },
      { route: 'conservation', titre: 'Conservation des données', icone: 'shield-check' },
    ],
  },
]

/** Routes qui sont une entrée de navigation (page « de premier niveau » : pas de flèche de retour à l'ordinateur). */
export const ENTREES = new Set(NAVIGATION.flatMap((g) => g.entrees.map((e) => e.route)))
