// Domaine « activite » (LIV-P25 ; LIV-09-R02, R16 à R21, LIV-P25R-01 à R03, LIV-STA-06, DED-12, I-04).
// - BelivaY ne paie jamais un livreur partenaire et n'affiche jamais ce qu'elle paie à l'entreprise : l'écran dit
//   toujours qui le paie (« Vous êtes payé par … »). Un montant n'apparaît que si l'entreprise a choisi d'afficher son
//   propre tarif par mission (affichage « tarif ») ; par défaut, un compteur.
// - Une mission (arrêt) ne compte qu'une fois validée par le serveur (preuves complètes) ; contestée, elle est « en
//   revue » avec sa date de décision attendue, hors des compteurs ; mêmes chiffres que l'historique et la clôture.
// - Hors connexion : derniers compteurs reçus (avec leur heure) et gestes de la file à part.
import type { Francs, Instant, Jour } from '../communs'

export type Periode = 'jour' | 'semaine' | 'mois'
export type TypeMission = 'ramassage' | 'depot' | 'domicile' | 'retour'
export interface LigneMission {
  type: TypeMission
  nombre: number
  colis: number
  tarif: Francs | null // tarif par mission de l'entreprise (affichage « tarif » seulement)
  gain: Francs | null
}
export interface Activite {
  periode: Periode
  de: Jour
  a: Jour
  calculeA: Instant
  payePar: string // entreprise
  affichage: 'compteur' | 'tarif'
  missions: LigneMission[]
  totalMissions: number
  colis: { ramasses: number; deposes: number; remis: number }
  distanceKm: number
  gains: Francs | null // affichage « tarif » seulement
  parJour: { jour: Jour; missions: number; colis: number; km: number }[] // histogramme et évolution (semaine) : missions validées, colis ramassés, distance
  enRevue: { mission: string; motif: string; decisionAttendue: Jour }[]
  enCours: { paquetId: string; arretsFaits: number; arretsTotal: number } | null
}

/** Relevé d'une semaine (samedi → vendredi, jour de règlement des entreprises) : missions validées par le serveur. */
export interface ReleveSemaine {
  de: Jour
  a: Jour // vendredi
  enCours: boolean // la semaine en cours : relevé provisoire jusqu'au vendredi soir
  missions: LigneMission[]
  totalMissions: number
  colis: number
  distanceKm: number
  gains: Francs | null // affichage « tarif » seulement
  enRevue: number // missions contestées, hors compteurs jusqu'à la décision
}
export interface Releves {
  payePar: string
  affichage: 'compteur' | 'tarif'
  calculeA: Instant
  semaines: ReleveSemaine[] // la plus récente d'abord
}

export interface DomaineActivite {
  activite(periode: Periode): Promise<Activite>
  /** Relevés des semaines (page « Mes gains ») : la semaine en cours puis les précédentes. */
  releves(): Promise<Releves>
}
