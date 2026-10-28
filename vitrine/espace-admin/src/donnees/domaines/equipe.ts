// Domaine « equipe » (logique-metier/ACCES-CONSOLE.md, modèle validé par le porteur le 19 oct.) : les employés de la
// console organisés en ÉQUIPES, chacun à un NIVEAU (Agent, Senior, Responsable d'équipe) avec un PÉRIMÈTRE (zones,
// niveau de litige, plafond de montant), un rôle additionnel sans conflit, des accès temporaires (motif et fin
// obligatoires, retirés tout seuls), des avertissements avec accusé de lecture, la revue trimestrielle des accès,
// l'accès d'urgence de la Direction et les descentes terrain. La matrice page × rôle (config/droits.ts) reste le socle :
// les droits effectifs en sont une restriction (config/acces-console.ts). La source refuse (403) tout ce que le compte
// connecté ne peut pas faire, et chaque changement d'accès va au journal.
import type { CodeZone, Francs, Instant, Resultat, Role } from '../communs'
import type { EtatCompte, LigneJournal } from './gouvernance'
import type { Agent } from './session'

export type CodeEquipe = 'direction' | 'litiges' | 'service_client' | 'verification' | 'finance' | 'operations' | 'audit' | 'acces'
export type Niveau = 'agent' | 'senior' | 'responsable'

export interface Perimetre {
  zones: CodeZone[] | null // null : toutes les zones
  niveauLitige: 1 | 2 | null // null : sans objet (l'équipe ne tranche pas de litige)
  plafond: Francs | null // remboursement, geste commercial ; null : sans objet
}

export type EtatTemporaire = 'a_valider' | 'actif' | 'expire' | 'retire' | 'refuse'
export interface AccesTemporaire {
  id: string // « AT-0004 »
  role: Role
  motif: string // remplacement, congé, pic d'activité
  debut: Instant
  fin: Instant
  par: string
  etat: EtatTemporaire
  qy: string | null // plus de ADM-ACCES-TEMP-QY-J jours : validé par la Direction
}

export interface Conflit {
  roles: [Role, Role]
  raison: string
  dossier?: boolean // conflit seulement « sur le même dossier » (Vérification + Service client)
}

export interface Membre {
  agent: Agent // rôles et zones EFFECTIFS (équipe, niveau, rôle additionnel, accès temporaires actifs)
  equipe: CodeEquipe
  niveau: Niveau
  perimetre: Perimetre
  roleAdditionnel: Role | null
  temporaires: AccesTemporaire[]
  etat: EtatCompte
  derniereConnexion: Instant | null
  inviteLe: Instant | null
  jetonActivation: string | null
  suspension: { motif: string; le: Instant; par: string } | null
  depart: { le: Instant; motif: string; reattribues: number } | null
  revueLe: Instant | null // accès confirmés à la dernière revue
  dossiers: number // dossiers en cours (charge de travail)
  urgence: { jusqua: Instant; motif: string } | null
  conflits: Conflit[]
}

/** Ce qu'un membre peut faire, par domaine, en clair (« Ce que Rose peut faire »). */
export type AccesDomaine = 'oui' | 'lecture' | 'zone' | 'part' | 'aucun'
export interface DroitDomaine {
  id: string
  nom: string
  acces: AccesDomaine
  note: string | null // « Z1, Z3 », « Niveau 1 », « jusqu'à 25 000 F »
}
export interface GesteEffectif {
  id: string
  quoi: string
  ok: boolean
  limite: string | null // « jusqu'à 25 000 F », « niveau 1 », « sa zone »
}
export interface DroitsEffectifs {
  roles: Role[]
  domaines: DroitDomaine[]
  gestes: GesteEffectif[]
}

export interface ChangementAcces {
  le: Instant
  quoi: string // « Niveau : Agent → Senior », « Accès temporaire Médiation jusqu'au 20 oct. »
  par: string
  motif: string | null
}

export type GenreMessage = 'rappel' | 'avertissement' | 'consigne'
export interface MessageMembre {
  id: string // « AV-0003 »
  genre: GenreMessage
  texte: string
  de: string
  le: Instant
  pour: { genre: 'membre'; id: string; nom: string } | { genre: 'equipe'; equipe: CodeEquipe }
  destinataires: number
  lus: number
  luParMoi: Instant | null
}

export interface DemandeAcces {
  qy: string // décision à quatre yeux
  genre: 'niveau' | 'perimetre' | 'role' | 'temporaire' | 'reactivation' | 'invitation'
  membreId: string
  nom: string
  resume: string
  par: string
  le: Instant
}

export type GenreAlerte = 'inactif' | 'temporaire_expire' | 'conflit' | 'connexions_refusees' | 'revue_retard' | 'urgence_a_revoir'
export interface AlerteAcces {
  id: string
  genre: GenreAlerte
  membreId: string | null
  titre: string
  sous: string
  le: Instant
  echeance: Instant | null
}

