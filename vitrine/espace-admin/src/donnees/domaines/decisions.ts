// Domaine « decisions » : le poste de travail des décisions humaines encadrées (logique-metier/DECISIONS-ENCADREES.md,
// validé par le porteur le 19 oct.). Un même modèle pour les litiges, la vérification d'identité, les remboursements,
// les sanctions, les constats des relais, les retenues de kit contestées et les signalements :
// - un dossier = ce qu'il faut décider, l'échéance, le montant, le niveau requis ;
// - les PIÈCES (frise des preuves, alimentée par le pont : photos de ramassage, scans, remise, position, appels,
//   photos et message du client, réponse du vendeur…) ;
// - la LISTE DE CONTRÔLE calculée d'office (✓ / ✕ / ⚠), que l'agent confirme ou corrige en un geste ;
// - la SUGGESTION de la règle (issue, qui supporte le coût, raison en une ligne) ;
// - les ISSUES : permises, à transmettre (au-delà du plafond du niveau, preuves contradictoires), bloquées (avec la
//   raison : § 3 du document) ; le champ de manœuvre (fourchette d'un remboursement partiel, geste sous plafond, une
//   prolongation) ;
// - les APPELS notés (qui, résultat, résumé) : ils deviennent des pièces ; un accord n'ouvre que les issues permises ;
// - le JOURNAL : instantané des preuves, suggestion, écart et motif ; l'Audit voit les écarts et tire un échantillon.
// Le serveur refait chaque contrôle (logique-metier/CONTROLES-SERVEUR-DECISIONS.md) : l'écran grise, la source refuse.
import type { Francs, Instant, Resultat } from '../communs'
import type { Niveau } from './equipe'

export type GenreDossier = 'litige' | 'kyc' | 'remboursement' | 'sanction' | 'constat' | 'kit' | 'signalement'
export type TypeLitige = 'non_recu' | 'abime' | 'non_conforme' | 'manquant' | 'retard'
/** Partie qui peut supporter le coût d'une issue (ou que les preuves disculpent). */
export type Partie = 'client' | 'vendeur' | 'entreprise' | 'relais' | 'livreur' | 'belivay'
export type EtatControle = 'ok' | 'ko' | 'doute'

/** Une pièce du dossier : photo, scan, code, position, appel, message, pièce d'identité, constat. */
export interface PieceDossier {
  id: string
  nature: 'photo' | 'scan' | 'code' | 'position' | 'appel' | 'message' | 'piece' | 'constat' | 'systeme'
  etape: string // « Ramassage », « Dépôt au relais », « Remise », « Client », « Vendeur », « Appel »…
  partie: Partie | 'console'
  titre: string
  par: string
  le: Instant
  lieu: string | null
  distanceM: number | null // écart avec l'adresse attendue (remise)
  colis: string | null
  note: string
  /** Vignette dessinée (photos de démonstration : aucun fichier réel) ; null : pièce sans image. */
  image: { motif: MotifImage; teinte: 'sable' | 'bleu' | 'vert' | 'rouge' | 'or' | 'gris' } | null
  manquante: boolean
  /** Saisie hors connexion : heure d'origine du téléphone (ADM-CACHEE-18). */
  saisieLe: Instant | null
  source: 'pont' | 'jeu' | 'console'
}
export type MotifImage = 'colis' | 'colis_abime' | 'colis_mouille' | 'produit' | 'produit_autre' | 'contenu_incomplet' | 'porte' | 'comptoir' | 'ecran' | 'ecran_fissure' | 'piece_recto' | 'piece_verso' | 'selfie' | 'kit' | 'kit_incomplet' | 'facture' | 'carte'

export interface ControlePreuve {
  id: string
  libelle: string
  calcule: EtatControle // ce que la règle lit des pièces
  etat: EtatControle // après confirmation ou correction de l'agent
  pourquoi: string // une ligne
  pieces: string[] // pièces qui fondent la ligne
  confirme: boolean
  corrige: { par: string; le: Instant; de: EtatControle } | null
}

export type EtatIssue = 'permise' | 'transmettre' | 'bloquee'
export interface IssuePoste {
  id: string
  libelle: string
  effet: string // phrase calculée par la source (montants compris)
  payeur: Partie | null // qui supporte le coût
  montant: Francs | null // ce qui sort (vers le client, ou retenue) ; null : rien
  etat: EtatIssue
  raison: string | null // bloquée : pourquoi ; à transmettre : pourquoi
  regle: string | null
  /** Champ de manœuvre : remboursement partiel ou geste, borné. */
  fourchette: { min: Francs; max: Francs; pas: Francs } | null
  quatreYeux: boolean
}

export interface SuggestionPoste {
  issue: string | null // null : preuves contradictoires, à transmettre
  payeur: Partie | null
  raison: string // une ligne
  regle: string
}

export interface AppelPoste {
  id: string
  avec: Partie
  nom: string
  resultat: 'joint' | 'absent' | 'accord' | 'refus'
  resume: string
  accord: string | null // issue convenue (accord seulement, parmi les issues permises)
  par: string
  le: Instant
}

export interface DecisionPoste {
  issue: string
  libelle: string
  montant: Francs | null
  payeur: Partie | null
  motif: string // code de la liste courte
  note: string
  message: string
  par: string
  le: Instant
  etat: 'appliquee' | 'a_contresigner' | 'contresignee'
  quatreYeux: string | null
  suggestion: string | null
  ecart: boolean
  lot: string | null
  suites: string[]
}

