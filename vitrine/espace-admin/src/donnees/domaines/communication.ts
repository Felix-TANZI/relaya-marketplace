// Domaine « communication » (ADM-11 ; tenu par S5) : messagerie et notifications (ADM-P27), modèles de messages
// (page ajoutée), diffusion de panne et mode papier (ADM-P28), support et centre d'aide (ADM-P29).
// Règles de fond : un événement, un seul envoi (clé d'idempotence) ; jamais de code ni de numéro dans un texte ni dans
// le journal (destinataire masqué, code « ●●●●●● ») ; aucune promotion par SMS ; la décision se prend dans le
// dossier, jamais dans la conversation. Règles pures : pages/ADM-11/regles-s5.ts.
import type { Espace, Instant, Resultat } from '../communs'
import type { RaisonContenu } from '../../pages/ADM-11/regles-s5'

// ── Messagerie (ADM-P27) ───────────────────────────────────────────────────────────────────────────────────────────
export type Canal = 'sms' | 'push' | 'app' | 'email' | 'portail'
export type Criticite = 1 | 2 | 3
export interface Envoi {
  id: string
  le: Instant
  evenement: string // « Code de retrait »
  objet: string // « BLV-00008 »
  destinataire: string // masqué : « Client ••• 0388 »
  espace: Espace
  canaux: Canal[]
  modele: string // « CODE-RETRAIT »
  version: number
  criticite: Criticite
  statut: 'delivre' | 'echec' | 'en_cours' | 'enregistre'
  delivres: number | null // diffusion : délivrés sur `destinataires`
  destinataires: number
  cout: number // F, 0 tant qu'il n'est pas délivré
  cle: string // clé d'idempotence
  essais: { le: Instant; ok: boolean; detail: string }[]
  renvois: number // renvois du client sur 24 h (CODE-RENVOI)
  echeanceCarte: Instant | null // criticité 1 non délivré : carte avant (ADM-MSG-C1-MIN)
  texte: string // texte envoyé, code masqué
}

export interface BudgetSms {
  mois: string // « octobre 2026 »
  jours: { jour: string; sms: number; cout: number }[]
  commandesMois: number
  commandesJour: number
  parModele: { modele: string; libelle: string; sms: number; cout: number }[]
  gratuits: number // push, application et courriel du mois
}

export type Espaces = Exclude<Espace, 'admin'>
export interface Diffusion {
  id: string // « DF-0007 »
  objet: string
  texte: string
  espaces: Espaces[]
  zones: string[]
  canaux: Canal[]
  promotion: boolean
  programmeeLe: Instant
  destinataires: number
  par: string
  le: Instant
  etat: 'programmee' | 'a_contresigner' | 'envoyee' | 'refusee'
  quatreYeux: string | null
}
export type RaisonDiffusion = 'motif_court' | 'contenu' | 'sms_promo' | 'heures_promo' | 'passe' | 'vide' | 'objet'

// ── Modèles de messages (page ajoutée) ─────────────────────────────────────────────────────────────────────────────
export interface VersionModele {
  version: number
  fr: string
  en: string
  le: Instant
  par: string
  motif: string
}
export interface ModeleMessage {
  id: string // « CODE-RETRAIT »
  nom: string
  evenement: string
  destinataire: Espaces
  canaux: Canal[]
  criticite: Criticite
  promotion: boolean
  codePermis: boolean // seul le code de retrait porte {code}, inséré par le service d'envoi
  source: string // règle ou décision (« DP-67 »)
  versions: VersionModele[] // la dernière est publiée
  echecs: number // envois en échec du jour
}
export type RaisonModele = RaisonContenu | 'motif_court' | 'sms_promo' | 'inchange' | 'vide'

// ── Panne et mode papier (ADM-P28) ─────────────────────────────────────────────────────────────────────────────────
export type EtatIncident = 'declare' | 'papier' | 'retabli' | 'clos'
export interface RemisePapier {
  id: string
  relais: string
  etiquette: string
  porteur: 'client' | 'tiers'
  le: Instant
  ressaisieLe: Instant | null // ressaisie faite par le gérant à la reconnexion
  relances: number
}
export interface Incident {
  id: string // « INC-261013-01 »
  service: string
  zones: string[]
  detecteLe: Instant
  declareLe: Instant
  par: string
  effets: string[]
  consignes: string
  etat: EtatIncident
  papierLe: Instant | null
  relaisPapier: string[]
  retabliLe: Instant | null
  closLe: Instant | null
  accuses: { app: Espace; le: Instant | null }[]
  remises: RemisePapier[]
  rapport: { cause: string; effets: string; change: string } | null
  journal: { le: Instant; quoi: string; par: string }[]
}
export interface ServiceEtat {
  id: string
  nom: string
  detail: string
  etat: 'normal' | 'degrade' | 'panne' | 'ferme'
}
export type RaisonIncident = 'motif_court' | 'contenu' | 'etat' | 'zones' | 'perimetre' | 'registre' | 'rapport' | 'non_retabli' | 'service'

