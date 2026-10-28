// Regroupement des marqueurs trop proches (module commun des cartes, voir acteurs.ts) : calcul pur, dans le repère de
// la vue (unités du SVG), sans dépendance. Glouton et stable : chaque point rejoint le premier groupe dont le centre
// est à moins de `rayon`, sinon il ouvre un groupe ; le centre d'un groupe est la moyenne de ses points. Un groupe
// d'un seul point est un marqueur ordinaire. Coût : O(n × g), suffisant pour quelques centaines de points par carte
// (au-delà, le serveur regroupe d'abord, voir CONNECTEURS des applications).

export interface PointVue {
  id: string
  x: number
  y: number
}
export interface Groupe<T extends PointVue> {
  id: string // identifiant stable : celui du premier point
  x: number
  y: number
  membres: T[]
}

export function regrouper<T extends PointVue>(points: readonly T[], rayon: number): Groupe<T>[] {
  const groupes: Groupe<T>[] = []
  const r2 = rayon * rayon
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    const g = rayon > 0 ? groupes.find((x) => (x.x - p.x) ** 2 + (x.y - p.y) ** 2 < r2) : undefined
    if (!g) {
      groupes.push({ id: p.id, x: p.x, y: p.y, membres: [p] })
      continue
    }
    g.membres.push(p)
    const n = g.membres.length
    g.x += (p.x - g.x) / n
    g.y += (p.y - g.y) / n
  }
  return groupes
}

/** Positions des membres d'un groupe déplié, en cercle autour de son centre (un trait les relie au centre). */
export function deplier<T extends PointVue>(g: Groupe<T>, ecart: number): { p: T; x: number; y: number }[] {
  const n = g.membres.length
  const rayon = Math.max(ecart, (ecart * n) / (2 * Math.PI))
  return g.membres.map((p, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    return { p, x: g.x + rayon * Math.cos(a), y: g.y + rayon * Math.sin(a) }
  })
}
