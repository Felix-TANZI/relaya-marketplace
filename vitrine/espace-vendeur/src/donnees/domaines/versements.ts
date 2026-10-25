// Domaine « versements » (propriétaire seulement) : le vendredi avant 12 h, sans frais ni minimum (GEN-04) ;
// prochain versement et sa référence annoncée (VER-02), historique filtré par période (VER-05), refus de l'opérateur
// (3 essais à 24 h, puis suspension : VER-04, Q-13), versement non reçu (VER-03), numéro de versement changé avec
// deux codes SMS et 7 jours de revue (NUM-01 à NUM-07, Q-19). Calculs : src/calculs/versements.ts.
// API : GET /payouts, GET /payouts/next, POST /payouts/{id}/incident, POST /payout-number/codes, PUT /payout-number
// (VD-02 p12, Q-92).
import type { Francs, Instant, Jour, ReferenceCommande, Resultat } from '../communs'

export type StatutVersement = 'prevu' | 'reporte' | 'envoye' | 'credite' | 'refuse' | 'suspendu' // machine VERSEMENT
export type Operateur = 'MTN' | 'Orange'
export type MotifRefus = 'plein' | 'tiers' | 'prefixe' // les trois seuls motifs (REFVD-R98)
export type Periode = '3' | '12' | 'tout'

export interface CommandeCouverte {
  ref: ReferenceCommande
  liberation: Instant
  garde: Francs
}

export interface Versement {
  reference: string // « BLV-VS-4092 »
  vendredi: Jour
  montant: Francs
  numero: string // « MTN ···· 4217 »
  statut: StatutVersement
  essais: Instant[]
  commandes: CommandeCouverte[]
  signale: boolean // « versement non reçu » déjà signalé
}

export interface Incident {
  motif: MotifRefus
  operateur: Operateur
  refuseA: Instant
  essais: Instant[] // t + 24, 48, 72 h (essaisApresRefus)
  essaisFaits: number
  suspendu: boolean // après le dernier essai : le support appelle
}

export interface Prochain {
  reference: string // attribuée à l'arrêté du jeudi, annoncée avant
  statut: StatutVersement
  vendredi: Jour
  heureLimite: Instant // vendredi avant 12 h
  aVerser: Francs // déjà libéré
  montant: Francs // total prévu (ce qui se libère avant l'arrêté compris)
  passeA: { montant: Francs; ref: ReferenceCommande; a: Instant } | null
  commandes: CommandeCouverte[]
  numero: string
  operateur: Operateur
  titulaire: string
  incident: Incident | null
  enRevueJusqua: Instant | null // numéro en revue : le versement attend la fin de la revue
  reporteAu: Jour | null // vendredi qui suit la revue
}

export interface Historique {
  periode: Periode
  versements: Versement[]
  total: Francs
  nombre: number
  depuis: Jour // signature du contrat (« depuis le 7 mai »)
}

export interface NumeroVersement {
  actuel: { operateur: Operateur; masque: string; verifieLe: Jour; titulaire: string }
  /** Changement validé, en revue humaine 7 jours (VD09-R32, R35). */
  enRevue: { operateur: Operateur; masque: string; jusqua: Instant; premierVersement: Jour; ancien: { operateur: Operateur; masque: string }; enAttente: { vendredi: Jour; montant: Francs } | null } | null
  /** Préfixes par opérateur (Q-94 : paramètres du pays, jamais dans l'écran). */
  operateurs: { nom: Operateur; libelle: string; prefixes: string[] }[]
  indicatif: string // « +237 »
  longueur: number // chiffres du numéro national
  telephonePersonnel: string // « 6•• •• •• 17 » : le second facteur (NUM-07)
  revueJours: number // VD-NUM-REVUE
  code: { longueur: number; renvoiSecondes: number; dureeMinutes: number }
  /** Codes déjà envoyés (étape 2 en cours). */
  attente: { operateur: Operateur; numeroMasque: string; envoyeA: Instant } | null
}

export type RefusCodes = 'prefixe' | 'longueur' | 'meme_numero' | 'operateur' | 'trop_tot'
export type RefusConfirmation = 'code_nouveau' | 'code_personnel' | 'expire' | 'bloque'

export interface DomaineVersements {
  prochain(): Promise<Prochain | null>
  historique(periode: Periode): Promise<Historique>
  signalerNonRecu(reference: string): Promise<Resultat<{ reponseAvant: Instant }, 'inconnu' | 'deja'>>
  numero(): Promise<NumeroVersement>
  demanderCodes(operateur: Operateur, numero: string): Promise<Resultat<{ destination: string; renvoiSecondes: number; codeDemo?: string }, RefusCodes> & { detail?: string }>
  renvoyerCode(quel: 'nouveau' | 'personnel'): Promise<Resultat<{ renvoiSecondes: number }, 'trop_tot' | 'expire'>>
  confirmerNumero(codeNouveau: string, codePersonnel: string): Promise<Resultat<{ revueJusqua: Instant; premierVersement: Jour }, RefusConfirmation> & { essaisRestants?: number; bloqueJusqua?: Instant }>
  annulerSaisie(): Promise<void>
}