export interface TransmissionPoste {
  vers: string // « Médiation (niveau 2) », « Senior », « Direction »
  par: string
  parId: string
  le: Instant
  raison: string
  issueProposee: string | null
  quatreYeux: string | null
}

/** Ce que l'agent connecté peut faire ici (le serveur le recalcule). */
export interface DroitsPoste {
  niveau: Niveau | null
  plafond: Francs | null // null : sans plafond (Direction)
  geste: Francs
  decider: boolean
  raison: string | null // lecture seule : pourquoi (auteur du dossier, lié à une partie, hors niveau…)
}

export interface DossierCourt {
  genre: GenreDossier
  id: string
  ref: string // référence visible (« BLV-51877 », « KYC-0088 »)
  titre: string // ce qu'il faut décider, en une ligne
  type: TypeLitige | null
  typeLibelle: string
  montant: Francs
  echeance: Instant | null
  niveauRequis: string // « Agent », « Senior », « Médiation », « Direction »
  etat: 'a_decider' | 'trop_tot' | 'transmis' | 'attente' | 'decide'
  doutes: number // lignes ⚠ restantes
  suggestion: string | null // libellé de l'issue suggérée
  lot: string | null // clé de lot : même genre, même cause, même issue suggérée
  zone: string | null
}

export interface DossierPoste extends DossierCourt {
  aDecider: string // phrase : « Le client dit ne pas avoir reçu son colis »
  parties: { partie: Partie; nom: string; position: string | null }[]
  paye: Francs
  pieces: PieceDossier[]
  controles: ControlePreuve[]
  suggestion: string | null
  lecture: SuggestionPoste | null
  issues: IssuePoste[]
  prolongation: { heures: number; faite: boolean; possible: boolean; raison: string | null }
  droits: DroitsPoste
  appels: AppelPoste[]
  motifs: string[] // liste courte
  messages: Record<string, { partie: Partie; texte: string }[]> // pré-remplis, par issue puis par partie prévenue
  modeles: { id: string; titre: string; texte: string }[]
  decision: DecisionPoste | null
  transmission: TransmissionPoste | null
  attente: string | null // QY en attente
  route: { route: string; params: Record<string, string> } | null // page d'origine (KYC, remboursements…)
  ouvertPar: string | null
  /** Une ligne de la frise que le poste propose de comparer côte à côte (ramassage, remise, client ; recto, verso, selfie). */
  comparer: string[]
  ambigu: boolean
  /** Preuves à ouvrir avant de décider (pièces d'identité : lien court journalisé). */
  aOuvrir: string[]
}

export interface DemandePoste {
  issue: string
  montant?: Francs | null // remboursement partiel ou geste : dans la fourchette
  motif: string // code de la liste courte (motifs)
  note: string
  message: string
  prolonger?: boolean
  appel?: string | null // accord téléphonique sur lequel repose la décision
}

export type RefusPoste =
  | 'deja_decide'
  | 'trop_tot'
  | 'auteur'
  | 'lie'
  | 'hors_regle'
  | 'disculpe'
  | 'au_dela_paye'
  | 'hors_fourchette'
  | 'geste_commission'
  | 'motif'
  | 'note_courte'
  | 'lecture_seule'
  | 'transmettre'
  | 'prolongation_unique'
  | 'lot_heterogene'
  | 'lot_plafond'
  | 'lot_taille'
  | 'accord_hors_issues'
  | 'en_attente'

/** Ligne de l'Audit : une décision qui s'écarte de la suggestion de la règle. */
export interface LigneEcart {
  genre: GenreDossier
  id: string
  ref: string
  suggestion: string | null
  decision: string
  motif: string
  note: string
  par: string
  le: Instant
  montant: Francs | null
  instantane: { controles: { libelle: string; etat: EtatControle; corrige: boolean }[]; pieces: number; appels: number }
}

export interface DomaineDecisions {
  /** File du poste : dossiers visibles du rôle, triés par échéance (un genre, ou tous). */
  file(genre?: GenreDossier): Promise<DossierCourt[]>
  dossier(genre: GenreDossier, id: string): Promise<DossierPoste | null>
  /** Confirme ou corrige une ligne de la liste de contrôle (journalisé). */
  controler(genre: GenreDossier, id: string, controle: string, etat: EtatControle): Promise<Resultat<object, RefusPoste>>
  /** Note un appel : il devient une pièce ; un accord ne porte que sur une issue permise. */
  noterAppel(genre: GenreDossier, id: string, a: Omit<AppelPoste, 'id' | 'par' | 'le'>): Promise<Resultat<{ id: string }, RefusPoste>>
  /** Décide : la source refait tous les contrôles (issue permise, plafond, auteur, échéance…). */
  decider(genre: GenreDossier, id: string, d: DemandePoste): Promise<Resultat<{ etat: 'appliquee' | 'a_contresigner'; id: string }, RefusPoste>>
  /** Transmet au niveau supérieur (quatre yeux : un autre compte tranchera). */
  transmettre(genre: GenreDossier, id: string, raison: string, issueProposee: string | null): Promise<Resultat<{ vers: string }, RefusPoste>>
  /** Prolonge l'échéance une fois (champ de manœuvre), avec motif. */
  prolonger(genre: GenreDossier, id: string, note: string): Promise<Resultat<{ echeance: Instant }, RefusPoste>>
  /** Décision en lot pour des dossiers identiques (même cause, même issue), plafonnée. */
  deciderLot(genre: GenreDossier, ids: string[], d: DemandePoste): Promise<Resultat<{ n: number }, RefusPoste>>
  /** Audit : décisions qui s'écartent de la suggestion. */
  ecarts(): Promise<LigneEcart[]>
}
