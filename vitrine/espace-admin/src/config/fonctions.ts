// Les fonctions de chaque rôle, en tête de son accueil (File d'action) : ce que CE poste fait d'abord, avec son nombre
// (compteurs de la session, filtrés par rôle et par zone). Une vue par équipe : Direction, Finance (versements),
// Support, Médiation (litiges), Opérations, Vérification, Audit, Ressources humaines, Agent terrain. Jamais une
// fonction vers une page que le rôle n'ouvre pas (droits.ts) : la liste est filtrée à l'affichage.
import type { Fonction } from '../composants/Fonctions'
import type { Role } from '../donnees/communs'
import type { Badges } from '../donnees/domaines/session'
import { pageOuverte } from './droits'
import { chemin } from './pages'

type Def = Omit<Fonction, 'vers' | 'n'> & { route: string; params?: Record<string, string>; n: (b: Badges) => number | null }

const F = {
  contresigner: { verbe: 'Contresigner', unite: ['décision', 'décisions'], icone: 'users-round', route: 'quatreyeux', n: (b) => b.quatreyeux },
  arbitrer: { verbe: 'Arbitrer', unite: ['litige', 'litiges'], icone: 'scale', route: 'litige', n: (b) => b.litige },
  traiterLitiges: { verbe: 'Traiter', unite: ['litige', 'litiges'], icone: 'scale', route: 'litige', n: (b) => b.litige },
  valider: { verbe: 'Valider', unite: ['identité', 'identités'], icone: 'id-card', route: 'kyc', n: (b) => b.kyc },
  activer: { verbe: 'Activer', unite: ['candidature', 'candidatures'], icone: 'user-plus', route: 'candidatures', n: (b) => b.candidatures },
  rembourser: { verbe: 'Rembourser', unite: ['client', 'clients'], icone: 'undo-2', route: 'remboursements', n: (b) => b.remboursements },
  verser: { verbe: 'Débloquer', unite: ['versement', 'versements'], icone: 'banknote', route: 'versements', n: (b) => b.versements },
  repondre: { verbe: 'Répondre', unite: ['demande', 'demandes'], icone: 'life-buoy', route: 'support', n: (b) => b.support },
  relancer: { verbe: 'Relancer', unite: ['message', 'messages'], icone: 'message-square-warning', route: 'messagerie', n: (b) => b.messagerie },
  sanctionner: { verbe: 'Décider', unite: ['sanction', 'sanctions'], icone: 'gavel', route: 'sanctions', n: (b) => b.sanctions },
  paliers: { verbe: 'Revoir', unite: ['palier', 'paliers'], icone: 'trophy', route: 'paliers', n: (b) => b.paliers },
  fraude: { verbe: 'Instruire', unite: ['alerte', 'alertes'], icone: 'shield-alert', route: 'fraude', n: (b) => b.fraude, alerte: true },
  debloquer: { verbe: 'Débloquer', unite: ['paquet', 'paquets'], icone: 'boxes', route: 'paquets', n: (b) => b.paquets, alerte: true },
  panne: { verbe: 'Suivre', unite: ['panne', 'pannes'], icone: 'siren', route: 'panne', n: (b) => b.panne, alerte: true },
  moderer: { verbe: 'Modérer', unite: ['offre', 'offres'], icone: 'badge-check', route: 'moderation', n: (b) => b.moderation },
  parametres: { verbe: 'Valider', unite: ['paramètre', 'paramètres'], icone: 'sliders-horizontal', route: 'parametrage', n: (b) => b.parametrage },
  equipe: { verbe: 'Revoir', unite: ['compte', 'comptes'], icone: 'key-round', route: 'roles', n: (b) => b.equipe },
  inviter: { verbe: 'Inviter', unite: ['employé', 'employés'], icone: 'user-plus', route: 'roles', params: { inviter: '1' }, n: () => null },
  journal: { verbe: 'Contrôler', unite: ['trace', 'traces'], icone: 'scroll-text', route: 'journal', n: () => null },
  exporter: { verbe: 'Exporter', unite: ['liste', 'listes'], icone: 'download', route: 'export', n: () => null },
  saisir: { verbe: 'Saisir', unite: ['fiche', 'fiches'], icone: 'user-plus', route: 'comptes', n: () => null },
  photos: { verbe: 'Photographier', unite: ['local', 'locaux'], icone: 'camera', route: 'kyc', n: (b) => b.kyc },
} satisfies Record<string, Def>

const ROLES_FONCTIONS: Record<Role, Def[]> = {
  superviseur: [F.contresigner, F.arbitrer, F.valider, F.verser, F.fraude],
  finance: [F.verser, F.rembourser, F.contresigner, F.parametres],
  support: [F.repondre, F.traiterLitiges, F.relancer],
  mediation: [F.arbitrer, F.sanctionner, F.fraude, F.paliers],
  operations: [F.debloquer, F.activer, F.panne],
  verification: [F.valider, F.activer, F.moderer],
  audit: [F.fraude, F.journal, F.exporter],
  rh: [F.equipe, F.inviter, F.contresigner],
  terrain: [F.saisir, F.photos],
}

/** Fonctions de l'accueil d'un rôle, avec leur nombre ; seulement vers les pages que le rôle ouvre. */
export function fonctionsDuRole(role: Role, b: Badges): Fonction[] {
  return ROLES_FONCTIONS[role]
    .filter((d) => pageOuverte(d.route, role))
    .map(({ route, params, n, ...d }) => ({ ...d, n: n(b), vers: chemin(route, params) }))
}
