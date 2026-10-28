// Domaine « litiges » (ADM-P03 ; tenu par S1) : dossiers de litige. Niveau 1 au Support, niveau 2 et recours à la
// Médiation (la Direction voit tout) ; la Finance n'en voit jamais le contenu (ADM-ROL-04 : l'état de l'argent
// seulement) ; les Opérations ne voient que les constats des relais de leurs zones, en lecture.
// Règles tenues par la source : vendeur LIT-VENDEUR-H pour répondre (sans réponse : arbitrage prioritaire, présomption
// en faveur du client) ; aucune décision tant que le vendeur peut répondre ; client silencieux LIT-CLIENT-SILENCE-J :
// clos en faveur du vendeur ; recours une fois, sous LIT-RECOURS-H, décidé par la Médiation sous LIT-MEDIATEUR-J ;
// remboursement TOUJOURS au moyen de paiement d'origine (ADM-ARG-05, ADM-CACHEE-11), au-delà de REMB-CONTROLE-SEUIL à
// quatre yeux ; montants calculés par la source, jamais saisis (ADM-PRI-02) ; motif écrit (ADM-PRI-03).
// Chaîne de preuves (v6, DP-60) : une photo à CHAQUE changement de main (C1 vendeur → livreur, C2 livreur → relais,
// C3 relais → client ou remise à domicile), horodatée par le serveur, avec l'heure et la position d'origine du téléphone
// quand elle est prise hors connexion ; une preuve manquante reporte la responsabilité sur qui devait la produire.
import type { CodeZone, EtatDecision, Francs, Instant, Resultat } from '../communs'

export type EtatLitige = 'ouvert' | 'arbitrer' | 'decide' | 'recours' | 'clos'
export type OptionLitige = 'rembourser' | 'remplacer' | 'partager' | 'debouter' | 'transporteur'

export interface LitigeCourt {
  id: string // « LT-0412 »
  commande: string // « BLV-51877 »
  niveau: 1 | 2
  motif: string
  client: string // masqué : « Client ••• 4217 »
  vendeur: string
  zone: CodeZone
  montantEnJeu: Francs
  ouvertLe: Instant
  echeance: Instant
  etat: EtatLitige
  alerte: string | null // « Vendeur silencieux », « Contesté par le vendeur »
}

/** Un changement de main (ou une photo d'une partie), dans l'ordre. */
export interface PreuveGarde {
  id: string
  point: 'C1' | 'C2' | 'C3' | 'client' | 'vendeur' | 'gerant' | 'livreur' | 'entreprise'
  quoi: string // « Produit à découvert »
  par: string // « Serge A. · Yafé Express »
  le: Instant
  lieu: string // « Melen · ±6 m »
  photo: boolean // false : constat sans photo (QR scanné, scellé intact)
  note: string
  saisieLe: Instant | null // prise hors connexion : heure d'origine du téléphone (ADM-CACHEE-18)
  manquante?: boolean // preuve attendue mais absente : responsabilité reportée
}

export interface Position {
  partie: 'client' | 'vendeur' | 'entreprise'
  nom: string
  etat: string // « Attend un remboursement », « Conteste », « Pas encore répondu », « Non mise en cause »
  texte: string | null
  le: Instant | null
}

export interface OptionDecision {
  id: OptionLitige
  libelle: string
  effet: string // phrase calculée par la source (montants compris)
  montant: Francs | null // ce qui sort de l'escrow vers le client (calculé)
  quatreYeux: boolean
  permise: boolean
  raison?: string // pourquoi elle n'est pas permise
}

export interface DecisionLitige {
  option: OptionLitige
  libelle: string
  motif: string
  par: string // « Clarisse Mvondo · Support client »
  le: Instant
  etat: EtatDecision
  quatreYeux: string | null // « QY-0008 »
  suites: string[] // ce qui est parti vers les autres espaces
}

export interface LitigeDossier extends LitigeCourt {
  paiement: string // moyen d'origine, masqué : « MTN MoMo ···· 31 »
  article: string
  trajet: string // « Tonton PG, Mvog-Mbi (Z10) → Relais Mvog-Ada »
  etiquette: string | null // « BV 24 7962 »
  paquet: string | null
  echeanceVendeur: Instant
  vendeurRepondu: boolean
  preuves: PreuveGarde[]
  frise: { t: string; le: Instant | null; st: 'done' | 'cur' | 'bad' | '' }[]
  croisement: { colonnes: string[]; lignes: string[][]; alerteFraude: boolean; note: string }
  positions: Position[]
  /** Lecture des preuves par les règles (sans assistant : FF-IA fermé) ; null tant que le vendeur peut répondre. */
  proposition: { option: OptionLitige; texte: string; regle: string } | null
  options: OptionDecision[]
  decision: DecisionLitige | null
  recours: { par: string; le: Instant; texte: string; echeance: Instant } | null
  /** Compléments demandés par la console (message du dossier, journalisé). */
  complements: { partie: 'client' | 'vendeur' | 'entreprise'; motif: string; le: Instant; par: string }[]
  /** Le rôle courant tient-il ce niveau (Support : niveau 1 ; Médiation : niveau 2 et recours ; Direction : tout) ? */
  monNiveau: boolean
  /** Décision envoyée au second validateur (« QY-0008 ») : rien ne s'applique avant la contresignature. */
  attente: string | null
  /** Ce que le rôle peut faire ici : décider (son niveau), escalader, lecture seule, ou argent seulement (Finance). */
  vue: 'decider' | 'lecture'
  escrow: string // « 16 700 F gelés · sans date »
}

export interface DomaineLitiges {
  liste(): Promise<LitigeCourt[]>
  litige(id: string): Promise<LitigeDossier | null>
  /** Tranche le dossier (ou le recours) : motif, quatre yeux au-delà du seuil ; effets publiés vers les espaces. */
  decider(id: string, option: OptionLitige, motif: string): Promise<Resultat<{ etat: EtatDecision; id: string }, 'motif_court' | 'trop_tot' | 'non_permise' | 'deja_decide'>>
  /** Niveau 1 → Médiation (montant élevé, dossier complexe), motif journalisé. */
  escalader(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'deja_niveau_2'>>
  /** Demande un complément de preuve à une partie (message du dossier). */
  demanderComplement(id: string, partie: 'client' | 'vendeur' | 'entreprise', motif: string): Promise<Resultat<object, 'motif_court'>>
}
