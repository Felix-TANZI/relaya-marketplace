// Connecteur des cartes (DP-49, DP-53) : une seule interface pour l'affichage d'une carte, ses marqueurs (relais),
// la recherche d'une adresse, le géocodage inverse et la distance, quel que soit le fournisseur.
// - OpenStreetMap (défaut) : carte intégrée openstreetmap.org, recherche et géocodage inverse par Nominatim
//   (une requête par seconde au plus, réponses gardées, politique d'usage de la fondation OSM).
// - Google Maps : Maps JavaScript API, Places (Autocomplete « nouveau »), Geocoding ; chargé à la demande, seulement
//   si VITE_MAPS=google et VITE_GOOGLE_MAPS_KEY sont posés. Clé absente, script qui n'arrive pas, clé refusée
//   (gm_authFailure) : repli sur OpenStreetMap, sans erreur pour le client.
// Les distances affichées restent géodésiques (src/donnees/geo.ts, CAL-04) : jamais un itinéraire calculé.
import { distance as distanceGeo, type Point } from '../donnees/geo'
import { connecteurs } from '../config/env'

export type { Point }
export type NomFournisseur = 'osm' | 'google'

export interface Marqueur extends Point {
  nom: string
  principal?: boolean // le point de la carte (relais habituel, adresse) ; les autres sont secondaires
}

export interface OptionsCarte {
  centre: Point
  zoom?: number // 16 par défaut (rue)
  titre: string // nom accessible de la carte
  marqueurs?: Marqueur[] // sans marqueur : le centre est marqué
  // Clic sur un repère (Google Maps) : le relais est choisi dans la liste de l'écran. La carte intégrée
  // OpenStreetMap n'a pas de repères cliquables : l'écran garde sa liste cliquable des relais à côté.
  choisir?: (m: Marqueur) => void
}

// Lieu trouvé (recherche ou géocodage inverse).
export interface Lieu extends Point {
  libelle: string // « Carrefour Emana, Yaoundé »
  quartier?: string // quartier donné par le fournisseur, s'il est connu
}

// Proposition de la recherche : le point peut ne venir qu'au choix (Google Places : un détail par choix).
export interface Proposition {
  id: string
  libelle: string
  detail?: string
  resoudre(): Promise<Lieu | null>
}

export interface Fournisseur {
  nom: NomFournisseur
  // Pose la carte dans l'élément ; renvoie de quoi la retirer.
  afficherCarte(el: HTMLElement, o: OptionsCarte): Promise<() => void>
  rechercher(texte: string, signal?: AbortSignal): Promise<Proposition[]>
  geocoderInverse(p: Point, signal?: AbortSignal): Promise<Lieu | null>
  lienCarte(p: Point): string // la carte dans le navigateur
  lienItineraire(destination: Point | string): string // le trajet jusqu'au lieu
}

// Distance géodésique (haversine), en mètres : la règle commune.
export const distance = distanceGeo

// Zone de Yaoundé (recherche orientée, pas bornée) : ouest, nord, est, sud.
const YAOUNDE = { ouest: 11.4, nord: 3.98, est: 11.62, sud: 3.76, centre: { lat: 3.8667, lon: 11.5167 } }
const langue = () => (document.documentElement.lang === 'en' ? 'en' : 'fr')
const fixe = (x: number) => x.toFixed(6)

// ——— OpenStreetMap ———

