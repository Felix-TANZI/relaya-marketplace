// Domaine « tableau » (ENT-P02) : à faire maintenant trié par échéance, indicateurs uniques, palier et Trust Score,
// pilote, zones du jour, flotte maintenant, guide de démarrage (chaîne d'activation, ENT-RG-R16). « À verser
// vendredi » : propriétaire et comptable seulement (ENT-P02R-03) ; null pour le répartiteur. Le comptable n'a pas de
// paquet à accepter ni d'affectation (ENT-03-R09).
// API : GET /api/company/dashboard → {state, activation, todo[], kpis, tier, trust, pilot, zones[], fleet}.
import type { CodeZone, Francs, Instant, PalierEntreprise } from '../communs'
import type { EtapeActivation } from './contrat'

// DP-66 : « depart » (départ demandé, échéance : fin du préavis), « depart_echu » (préavis échu : l'administrateur
// BelivaY peut clôturer à la place de l'entreprise), « absence » (absence prévenue pas encore vue, échéance : son début).
// DP-67 : « kit_a_constater » (préavis échu, kit pas encore constaté, délai pas passé ; échéance : constatJusqua, après quoi
// l'administrateur peut clôturer « kit non contesté », sans retenue), « versement_a_faire » (départ clos dont le vendredi
// du dernier versement est arrivé, versement Mobile Money pas encore marqué fait ; propriétaire).
export type GenreTache = 'paquet_a_accepter' | 'paquet_non_affecte' | 'incident' | 'litige' | 'piece_expire' | 'piece_a_controler' | 'depart' | 'depart_echu' | 'absence' | 'kit_a_constater' | 'versement_a_faire'
export interface Tache {
  id: string
  genre: GenreTache
  titre: string
  detail: string
  echeance: Instant
  route: string // écran qui la traite
  params: Record<string, string>
}

export interface TableauDeBord {
  aFaire: Tache[]
  indicateurs: { missionsEnCours: number; colisSousGarde: number; delaiTenu7j: number | null; litigesOuverts: number; aVerserVendredi: Francs | null }
  palier: { palier: PalierEntreprise; plafond: number | null; trustScore: number; tendance: number; prochain: PalierEntreprise | null }
  zones: { code: CodeZone; nom: string; acceptes: number; capacite: number }[]
  flotte: { actifs: number; enLigne: number; enActivation: number }
  demarrage: { etape: number; total: number } | null // guide de démarrage (compte en configuration)
  /** Étapes du guide (en configuration seulement), la prochaine non faite en tête des actions. */
  guide?: EtapeActivation[] | null
  /** Délai tenu sur la fenêtre : livrés dans la promesse ÷ paquets clos (null : aucun paquet clos). */
  delaiTenu?: { dansLeDelai: number; clos: number } | null
  /** Pilote : jour, durée, date du bilan. */
  pilote?: { jour: number; duree: number; bilanLe: Instant } | null
  /** Heure des données (affichée quand la lecture suivante échoue : « données de 13 h 02 »). */
  lu?: Instant
}

export interface DomaineTableau {
  tableau(): Promise<TableauDeBord>
}
