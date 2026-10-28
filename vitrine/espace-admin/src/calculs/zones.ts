// Les douze zones BelivaY de Yaoundé (carte adoptée le 23 oct. 2026, DP-70) : le fichier qui fait foi
// (logique-metier/livraison/zones-yaounde.geo.json, méthode dans logique-metier/livraison/ZONES.md), le même que
// l'entreprise, le livreur, le relais, le vendeur et le kit (livraison_core.zones). La carte du réseau (ADM-09) dessine
// ces polygones ; la zone d'un point s'y lit (règle pair-impair) ; un point hors des douze polygones est hors zone (R76).
// En production, la console versionne ces polygones (PostGIS, ADM-01).
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import type { CodeZone } from '../donnees/communs'

export interface ZoneYaounde {
  code: CodeZone
  nom: string // nom court : « Centre-ville »
  nomComplet: string // « Centre-ville / Mballa »
  niveau: 'centre' | 'peripherie'
  etiquette: [number, number] // [lat, lon] : point le plus à l'intérieur de la zone
  polygone: [number, number][] // [lat, lon], anneau extérieur sans répéter le premier point
  quartiers: string[]
}

export const ZONES_YAOUNDE: ZoneYaounde[] = geo.features.map((f) => ({
  code: f.properties.code as CodeZone,
  nom: f.properties.nom,
  nomComplet: f.properties.nomComplet,
  niveau: f.properties.niveau as ZoneYaounde['niveau'],
  etiquette: [f.properties.etiquette[0], f.properties.etiquette[1]],
  polygone: f.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon] as [number, number]),
  quartiers: f.properties.quartiers,
}))

/** Code de la zone dont le polygone contient le point ; null : hors des douze zones. */
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
