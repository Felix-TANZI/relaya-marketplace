// Domaine « trust » (LIV-P26 ; LIV-09-R26 à R37, LIV-TSC-01 à 07, LIV-P26R-01 à R04, DED-35).
// - Note entière sur 100 = Σ poids × critère (Ponctualité, Qualité, Litiges, Ancienneté, Formation : LIV-TSC-POIDS) ;
//   le serveur garantit que la somme des points fait la note ; départ au neutre (LIV-TSC-NEUTRE).
// - Paliers Nouveau · Confirmé · Or (TSC-PALIERS-LIVREUR) ; aucune descente automatique ; alerte avant chaque seuil ;
//   veto : note plafonnée (LIV-TSC-VETO-PLAFOND).
// - Chaque événement est relié à sa mission ; il se conteste UNE fois dans LIV-TSC-CONTESTATION-J jours ; l'effet est
//   suspendu jusqu'à la décision. Un litige en cours ne pénalise personne.
// - Visible par le livreur, son entreprise et la console ; jamais par les clients, vendeurs ou gérants ; jamais le
//   score d'un autre livreur, aucun classement.
import type { Francs, Instant, Origine, Resultat } from '../communs'

export type IdCritere = 'ponctualite' | 'qualite' | 'litiges' | 'anciennete' | 'formation'
export type Gravite = 'succes' | 'neutre' | 'g1' | 'g2' | 'g3' | 'veto'
export type Palier = 'nouveau' | 'confirme' | 'or'
export type MotifContestation = 'incident_non_pris' | 'horodatage' | 'autre'

export interface Critere {
  id: IdCritere
  poids: number // 0,30…
  valeur: number // sur 100, une décimale
  points: number // poids × valeur, une décimale
}
export interface EvenementTrust {
  id: string
  quand: Instant
  mission: string | null
  texte: string
  critere: IdCritere
  gravite: Gravite
  effet: number // points sur la note (0 pour un succès déjà au plafond)
  contesterAvant: Instant | null // null : rien à contester (succès, neutre)
  contestation: { motif: MotifContestation; note: string; le: Instant; etat: 'en_file' | 'en_examen' | 'acceptee' | 'rejetee'; decision: string | null } | null
}
export interface TrustLivreur {
  score: number | null
  palier: Palier
  depart: number // score au neutre, à l'activation
  activeLe: Instant
  criteres: Critere[]
  evenements: EvenementTrust[]
  courbe: { quand: Instant; score: number }[]
  paliers: { id: Palier; seuil: number }[] // seuils de montée
  veto: number // plafond après un veto
  hysteresisJours: number
  contestationJours: number
  noteMin: number // note minimale d'une contestation
  bareme: { evenement: string; critere: IdCritere; gravite: string }[]
  entreprise: { nom: string; score: number; palier: Palier; plafondColis: Francs | null }
  recalculeA: Instant
}

export interface DomaineTrust {
  trust(): Promise<TrustLivreur>
  /** Hors connexion (enLigne faux), la contestation part au retour du réseau ; l'effet est suspendu dès sa réception. */
  contester(evenementId: string, motif: MotifContestation, note: string, origine: Origine, enLigne: boolean): Promise<Resultat<object, 'hors_delai' | 'deja_conteste' | 'note_trop_courte' | 'non_contestable'>>
}
