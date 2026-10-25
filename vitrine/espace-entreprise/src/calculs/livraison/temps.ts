// Temps des calculs de la livraison : instants en millisecondes ; heure de Yaoundé (Africa/Douala, UTC+1 toute
// l'année, le Cameroun n'a pas d'heure d'été). Fichier identique dans espace-entreprise et espace-livreur.
export const MINUTE = 60_000
export const HEURE = 60 * MINUTE
export const JOUR = 24 * HEURE
export const DECALAGE_YAOUNDE_MS = HEURE

/** Instant d'une date et d'une heure de Yaoundé (mois de 1 à 12) : yaounde(2026, 10, 12, 9, 10). */
export const yaounde = (a: number, mois: number, j: number, h = 0, min = 0): number => Date.UTC(a, mois - 1, j, h, min) - DECALAGE_YAOUNDE_MS
