// Domaine « kit » (LIV-P07) : emballages BelivaY remis par l'entreprise (cinq formats, rouleau d'étiquettes, ruban,
// marqueur, papier bulle). Règles :
// - on ne compte pas le stock, on compte les étiquettes : stock = reçu − étiquettes liées − pochettes abîmées, décompté
//   à chaque étiquette liée, jamais saisi (LIV-EQU-02, LIV-04-R38) ;
// - un format sous son seuil est « bas » (ambre) ; un paquet non couvert est rouge ; le C2 reste au stockage (gris) ;
// - une étiquette hors de la plage du rouleau ne se lie pas ; un rouleau perdu invalide sa plage (LIV-P07R-01, R71) ;
// - pochettes abîmées : au-delà du seuil de la semaine, l'entreprise est alertée (LIV-P07R-02) ;
// - le livreur n'achète ni ne paie jamais un emballage : un écart remonte à l'entreprise (LIV-P07R-03).
import type { Instant, Origine, Resultat } from '../communs'

export type FormatKit = 'S' | 'M' | 'L' | 'C1' | 'C2'
export type Quantites = Record<FormatKit, number>

export interface StockFormat {
  format: FormatKit
  recu: number
  lies: number // étiquettes liées à un colis dans ce format
  abimes: number
  stock: number
  seuil: number | null // null : pas de seuil (C2, au stockage)
  etat: 'ok' | 'bas' | 'non_couvert' | 'stockage'
}
export interface Kit {
  formats: StockFormat[]
  dimensions: Record<FormatKit, string> // « 20 × 30 cm » (cinq formats BelivaY, LIV-PRV-09)
  etiquettes: { de: string; a: string; derniere: string | null; restantes: number; prochaine: string | null; perdu: boolean } | null
  accessoires: { ruban: boolean; marqueur: boolean; papierBulle: boolean }
  /** Remise du matin enregistrée par l'entreprise dans son portail, et ce que le livreur a déclaré. */
  remise: { le: Instant; lieu: string; quantites: Quantites; plage: { de: string; a: string } } | null
  declaration: { le: Instant; quantites: Quantites; ecartAvecRemise: boolean } | null
  consommation: { paquetId: string; formats: Partial<Quantites>; etiquettes: { de: string; a: string } | null }[]
  couverture: { paquetId: string; manque: Partial<Quantites> }[] // paquets à venir non couverts
  reassort: { demandeLe: Instant; formats: Partial<Quantites>; paquetId: string | null } | null
  abimesSemaine: { abimes: number; utilises: number; seuilPourcent: number; alerte: boolean }
  finDeJournee: { rendu: Quantites; ecarts: { format: FormatKit; ecart: number; motif: MotifEcart | null }[] } | null
  suffisant: boolean
}
export type MotifEcart = 'dechiree' | 'perdue' | 'autre'

export interface DomaineKit {
  lire(): Promise<Kit>
  /** « J'ai reçu des emballages » : quantités réellement reçues, accessoires, première étiquette du rouleau scanné. */
  confirmerReception(quantites: Quantites, accessoires: Kit['accessoires'], premiereEtiquette: string, origine: Origine): Promise<Resultat<object, 'plage_differente' | 'sans_remise'>>
  demanderReassort(formats: Partial<Quantites>, paquetId: string | null, origine: Origine): Promise<Resultat<object, 'deja_demande' | 'rien_a_demander'>>
  declarerAbimee(format: FormatKit, origine: Origine): Promise<Resultat<object, 'plus_de_stock'>>
  declarerRouleauPerdu(origine: Origine): Promise<Resultat<object, 'deja_perdu' | 'sans_rouleau'>>
  /** Liaison d'une étiquette à un colis (LIV-P13) : décompte du stock et contrôle de la plage. */
  lierEtiquette(format: FormatKit, etiquette: string, paquetId: string, origine: Origine): Promise<Resultat<object, 'hors_plage' | 'deja_liee' | 'plage_perdue' | 'plus_de_stock'>>
  /** Fin de journée (LIV-P23) : ce qui est rendu au point de stockage, et le motif d'un écart. */
  declarerRendu(rendu: Quantites, origine: Origine): Promise<Resultat>
  declarerMotifEcart(format: FormatKit, motif: MotifEcart, origine: Origine): Promise<Resultat<object, 'sans_ecart'>>
}
