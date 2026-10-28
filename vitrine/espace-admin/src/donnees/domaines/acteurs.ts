// Domaine « acteurs » (ADM-06, ADM-07 clients ; page ajoutée « qualite » ; tenu par S3) : revue KYC (file unique de
// tous les acteurs), vendeurs (liste, carte, fiche), paliers et Trust Score à valider, sanctions et recours, clients et
// IFA, qualité des acteurs. Règles : src/pages/ADM-06/calculs/regles.ts (mêmes fonctions que le serveur).
// - une pièce d'identité ne se montre que par lien court journalisé (composants/PieceIdentite.tsx) ; « Approuver »
//   n'est accepté que si chaque pièce a été ouverte par l'agent (ADM-06-R05) ;
// - conflit d'intérêts (A-33) : la source refuse toute décision d'un agent sur un compte d'acteur qu'il tient
//   (`lieAgent`) ; l'écran le dit et renvoie à un autre agent ;
// - toute décision défavorable a un motif écrit (motif_min_caracteres) ; exclusion et levée de liste noire à quatre
//   yeux (second validateur d'un autre compte : domaine quatreyeux) ; chaque geste est journalisé et publié vers
//   l'espace concerné (pont de démonstration, CONNEXIONS.md).
// Les textes des données (motifs, événements, contrôles) viennent du serveur, en français.
import type { CodeZone, Instant, Resultat } from '../communs'
import type { EspaceTrust, Niveau, Palier, PalierIfa } from '../../pages/ADM-06/calculs/regles'

export type EspaceActeur = 'vendeur' | 'relais' | 'entreprise' | 'livreur' | 'client'

/** Contrôle ou constat (résultat automatique, déduplication, effet) : ton et texte. */
export interface Controle {
  ton: 'ok' | 'doute' | 'ko' | 'info'
  texte: string
}
/** Événement du Trust Score (gravité ADM-TSC-02). */
export interface EvenementTrust {
  id: string
  gravite: 'ok' | 'g1' | 'g2' | 'g3' | 'veto'
  titre: string
  detail: string
}
export interface LigneHistorique {
  titre: string
  le: Instant
  par?: string
  ton?: 'done' | 'cur' | 'bad'
}
export interface DecisionPrise {
  quoi: string
  par: string
  parId: string
  le: Instant
  motif: string | null
}

// ── KYC ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type NaturePiece = 'cni_recto' | 'cni_verso' | 'selfie_video' | 'permis' | 'carte_grise' | 'rccm' | 'niu' | 'mint' | 'assurance' | 'local'
export type EtatPiece = 'a_revoir' | 'auto_ok' | 'approuvee' | 'rejetee' | 'complement'
export interface PieceKyc {
  id: string // « KYC-0091-3 »
  nature: NaturePiece
  etat: EtatPiece
  doute: string | null
  vue: boolean // ouverte par l'agent connecté (lien court journalisé)
  motif: string | null // motif en clair d'un rejet ou d'un complément, visible par l'acteur
  recueLe: Instant
}
export type EtatKyc = 'a_revoir' | 'complement' | 'approuve' | 'rejete'
export type RaisonRejet = 'non_conforme' | 'illisible' | 'expiree' | 'incoherente' | 'faux_document'
export interface DossierKyc {
  id: string // « KYC-0088 »
  acteur: string
  titulaire: string
  espace: EspaceActeur
  organisation: string
  zone: CodeZone
  deposeLe: Instant
  echeance: Instant | null // dépôt + KYC-REVUE-H heures ouvrées ; null : suspendue (complément demandé)
  etat: EtatKyc
  pieces: PieceKyc[]
  visage: number | null
  preuveVie: boolean | null
  controles: Controle[]
  dedup: Controle[]
  doublon: { autreCompte: string; similarite: number; rolesDeclares: boolean } | null
  proposition: { texte: string; confiance: number } | null
  conflit: boolean // l'agent connecté tient ce compte d'acteur (A-33)
  visiblePar: string // ce que voit l'organisation : jamais l'image
  complement: { motif: string; le: Instant; par: string } | null
  decision: DecisionPrise | null
  historique: LigneHistorique[]
}
export type DemandeKyc = { action: 'approuver' } | { action: 'rejeter'; piece: string; raison: RaisonRejet; motif: string } | { action: 'complement'; pieces: string[]; motif: string }
export type RaisonRefus = 'motif_court' | 'pieces_non_vues' | 'conflit_interets' | 'deja_traite' | 'lecture_seule' | 'sans_evenement' | 'meme_auteur' | 'trop_tot' | 'sans_croisement' | 'doublon'

