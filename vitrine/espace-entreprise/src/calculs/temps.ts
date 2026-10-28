// Temps de l'espace entreprise : instants en millisecondes, heure de Yaoundé (UTC+1, sans heure d'été).
export const MINUTE = 60_000
export const HEURE = 60 * MINUTE
export const JOUR = 24 * HEURE

/** Instant d'une date et d'une heure de Yaoundé (mois de 1 à 12). */
export const yaounde = (annee: number, mois: number, jour: number, h = 0, min = 0): number => Date.UTC(annee, mois - 1, jour, h - 1, min)

/** Jour civil « AAAA-MM-JJ » à Yaoundé. */
export const jourDe = (t: number): string => new Date(t + HEURE).toISOString().slice(0, 10)