export const lienOsm = (c: Point) => `https://www.openstreetmap.org/?mlat=${fixe(c.lat)}&mlon=${fixe(c.lon)}#map=18/${fixe(c.lat)}/${fixe(c.lon)}`
// Carte intégrée openstreetmap.org (un seul marqueur : le principal).
export function srcOsm(c: Point, ecart = 0.0025): string {
  const bbox = [c.lon - ecart, c.lat - ecart, c.lon + ecart, c.lat + ecart].map(fixe).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${fixe(c.lat)},${fixe(c.lon)}`
}

// Nominatim : une requête par seconde au plus ; les réponses sont gardées le temps de la visite.
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const memoire = new Map<string, unknown>()
let derniere = 0
async function nominatim<T>(chemin: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = `${NOMINATIM}/${chemin}?${new URLSearchParams({ format: 'jsonv2', 'accept-language': langue(), ...params })}`
  if (memoire.has(url)) return memoire.get(url) as T
  const attente = derniere + 1000 - Date.now()
  derniere = Math.max(Date.now(), derniere + 1000)
  if (attente > 0) await new Promise((ok) => setTimeout(ok, attente))
  if (signal?.aborted) throw new DOMException('annulé', 'AbortError')
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('Nominatim ' + r.status)
  const v = (await r.json()) as T
  memoire.set(url, v)
  return v
}
interface ReponseNominatim {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: Record<string, string>
}
const quartierOsm = (a?: Record<string, string>) => a?.suburb ?? a?.neighbourhood ?? a?.quarter ?? a?.city_district
const lieuOsm = (x: ReponseNominatim): Lieu => ({
  lat: Number(x.lat),
  lon: Number(x.lon),
  libelle: x.display_name.split(',').slice(0, 3).join(',').trim(),
  quartier: quartierOsm(x.address),
})

const osm: Fournisseur = {
  nom: 'osm',
  async afficherCarte(el, o) {
    const p = o.marqueurs?.find((m) => m.principal) ?? o.marqueurs?.[0] ?? o.centre
    const f = document.createElement('iframe')
    f.title = o.titre
    f.src = srcOsm(p)
    f.loading = 'lazy'
    f.style.cssText = 'display:block;width:100%;height:100%;border:0'
    el.replaceChildren(f)
    return () => f.remove()
  },
  async rechercher(texte, signal) {
    const v = await nominatim<ReponseNominatim[]>(
      'search',
      { q: texte, countrycodes: 'cm', viewbox: [YAOUNDE.ouest, YAOUNDE.nord, YAOUNDE.est, YAOUNDE.sud].join(','), bounded: '0', limit: '5', addressdetails: '1' },
      signal,
    )
    return v.map((x) => {
      const l = lieuOsm(x)
      return { id: String(x.place_id), libelle: x.name || l.libelle.split(',')[0], detail: l.libelle, resoudre: async () => l }
    })
  },
  async geocoderInverse(p, signal) {
    const v = await nominatim<ReponseNominatim & { error?: string }>('reverse', { lat: fixe(p.lat), lon: fixe(p.lon), zoom: '17', addressdetails: '1' }, signal)
    return v.error ? null : lieuOsm(v)
  },
  lienCarte: lienOsm,
  lienItineraire: (d) =>
    typeof d === 'string' ? 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(d) : `https://www.openstreetmap.org/directions?route=%3B${fixe(d.lat)}%2C${fixe(d.lon)}#map=16/${fixe(d.lat)}/${fixe(d.lon)}`,
}

// ——— Google Maps (chargé à la demande) ———

// Ce que le site utilise de google.maps (pas de dépendance @types : l'interface utile, rien de plus).
interface LatLng {
  lat(): number
  lng(): number
}
interface GMap {
  fitBounds(b: unknown, marge?: number): void
}
interface GMaps {
  Map: new (el: HTMLElement, o: Record<string, unknown>) => GMap
  Marker: new (o: Record<string, unknown>) => { setMap(m: GMap | null): void; addListener(e: string, f: () => void): unknown }
  LatLngBounds: new () => { extend(p: { lat: number; lng: number }): void }
  importLibrary(nom: string): Promise<Record<string, unknown>>
}
interface ComposantAdresse {
  longText?: string
  long_name?: string
  types: string[]
}
interface PlaceGoogle {
  location?: LatLng
  formattedAddress?: string
  displayName?: string
  addressComponents?: ComposantAdresse[]
  fetchFields(o: { fields: string[] }): Promise<unknown>
}
interface SuggestionGoogle {
  placePrediction?: { placeId: string; text: { toString(): string }; mainText?: { toString(): string }; secondaryText?: { toString(): string }; toPlace(): PlaceGoogle }
}
interface ResultatGeocodage {
  formatted_address: string
  address_components: ComposantAdresse[]
  geometry: { location: LatLng }
}

