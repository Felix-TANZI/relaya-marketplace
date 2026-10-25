// Temps des calculs : les délais se comptent à l'heure de Yaoundé (Africa/Douala, UTC+1 toute l'année : le Cameroun
// n'a pas d'heure d'été). Un instant est un nombre de millisecondes (Date.now()) ; un jour civil est « AAAA-MM-JJ ».
export const DECALAGE_YAOUNDE_MS = 3600 * 1000
export const HEURE = 3600 * 1000
export const JOUR = 24 * HEURE

export type Jour = string // « 2026-09-21 »

/** Instant d'une heure de Yaoundé : yaounde(2026, 9, 21, 9, 48). Mois de 1 à 12. */
export const yaounde = (a: number, mois: number, j: number, h = 0, mi = 0, s = 0) => Date.UTC(a, mois - 1, j, h, mi, s) - DECALAGE_YAOUNDE_MS

/** Jour civil à Yaoundé d'un instant. */
export const jourDe = (instant: number): Jour => new Date(instant + DECALAGE_YAOUNDE_MS).toISOString().slice(0, 10)

/** Minutes écoulées depuis minuit à Yaoundé. */
export function minutesDuJour(instant: number): number {
  const d = new Date(instant + DECALAGE_YAOUNDE_MS)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

// Conversions mises en cache : la garde, le stock et l'accueil les appellent des milliers de fois par écran (jours de
// garde, rangs, rappels) ; un téléphone modeste doit répondre sans attendre. Fonctions pures, cache borné.
const CACHE_MAX = 4000
const cacheVers = new Map<Jour, number>()
const cacheDe = new Map<number, Jour>()
const versDate = (j: Jour) => {
  let v = cacheVers.get(j)
  if (v === undefined) {
    const [a, m, d] = j.split('-').map(Number)
    v = Date.UTC(a, m - 1, d)
    if (cacheVers.size >= CACHE_MAX) cacheVers.clear()
    cacheVers.set(j, v)
  }
  return v
}
const deDate = (ms: number): Jour => {
  let j = cacheDe.get(ms)
  if (j === undefined) {
    j = new Date(ms).toISOString().slice(0, 10)
    if (cacheDe.size >= CACHE_MAX) cacheDe.clear()
    cacheDe.set(ms, j)
  }
  return j
}

export const ajouterJours = (j: Jour, n: number): Jour => deDate(versDate(j) + n * JOUR)
/** Jour de la semaine comme Python (lundi = 0 … dimanche = 6). */
export const jourSemaine = (j: Jour) => (new Date(versDate(j)).getUTCDay() + 6) % 7
export const ecartJours = (a: Jour, b: Jour) => Math.round((versDate(b) - versDate(a)) / JOUR)
/** Minuit (heure de Yaoundé) au début d'un jour civil. */
export const debutDuJour = (j: Jour) => versDate(j) - DECALAGE_YAOUNDE_MS

/** Même jour, `mois` mois plus tard, ramené au dernier jour d'un mois plus court (27 août + 3 mois = 27 nov.). */
export function ajouterMois(j: Jour, mois: number): Jour {
  const [a, m, d] = j.split('-').map(Number)
  const rang = m - 1 + mois
  const annee = a + Math.floor(rang / 12)
  const vise = (rang % 12) + 1
  const dernier = new Date(Date.UTC(annee, vise, 0)).getUTCDate()
  return `${annee}-${String(vise).padStart(2, '0')}-${String(Math.min(d, dernier)).padStart(2, '0')}`
}

/** « 08:00 » → 480 minutes depuis minuit. */
export const minutesDe = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/** Instant d'un jour civil à une heure de Yaoundé donnée en minutes depuis minuit. */
export const aHeure = (j: Jour, minutes: number) => debutDuJour(j) + minutes * 60_000