/** Lien court vers une pièce : il expire, et chaque ouverture est journalisée. */
export interface LienPiece {
  url: string
  expireLe: Instant
  filigrane: string
}

// ── Vendeurs ───────────────────────────────────────────────────────────────────────────────────────────────────
export type Etiquette = 'made_in_cameroon' | 'descente_proposee' | 'lancement' | 'sanction_proposee' | 'conflit'
export interface VendeurCourt {
  id: string
  nom: string
  categorie: string
  quartier: string
  zone: CodeZone
  palier: Palier
  trustScore: number
  seuil: number | null
  produits: number
  commandes30: number
  litiges: number
  statut: 'ouvert' | 'ferme' | 'suspendu' | 'en_revue'
  etiquettes: Etiquette[]
  plafondDemarrage: { faites: number; sur: number } | null
  position: [number, number]
  precision: string | null
  lieAgent: string | null
}
export interface FicheVendeur extends VendeurCourt {
  titulaire: string
  adresse: string
  telephone: string // masqué
  momo: string // masqué
  kyc: string
  contrat: string
  abonnement: string
  employes: string
  historique: number[] // Trust Score des 30 derniers jours
  evenements: EvenementTrust[]
  commissions: { commande: string; article: string; prix: number; commission: number; garde: number; version: string; etat: string }[]
  offres: { titre: string; prix: number; stock: number; etat: 'publiee' | 'brouillon' | 'moderation' | 'depubliee'; note: string }[]
  litigesListe: { id: string; titre: string; sous: string }[]
  versements: { titre: string; sous: string }[]
  sanctions: { id: string; niveau: Niveau; etat: EtatSanction; titre: string }[]
  journal: LigneHistorique[]
  conflit: boolean
  bandeau: { ton: 'amber' | 'red'; texte: string } | null
}

// ── Paliers et Trust Score ─────────────────────────────────────────────────────────────────────────────────────
export type EtatProposition = 'a_valider' | 'contestee' | 'observation' | 'confirmee' | 'refusee' | 'revue_terrain' | 'maintenue' | 'annulee'
export interface PropositionPalier {
  id: string // « PT-0014 »
  acteurId: string
  acteur: string
  organisation: string
  espace: EspaceTrust
  sens: 'descente' | 'montee' | 'contestation'
  de: Palier
  vers: Palier
  etat: EtatProposition
  score: number
  seuil: number | null
  seuilDescente: number | null
  joursSous: number
  historique: number[]
  evenements: EvenementTrust[]
  decomposition: { critere: string; v: number; max: number }[]
  croisement: { evenement: string; contrepartie: string; historique: string; lecture: 'solide' | 'relativiser' }[]
  proposition: { texte: string; confiance: number } | null
  contestation: { texte: string; le: Instant; constats: Controle[] } | null
  decision: (DecisionPrise & { evenements: string[] }) | null
  recours: DecisionPrise | null
  conflit: boolean
  creeeLe: Instant
  echeance: Instant | null
}
export interface DemandePalier {
  action: 'confirmer' | 'refuser' | 'revue_terrain' | 'maintenir' | 'annuler'
  motif: string
  evenements: string[]
}

