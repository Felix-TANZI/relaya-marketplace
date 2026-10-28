// Domaine « argent » (ADM-05 et commissions d'ADM-10 ; tenu par S2) : escrow et registre en partie double, Wallet,
// remboursements (et remboursements automatiques), versements du vendredi, rapprochement l’agrégateur ↔ registre, revenus et
// obligations, commissions, export comptable. Règles de fond :
// - tout montant est CALCULÉ par le serveur à partir du registre (src/calculs/argent.ts) ; aucun champ montant n'est
//   éditable dans la console ; une transition passe par une décision motivée (quatre yeux selon la règle) ;
// - Finance ne voit jamais le CONTENU d'un litige (référence seule) ; Support ne voit jamais les versements (ADM-ROL-04) ;
// - Opérations : lecture de l'escrow de ses zones seulement (ADM-ROL-03).
import type { Francs, Instant, Resultat } from '../communs'

export type EtatEscrow = 'bloque' | 'se_libere' | 'gele' | 'libere' | 'verse' | 'rembourse'
export type Moyen = 'momo' | 'wallet' | 'comptoir'

export interface Ecriture {
  le: Instant | null // null : écriture future
  quand: string | null // libellé d'une écriture future (« à la libération », « vendredi »)
  libelle: string
  debit: string // compte qui reçoit
  credit: string
  montant: Francs
  cle: string // clé d'idempotence
  future: boolean
}
export interface Transition {
  le: Instant | null
  titre: string
  detail: string
  st: 'done' | 'cur' | 'bad' | ''
}
export interface GesteEscrow {
  permis: boolean
  raison: string
}
export interface CommandeEscrow {
  ref: string
  article: string
  vendeurs: string[]
  relais: string | null
  zone: string
  client: string // masqué
  moyen: Moyen
  numero: string // « MTN ···· 17 », « Wallet »
  total: Francs // payé à BelivaY (articles + livraison), détenu chez l'agrégateur
  fraisClient: Francs // 2 % Mobile Money du client : argent de passage, jamais revenu
  commission: Francs
  livraison: Francs
  netVendeurs: Francs
  payeeLe: Instant
  etat: EtatEscrow
  liberationLe: Instant | null
  dossier: string | null // « LT-0412 » ou « Gel conservatoire »
  dossierLisible: boolean // false pour la Finance : la référence seule (ADM-ROL-04)
  remboursement: string | null
  versementLe: Instant | null
  ecritures: Ecriture[]
  transitions: Transition[]
  soldes: { compte: string; montant: Francs }[]
  gestes: { liberer: GesteEscrow; geler: GesteEscrow; lever: GesteEscrow; rembourser: GesteEscrow; partager: GesteEscrow }
  enAttenteQuatreYeux: string | null
}
export interface VueEscrow {
  le: Instant
  bloque: Francs
  seLibere: Francs
  gele: Francs
  prochainVersement: { le: Instant; montant: Francs }
  equilibre: boolean
  commandes: CommandeEscrow[]
}

export interface CompteWallet {
  id: string // « WL-0007 »
  client: string // masqué
  retirable: Francs // rechargé ou remboursé : retirable
  gestes: Francs // gestes commerciaux : non retirables, seulement pour acheter
  numeroRecharge: string
  rechargesMois: Francs
  retraits24h: { n: number; montant: Francs }
  dernierMouvement: Instant
  alerte: string | null
  gele: boolean
  enAttenteQuatreYeux: string | null
}
export interface VueWallet {
  interrupteur: { code: string; etat: string }
  comptes: CompteWallet[]
  mouvementsMois: { recharges: Francs; retraits: Francs; paiements: Francs; remboursements: Francs; gestes: Francs }
}

export type OrigineRemb = 'auto' | 'litige' | 'annulation' | 'rupture' | 'renvoi_garde'
export type EtatRemb = 'attente' | 'decide' | 'a_contresigner' | 'en_cours' | 'echoue' | 'rembourse' | 'refuse'
export interface Tentative {
  le: Instant
  vers: string
  issue: 'ok' | 'refus' | 'attente'
  detail: string
}
export interface RemboursementVu {
  id: string // « RB-0031 »
  commande: string
  vendeur: string
  article: string
  origine: OrigineRemb
  motif: string // action et décision, jamais le contenu d'un litige
  dossier: string | null
  articles: Francs
  livraison: Francs
  retenues: Francs // garde et renvoi
  fraisRendus: Francs // 2 % Mobile Money du client rendus (faute qui n'est pas la sienne)
  montant: Francs // envoyé au client
  moyen: string // moyen d'origine
  vers: string // moyen de l'envoi : d'origine, ou autre numéro du même titulaire après quatre yeux
  etat: EtatRemb
  auteur: string
  decideLe: Instant
  tentatives: Tentative[]
  rembourseLe: Instant | null
  repriseVendeur: Francs // avancé par BelivaY, repris sur les versements du vendeur fautif
  quatreYeux: { id: string | null; premier: string | null; second: string | null } | null
  gestes: { executer: boolean; relever: boolean; autreNumero: boolean }
}
export interface CasAuto {
  id: string // « RA-0012 »
  commande: string
  client: string
  vendeur: string
  article: string
  montant: Francs
  palierEleve: boolean
  le: Instant
  photo: boolean
  commandesSansLitige: number
  delaiH: number
  sur30j: number
  surAn: number
  doute: string | null
  etat: 'rembourse' | 'retour_normal' | 'en_revue'
  droitRetire: boolean
}
export interface VueRemboursements {
  liste: RemboursementVu[]
  auto: { cas: CasAuto[]; moisTotal: Francs; vendeursEnControle: string[] }
}

