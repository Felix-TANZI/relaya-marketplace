// Domaine « files » (ADM-P02, File d'action ; tenu par S1) : ce qui demande une décision humaine, filtré par rôle et par
// zone CÔTÉ SOURCE (ADM-ROL-04, ADM-ANO-03 : une carte hors périmètre n'est jamais envoyée). Ordre (ADM-P02R-01,
// ADM-02-R39) : échéance − maintenant croissante (une échéance dépassée reste en tête), puis montant décroissant ; une
// carte sans échéance vient après. Aucune carte ne disparaît sans décision ou résolution automatique journalisée
// (ADM-P02R-03). Ouvrir une carte pose un verrou de ADM-VERROU-MIN pour les autres agents (ADM-P02R-02), prolongé à
// chaque ouverture, libéré à la fermeture ; chaque carte mène à l'écran qui décide (route et paramètres).
import type { CodeZone, Francs, Instant, Resultat, Role } from '../communs'

/** Les files de travail de la console (ADM-14-R31 et ajouts du porteur : départs échus, kit contesté, pièces…). */
export type FamilleCarte =
  | 'litige' // litige niveau 1 (Support)
  | 'recours' // litige niveau 2 et recours (Médiation)
  | 'remboursement'
  | 'kyc' // vérification d'identité, candidature d'un partenaire
  | 'piece' // pièce envoyée par un livreur, à contrôler
  | 'moderation'
  | 'score'
  | 'support'
  | 'livraison' // paquet en retard, incident
  | 'retour'
  | 'depart' // départ de livreur échu sans clôture
  | 'kit' // retenue de kit contestée
  | 'fraude'
  | 'quatreyeux'
  | 'finance' // lot du vendredi à contrôler, dette de relais reportée, carte de la Finance
  | 'candidature' // candidature d'un relais ou d'une entreprise à prendre en charge
  | 'sanction' // sanction proposée, recours à décider
  | 'messagerie' // message critique non délivré
  | 'relais' // relais saturé sans bascule, fermé sans transfert
  | 'panne' // incident de service en cours
  | 'equipe' // compte d'employé : suspendu (inactif), invitation sans suite, revue trimestrielle à faire (Ressources humaines)
  | 'systeme' // demande de données proche de l'échéance, tâche planifiée en échec

export interface Verrou {
  agentId: string
  agent: string // « Clarisse Mvondo »
  role: Role
  depuis: Instant
  jusqua: Instant
}

export interface CarteAction {
  id: string // « CA-LT-0412 »
  famille: FamilleCarte
  titre: string
  sous: string // contexte en une ligne
  objet: string // « LT-0412 »
  route: string // écran qui décide
  params?: Record<string, string>
  zone: CodeZone | null
  echeance: Instant | null
  montant: Francs | null // null : rôle sans accès à l'argent, ou carte sans montant
  alerte?: string // « Vendeur silencieux »
  creeeLe: Instant
  verrou: Verrou | null
  confieA: string | null // délégation (surcharge) : agent qui la reprend
}

/** Indicateurs de la file (ADM-RG-R19) et chiffres du jour ; null : pas mesuré, ou rôle sans accès à l'argent. */
export interface IndicateursFile {
  litigesOuverts: number
  litigesVeille: number
  delaiMedianH: number | null // médiane (décision − ouverture) sur 7 jours
  decides7j: number
  coutSmsParCommande: Francs | null // journal des envois (Messagerie, S5) : pas encore branché
  zonesEnAlerte: number
  zonesExploitees: number
  jour: {
    commandes: number
    valeur: Francs | null // argent d'autrui
    revenus: Francs | null // commissions + frais de livraison (ADM-MOD-07)
    escrow: Francs | null
    paquetsPublies: number
    sansPreneur: number
    piecesKyc: number
  }
}

/** Agent à qui confier des cartes en retard (surcharge, ADM-03-R04). */
export interface Delegue {
  agentId: string
  nom: string
  role: Role
  familles: FamilleCarte[]
}

export interface DomaineFiles {
  file(): Promise<CarteAction[]>
  indicateurs(): Promise<IndicateursFile>
  /** Ouvre la carte : verrou pour les autres (ADM-VERROU-MIN), prolongé si c'est déjà le sien. */
  ouvrir(id: string): Promise<Resultat<{ verrou: Verrou }, 'verrouillee' | 'inconnue'>>
  /** Ferme le dossier et libère le verrou (journalisé). */
  liberer(id: string): Promise<void>
  delegues(): Promise<Delegue[]>
  /** Surcharge : confie des cartes à un autre agent (motif, journal) ; rien n'est fermé en masse. */
  deleguer(ids: string[], agentId: string, motif: string): Promise<Resultat<{ n: number }, 'motif_court' | 'inconnu'>>
}
