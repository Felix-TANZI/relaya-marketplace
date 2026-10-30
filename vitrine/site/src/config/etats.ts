// Ce que le prototype affiche autour de chaque état (outils/etats.mjs) : en-tête, titre, retour, barre du bas,
// marge haute, classes de #app. Un écran construit (étape 6) suit son état, sans rien recopier à la main.
import { useLocation } from 'react-router-dom'
import { useSession } from '../session'
import etats from '../genere/etats.json'
import type { ActionEntete } from './pages'

// Un nœud du sous-titre : texte, ou élément et ses enfants (le prototype traduit chaque nœud de texte).
export type Noeud = { texte: string } | { balise: string; classe: string | null; enfants: Noeud[] }

export interface Etat {
  route: string
  adresse: string
  entete: 'racine' | 'enfant' | 'aucun' | 'propre' // propre : l'écran écrit son en-tête (pages web de CL-14)
  classeEntete?: string[]
  titre: string | null
  sousTitre: string | null
  sousTitreNoeuds?: Noeud[] // quand il a plusieurs nœuds
  retour: string | null // adresse du prototype (« #panier?premiere=1 »)
  droite: 'panier' | 'accueil' | 'propre' | null
  action?: ActionEntete
  recherche: boolean
  barre: boolean
  calme?: boolean
  onglet: string | null
  margeHaute: number
  styleMain: string
  classesApp: string[]
  styles: string[]
  titrePanier?: string // « · 4 articles » de l'en-tête du panier
  racine?: { nonLus: string | null; panier: string | null; invite: boolean } // badges et avatar de l'en-tête racine
  badgesBarre?: { panier: string | null; compte: string | null } // badges de la barre du bas
}

export const ETATS = etats as Record<string, Etat>

// Clé d'un état : la route et ses paramètres triés (même calcul que outils/etats.mjs).
export function cleEtat(route: string, recherche: string): string {
  const p = new URLSearchParams(recherche)
  p.sort()
  const s = p.toString()
  return route + (s ? '?' + s : '')
}

// Clé de l'état demandé par l'adresse. Sans paramètre, une route qui a un état « visiteur » le montre quand
// personne n'est connecté (DP-53 : l'accueil d'un visiteur est celui du prototype, sans colis ni badges du compte).
export function useCleEtat(route: string): string {
  const { search } = useLocation()
  const { connecte } = useSession()
  if (!search && !connecte && ETATS[route + '?profil=visiteur']) return route + '?profil=visiteur'
  return cleEtat(route, search)
}

// État affiché d'une route : sa clé si le prototype le connaît, sinon l'adresse nue de la route.
export function useEtat(route: string): string {
  const cle = useCleEtat(route)
  return cle in ETATS ? cle : route
}