export interface TableauEquipe {
  membres: Membre[]
  equipes: { code: CodeEquipe; responsable: string | null; actifs: number; membres: number }[]
  demandes: DemandeAcces[]
  aRevoir: number // lignes de revue sans décision ce trimestre
  expirent: number // accès temporaires qui finissent sous ADM-ALERTE-EXPIRE-H
  alertes: AlerteAcces[]
  directionActifs: number
  directionMin: number
  seuil: Francs // REMB-CONTROLE-SEUIL : un plafond au-dessus passe à quatre yeux
  /** Ce que le compte connecté peut attribuer : toutes les équipes (Accès et personnel, Direction) ou la sienne. */
  gere: CodeEquipe[]
  moi: { id: string; equipe: CodeEquipe; niveau: Niveau } | null
}

export interface FicheMembre {
  membre: Membre
  droits: DroitsEffectifs
  historique: LigneJournal[]
  messages: MessageMembre[]
  /** Gestes que le compte connecté peut faire sur ce membre (la source refuse de toute façon). */
  gestes: { niveau: boolean; perimetre: boolean; temporaire: boolean; avertir: boolean; suspendre: boolean; reactiver: boolean; desactiver: boolean; role: boolean }
  /** Membres de la même équipe qui peuvent reprendre ses dossiers (départ). */
  repreneurs: { id: string; nom: string }[]
}

export interface QuiPeut {
  gestes: { id: string; quoi: string; mots: string[]; membres: { id: string; nom: string; equipe: CodeEquipe; niveau: Niveau; limite: string | null }[] }[]
  matrice: { equipe: CodeEquipe; domaines: { id: string; acces: AccesDomaine; note: string | null }[] }[]
  domaines: { id: string; nom: string }[]
}

export interface LigneRevue {
  id: string
  membreId: string
  nom: string
  acces: string // « Litiges et médiation · Senior », « Rôle additionnel : Support client », « Accès temporaire… »
  genre: 'base' | 'perimetre' | 'additionnel' | 'temporaire'
  decision: null | 'confirme' | 'retire'
  par: string | null
}
export interface RevueAcces {
  equipe: CodeEquipe
  responsable: string | null
  echeance: Instant
  enRetard: boolean
  lignes: LigneRevue[]
}

export interface DossierEnCours {
  id: string // « LT-0412 »
  libelle: string
  agentId: string
  depuis: Instant
}
export interface MonEquipe {
  equipe: CodeEquipe
  membres: (Membre & { liste: DossierEnCours[] })[]
  revue: RevueAcces
  messages: MessageMembre[]
}

export interface MesMessages {
  messages: MessageMembre[]
  changements: ChangementAcces[]
  nonLus: number
}

// ── Descentes terrain (§ 9) ─────────────────────────────────────────────────────────────────────────────────────────
export type TypeDescente = 'verification_boutique' | 'inspection_relais' | 'recrutement' | 'constat_litige' | 'controle_zone'
export type StatutDescente = 'planifiee' | 'en_route' | 'sur_place' | 'terminee' | 'annulee'
export interface Descente {
  id: string // « DT-0014 »
  type: TypeDescente
  zone: CodeZone
  lieu: string
  repere: string
  cible: { genre: 'kyc' | 'relais' | 'litige' | 'zone' | 'recrutement'; ref: string; libelle: string }
  prevueLe: Instant
  agentId: string | null
  agent: string | null
  statut: StatutDescente
  controles: { id: string; libelle: string; ok: boolean | null }[]
  photos: { id: string; nom: string; le: Instant }[]
  compteRendu: string
  resultat: 'conforme' | 'non_conforme' | 'a_revoir' | null
  creePar: string
  termineeLe: Instant | null
  envoiHorsReseau: boolean // compte rendu gardé sur le téléphone, envoyé au retour du réseau
}
export interface TableauDescentes {
  descentes: Descente[]
  agents: { id: string; nom: string; zones: CodeZone[]; aFaire: number }[]
  cibles: { genre: Descente['cible']['genre']; ref: string; libelle: string; zone: CodeZone; lieu: string }[]
}
export interface NouvelleDescente {
  type: TypeDescente
  zone: CodeZone
  cible: Descente['cible']
  lieu: string
  repere: string
  prevueLe: Instant
  agentId: string | null
}
export interface RapportDescente {
  controles: Record<string, boolean>
  photos: string[] // noms des photos prises
  compteRendu: string
  resultat: 'conforme' | 'non_conforme' | 'a_revoir' | null
  horsReseau?: boolean
}

export interface NouveauMembre {
  prenom: string
  nom: string
  email: string
  equipe: CodeEquipe
  niveau: Niveau
  zones: CodeZone[] | null
}

