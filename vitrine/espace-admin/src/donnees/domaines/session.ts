// Domaine « session » (ADM-P01, en-tête ; tenu par S1) : l'agent connecté, ses rôles cumulés (ADM-ROL-02) et le rôle
// sous lequel il agit, ses zones (ADM-ROL-03), l'espace pays, les compteurs de la coque, les interrupteurs des
// fonctions d'après lancement (assistant IA : FF-IA). La connexion se fait avec un second facteur, toujours (ADM-03).
// Démonstration : « ?role=<code> » connecte l'agent de démonstration qui tient ce rôle (le double contrôle se montre
// en changeant de personne : un second validateur est un AUTRE compte).
import type { CodeZone, Instant, Role } from '../communs'
import type { CodeEquipe, Niveau, Perimetre } from './equipe'

export interface AppareilConnu {
  id: string
  nom: string // « Ordinateur · Chrome · Yaoundé »
  vuLe: Instant
  courant: boolean
}

export interface Agent {
  id: string
  prenom: string
  nom: string
  initiales: string
  roles: Role[] // rôles cumulés (ADM-ROL-02)
  zones: CodeZone[] | null // null : tous les périmètres
  telephone: string // masqué : « +237 6•• •• •• 17 »
  email: string
  secondFacteur: 'sms' | 'application'
  appareils: AppareilConnu[]
  note?: string // « Désignation à confirmer » (médiation, second validateur)
}

export interface EspacePays {
  code: string // « CM »
  nom: string // « Cameroun »
  devise: string // « XAF »
  ville: string // « Yaoundé »
  zonesExploitees: CodeZone[]
  zonesTotal: number
}

/** Compteurs de la coque (barre latérale, onglets, cloche), déjà filtrés par rôle et par zone. */
export interface Badges {
  file: number
  litige: number
  support: number
  remboursements: number
  kyc: number
  paliers: number
  fraude: number
  moderation: number
  paquets: number
  quatreyeux: number
  sanctions: number
  messagerie: number
  panne: number
  parametrage: number
  /** Lots du vendredi à contrôler, contresigner ou débloquer (R22, R43). */
  versements: number
  /** Candidatures de relais et d'entreprises à prendre ou compléter (activation des comptes). */
  candidatures: number
  /** Comptes des employés à revoir (Ressources humaines). */
  equipe: number
}

export interface SessionAdmin {
  connecte: boolean
  agent: Agent | null
  role: Role // rôle sous lequel l'agent agit (chaque ligne du journal le porte)
  pays: EspacePays
  badges: Badges
  interrupteurs: Record<string, boolean> // « FF-IA » : false → l'assistant est caché
  astreinte: boolean
  /** Panne de service en cours (déclarée par la console, ADM-P28) : bandeau de la coque, comme dans les cinq autres espaces. */
  panne?: { id: string; service: string; zones: string[]; etat: 'declare' | 'papier' | 'retabli'; consignes: string } | null
  maintenant: Instant
  expire: Instant | null
  /** Équipe, niveau et périmètre de l'agent (logique-metier/ACCES-CONSOLE.md) ; null : compte hors équipe. */
  membre?: { equipe: CodeEquipe; niveau: Niveau; perimetre: Perimetre; urgenceJusqua: Instant | null } | null
  /** Messages non lus et changements d'accès à voir (Profil). */
  messagesNonLus?: number
}

/** Employé de démonstration (sélecteur de la connexion, groupé par équipe). */
export interface CompteDemo {
  agentId: string
  nom: string
  initiales: string
  equipe: CodeEquipe
  niveau: Niveau
  role: Role
  actif: boolean
}

/** Agent de démonstration proposé à la connexion (un par rôle). */
export interface AgentDemo {
  role: Role
  agentId: string
  nom: string
}

