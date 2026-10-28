// Les douze zones BelivaY de Yaoundé : le fichier qui fait foi (logique-metier/livraison/zones-yaounde.geo.json,
// méthode dans logique-metier/livraison/ZONES.md) — carte adoptée le 23 oct. 2026 (DP-70) : douze zones découpées dans
// l'emprise urbaine réelle (241,5 km²), sans vide ni chevauchement ; une épingle hors des douze est hors zone. Le même fichier sert l'app entreprise et le
// kit (livraison_core.zones) ; en production, le contour d'une zone arrive avec la tournée (Tournee.zones).
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }

export interface ZoneYaounde {
  code: string
  nom: string // nom court (« Centre-ville »)
  nomComplet: string // « Centre-ville / Mballa »
  centre: { lat: number; lng: number } // centre du quartier-titre
  etiquette: { lat: number; lng: number } // le point le plus à l'intérieur de la zone, où écrire son nom
  contour: { lat: number; lng: number }[] // anneau extérieur, sans répéter le premier point
}

export const ZONES_YAOUNDE: ZoneYaounde[] = geo.features.map((f) => ({
  code: f.id,
  nom: f.properties.nom,
  nomComplet: f.properties.nomComplet,
  centre: { lat: f.properties.centre[0], lng: f.properties.centre[1] },
  etiquette: { lat: f.properties.etiquette[0], lng: f.properties.etiquette[1] },
  contour: f.geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
}))

export const zoneYaounde = (code: string): ZoneYaounde | undefined => ZONES_YAOUNDE.find((z) => z.code === code)
