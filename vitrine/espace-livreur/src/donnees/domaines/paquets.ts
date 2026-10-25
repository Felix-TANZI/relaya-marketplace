// Domaine « paquets » (LIV-P06) : le paquet affecté par l'entreprise (le livreur n'accepte rien, LIV-P04R-02), vu avant
// le départ. Règles :
// - le livreur ne voit que ses paquets ; jamais le contenu ni la valeur d'un colis isolé, seulement la classe, « avec
//   soin » et la valeur totale transportée face au plafond du palier (LIV-P06R-01, LIV-04-R28) ;
// - heure limite = min(prêt le plus ancien + délai de zone ; fermeture du relais − marge) ; durée estimée = trajets +
//   temps par ramassage + temps par colis déposé ; dépôt prévu = départ + durée ; marge = limite − dépôt prévu
//   (LIV-RG-R64, R65, LIV-04-R26) — calculs du serveur, affichés tels quels ;
// - ordre des arrêts calculé par le système et imposé (LIV-P08R-01) ; un paquet se fait en entier ou est rendu avant le
//   premier ramassage (LIV-P06R-04) ; après un ramassage, « je ne peux pas » devient un incident (LIV-04-R20) ;
// - machine du paquet (LIV-02-R080) : affecté, modifié (à relire), en cours, terminé, clos, retiré, rendu, bloqué.
import type { ClasseColis, ColisVu, Francs, Instant, Origine, Resultat, TypeArret } from '../communs'

export type TypePaquet = 'relais' | 'domicile' | 'collecte' | 'retour' | 'transfert'
export type EtatPaquet = 'affecte' | 'modifie' | 'en_cours' | 'termine' | 'clos' | 'retire' | 'rendu' | 'bloque'
export type FormatEmballage = 'S' | 'M' | 'L' | 'C1' | 'C2' | 'origine'
export type MotifImpossible = 'panne' | 'sante' | 'securite'

export interface ColisDuPaquet extends ColisVu {
  format: FormatEmballage // format conseillé (classe, « avec soin ») ; volumineux : carton d'origine filmé
  ramasse: boolean
}
export interface ArretPaquet {
  id: string
  ordre: number
  type: TypeArret
  nom: string // boutique, relais ou « Remise à domicile »
  quartier: string
  zone: string
  creneau: [string, string] | null // « 14:00 », « 14:30 »
  pretDepuis: Instant | null // « C'est prêt » du vendeur (ramassage)
  gerant: string | null // relais : prénom du gérant
  fermeA: string | null // relais : heure de fermeture « 19:00 »
  trajetMin: number // trajet depuis l'arrêt précédent (calculé, téléchargé)
  colis: ColisDuPaquet[]
  fait: boolean
}
export interface LigneKit {
  format: FormatEmballage
  ilFaut: number
  surVous: number // disponible pour ce paquet (stock moins ce que les paquets d'avant consomment)
  manque: number
}
export interface ChangementPaquet {
  libelle: string // ce qui change (« Repère de Maison Ngono »)
  avant: string
  apres: string
}
export interface Paquet {
  id: string // « PQ-Z1-260921-012 »
  type: TypePaquet
  etat: EtatPaquet
  version: number
  zone: string
  entreprise: string
  accepteA: Instant // par l'entreprise
  affecteA: Instant // au livreur
  arrets: ArretPaquet[]
  heureLimite: Instant
  dureeEstimeeMin: number
  distanceKm: number
  departA: Instant | null // démarré
  depotPrevu: Instant // départ (ou maintenant) + durée estimée
  margeMin: number // heure limite − dépôt prévu (négative : heure limite menacée)
  valeurTotale: Francs | null // null : un seul colis (sa valeur se lirait) ; la règle du plafond reste dite
  plafondPalier: Francs | null // null : palier sans plafond
  palier: string
  kit: LigneKit[]
  kitCouvert: boolean
  etiquettesPrevues: { de: string; a: string } | null
  changements: { a: Instant; liste: ChangementPaquet[]; inchange: string[] } | null // modifié, à relire
  telechargeA: Instant | null // paquet hors connexion téléchargé
  colisRamasses: number
  colisTotal: number
  rendu: { le: Instant; motif: MotifImpossible } | null
  retireLe: Instant | null
  blocage: string | null // bloqué : la raison (plafond du palier dépassé)
  avant: string | null // autre paquet à faire d'abord (heure limite plus tôt) : il bloque le départ
}

export interface DomainePaquets {
  /** Un paquet du livreur (sans id : le paquet en cours, sinon le prochain affecté). */
  paquet(id?: string): Promise<Paquet | null>
  marquerRelu(id: string, version: number): Promise<void>
  demarrer(id: string, origine: Origine): Promise<Resultat<object, 'kit_insuffisant' | 'deja_demarre' | 'a_relire' | 'autre_paquet_avant' | 'bloque' | 'retire'>>
  /** « Je ne peux pas faire ce paquet » : rendu à l'entreprise avant le premier ramassage, sinon incident. */
  impossible(id: string, motif: MotifImpossible, origine: Origine): Promise<Resultat<object, 'deja_ramasse' | 'non_rendable'> & { colisSousGarde?: number }>
  telecharger(id: string): Promise<Resultat<{ le: Instant }>>
}

/** Format d'emballage conseillé d'un colis (LIV-02-R027, LIV-P06R-05) : « avec soin » petit → carton C1. */
export function formatConseille(classe: ClasseColis, fragile: boolean): FormatEmballage {
  if (classe === 'XL' || classe === 'XXL') return 'origine'
  if (fragile && (classe === 'S' || classe === 'M')) return 'C1'
  return classe
}
