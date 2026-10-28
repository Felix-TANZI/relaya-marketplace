// Domaine « gouvernance » (ADM-12 ; tenu par S6) : journal d'audit chaîné par empreinte, rôles et agents. Le socle y
// écrit déjà : chaque geste de la démonstration (décision, démasquage, pièce consultée, export) ajoute une ligne
// (composants/LigneJournal.tsx la montre). Une ligne n'est jamais modifiée ni effacée ; son empreinte couvre la ligne
// et l'empreinte de la précédente (la chaîne casse si une ligne change). En API : SHA-256 côté serveur.
import type { CodeZone, EtatDecision, Espace, Francs, Instant, Resultat, Role } from '../communs'
import type { Agent } from './session'

export interface LigneJournal {
  n: number // rang dans la chaîne
  le: Instant
  agentId: string
  agent: string // « Franck Penga »
  role: Role // rôle sous lequel le geste a été fait (ADM-ROL-02)
  action: string // « litige.decider », « donnee.demasquer », « export.csv »…
  objet: string // « LT-0412 », « Client ••• 4217 »
  motif: string | null
  zone: string | null
  precedente: string // empreinte de la ligne précédente (« 0 » pour la première)
  /** État avant et après le geste, quand il change un objet : dans l'empreinte (une modification se voit). */
  avant?: string | null
  apres?: string | null
  empreinte: string
}

/** Ce qu'un geste écrit au journal (le reste est posé par la source : agent, rôle, heure, chaîne). */
export interface EntreeJournal {
  action: string
  objet: string
  motif?: string | null
  zone?: string | null
  avant?: string | null
  apres?: string | null
}

export interface DomaineGouvernance {
  /** Lignes visibles du rôle : tout (Direction, Audit) ou « sa part » (ses gestes et son périmètre). */
  journal(filtre?: { action?: string; objet?: string; limite?: number }): Promise<LigneJournal[]>
  /** Vérifie la chaîne entière : la première ligne cassée, ou null. */
  verifierChaine(): Promise<{ ok: boolean; casseeA: number | null; lignes: number }>
  ecrire(e: EntreeJournal): Promise<LigneJournal>
  agents(): Promise<Agent[]>

  // ── Journal d'audit (ADM-P31) ──
  /** Tableau du journal : lignes de « sa part » filtrées, détails (avant → après, adresse, appareil), compteurs. */
  tableauJournal(f: FiltreJournal): Promise<TableauJournal>
  /** Ouvrir le journal ajoute une ligne « journal.consulter » (ADM-P31R-02) ; une seule par minute et par agent. */
  consulterJournal(): Promise<void>
  /** État d'un objet à une date : rejeu de ses lignes jusqu'à cet instant (ADM-JRN-04). */
  reconstituer(objet: string, jusqua: Instant): Promise<Reconstitution>
  /** Export signé à quatre yeux : la demande est liée à la décision QY créée par DecisionMotivee. */
  lierExport(qy: string, portee: PorteeExport): Promise<void>
  exportsJournal(): Promise<ExportJournal[]>
  /** Après contre-signature : lignes du fichier (export journalisé « journal.exporter »). */
  telechargerExport(id: string): Promise<Resultat<{ entetes: string[]; lignes: string[][]; nom: string }, 'pas_valide' | 'inconnu'>>
  demandesDonnees(): Promise<DemandeDonnees[]>
  enregistrerDemande(d: { acteur: string; espace: Espace; type: DemandeDonnees['type']; motif: string }): Promise<Resultat<{ id: string }, 'motif_court'>>
  /** Répondre : export des seules lignes de l'acteur, sans données de tiers (loi n° 2024/017). */
  repondreDemande(id: string, motif: string): Promise<Resultat<{ entetes: string[]; lignes: string[][]; nom: string }, 'motif_court' | 'inconnu' | 'deja_repondue'>>