// ── Sanctions ──────────────────────────────────────────────────────────────────────────────────────────────────
export type EtatSanction = 'proposee' | 'quatre_yeux' | 'recours' | 'vigueur' | 'levee' | 'classee'
export interface Sanction {
  id: string // « SN-0021 »
  acteurId: string
  acteur: string
  espace: EspaceActeur
  zone: CodeZone | null
  niveau: Niveau
  etat: EtatSanction
  origine: string
  declencheurs: EvenementTrust[]
  historique: LigneHistorique[]
  proposition: { texte: string; confiance: number } | null
  effet: string
  listeNoire: { identifiant: string; valeur: string; effet: string }[]
  quatreYeux: { id: string; etat: 'a_contresigner' | 'contresignee' | 'refusee'; premier: string; second: string | null } | null
  recours: { texte: string; le: Instant } | null
  debut: Instant | null
  fin: Instant | null
  probatoireFin: Instant | null
  decision: DecisionPrise | null
  conflit: boolean
}
export interface DemandeSanction {
  action: 'valider' | 'niveau_inferieur' | 'classer' | 'recours_maintenir' | 'recours_reduire' | 'recours_lever' | 'lever'
  motif: string
}

// ── Clients et IFA ─────────────────────────────────────────────────────────────────────────────────────────────
export interface ClientCourt {
  id: string
  masque: string // « Client ••• 4217 »
  zone: CodeZone
  palier: PalierIfa
  commandes: number
  depuis: Instant
  resume: string
  aProposition: boolean
}
export interface FicheClient extends ClientCourt {
  telephone: string // masqué
  momo: string // masqué
  relaisHabituel: string
  compteurs: { litigesPerdus: number; litigesGagnes: number; retiresApresPreuve: number; rembNonInstruits: number; rembMontant: number; annulations: number; nonRetraits: number; refusRetrait: number; commandesSansIncident: number; retrogradations: number }
  composantes: { libelle: string; v: number; max: number; faible: boolean }[]
  remboursements: { id: string; montant: number; etat: string }[]
  historique: LigneHistorique[]
  proposition: null | {
    vers: PalierIfa
    texte: string
    confiance: number
    croisementCharge: boolean
    croisement: { vendeur: string; trust: number; issue: 'perdu' | 'gagne' | 'retire'; autres: number }[]
    antiContournement: Controle[]
  }
  recours: { texte: string; le: Instant } | null
  decision: DecisionPrise | null
}
export interface DemandeIfa {
  action: 'valider' | 'refuser' | 'recours_maintenir' | 'recours_relever'
  motif: string
}

// ── Qualité des acteurs (page ajoutée) ─────────────────────────────────────────────────────────────────────────
export interface ActeurQualite {
  id: string
  nom: string
  espace: EspaceTrust
  zone: CodeZone
  organisation: string | null
  score: number | null // null : départ neutre, pas encore calculé
  palier: Palier | null
  historique: number[] // 30 jours
  veto: boolean
  sanctionsOuvertes: number
  route: string
  params: Record<string, string>
}