// ── Support et centre d'aide (ADM-P29) ─────────────────────────────────────────────────────────────────────────────
export interface MessageSupport {
  le: Instant
  de: 'acteur' | 'support' | 'systeme'
  auteur: string
  texte: string
}
export interface TicketSupport {
  id: string // « SP-0207 »
  espace: Espaces
  canal: 'whatsapp_clients' | 'whatsapp_vendeurs' | 'app' | 'portail'
  sujet: string
  de: string // masqué pour un client
  role: string // « Client · Bastos »
  ouvertLe: Instant
  echeance: Instant // première réponse (SUP-DELAI, heures d'ouverture)
  premiereReponseLe: Instant | null
  etat: 'nouvelle' | 'en_cours' | 'resolue'
  rattache: { ref: string; libelle: string } | null
  proposition: { ref: string; libelle: string } | null // rattachement proposé (même numéro que la commande)
  dossier: { commission: number; moyen: string } | null // commande rattachée : commission perçue, moyen de paiement d'origine (masqué)
  messages: MessageSupport[]
  brouillon: { texte: string; reponseType: string | null } | null
  geste: { montant: number; le: Instant; par: string; moyen: string } | null
  zone: string | null
}
export interface ReponseType {
  id: string // « RT-CODE-01 »
  titre: string
  regles: string[]
  version: number
  utilisee30j: number
  texte: string
  pour: Espaces[]
  majLe: Instant
}
export interface ArticleAide {
  id: string
  titre: string
  pour: Espaces
  regles: string[] // codes de règle ou de paramètre cités
  majLe: Instant
  signale: string | null // raison : une règle citée a une nouvelle version (ADM-P29R-06)
}
export type RaisonSupport = 'contenu' | 'vide' | 'etat' | 'geste_depasse' | 'deja_geste' | 'non_rattache' | 'motif_court' | 'inconnu'

export interface DomaineCommunication {
  // Messagerie
  envois(): Promise<Envoi[]>
  renvoyer(id: string): Promise<Resultat<object, 'deja_delivre' | 'quota' | 'inconnu'>>
  budgetSms(): Promise<BudgetSms>
  diffusions(): Promise<Diffusion[]>
  audience(espaces: Espaces[], zones: string[], promotion: boolean): Promise<number>
  diffuser(d: { objet: string; texte: string; espaces: Espaces[]; zones: string[]; canaux: Canal[]; promotion: boolean; programmeeLe: Instant; motif: string }): Promise<Resultat<{ id: string; etat: Diffusion['etat'] }, RaisonDiffusion>>
  // Modèles
  modeles(): Promise<ModeleMessage[]>
  publierModele(id: string, fr: string, en: string, motif: string): Promise<Resultat<{ version: number }, RaisonModele>>
  // Panne
  services(): Promise<ServiceEtat[]>
  incidents(): Promise<Incident[]>
  declarer(d: { service: string; zones: string[]; effets: string[]; consignes: string; detecteLe: Instant }): Promise<Resultat<{ id: string }, RaisonIncident>>
  passerPapier(id: string, relais: string[]): Promise<Resultat<object, RaisonIncident>>
  mettreAJour(id: string, consignes: string): Promise<Resultat<object, RaisonIncident>>
  retablir(id: string): Promise<Resultat<object, RaisonIncident>>
  relancerRessaisie(id: string, remise: string): Promise<Resultat<object, RaisonIncident>>
  ecrireRapport(id: string, r: { cause: string; effets: string; change: string }): Promise<Resultat<object, RaisonIncident>>
  clore(id: string): Promise<Resultat<object, RaisonIncident>>
  // Support
  tickets(): Promise<TicketSupport[]>
  rattacher(id: string, ref: string): Promise<Resultat<object, RaisonSupport>>
  preparerReponse(id: string, reponseType: string | null, texte: string): Promise<Resultat<object, RaisonSupport>>
  envoyerReponse(id: string): Promise<Resultat<object, RaisonSupport>>
  resoudre(id: string): Promise<Resultat<object, RaisonSupport>>
  accorderGeste(id: string, motif: string): Promise<Resultat<object, RaisonSupport>>
  reponsesTypes(): Promise<ReponseType[]>
  articles(): Promise<ArticleAide[]>
  mettreAJourArticle(id: string): Promise<Resultat<object, RaisonSupport>>
}
