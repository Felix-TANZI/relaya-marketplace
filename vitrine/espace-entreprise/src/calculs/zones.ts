// Les douze zones BelivaY de Yaoundé : le fichier qui fait foi (logique-metier/livraison/zones-yaounde.geo.json,
// méthode dans logique-metier/livraison/ZONES.md) — carte adoptée le 23 oct. 2026 (DP-70) : douze zones découpées dans
// l'emprise urbaine réelle (241,5 km²), sans vide ni chevauchement ; une épingle hors des douze est hors zone. Le même fichier sert l'app livreur et le kit
// (livraison_core.zones). En production, les polygones versionnés de la console (GET /api/company/zones/map).
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import type { CodeZone } from '../donnees/communs'

export interface ZoneYaounde {
  code: CodeZone
  nom: string // nom court (« Centre-ville »)
  nomComplet: string // « Centre-ville / Mballa »
  centre: [number, number] // [lat, lon] : centre du quartier-titre
  etiquette: [number, number] // [lat, lon] : le point le plus à l'intérieur de la zone, où écrire son nom
  polygone: [number, number][] // [lat, lon], anneau extérieur sans répéter le premier point
  quartiers: string[]
  rayonKm: number // rayon du disque de même superficie
}

export const ZONES_YAOUNDE: ZoneYaounde[] = geo.features.map((f) => ({
  code: f.id as CodeZone,
  nom: f.properties.nom,
  nomComplet: f.properties.nomComplet,
  centre: [f.properties.centre[0], f.properties.centre[1]],
  etiquette: [f.properties.etiquette[0], f.properties.etiquette[1]],
  polygone: f.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon] as [number, number]),
  quartiers: f.properties.quartiers,
  rayonKm: Math.round(Math.sqrt(f.properties.superficieKm2 / Math.PI) * 10) / 10,
}))

/** Code de la zone dont le polygone contient le point (règle pair-impair) ; null : hors de Yaoundé. */
export function zoneDuPoint(lat: number, lon: number): CodeZone | null {
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
