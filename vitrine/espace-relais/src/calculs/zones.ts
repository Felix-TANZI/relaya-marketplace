// Les douze zones BelivaY de Yaoundé : le fichier qui fait foi (logique-metier/livraison/zones-yaounde.geo.json,
// méthode dans logique-metier/livraison/ZONES.md), le même que l'app livreur, l'espace entreprise et le kit
// (livraison_core.zones) ; carte adoptée le 23 oct. 2026 (DP-70), douze zones dans l'emprise urbaine réelle. Le relais y lit sa zone et la montre sur la carte (Ma zone sur la carte). En production,
// les polygones versionnés de la console.
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }

export interface ZoneYaounde {
  code: string
  nom: string // nom court (« Centre-ville »)
  nomComplet: string // « Centre-ville / Mballa »
  centre: [number, number] // [lat, lon] : centre du quartier-titre
  etiquette: [number, number] // [lat, lon] : le point le plus à l'intérieur de la zone, où écrire son nom
  polygone: [number, number][] // [lat, lon], anneau extérieur sans répéter le premier point
  quartiers: string[]
  superficieKm2: number
}

export const ZONES_YAOUNDE: ZoneYaounde[] = geo.features.map((f) => ({
  code: f.id as string,
  nom: f.properties.nom,
  nomComplet: f.properties.nomComplet,
  centre: [f.properties.centre[0], f.properties.centre[1]],
  etiquette: [f.properties.etiquette[0], f.properties.etiquette[1]],
  polygone: f.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon] as [number, number]),
  quartiers: f.properties.quartiers,
  superficieKm2: f.properties.superficieKm2,
}))

/** Code de la zone dont le polygone contient le point (règle pair-impair) ; null : hors de Yaoundé. */
export function zoneDuPoint(lat: number, lon: number): string | null {
  for (const z of ZONES_YAOUNDE) {
    let dedans = false
    const p = z.polygone
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [y1, x1] = p[j]
      const [y2, x2] = p[i]
      if (y1 > lat !== y2 > lat && lon < x1 + ((lat - y1) * (x2 - x1)) / (y2 - y1)) dedans = !dedans
    }
    if (dedans) return z.code
  }
  return null
}

/** Boîte englobante de polygones, élargie de `marge` (fraction) de chaque côté. */
export function boite(polygones: [number, number][][], marge = 0.08) {
  const pts = polygones.flat()
  let lat0 = Math.min(...pts.map((p) => p[0]))
  let lat1 = Math.max(...pts.map((p) => p[0]))
  let lng0 = Math.min(...pts.map((p) => p[1]))
  let lng1 = Math.max(...pts.map((p) => p[1]))
  const dl = (lat1 - lat0) * marge
  const dg = (lng1 - lng0) * marge
  lat0 -= dl
  lat1 += dl
  lng0 -= dg
  lng1 += dg
  return { lat0, lat1, lng0, lng1 }
}
