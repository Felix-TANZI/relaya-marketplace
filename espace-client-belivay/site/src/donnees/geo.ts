// Géographie des zones servies (DP-49, DP-53) : centres approchés des quartiers de Yaoundé (WGS 84) et distance
// géodésique (haversine). Les distances affichées restent géodésiques, jamais un itinéraire (CAL-04, CDA-05).
// La position d'une boutique ne se montre jamais (CMC-49) : seule la distance en km sort du serveur.

// Centres approchés des zones servies de Yaoundé (WGS 84).
export const CENTRES: Record<string, [number, number]> = {
  'Mvog-Ada': [3.8634, 11.526],
  Essos: [3.873, 11.537],
  Mvan: [3.833, 11.523],
  Bastos: [3.896, 11.509],
  Mokolo: [3.873, 11.5],
  Melen: [3.865, 11.493],
  'Biyem-Assi': [3.835, 11.486],
  Emana: [3.92, 11.513],
  Nlongkak: [3.885, 11.517],
  'Ngoa-Ekellé': [3.859, 11.499],
  Omnisport: [3.883, 11.545],
  Etoudi: [3.918, 11.527],
}

export interface Point {
  lat: number
  lon: number
}

// Distance géodésique (haversine), en mètres.
export function distance(a: Point, b: Point): number {
  const r = (x: number) => (x * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export const centre = (quartier: string): Point | null => (CENTRES[quartier] ? { lat: CENTRES[quartier][0], lon: CENTRES[quartier][1] } : null)

// Distance en km, arrondie à 100 m (0,1 km au moins), entre deux points ; null si l'un manque.
export function kmEntre(a: Point | null, b: Point | null): number | null {
  if (!a || !b) return null
  return Math.max(0.1, Math.round(distance(a, b) / 100) / 10)
}

// « 1,2 km » : la forme lue par le catalogue (tri « plus proche », filtre de distance).
export const texteKm = (k: number) => `${k.toFixed(1).replace('.', ',')} km`
