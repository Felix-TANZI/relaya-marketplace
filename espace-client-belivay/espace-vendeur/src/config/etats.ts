// Ce que le prototype affiche autour de chaque état (outils/etats.mjs → src/genere/etats.json) : en-tête, titre,
// retour, pastilles de l'en-tête racine, barre du bas, marge haute. Les pages provisoires suivent leur état ; un écran
// repris lit ses données dans la source et ne s'en sert plus que pour sa coque (titre, retour).
import { useLocation } from 'react-router-dom'
import etats from '../genere/etats.json'

export interface PastilleReleve {
  ton: string
  point: boolean
  icone: string | null
  texte: string
}
export interface Etat {
  route: string
  adresse: string
  entete: 'racine' | 'enfant' | 'aucun'
  titre: string | null
  retour: string | null
  styleEntete?: string
  racine?: { pastilles: PastilleReleve[]; libelle: string | null; avatar: string | null; cloche: string | null }
  barre: { onglet: string | null; badges: Record<string, string | null>; point: boolean } | null
  margeHaute: number | null
  styleMain: string
  classesApp: string[]
  styles: string[]
  profil?: boolean
}
export const ETATS = etats as Record<string, Etat>

/** Clé d'un état : la route et ses paramètres triés (même calcul que outils/inventaire-commun.mjs). */
export function cleEtat(route: string, recherche: string): string {
  const p = new URLSearchParams(recherche)
  p.sort()
  const s = p.toString()
  return route + (s ? '?' + s : '')
}

/** État affiché d'une route : sa clé si le prototype la connaît, sinon l'état par défaut de la route. */
export function useEtat(route: string): string {
  const { search } = useLocation()
  const cle = cleEtat(route, search)
  return cle in ETATS ? cle : route
}
