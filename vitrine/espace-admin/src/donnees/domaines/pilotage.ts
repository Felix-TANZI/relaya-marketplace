// Domaine « pilotage » (ADM-10 ; tenu par S5 ; commissions : S2) : paramétrage et simulation (ADM-P24), promotions et
// ventes flash (ADM-P26), interrupteurs des fonctions (page ajoutée). Les valeurs viennent du registre
// (logique-metier/parametres-en-vigueur.json) ; un changement est une PROPOSITION motivée, simulée, validée par une
// autre personne quand le paramètre est critique (quatre yeux, source.quatreyeux), créée en NOUVELLE VERSION avec sa
// date d'effet (jamais rétroactive). Règles pures : pages/ADM-11/regles-s5.ts.
import type { Instant, Resultat, Role } from '../communs'
import type { ControleFlash, EtatFlash, Simulation } from '../../pages/ADM-11/regles-s5'

// ── Paramétrage (ADM-P24) ──────────────────────────────────────────────────────────────────────────────────────────
export interface ParametreVu {
  code: string
  valeur: string // valeur en vigueur aujourd'hui
  unite: string | null
  statut: string // Décidé, Proposé, Recommandé, À trancher (registre)
  famille: string
  critique: boolean
  proposable: boolean // valeur chiffrée (pas imposés) ; sinon : décision écrite
  version: number
  depuis: Instant | null // date d'effet de la version en vigueur (null : registre d'origine)
  annoncee: { version: number; valeur: string; dateEffet: Instant } | null
  propositionOuverte: string | null
}

export interface VersionParametre {
  code: string
  version: number
  valeur: string
  avant: string
  dateEffet: Instant
  creeLe: Instant
  par: string
  validePar: string | null // second validateur (paramètre critique)
  motif: string
  reference: string | null
  etat: 'annoncee' | 'en_vigueur' | 'remplacee'
}

export type EtatProposition = 'simulee' | 'bloquee' | 'a_contresigner' | 'appliquee' | 'refusee' | 'expiree' | 'retiree'
export interface PropositionParametre {
  id: string // « PP-0004 »
  code: string
  statut: string
  avant: string
  apres: string
  apresN: number
  dateEffet: Instant
  motif: string
  reference: string
  critique: boolean
  par: { agentId: string; nom: string; role: Role; le: Instant }
  simulation: Simulation
  etat: EtatProposition
  quatreYeux: string | null // « QY-0008 »
  expireLe: Instant | null
  second: { nom: string; role: Role; le: Instant; motif: string } | null
}

export type RaisonProposition = 'texte' | 'pas' | 'deja_ouverte' | 'critique_reserve' | 'inconnu' | 'bloquee' | 'deja_soumise' | 'pas_demandeur'

// ── Promotions et ventes flash (ADM-P26) ───────────────────────────────────────────────────────────────────────────
export interface FlashVu {
  id: string // « FL-0012 »
  offre: string
  vendeur: string
  zone: string | null
  cible: string // tournée servie
  prix30: number
  joursPratique: number
  prixFlash: number
  remise: number // % réelle
  debut: Instant
  fin: Instant
  finReelle: Instant
  stockReserve: number
  stockOffre: number
  vendus: number
  ventes: Instant[]
  etat: EtatFlash
  controles: { id: ControleFlash; ok: boolean }[]
  simuleeLe: Instant | null
  motifArret: string | null
  journal: { le: Instant; quoi: string; par: string | null }[]
}
export interface PromotionVu {
  id: string // « PM-0031 »
  offre: string
  vendeur: string
  prixBarre: number
  prix: number
  joursPratique: number // jours sur 30 où le prix barré a été pratiqué
  remise: number
  honnete: boolean
  retiree: { le: Instant; motif: string } | null
}
export interface FonctionFermee {
  code: string // « FF-SPONSO »
  libelle: string
  regle: string
  ouvert: boolean
}
export interface VuePromotions {
  flashes: FlashVu[]
  promotions: PromotionVu[]
  fonctions: FonctionFermee[] // sponsorisé, boost, parrainage, codes promo, fidélité (cachés au lancement)
  flashOuvert: boolean // FF-FLASH
  mois: { libelle: string; revenus: number; volume: number; livraisonOfferte: number; gestes: number; remisesBelivay: number; fidelite: number; premiereAnnee: boolean; plusForteRemise: number }
  accueil: { emplacements: number; nouveaux: number; sponsorises: number; rotationH: number }
  fetes: { libelle: string; quand: string }[]
}
export type RaisonFlash = 'motif_court' | 'controle' | 'etat' | 'ferme' | 'inconnu' | 'non_simulee'

