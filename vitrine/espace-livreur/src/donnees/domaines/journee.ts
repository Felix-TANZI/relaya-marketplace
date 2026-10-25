// Domaine « journee » (LIV-P23 ; LIV-08-R05, R49 à R57, LIV-P23R-01 à R05, LIV-JOU-01/02, DED-26).
// - Contrôles calculés par le serveur, jamais déclaratifs : colis sous garde (ROUGE : bloque), preuves en file (ambre :
//   la clôture passe, statut « preuves à envoyer »), kit (déclaré le matin, compté le soir), retours sur soi.
// - Aucun colis ne passe la nuit chez un livreur : après la dernière tournée, ce qui reste sous sa garde se dépose au
//   point de stockage déclaré par l'entreprise, avec scan ; la clôture est refusée tant qu'un colis reste sous garde.
// - Kit attendu = reçu − étiquettes liées ; le livreur ne saisit que le compté ; tout écart par format demande un motif
//   (et une photo pour une pochette abîmée) ; l'écart remonte à l'entreprise, jamais aux frais du livreur.
// - Clôturer : statut hors service, bilan envoyé à l'entreprise (day.closed) ; BelivaY ne l'utilise que pour les
//   scores et les règlements ; la position n'est plus enregistrée. Proposée à LIV-CLOTURE-PROPOSEE-H.
import type { Instant, Origine, Resultat } from '../communs'

export type FormatKit = 'S' | 'M' | 'L' | 'C1' | 'C2'
export type MotifEcart = 'pochette_abimee' | 'perdue' | 'rendue_entreprise' | 'autre'
export interface ControleJour {
  id: 'garde' | 'file' | 'kit' | 'retours'
  ton: 'rouge' | 'ambre' | 'vert'
  nombre: number
}
export interface LigneKit {
  format: FormatKit
  recu: number
  utilise: number // étiquettes liées
  attendu: number // reçu − utilisé
}
export interface BilanJour {
  paquets: number
  arrets: number
  km: number
  ramasses: number
  deposes: number
  remis: number
  incidents: number
  preuves: number
  etiquettes: number
}
export interface ControleCloture {
  possible: boolean
  blocages: { id: 'colis_sous_garde' | 'file_non_envoyee' | 'incident_ouvert' | 'kit_non_rendu'; nombre: number }[]
  controles: ControleJour[]
  tourneeEnCours: boolean // des arrêts restent à faire
  bilan: BilanJour
  deja: { a: Instant; texte: string; valeurs: Record<string, string | number> }[] // texte à valeurs {…}
  kit: LigneKit[]
  proposeeA: Instant
  etat: 'ouverte' | 'cloturee' | 'preuves_a_envoyer'
  clotureeA: Instant | null
  stockage: { nom: string; quartier: string }
  prochainService: Instant
  entreprise: string
}
export interface ComptageKit {
  format: FormatKit
  compte: number
  motif: MotifEcart | null
  photo: boolean
}

export interface DomaineJournee {
  controle(): Promise<ControleCloture>
  /** Hors connexion (enLigne faux), la clôture part avec la file : statut « preuves à envoyer ». */
  cloturer(kit: ComptageKit[], origine: Origine, enLigne: boolean): Promise<Resultat<object, 'blocages' | 'ecart_sans_motif' | 'photo_manquante' | 'deja_cloturee'>>
  /** Dépôt au point de stockage de l'entreprise, avec scan, des colis encore sous garde après la dernière tournée. */
  deposerAuStockage(origine: Origine): Promise<Resultat<{ colis: number }, 'tournee_en_cours' | 'rien_a_deposer'>>
}
