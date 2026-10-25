// DONNÉES DE DÉMONSTRATION — ce que l'employeur de Serge (Yafé Express, DP-66 : son employeur est l'entreprise, pas
// BelivaY) a décidé pour son emploi, reçu par le pont (src/demo/pont-entreprise.ts) : suspension et réintégration,
// avertissements écrits, zones et horaires de travail, fin de la période d'essai, fin de contrat avec préavis (le départ
// lui-même suit le chemin du départ, domaine « moi »). Le livreur voit, il ne décide pas : un bandeau sobre en tête des
// pages (composants/BandeauEmploi.tsx), ses notifications, ses zones (Moi) et son planning (Mon statut).
import { ZONES_YAOUNDE } from '../calculs/zones'
import { magasin } from './stockage'

export interface CreneauEmploi {
  jour: number // 0 lundi … 6 dimanche
  de: string
  a: string
}
export interface EtatEmploi {
  suspension: { motif: string; depuis: number; jusqua: number | null } | null
  avertissements: { id: string; rang: number; le: number; motif: string }[]
  zones: string[] | null // null : celles du jeu d'essai (Z1, Z3)
  horaires: CreneauEmploi[] | null // null : le planning de l'entreprise du jeu d'essai
  essai: { issue: 'confirme' | 'prolonge' | 'rompu'; le: number; jusqua: number | null } | null
  finContrat: { id: string; motif: string; le: number; preavisJusqua: number } | null
}

export const etatEmploi = magasin<EtatEmploi>('emploi', () => ({ suspension: null, avertissements: [], zones: null, horaires: null, essai: null, finContrat: null }))

/** Noms courts des douze zones de Yaoundé, lus sur la carte (calculs/zones.ts, les mêmes que l'espace entreprise). */
export const NOMS_ZONES: Record<string, string> = Object.fromEntries(ZONES_YAOUNDE.map((z) => [z.code, z.nom]))

/** Suspension par l'employeur encore en cours à l'instant t (une date de fin passée la clôt d'elle-même). */
export function suspensionEnCours(t: number) {
  const s = etatEmploi.lire().suspension
  return s && (s.jusqua === null || s.jusqua > t) ? s : null
}
