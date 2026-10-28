// Affectation suggérée (VAGUE-AMELIORATIONS.md n° 6) : parmi les livreurs ÉLIGIBLES (demo/affectation.ts : actif,
// certifié, disponible, rattaché à la zone, véhicule adapté), l'assistant propose celui qui équilibre le mieux la zone,
// la charge du jour et le Trust Score, puis la distance au premier arrêt. Il ne fait que proposer : l'entreprise valide
// d'un clic, ou choisit un autre livreur (DP-63 : BelivaY n'affecte jamais).
// Note sur 100 (pondérations à valider par le porteur, POIDS) :
//   Trust Score (0 à 100 ; « à venir » : 50)                         35
//   charge du jour : 0 mission = 1, puis −1/CHARGE_MAX par mission    30
//   distance au premier arrêt : 0 km = 1, DISTANCE_MAX_KM et au-delà = 0 ;
//     position inconnue : DISTANCE_INCONNUE                           20
//   zone : la zone du paquet est sa zone principale (la première)     15 (rattaché sans être sa zone principale : 7,5)
// À note égale : la distance connue la plus courte, puis le nom.
export const POIDS = { trust: 35, charge: 30, distance: 20, zone: 15 }
export const CHARGE_MAX = 6
export const DISTANCE_MAX_KM = 10
export const DISTANCE_INCONNUE = 0.3
export const TRUST_A_VENIR = 50

export interface CandidatSuggestion {
  id: string
  nom: string
  trustScore: number | null
  missionsDuJour: number
  distanceKm: number | null
  zones: string[]
}
export interface Suggestion {
  id: string
  note: number // sur 100, arrondie
  zonePrincipale: boolean
  parts: { trust: number; charge: number; distance: number; zone: number } // points de chaque critère
}

const borne = (x: number) => Math.max(0, Math.min(1, x))
export function noter(c: CandidatSuggestion, zone: string): Suggestion {
  const principale = c.zones[0] === zone
  const parts = {
    trust: POIDS.trust * borne((c.trustScore ?? TRUST_A_VENIR) / 100),
    charge: POIDS.charge * borne(1 - c.missionsDuJour / CHARGE_MAX),
    distance: POIDS.distance * (c.distanceKm === null ? DISTANCE_INCONNUE : borne(1 - c.distanceKm / DISTANCE_MAX_KM)),
    zone: POIDS.zone * (principale ? 1 : c.zones.includes(zone) ? 0.5 : 0),
  }
  const arrondi = (x: number) => Math.round(x * 10) / 10
  return { id: c.id, note: Math.round(parts.trust + parts.charge + parts.distance + parts.zone), zonePrincipale: principale, parts: { trust: arrondi(parts.trust), charge: arrondi(parts.charge), distance: arrondi(parts.distance), zone: arrondi(parts.zone) } }
}

/** Les éligibles classés, la suggestion en tête ; vide : personne à proposer. */
export function classer(candidats: CandidatSuggestion[], zone: string): Suggestion[] {
  const par = new Map(candidats.map((c) => [c.id, c]))
  return candidats
    .map((c) => noter(c, zone))
    .sort((a, b) => {
      const [x, y] = [par.get(a.id)!, par.get(b.id)!]
      const dx = x.distanceKm ?? Infinity
      const dy = y.distanceKm ?? Infinity
      if (b.note !== a.note) return b.note - a.note
      if (dx !== dy) return dx < dy ? -1 : 1
      // Ordre total du serveur (suggestion.py) : nom sans accents ni casse, puis nom exact, puis identifiant (binaire).
      for (const [u, v] of [[sansAccents(x.nom), sansAccents(y.nom)], [x.nom, y.nom], [x.id, y.id]]) if (u !== v) return u < v ? -1 : 1
      return 0
    })
}
const sansAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