// ── Interrupteurs (page ajoutée) ──────────────────────────────────────────────────────────────────────────────────
export interface InterrupteurVu {
  code: string // « FF-IA »
  libelle: string
  apresLancement: boolean
  ouvert: boolean // état dans l'espace pays (console et applications)
  registreSite: string | null // valeur du registre pour le site (DP-50), quand elle existe
  branche: string[] // où le code le lit (applications)
  parametres: { code: string; statut: string }[]
  bloque: boolean // un paramètre « À trancher » : ne peut pas s'ouvrir
  alerte: string | null // « après lancement ouvert »
  demande: { id: string; ouvrir: boolean; par: string; le: Instant; motif: string } | null
  historique: { le: Instant; ouvert: boolean; par: string; second: string | null; motif: string }[]
}
export type RaisonBascule = 'motif_court' | 'module_bloque' | 'deja_demande' | 'inconnu' | 'sans_effet'

export interface DomainePilotage {
  parametres(): Promise<ParametreVu[]>
  propositions(): Promise<PropositionParametre[]>
  versions(code?: string): Promise<VersionParametre[]>
  /** Prépare et simule une proposition (rejeu, cas types, contrôles) ; rien n'est soumis. */
  preparer(d: { code: string; apres: number; dateEffet: Instant; motif: string; reference: string }): Promise<Resultat<{ id: string }, RaisonProposition>>
  /** Soumet : appliquée (nouvelle version) si non critique, sinon quatre yeux (Direction ou Finance, autre personne). */
  soumettre(id: string): Promise<Resultat<{ etat: EtatProposition }, RaisonProposition>>
  retirer(id: string): Promise<Resultat<object, RaisonProposition>>
  promotions(): Promise<VuePromotions>
  simulerFlash(id: string): Promise<Resultat<object, RaisonFlash>>
  programmerFlash(id: string): Promise<Resultat<object, RaisonFlash>>
  annulerFlash(id: string, motif: string): Promise<Resultat<object, RaisonFlash>>
  arreterFlash(id: string, motif: string): Promise<Resultat<object, RaisonFlash>>
  retirerRabais(id: string, motif: string): Promise<Resultat<object, RaisonFlash>>
  /** Interrupteurs vus du Paramétrage (nouveautés EX-01 à EX-06, modules fermés). */
  modules(): Promise<InterrupteurVu[]>
  interrupteurs(): Promise<InterrupteurVu[]>
  /** Demande d'ouvrir ou de fermer une fonction : toujours à quatre yeux (ADM-CACHEE-25). */
  demanderBascule(code: string, ouvrir: boolean, motif: string): Promise<Resultat<{ id: string }, RaisonBascule>>
  /** Contenu du site client (accueil) piloté par la console : moments (actif, dates), catégories mises en avant. */
  contenuSite(): Promise<ContenuSite>
  /** Publie le contenu : le site client le lit par le pont ; la Direction règle tout, le Marketing (Service client) les catégories. */
  publierContenu(c: { moments: { id: string; actif: boolean; du: string; au: string }[]; categories: string[] }, motif: string): Promise<Resultat<{ version: number }, 'motif_court' | 'dates' | 'moments_reserves'>>
  /** Promotions de la plateforme (financées par BelivaY) : programmées, en cours, finies ou arrêtées. */
  promotionsPlateforme(): Promise<VuePromotionsPlateforme>
  /** Crée une promotion : programmée (début à venir) ou lancée aussitôt (début maintenant) ; Direction seule. */
  creerPromotion(d: DemandePromotion, motif: string): Promise<Resultat<{ id: string }, RaisonPromotion>>
  /** Lance maintenant une promotion programmée (le début devient l'instant présent ; la fin ne bouge pas). */
  lancerPromotion(id: string, motif: string): Promise<Resultat<object, RaisonPromotion>>
  /** Arrête une promotion programmée ou en cours (Direction ; Service client : contrôle) ; les commandes payées gardent leur prix. */
  arreterPromotion(id: string, motif: string): Promise<Resultat<object, RaisonPromotion>>
  /** Photos ajoutées ou remplacées par la console (bannières, moments, catégories, produits signalés, pièces). */
  photos(): Promise<PhotoConsole[]>
  /** Ajoute ou remplace une photo (image réduite sur l'appareil) ; motif journalisé ; publiée à l'espace concerné. */
  remplacerPhoto(d: DemandePhoto, motif: string): Promise<Resultat<object, RaisonPhoto>>
  /** Retire la photo de la console : la photo d'origine revient. */
  retirerPhoto(cible: CiblePhoto, id: string, motif: string): Promise<Resultat<object, RaisonPhoto>>
}