export type GenreLot = 'vendeur' | 'relais' | 'entreprise'
export type EtatLot = 'prevu' | 'reporte' | 'attente_kyc' | 'controle_requis' | 'a_contresigner' | 'controle' | 'bloque' | 'suspendu' | 'relance' | 'zero' | 'confirme'
export interface Lot {
  id: string
  genre: GenreLot
  beneficiaire: string
  sous: string
  numero: string
  lignes: { libelle: string; montant: Francs }[] // décomposition calculée
  verse: Francs
  frais: Francs // 1 % Mobile Money payé par le bénéficiaire (vendeur, relais, entreprise : R43)
  fraisBelivay: Francs // frais de versement à la charge de BelivaY (aucun depuis R43 v2.0 ; gardé pour l'historique)
  etat: EtatLot
  raison: string | null
  reports: number // vendredis de report d'une dette (relais, entreprise)
  dette: Francs
  plan: boolean // plan d'apurement validé
  quatreYeux: string | null
  confirmeLe: Instant | null
}
export interface Cycle {
  id: string // « VS-261016 »
  vendredi: Instant
  arrete: Instant // jeudi 23 h 59
  limite: Instant // vendredi 12 h
  etat: 'prevision' | 'prepare' | 'controle' | 'execution' | 'termine' | 'clos'
  lots: Lot[]
  closPar: string | null
  closLe: Instant | null
}
export interface VueVersements {
  courant: Cycle
  dernier: Cycle
  historique: { vendredi: Instant; montant: Francs; lots: number; prevision: boolean }[]
  livreurs: { entreprise: string; livreurs: number; marque: Instant | null; par: string | null }[] // payés par leur entreprise
}

export interface LigneRappro {
  flux: string
  registre: Francs
  agregateur: Francs
}
export interface EcartRappro {
  id: string
  montant: Francs
  origine: string
  commande: string | null
  ouvertLe: Instant
  etat: 'en_attente' | 'ecart' | 'carte' | 'a_contresigner' | 'regularise'
  quatreYeux: string | null
  carte: string | null
}
export interface ExportMensuel {
  id: string
  nom: string
  detail: string
  entetes: string[]
  lignes: (string | number)[][]
}
export interface VueRapprochement {
  le: Instant
  revenusJour: { commissions: Francs; livraison: Francs; payeClients: Francs }
  revenusMois: Francs
  sept: { l: string; v: Francs }[]
  parZone: { l: string; v: Francs }[]
  parCategorie: { l: string; v: Francs }[]
  hier: { jour: Instant; lignes: LigneRappro[]; calculeLe: Instant }
  aujourdhui: { lignes: LigneRappro[]; ecarts: EcartRappro[] }
  couts: { libelle: string; montant: Francs; detail: string }[]
  import: { nom: string; le: Instant; lignes: number; concordantes: number; ecarts: { ref: string; registre: Francs; releve: Francs }[] } | null
  cloture: { mois: string; revenus: Francs; commissions: Francs; livraison: Francs; rapprochements: string; transmis: { le: Instant; par: string } | null; exports: ExportMensuel[] }
  frais: { flux: string; base: Francs; taux: number; frais: Francs; paye: 'client' | 'vendeur' | 'beneficiaire' | 'belivay' }[]
  releveModele: string // relevé de paiement du jour (CSV) : à réimporter pour vérifier
}

export interface VendeurCommission {
  vendeur: string
  palier: string
  zone: string
  plan: 'Free' | 'Boost' | 'Pro'
  essai: boolean
  decouverte: boolean
  commandes: number
  ventes: Francs
  retenu: Francs
  garde: Francs
  fraisVersement: Francs
  remisePlan: Francs
  echec: { le: Instant; motif: string; graceJusqua: Instant; etat: 'grace' | 'free' | 'paye' } | null
}
export interface VueCommissions {
  mois: string
  versions: { v: string; contenu: string; effet: string; par: string; etat: 'en_vigueur' | 'remplacee' | 'annoncee' }[]
  vendeurs: VendeurCommission[]
  relevesEmis: { mois: string; emisLe: Instant; vendeurs: number; retenu: Francs }[]
}

export interface LigneExport {
  date: string
  piece: string
  compte: string
  libelle: string
  debit: Francs
  credit: Francs
}

export interface DomaineArgent {
  escrow(): Promise<VueEscrow>
  wallet(): Promise<VueWallet>
  remboursements(): Promise<VueRemboursements>
  /** Relève le statut de l'opérateur d'un remboursement envoyé (en production : webhook et sondage PAY-SONDAGE). */
  releverStatut(id: string): Promise<Resultat<{ etat: EtatRemb }, 'inconnu' | 'etat'>>
  /** Exécute un remboursement décidé, sous le seuil de contrôle (au-delà : quatre yeux). */
  executer(id: string): Promise<Resultat<{ etat: EtatRemb }, 'inconnu' | 'etat' | 'seuil' | 'deja_rembourse'>>
  versements(): Promise<VueVersements>
  rapprochement(): Promise<VueRapprochement>
  /** Import du relevé de l'agrégateur (CSV « reference;montant;statut »). */
  importerReleve(nom: string, contenu: string): Promise<Resultat<{ lignes: number; ecarts: number }, 'vide' | 'forme'>>
  /** Carte Finance (ou Direction) ouverte sur un écart, une dette, un échec : arrive dans la File d'action. */
  ouvrirCarte(objet: string, texte: string): Promise<Resultat<{ id: string }, 'deja'>>
  transmettreComptable(mois: string): Promise<Resultat<object, 'deja'>>
  commissions(): Promise<VueCommissions>
  /** Écritures du grand livre d'une période (plan de comptes A-19), pour l'export comptable signé. */
  grandLivre(du: Instant, au: Instant): Promise<LigneExport[]>
}
