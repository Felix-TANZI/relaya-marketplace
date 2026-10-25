// Domaine « systeme » (ADM-13 ; tenu par S6 ; interrupteurs : S5) : santé du système, tâches planifiées, conservation
// des données, interrupteurs des fonctions d'après lancement (FF-IA : assistant de la console, fermé au lancement).
import type { CodeZone, Espace, Francs, Instant, Resultat, Role } from '../communs'

export interface Interrupteur {
  code: string // « FF-IA »
  libelle: string
  ouvert: boolean
  decision: string // « A-VALIDER § 3 (Proposé) »
}

export interface ServiceSante {
  id: string
  nom: string // « Paiement Mobile Money (MTN) »
  etat: 'ok' | 'lent' | 'panne'
  latenceMs: number
  verifieLe: Instant
}

export interface TachePlanifiee {
  id: string
  nom: string // « Versements du vendredi »
  quand: string // « chaque vendredi à 10 h »
  derniere: Instant | null
  prochaine: Instant
  etat: 'ok' | 'echec' | 'en_cours'
}

export interface DomaineSysteme {
  interrupteurs(): Promise<Interrupteur[]>
  sante(): Promise<ServiceSante[]>
  taches(): Promise<TachePlanifiee[]>

  // ── Santé du système et maintenance (ADM-P36) ──
  tableauSante(): Promise<TableauSante>
  programmerMaintenance(m: { service: string; debut: Instant; dureeMin: number; motif: string }): Promise<Resultat<{ id: string }, 'motif_court' | 'preavis' | 'creneau_interdit' | 'inconnu'>>
  annulerMaintenance(id: string, motif: string): Promise<Resultat<object, 'motif_court' | 'inconnu'>>

  // ── Tâches planifiées (page ajoutée) ──
  tableauTaches(): Promise<TacheDetail[]>
  lancerTache(nom: string, motif: string): Promise<Resultat<{ ok: boolean }, 'motif_court' | 'inconnu' | 'deja_faite' | 'non_installee'>>

  // ── Conservation des données (page ajoutée) ──
  conservation(): Promise<TableauConservation>

  // ── Rapports et indicateurs (ADM-P35) ──
  rapports(f: { periode: 'jour' | '7j' | '30j'; zone: CodeZone | null }): Promise<TableauRapports>

  // ── Contenus légaux et produits interdits (ADM-P37) ──
  legal(): Promise<TableauLegal>
  proposerVersion(v: { texte: string; resume: string; contenu: string; effet: Instant; motif: string }): Promise<Resultat<{ version: string }, 'motif_court' | 'preavis' | 'vocabulaire' | 'inconnu' | 'deja_annoncee'>>
  ajouterInterdit(categorie: string, produit: string, motif: string): Promise<Resultat<object, 'motif_court' | 'inconnu' | 'existe' | 'vide'>>
}

// ── Santé ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ServiceDetail extends ServiceSante {
  couche: string // « Paiement », « Messages »
  fournisseur: string
  disponibilite30j: number // pour cent
  mesure: string // seconde mesure (« 0,2 % d'échecs »)
  seuilMs: number
}
export interface Maintenance {
  id: string
  service: string
  debut: Instant
  fin: Instant
  motif: string
  annonceeLe: Instant
  par: string
  etat: 'annoncee' | 'annulee' | 'faite'
}
export interface TableauSante {
  services: ServiceDetail[]
  files: { id: 'preuves' | 'envois' | 'versements'; n: number; plusVieuxMin: number | null; seuil: number }[]
  ia: { actif: boolean; budget: string; mesure: string; gpu: string }
  sauvegardes: { derniere: Instant; prochaine: Instant; restaurationTesteeLe: Instant; tailleGo: number }
  demonstration: boolean // données de démonstration chargées (jamais en production)
  erreurs24h: number
  maintenances: Maintenance[]
  preavisH: number
  creneauxInterdits: string[]
  appels: { le: Instant; service: string; appel: string; resultat: 'ok' | 'lent' | 'echec'; dureeMs: number }[]
  latencePaiement: number[] // dernière heure, une mesure toutes les 5 min
  tachesEnRetard: number
}

// ── Tâches ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface TacheDetail {
  nom: string // « livraison.vendredi »
  periodicite: 'minute' | 'heure' | 'jour' | 'vendredi' | 'mois'
  quoi: string
  installee: boolean
  derniere: { debut: Instant; fin: Instant | null; ok: boolean; essais: number; resultat: string | null; erreur: string | null; par: string } | null
  dernierSucces: Instant | null
  prochaine: Instant
  enRetard: boolean
  echecs7j: number
}

// ── Conservation ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface PolitiqueDonnee {
  donnee: string
  code: string | null
  valeur: string | null // texte du registre
  jours: number | null
  action: 'effacer' | 'pseudonymiser' | 'expirer' | 'lecture_seule' | 'jamais'
  gelEnLitige: boolean
  ou: string // tâche qui l'applique
}
export interface TableauConservation {
  politique: PolitiqueDonnee[]
  derniere: { le: Instant; effaces: number; pseudonymises: number; gardesEnLitige: number } | null
  geles: { objet: string; litige: string; donnees: string; zone: CodeZone | null }[]
  demandesOuvertes: number
  accesDonneesJ: number
}

// ── Rapports ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Indicateur {
  id: string
  libelle: string
  valeur: number | null // null : échantillon insuffisant
  unite: string // « F », « % », « h », « »
  definition: string // formule, source, période
  echantillonInsuffisant: boolean
  tendance: number[] // une valeur par jour de la période (graphique)
}
export interface TableauRapports {
  arreteLe: Instant
  periode: 'jour' | '7j' | '30j'
  zone: CodeZone | null
  zones: CodeZone[] // zones visibles du rôle
  parties: ('activite' | 'logistique' | 'qualite' | 'couts')[] // ce que le rôle voit (« son périmètre »)
  activite: Indicateur[]
  marge: { revenu: Francs; lignes: { libelle: string; montant: Francs }[]; marge: Francs; commandes: number; parCommande: Francs | null }
  logistique: Indicateur[]
  qualite: Indicateur[]
  couts: Indicateur[]
  semaine: { jour: string; commandes: number; valeur: Francs; revenu: Francs }[]
  lundi: { prochain: Instant; heure: string; destinataires: { nom: string; role: Role; perimetre: string }[]; envoyes: { semaine: string; le: Instant; destinataires: number }[] }
}

// ── Légal ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface TexteLegal {
  id: string // « cg-client »
  titre: string
  destinataires: Espace[]
  version: string
  effet: Instant
  acceptes: number
  actifs: number
  annonce: { version: string; effet: Instant; annonceeLe: Instant; resume: string; contenu: string; acceptes: number } | null
  versions: { version: string; effet: Instant; resume: string; contenu: string }[]
}
export interface TableauLegal {
  textes: TexteLegal[]
  interdits: { categorie: string; base: string; produits: string[]; restreint: boolean }[]
  acceptations: { espace: Espace; actifs: number; aJour: number }[]
  vocabulaire: { interdit: string; plutot: string }[]
  cadre: { loi: string; objet: string }[]
  mentions: string
  retour: { cle: string; valeur: string }[]
  preavisJ: number
}