// ── Promotions de la plateforme ────────────────────────────────────────────────────────────────────────────────────
export type EtatPromotion = 'programmee' | 'en_cours' | 'terminee' | 'arretee'
/** Cible : tout le catalogue, une catégorie (univers du site), une zone exploitée, ou des vitrines nommées. */
export type CiblePromotion = { genre: 'toutes' } | { genre: 'categorie'; id: string } | { genre: 'zone'; id: string } | { genre: 'vitrines'; ids: string[] }
/** Remise : un pourcentage (au plus la limite de générosité) ou la livraison offerte. */
export type RemisePromotion = { genre: 'pourcentage'; pct: number } | { genre: 'livraison' }
export interface DemandePromotion {
  titre: string
  remise: RemisePromotion
  /** null : lancée maintenant. */
  debut: Instant | null
  fin: Instant
  cible: CiblePromotion
}
export interface PromotionPlateforme {
  id: string // « PP-0003 »
  titre: string
  remise: RemisePromotion
  cible: CiblePromotion
  cibleLibelle: string // « Catégorie : Mode femme »
  debut: Instant
  fin: Instant
  etat: EtatPromotion
  creeePar: string
  arret: { le: Instant; par: string; motif: string } | null
  journal: { le: Instant; quoi: string; par: string; motif: string | null }[]
}
export interface VuePromotionsPlateforme {
  promotions: PromotionPlateforme[]
  /** Choix de cible proposés à la création. */
  categories: { id: string; titre: string }[]
  zones: { id: string; titre: string }[]
  vitrines: { id: string; titre: string }[]
  remiseMaxPct: number
  peutCreer: boolean
  peutArreter: boolean
}
export type RaisonPromotion = 'motif_court' | 'titre' | 'dates' | 'remise' | 'cible' | 'etat' | 'inconnu'

// ── Photos de la console ───────────────────────────────────────────────────────────────────────────────────────────
export type CiblePhoto = 'banniere' | 'moment' | 'categorie' | 'produit' | 'piece'
export interface DemandePhoto {
  cible: CiblePhoto
  id: string // bannière ou catégorie : univers (« femme ») ; moment : son id ; produit : offre ; pièce : dossier
  libelle: string // « Bannière Mode femme »
  photo: string // image réduite (data:image/jpeg ou webp)
}
export interface PhotoConsole {
  cible: CiblePhoto
  id: string
  libelle: string
  photo: string
  le: Instant
  par: string
  motif: string
}
export type RaisonPhoto = 'motif_court' | 'photo' | 'sans_effet' | 'inconnu'

/** Contenu du site client (accueil) piloté par la console. */
export interface ContenuSite {
  version: number
  publieLe: Instant | null
  par: string | null
  moments: { id: string; titre: string; accroche: string; du: string; au: string; actif: boolean; enCours: boolean }[]
  categories: { id: string; titre: string; enAvant: boolean }[]
  /** La Direction règle les moments ; le Marketing (Service client) seulement les catégories. */
  peutMoments: boolean
}
