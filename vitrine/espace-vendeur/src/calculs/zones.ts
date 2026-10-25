// Les douze zones BelivaY de Yaoundé (carte adoptée le 23 oct. 2026, DP-70) : le fichier qui fait foi
// (logique-metier/livraison/zones-yaounde.geo.json, méthode dans logique-metier/livraison/ZONES.md), le même que
// l'entreprise, le livreur, le relais, la console et le kit (livraison_core.zones). La zone d'une boutique ou d'un lieu
// se lit sur ces polygones (VD03-R06) ; un point hors des douze polygones est hors zone (R76). Zones exploitées :
// registre (ZONES-EXPLOITEES). En production, le serveur calcule la zone (GET /api/vendors/zone).
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import { REGISTRE } from './registre'

export interface ZoneYaounde {
  code: string // « Z1 » … « Z12 »
  nom: string // nom court : « Centre-ville »
  nomComplet: string // « Centre-ville / Mballa »
  niveau: 'centre' | 'peripherie'
  polygone: [number, number][] // [lat, lon], anneau extérieur sans répéter le premier point
  quartiers: string[]
}

export const ZONES_YAOUNDE: ZoneYaounde[] = geo.features.map((f) => ({
  code: f.properties.code,
  nom: f.properties.nom,
  nomComplet: f.properties.nomComplet,
  niveau: f.properties.niveau as ZoneYaounde['niveau'],
  polygone: f.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon] as [number, number]),
  quartiers: f.properties.quartiers,
}))

/** Code de la zone dont le polygone contient le point (règle pair-impair) ; null : hors des douze zones. */
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

export const zoneParCode = (code: string): ZoneYaounde | undefined => ZONES_YAOUNDE.find((z) => z.code === code)

/** Codes des zones exploitées (ZONES-EXPLOITEES : « Z1 Centre-ville, Z2 Nsam, … »). */
export const ZONES_EXPLOITEES: string[] = (REGISTRE['ZONES-EXPLOITEES'] ?? '')
  .split(',')
  .map((z) => /^Z\d+/.exec(z.trim())?.[0])
  .filter((z): z is string => !!z)