export interface DomaineActeurs {
  vendeurs(): Promise<VendeurCourt[]>
  vendeur(id: string): Promise<FicheVendeur | null>
  demasquerVendeur(id: string, motif: string): Promise<Resultat<{ valeur: string }, 'motif_court'>>
  kyc(): Promise<DossierKyc[]>
  /** Ouvre une pièce (rôles « piece.consulter ») : lien court à durée limitée, journalisé ; la pièce compte comme vue. */
  ouvrirPiece(dossier: string, piece: string, motif: string): Promise<{ ok: true; lien: LienPiece } | { ok: false; raison: 'motif_court' }>
  deciderKyc(id: string, d: DemandeKyc): Promise<Resultat<{ etat: EtatKyc; sanction: string | null }, RaisonRefus>>
  paliers(): Promise<PropositionPalier[]>
  deciderPalier(id: string, d: DemandePalier): Promise<Resultat<{ etat: EtatProposition }, RaisonRefus>>
  sanctions(): Promise<Sanction[]>
  deciderSanction(id: string, d: DemandeSanction): Promise<Resultat<{ etat: EtatSanction; quatreYeux: string | null }, RaisonRefus>>
  /** Ouvre un dossier de sanction (Support : proposer ; modération, avis, KYC : transmettre). */
  proposerSanction(p: { acteurId: string; acteur: string; espace: EspaceActeur; zone: CodeZone | null; niveau: Niveau; motif: string; origine: string }): Promise<Resultat<{ id: string }, RaisonRefus>>
  clients(): Promise<ClientCourt[]>
  client(id: string): Promise<FicheClient | null>
  demasquerClient(id: string, motif: string): Promise<Resultat<{ valeur: string }, 'motif_court'>>
  deciderIfa(id: string, d: DemandeIfa): Promise<Resultat<{ palier: PalierIfa }, RaisonRefus>>
  qualite(): Promise<ActeurQualite[]>
  /** Abonnements des clients (paliers Plus, Prime, Prime Duo, Business) : lecture ; geste du Support plafonné. */
  abonnements(): Promise<{ liste: AbonnementClient[]; plafondGeste: number | null }>
  /** Geste commercial sur un abonnement : au plus le prix d'un mois et le plafond de l'agent (son niveau). */
  gesteAbonnement(id: string, montant: number, motif: string): Promise<Resultat<object, 'motif_court' | 'plafond' | 'montant' | 'inconnu'>>
  /** Accès d'un compte d'acteur à son espace (connexion) : autorisé ou bloqué par la console, et qui peut le changer. */
  accesActeur(espace: EspaceActeur, acteurId: string, zone?: CodeZone | null): Promise<AccesActeur>
  /**
   * Bloque ou rétablit l'accès d'un compte d'acteur (motif écrit, journalisé, publié à son espace : acces_change).
   * Bloquer un vendeur, un relais, une entreprise ou un livreur passe à quatre yeux (second : Direction, autre compte) ;
   * bloquer un client et rétablir un accès s'appliquent aussitôt. Droits : ceux de la page de l'acteur (« oui », ou
   * « zone » dans le périmètre de l'agent).
   */
  changerAcces(d: DemandeAcces): Promise<Resultat<{ etat: 'appliquee' | 'a_contresigner'; id: string }, RaisonAcces>>
}

/** Accès d'un compte d'acteur (surveillance de la console). */
export interface AccesActeur {
  espace: EspaceActeur
  acteurId: string
  etat: 'autorise' | 'bloque'
  depuis: Instant | null
  par: string | null
  motif: string | null
  /** Blocage demandé, en attente du second validateur. */
  demande: { id: string; par: string; le: Instant; motif: string } | null
  /** Le rôle connecté peut bloquer ou rétablir cet accès (droit de la page, périmètre). */
  peutChanger: boolean
  /** Bloquer cet accès passe à quatre yeux (tout espace sauf le client). */
  quatreYeux: boolean
  historique: { le: Instant; etat: 'bloque' | 'autorise'; par: string; motif: string }[]
}
export interface DemandeAcces {
  espace: EspaceActeur
  acteurId: string
  nom: string
  zone: CodeZone | null
  etat: 'bloque' | 'autorise'
  motif: string
}
export type RaisonAcces = 'motif_court' | 'sans_effet' | 'deja_demande'

/** Abonnement d'un client (paliers du site : site/src/donnees/prime.ts). */
export interface AbonnementClient {
  id: string // « AB-0012 »
  client: string // masqué : « Client ••• 4217 »
  zone: CodeZone
  palier: string // « Prime »
  prixMois: number
  depuis: Instant
  renouvellement: Instant
  etat: 'actif' | 'grace' | 'resilie'
  commandesMois: number
  plafondMois: number
  gestes: { montant: number; le: Instant; par: string; motif: string }[]
}