let repliGoogle = false // clé refusée ou script absent : OpenStreetMap jusqu'au rechargement
let chargement: Promise<GMaps> | null = null
export const EVENEMENT_REPLI = 'blv-cartes-repli'

function chargerGoogle(cle: string): Promise<GMaps> {
  return (chargement ??= new Promise<GMaps>((ok, ko) => {
    const w = window as unknown as Record<string, unknown> & { google?: { maps?: GMaps } }
    if (w.google?.maps?.importLibrary) return ok(w.google.maps)
    const rappel = '__blvCartesPretes'
    const delai = setTimeout(() => ko(new Error('Google Maps : délai dépassé')), 12000)
    w[rappel] = () => (clearTimeout(delai), w.google?.maps ? ok(w.google.maps) : ko(new Error('Google Maps absent')))
    // Clé refusée (domaine non autorisé, facturation) : Google appelle gm_authFailure après le chargement.
    w.gm_authFailure = () => {
      repliGoogle = true
      window.dispatchEvent(new Event(EVENEMENT_REPLI))
    }
    const s = document.createElement('script')
    const params = new URLSearchParams({ key: cle, v: 'weekly', loading: 'async', libraries: 'places,marker,geocoding', language: langue(), region: 'CM', callback: rappel })
    s.src = 'https://maps.googleapis.com/maps/api/js?' + params
    s.async = true
    s.onerror = () => (clearTimeout(delai), ko(new Error('Google Maps : script non chargé')))
    document.head.append(s)
  }).catch((e: unknown) => {
    repliGoogle = true
    chargement = null
    throw e
  }))
}

// Places renvoie longText, le Geocoder long_name.
const quartierGoogle = (c?: ComposantAdresse[]) => {
  const x = c?.find((y) => y.types.some((t) => t === 'sublocality' || t === 'sublocality_level_1' || t === 'neighborhood'))
  return x ? (x.longText ?? x.long_name) : undefined
}