  // ── Fraude et anneaux (ADM-P30) ──
  fraude(): Promise<TableauFraude>
  alerte(id: string): Promise<AlerteFraude | null>
  /** Ouvre la revue : graphe complet, ouverture journalisée. */
  ouvrirRevue(id: string): Promise<Resultat>
  classerAlerte(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'pas_de_revue' | 'deja_tranchee'>>
  proposerSanction(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'pas_de_revue' | 'deja_tranchee'>>
  /** Lie la demande de gel (décision à quatre yeux QY) à l'alerte ; le gel s'applique à la contre-signature. */
  lierGel(id: string, qy: string): Promise<void>
  leverGel(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'pas_de_gel'>>
  /** Démasque le numéro partagé (donnée sensible consultée, journalisée). */
  demasquerIdentifiant(id: string, motif: string): Promise<{ ok: true; valeur: string } | { ok: false; raison: 'motif_court' }>

  // ── Rôles et accès (ADM-P32) ──
  comptes(): Promise<TableauComptes>
  /** Compte sans rôle Direction : créé tout de suite (invitation). Direction : passer par lierCreationDirection. */
  creerCompte(c: NouveauCompte): Promise<Resultat<{ id: string }, 'incomplet' | 'direction_quatre_yeux' | 'email_pris'>>
  lierCreationDirection(qy: string, c: NouveauCompte): Promise<void>
  modifierCompte(id: string, m: { roles: Role[]; zones: CodeZone[] | null }, motif: string): Promise<Resultat<object, 'motif_court' | 'direction_quatre_yeux' | 'sans_role' | 'direction_min' | 'inconnu' | 'soi_meme'>>
  fermerAcces(id: string, motif: string): Promise<Resultat<{ reattribues: number }, 'motif_court' | 'direction_min' | 'direction_quatre_yeux' | 'soi_meme' | 'inconnu'>>
  confirmerCompte(id: string): Promise<Resultat<object, 'inconnu' | 'ferme'>>
  reactiverCompte(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'inconnu'>>
  /** Suspend un compte d'employé (absence, enquête) : sessions révoquées, compte gardé, réactivable. */
  suspendreCompte(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'inconnu' | 'soi_meme' | 'direction_quatre_yeux' | 'direction_min' | 'etat'>>
  /** Renvoie l'invitation : nouveau lien d'activation, l'ancien ne sert plus. */
  renvoyerInvitation(id: string): Promise<Resultat<object, 'inconnu' | 'etat'>>

  // ── Espaces pays (ADM-P33) ──
  pays(): Promise<EspacePaysDetail[]>
  copierPays(code: string, nom: string, motif: string): Promise<Resultat<object, 'motif_court' | 'existe' | 'inconnu'>>
  revoirParametre(pays: string, code: string, valeur: string): Promise<Resultat<object, 'vide' | 'inconnu' | 'condition'>>
  ouvrirPays(code: string, motif: string): Promise<Resultat<object, 'conditions' | 'motif_court' | 'inconnu'>>

  // ── Comptes multi-rôles et agents terrain (ADM-P34) ──
  terrain(): Promise<TableauTerrain>
  nouvelleFiche(f: { genre: 'boutique' | 'relais'; nom: string; zone: CodeZone; quartier: string; titulaire: string; numero: string }): Promise<Resultat<{ id: string }, 'incomplet' | 'hors_zone'>>
  envoyerLien(id: string): Promise<Resultat<object, 'inconnu' | 'etat'>>
  relancer(id: string): Promise<Resultat<object, 'inconnu' | 'etat'>>
  controlerFiche(id: string, conforme: boolean, motif: string): Promise<Resultat<object, 'motif_court' | 'inconnu' | 'etat'>>
}

// ── Journal ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface FiltreJournal {
  q?: string
  agentId?: string
  role?: Role
  action?: string
  periode?: 'jour' | '7j' | 'tout'
}
export interface DetailLigne {
  avant: string | null
  apres: string | null
  adresse: string // masquée : « 102.244.···.18 »
  appareil: string
  sensible: boolean // donnée sensible consultée (démasquage, pièce)
}
export interface TableauJournal {
  lignes: (LigneJournal & { detail: DetailLigne })[]
  total: number // lignes de sa part, avant filtres
  aujourdhui: number
  consultations: number
  sensibles: number
  chaine: { ok: boolean; casseeA: number | null; lignes: number }
  tout: boolean // Direction et Audit : tout le journal ; sinon « sa part »
  agents: { id: string; nom: string }[]
  actions: string[]
  conservationAns: number
}
export interface Reconstitution {
  objet: string
  jusqua: Instant
  lignes: LigneJournal[]
  etat: string | null // « après » de la dernière ligne qui en porte un
}
export type PorteeExport = { genre: 'periode'; du: Instant; au: Instant } | { genre: 'demande'; demande: string }
export interface ExportJournal {
  id: string
  qy: string
  portee: PorteeExport
  lignes: number
  demandeur: string
  demandeLe: Instant
  etat: EtatDecision
  telechargeLe: Instant | null
}
export interface DemandeDonnees {
  id: string // « DA-0007 »
  acteur: string // « Client ••• 0388 »
  espace: Espace
  type: 'acces' | 'rectification' | 'export'
  recueLe: Instant
  echeance: Instant
  etat: 'ouverte' | 'repondue'
  reponduLe: Instant | null
  lignes: number | null
}

// ── Fraude ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TypeAlerteFraude = 'anneau' | 'remboursements' | 'comptoir' | 'avis_croises' | 'retraits' | 'signalement'
export type EtatAlerte = 'nouvelle' | 'revue' | 'gel_demande' | 'gel' | 'classee' | 'sanction_proposee' | 'gel_leve'
export interface CompteLie {
  id: string
  nom: string // masqué pour un client : « Client ••• 5530 »
  espace: Espace
  zone: CodeZone | null
  creeLe: Instant
  commandes: number
  liens: ('appareil' | 'numero' | 'relais')[]
}
export interface NoeudGraphe {
  id: string
  genre: 'client' | 'vendeur' | 'relais' | 'appareil' | 'numero'
  libelle: string
  sous: string
  chaud: boolean
}
export interface ArcGraphe {
  de: string
  vers: string
  nature: 'appareil' | 'numero' | 'relais' | 'note' | 'retrait'
  n: number | null
}
export interface AlerteFraude {
  id: string // « FR-261013-01 »
  type: TypeAlerteFraude
  lien: 'appareil' | 'numero' | 'moyen' | null // numéro de versement d'une boutique ; moyen de paiement d'un client
  niveau: 'attention' | 'critique'
  mesure: number
  seuil: number
  montant: Francs | null
  zone: CodeZone | null
  detecteeLe: Instant
  comptes: CompteLie[]
  identifiantMasque: string | null // « MoMo ···· 77 12 », « Appareil 7c1e…a90 »
  noeuds: NoeudGraphe[]
  arcs: ArcGraphe[]
  historique: { le: Instant; t: string; d: string }[]
  etat: EtatAlerte
  revue: { par: string; le: Instant } | null
  issue: { motif: string; par: string; le: Instant } | null
  revueGelJ: number // ADM-GEL-FRAUDE-J : revue d'un gel
  gel: { qy: string; etat: EtatDecision; montant: Francs; commandes: number; vendeur: string; demandeLe: Instant; appliqueLe: Instant | null; revueLe: Instant | null } | null
  /** Signalement grave reçu d'un espace (pont : report.filed) : objet et motif tels que publiés. */
  signalement?: { espace: Espace; objet: string; motif: string } | null
}
export interface TableauFraude {
  alertes: AlerteFraude[]
  signaux: { type: TypeAlerteFraude; lien: 'appareil' | 'numero' | 'moyen' | null; n: number }[]
  regles: { fenetreJ: number; anneauComptes: number; rembAuto: number; refusComptoir: number; avisNote: number; retraitsN: number; retraitsF: Francs; gelRevueJ: number }
  issues30j: { classees: number; sanctions: number; gelsLeves: number; automatiques: 0 }
}

// ── Rôles et accès ──────────────────────────────────────────────────────────────────────────────────────────────────
export type EtatCompte = 'actif' | 'invitation' | 'a_contresigner' | 'suspendu' | 'ferme'
export interface CompteConsole {
  agent: Agent
  etat: EtatCompte
  derniereConnexion: Instant | null
  confirmeLe: Instant | null // revue trimestrielle
  qy: string | null // création Direction en attente
  amorcage: boolean // second compte Direction créé avec Finance en second (G03)
  /** Invitation envoyée (heure) ; le lien d'activation n'existe que pour un compte en invitation. */
  inviteLe: Instant | null
  jetonActivation: string | null
  /** Suspension décidée (motif écrit) ; null pour une suspension d'inactivité (G07). */
  suspension: { motif: string; le: Instant; par: string } | null
}
export interface TableauComptes {
  comptes: CompteConsole[]
  directionActifs: number
  directionMin: number
  inactifJ: number
  prochaineRevue: Instant
  sessionHeures: number
  sessionInactifMin: number
  brisGlaceH: number
}
export interface NouveauCompte {
  prenom: string
  nom: string
  email: string
  role: Role
  zones: CodeZone[] | null
}

// ── Espaces pays ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ParametrePays {
  code: string
  libelle: string
  valeur: string
  etat: 'revu' | 'a_revoir' | 'manquant'
}
export interface EspacePaysDetail {
  code: string // « CM »
  nom: string
  devise: string
  ville: string
  etat: 'ouvert' | 'preparation'
  copieDe: string | null
  creeLe: Instant
  parametres: ParametrePays[]
  conditions: { textes: { ok: boolean; detail: string }; agregateur: { ok: boolean; detail: string }; zones: { ok: boolean; detail: string } }
  zones: { code: CodeZone; nom: string; exploitee: boolean; relais: number }[]
}

// ── Agents terrain ──────────────────────────────────────────────────────────────────────────────────────────────────
export type EtatFiche = 'brouillon' | 'lien_envoye' | 'validee' | 'a_corriger' | 'publiee'
export interface FicheTerrain {
  id: string // « ST-0042 »
  genre: 'boutique' | 'relais'
  nom: string
  zone: CodeZone
  quartier: string
  titulaire: string
  numeroMasque: string
  autresRoles: string[] // « client depuis le 3 sept. » : un numéro, plusieurs rôles, espaces séparés
  agent: string
  binome: string | null
  creeLe: Instant
  etat: EtatFiche
  lienEnvoyeLe: Instant | null
  relances: number
  valideeLe: Instant | null
  photos: number
  piece: 'aucune' | 'en_revue' | 'validee'
  offres: { titre: string; prix: Francs; etat: 'brouillon' | 'validee' | 'a_corriger' }[]
  controle: { conforme: boolean; motif: string; par: string; le: Instant } | null
  chronologie: { le: Instant; t: string }[]
}
export interface VisiteTerrain {
  n: number
  heure: Instant
  lieu: string
  zone: CodeZone
  but: string
  etat: 'faite' | 'en_cours' | 'a_venir'
  fiche: string | null
}
export interface TableauTerrain {
  agents: { id: string; nom: string; zones: CodeZone[] }[]
  visites: VisiteTerrain[]
  fiches: FicheTerrain[]
  rendement: { zone: CodeZone; nom: string; visites: number; preparees: number; validees: number; publiees: number }[]
}