/** Étape 1 de la connexion (ADM-P01) : identifiant nominatif et mot de passe. */
export type ResultatIdentifiants =
  | { ok: true; agent: { id?: string; prenom: string; nom: string; initiales: string; identifiant: string; secondFacteur: 'sms' | 'application' } }
  | { ok: false; raison: 'invalide'; restants: number }
  | { ok: false; raison: 'bloque'; jusqua: Instant }
  | { ok: false; raison: 'suspendu' }
  /** Lien de connexion par e-mail expiré ou déjà servi (kit). */
  | { ok: false; raison: 'lien_expire' }
  /** Comptes réels : le service ne peut pas ouvrir la console (second facteur non configuré) ; message humain du serveur. */
  | { ok: false; raison: 'indisponible'; message: string }

/** Étape 2 : second facteur (code à 6 chiffres). */
export type ResultatCode =
  | { ok: true; nouvelAppareil: boolean }
  | { ok: false; raison: 'faux'; restants: number }
  | { ok: false; raison: 'retour_etape_1' }
  | { ok: false; raison: 'expire' }

/** Invitation d'un employé (Ressources humaines ou Direction) : ce que le lien d'activation montre avant d'activer. */
export interface Invitation {
  jeton: string
  prenom: string
  nom: string
  email: string
  roles: Role[]
  zones: CodeZone[] | null
  expireLe: Instant
  /** Clé du second facteur à saisir dans l'application d'authentification (démonstration : affichée en clair). */
  cleSecondFacteur: string
}
export type ResultatInvitation = { ok: true; invitation: Invitation } | { ok: false; raison: 'inconnue' | 'expiree' | 'deja_active' }
export type ResultatActivation =
  | { ok: true }
  | { ok: false; raison: 'inconnue' | 'expiree' | 'deja_active' | 'mot_de_passe_court' | 'mots_de_passe_differents' | 'code_faux' | 'charte' }

export interface DomaineSession {
  session(): Promise<SessionAdmin>
  /** État du blocage (5 échecs : 30 min), lu à l'ouverture de l'écran de connexion. */
  blocage(): Promise<{ jusqua: Instant | null; echecs: number }>
  connecter(identifiant: string, motDePasse: string): Promise<ResultatIdentifiants>
  verifierCode(code: string, canal: 'application' | 'sms'): Promise<ResultatCode>
  /** Code de secours par SMS (envoyé au téléphone de l'agent, jamais affiché). */
  envoyerCodeSms(): Promise<{ ok: true; telephone: string } | { ok: false; raison: 'sans_etape_1' | 'application_obligatoire' }>
  deconnecter(): Promise<void>
  /** ADM-ROL-02 : agir sous un autre de ses rôles (journalisé). Refusé si l'agent ne tient pas ce rôle. */
  agirEnTantQue(role: Role): Promise<{ ok: true } | { ok: false; raison: 'role_non_tenu' }>
  /** Démonstration seulement : se connecter comme l'agent qui tient ce rôle (« ?role=finance »). */
  changerRole(role: Role): Promise<void>
  agentsDemo(): Promise<AgentDemo[]>
  /** Démonstration seulement : se connecter comme un employé précis (sélecteur groupé par équipe de la connexion). */
  changerAgent(agentId: string): Promise<{ ok: true } | { ok: false; raison: 'suspendu' | 'inconnu' }>
  /** Démonstration : tous les employés, par équipe (au moins un Responsable et un Agent dans chacune). */
  comptesDemo(): Promise<CompteDemo[]>
  /** Activation d'un compte d'employé invité (lien à jeton, ADM-INVITATION-H) : lecture de l'invitation. */
  invitation(jeton: string): Promise<ResultatInvitation>
  /** Activation : mot de passe (MDP-LONG), second facteur enrôlé (code à 6 chiffres), charte acceptée ; journalisée. */
  activer(jeton: string, a: { motDePasse: string; confirmation: string; code: string; charte: boolean }): Promise<ResultatActivation>
}