function google(cle: string, mapId: string | undefined): Fournisseur {
  let jeton: unknown = null // session d'autocomplétion : facturée une fois, de la frappe au choix
  return {
    nom: 'google',
    async afficherCarte(el, o) {
      const maps = await chargerGoogle(cle)
      const carte = new maps.Map(el, {
        center: { lat: o.centre.lat, lng: o.centre.lon },
        zoom: o.zoom ?? 16,
        mapId,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: 'cooperative',
      })
      el.setAttribute('role', 'region')
      el.setAttribute('aria-label', o.titre)
      const points = o.marqueurs?.length ? o.marqueurs : [{ ...o.centre, nom: o.titre, principal: true }]
      const poses: { retirer(): void }[] = []
      const avance = mapId ? ((await maps.importLibrary('marker')).AdvancedMarkerElement as (new (o: Record<string, unknown>) => { map: GMap | null; addListener(e: string, f: () => void): unknown }) | undefined) : undefined
      for (const m of points) {
        const position = { lat: m.lat, lng: m.lon }
        if (avance) {
          const x = new avance({ map: carte, position, title: m.nom, zIndex: m.principal ? 2 : 1, gmpClickable: !!o.choisir })
          if (o.choisir) x.addListener('click', () => o.choisir?.(m))
          poses.push({ retirer: () => (x.map = null) })
        } else {
          const x = new maps.Marker({ map: carte, position, title: m.nom, zIndex: m.principal ? 2 : 1, opacity: m.principal ? 1 : 0.75, clickable: !!o.choisir })
          if (o.choisir) x.addListener('click', () => o.choisir?.(m))
          poses.push({ retirer: () => x.setMap(null) })
        }
      }
      if (points.length > 1) {
        const b = new maps.LatLngBounds()
        points.forEach((m) => b.extend({ lat: m.lat, lng: m.lon }))
        carte.fitBounds(b, 40)
      }
      return () => {
        poses.forEach((p) => p.retirer())
        el.replaceChildren()
      }
    },
    async rechercher(texte, signal) {
      const maps = await chargerGoogle(cle)
      const lib = (await maps.importLibrary('places')) as {
        AutocompleteSuggestion: { fetchAutocompleteSuggestions(o: Record<string, unknown>): Promise<{ suggestions: SuggestionGoogle[] }> }
        AutocompleteSessionToken: new () => unknown
      }
      jeton ??= new lib.AutocompleteSessionToken()
      const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: texte,
        sessionToken: jeton,
        includedRegionCodes: ['cm'],
        language: langue(),
        locationBias: { center: { lat: YAOUNDE.centre.lat, lng: YAOUNDE.centre.lon }, radius: 20000 },
      })
      if (signal?.aborted) return []
      return suggestions.flatMap((s) => {
        const p = s.placePrediction
        if (!p) return []
        return [
          {
            id: p.placeId,
            libelle: (p.mainText ?? p.text).toString(),
            detail: p.secondaryText?.toString(),
            resoudre: async () => {
              const place = p.toPlace()
              await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName', 'addressComponents'] })
              jeton = null // le choix ferme la session
              if (!place.location) return null
              return { lat: place.location.lat(), lon: place.location.lng(), libelle: place.formattedAddress ?? place.displayName ?? p.text.toString(), quartier: quartierGoogle(place.addressComponents) }
            },
          },
        ]
      })
    },
    async geocoderInverse(p) {
      const maps = await chargerGoogle(cle)
      const { Geocoder } = (await maps.importLibrary('geocoding')) as { Geocoder: new () => { geocode(o: Record<string, unknown>): Promise<{ results: ResultatGeocodage[] }> } }
      const { results } = await new Geocoder().geocode({ location: { lat: p.lat, lng: p.lon }, language: langue() })
      const r = results[0]
      return r ? { lat: r.geometry.location.lat(), lon: r.geometry.location.lng(), libelle: r.formatted_address, quartier: quartierGoogle(r.address_components) } : null
    },
    lienCarte: (c) => `https://www.google.com/maps/search/?api=1&query=${fixe(c.lat)},${fixe(c.lon)}`,
    lienItineraire: (d) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(typeof d === 'string' ? d : `${fixe(d.lat)},${fixe(d.lon)}`),
  }
}

// ——— Choix du fournisseur ———

let googleConfigure: Fournisseur | null = null
// Fournisseur demandé par la configuration (sans rien charger) : Google seulement avec sa clé, et tant qu'il répond.
export function fournisseur(): Fournisseur {
  const { fournisseur: nom, cleGoogle, mapIdGoogle } = connecteurs.cartes
  if (nom !== 'google' || !cleGoogle || repliGoogle) return osm
  return (googleConfigure ??= google(cleGoogle, mapIdGoogle))
}
export const fournisseurOsm = osm

// Une opération Google qui échoue (réseau, quota, clé) est refaite sur OpenStreetMap.
async function avecRepli<T>(f: (x: Fournisseur) => Promise<T>): Promise<T> {
  const x = fournisseur()
  if (x.nom === 'osm') return f(osm)
  try {
    return await f(x)
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    repliGoogle = true
    window.dispatchEvent(new Event(EVENEMENT_REPLI))
    return f(osm)
  }
}

// Interface commune (ce que les écrans appellent).
export const afficherCarte = (el: HTMLElement, o: OptionsCarte) => avecRepli((x) => x.afficherCarte(el, o))
export const rechercherAdresse = (texte: string, signal?: AbortSignal) => avecRepli((x) => x.rechercher(texte, signal))
export const geocoderInverse = (p: Point, signal?: AbortSignal) => avecRepli((x) => x.geocoderInverse(p, signal))
export const lienCarte = (p: Point) => fournisseur().lienCarte(p)
export const lienItineraire = (d: Point | string) => fournisseur().lienItineraire(d)