/** Raisons de refus communes (config/acces-console.ts les explique en mots). */
export type RaisonAcces =
  | 'motif_court'
  | 'inconnu'
  | 'soi_meme'
  | 'hors_equipe'
  | 'hors_perimetre'
  | 'reserve_acces'
  | 'niveau_reserve'
  | 'conflit'
  | 'direction_min'
  | 'direction_seule'
  | 'etat'
  | 'duree'
  | 'dossiers_en_cours'
  | 'incomplet'
  | 'email_pris'
  | 'deja'

/** Issue d'un geste qui peut passer à quatre yeux : appliqué tout de suite, ou en attente de la Direction. */
export type IssueAcces = Resultat<{ etat: 'applique' | 'a_contresigner'; qy: string | null; id?: string }, RaisonAcces>

export interface DomaineEquipe {
  tableau(): Promise<TableauEquipe>
  membre(id: string): Promise<FicheMembre | null>
  quiPeut(): Promise<QuiPeut>
  inviter(n: NouveauMembre, motif: string): Promise<IssueAcces>
  changerNiveau(id: string, niveau: Niveau, motif: string): Promise<IssueAcces>
  changerPerimetre(id: string, p: Perimetre, motif: string): Promise<IssueAcces>
  /** Rôle additionnel (null : le retirer) ; refusé s'il crée un conflit (§ 4). */
  changerRole(id: string, role: Role | null, motif: string): Promise<IssueAcces>
  donnerTemporaire(id: string, t: { role: Role; fin: Instant; motif: string }): Promise<IssueAcces>
  retirerTemporaire(id: string, temporaire: string, motif: string): Promise<IssueAcces>
  avertir(a: { genre: 'membre'; id: string } | { genre: 'equipe'; equipe: CodeEquipe }, genre: GenreMessage, texte: string): Promise<Resultat<{ id: string; destinataires: number }, RaisonAcces>>
  suspendre(id: string, motif: string): Promise<IssueAcces>
  reactiver(id: string, motif: string): Promise<IssueAcces>
  /** Départ : accès retirés le jour même ; les dossiers en cours vont d'abord à un repreneur de l'équipe. */
  desactiver(id: string, motif: string, repreneur: string | null): Promise<Resultat<{ reattribues: number }, RaisonAcces>>
  revue(equipe: CodeEquipe): Promise<RevueAcces>
  revoir(ligne: string, decision: 'confirme' | 'retire', motif: string): Promise<IssueAcces>
  monEquipe(): Promise<MonEquipe>
  repartir(dossier: string, vers: string): Promise<Resultat<object, RaisonAcces>>
  mesMessages(): Promise<MesMessages>
  lireMessage(id: string): Promise<void>
  /** Accès d'urgence : Direction seulement, ADM-BRIS-GLACE-H au plus, motif, revu le lendemain par un second membre. */
  ouvrirUrgence(motif: string, heures: number): Promise<Resultat<{ jusqua: Instant }, RaisonAcces>>
  fermerUrgence(): Promise<void>
  revoirUrgence(id: string, motif: string): Promise<Resultat<object, RaisonAcces>>
  // Descentes terrain
  descentes(): Promise<TableauDescentes>
  planifier(d: NouvelleDescente): Promise<Resultat<{ id: string }, RaisonAcces>>
  assigner(id: string, agentId: string): Promise<Resultat<object, RaisonAcces>>
  annulerDescente(id: string, motif: string): Promise<Resultat<object, RaisonAcces>>
  mesDescentes(): Promise<Descente[]>
  descente(id: string): Promise<Descente | null>
  avancer(id: string, statut: 'en_route' | 'sur_place'): Promise<Resultat<object, RaisonAcces>>
  rapporter(id: string, r: RapportDescente): Promise<Resultat<object, RaisonAcces>>
  // Sécurité de l'employé (Profil) : ses sessions, fermer les autres.
  mesSessions(): Promise<MesSessions>
  fermerAutresSessions(): Promise<{ fermees: number }>
  // Support : « Voir comme le client » (lecture seule, motif, journalisé, limité dans le temps).
  ouvrirVueClient(client: string, motif: string): Promise<Resultat<{ jusqua: Instant }, 'motif_court' | 'inconnu'>>
  vueClient(client: string): Promise<VueClient | null>
}

export interface MesSessions {
  sessions: { id: string; appareil: string; vuLe: Instant; courante: boolean; fermee: boolean }[]
  secondFacteur: 'sms' | 'application'
  /** Finance, Direction, Accès et personnel : l'application d'authentification est obligatoire (pas de SMS de secours). */
  applicationObligatoire: boolean
  verrouillage: { echecs: number; avant: number; minutes: number }
}
export interface VueClient {
  client: string // masqué
  zone: string
  jusqua: Instant
  commandes: { ref: string; vendeurs: string; relais: string | null; total: Francs; etat: string }[]
  abonnement: string | null
}
