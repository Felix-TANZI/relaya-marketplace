// Comparateur (VAGUE-AMELIORATIONS.md n° 5) : jusqu'à trois produits d'une même catégorie, côte à côte. Règles pures
// (le serveur appliquera les mêmes) et liste gardée sur l'appareil (« blv_comparer »), annoncée par « blv:comparer ».
// - Une seule catégorie à la fois (la sous-catégorie, à défaut l'univers) : un produit d'une autre catégorie remplace
//   la comparaison en cours (annoncé à l'écran) ; trois au plus.
// - Meilleure valeur : parmi les produits en stock, les mieux notés (à 0,3 étoile près de la meilleure note), le moins
//   cher livré au relais (prix + retrait ; un colis trop volumineux compte à domicile) ; à égalité, la meilleure note,
//   puis le plus d'avis. Dite en clair sur l'écran.
// - Lignes : prix, prix livré, note, marque, vendeur (certifié, Trust Score : jamais sa lettre de boutique), distance,
//   stock, taille du colis, puis les caractéristiques des fiches ; la meilleure valeur de chaque ligne chiffrée est
//   marquée ; « seulement les différences » cache les lignes où tout est égal.
import type { Produit } from './source'

export const COMPARER_MAX = 3
export const ECART_NOTE = 0.3
const CLE = 'blv_comparer'

export const categorieComparee = (p: Produit) => p.sousCategorie || p.universTitre

export type RefusComparer = 'plein' | 'categorie'
/** Ajoute (ou retire) un produit de la comparaison ; refus : déjà trois, ou une autre catégorie. */
export function basculerDans(ids: string[], p: Produit, trouver: (id: string) => Produit | undefined): { ids: string[]; refus: RefusComparer | null } {
  if (ids.includes(p.p)) return { ids: ids.filter((x) => x !== p.p), refus: null }
  const premier = ids.map(trouver).find(Boolean)
  if (premier && categorieComparee(premier) !== categorieComparee(p)) return { ids, refus: 'categorie' }
  if (ids.length >= COMPARER_MAX) return { ids, refus: 'plein' }
  return { ids: [...ids, p.p], refus: null }
}

const note = (p: Produit) => Number(String(p.note ?? '0').replace(',', '.')) || 0
const km = (p: Produit) => Number(String(p.distance ?? '').split(' ')[0].replace(',', '.'))

/** Le produit de meilleure valeur (identifiant), ou null s'il n'y a rien à comparer en stock. */
export function meilleureValeur(produits: Produit[], prixLivre: (p: Produit) => number): string | null {
  const dispo = produits.filter((p) => p.stock > 0)
  if (produits.length < 2 || !dispo.length) return null
  const top = Math.max(...dispo.map(note))
  return dispo
    .filter((p) => note(p) >= top - ECART_NOTE)
    .sort((a, b) => prixLivre(a) - prixLivre(b) || note(b) - note(a) || b.avis - a.avis)[0].p
}

export interface LigneComparee {
  cle: string
  libelle: string
  valeurs: string[]
  meilleurs: number[] // colonnes de la meilleure valeur de la ligne (lignes chiffrées)
  egales: boolean
}
type Mesure = { libelle: string; texte: (p: Produit) => string; nombre?: (p: Produit) => number | null; sens?: 'min' | 'max' }

/** Les lignes du tableau, dans l'ordre ; F : mise en forme des francs. */
export function lignesComparees(produits: Produit[], prixLivre: (p: Produit) => number, F: (n: number) => string): LigneComparee[] {
  const mesures: Mesure[] = [
    { libelle: 'Prix', texte: (p) => F(p.prix) + ' F', nombre: (p) => p.prix, sens: 'min' },
    { libelle: 'Prix livré', texte: (p) => F(prixLivre(p)) + ' F', nombre: (p) => prixLivre(p), sens: 'min' },
    { libelle: 'Note', texte: (p) => (p.note ? `★ ${p.note} (${p.avis})` : '—'), nombre: (p) => (p.note ? note(p) : null), sens: 'max' },
    { libelle: 'Marque', texte: (p) => p.marque ?? 'Sans marque' },
    { libelle: 'Vendeur', texte: (p) => `Vendeur certifié · Trust Score ${p.vendeur.score}`, nombre: (p) => p.vendeur.score, sens: 'max' },
    { libelle: 'Distance', texte: (p) => p.distance ?? '—', nombre: (p) => (Number.isFinite(km(p)) ? km(p) : null), sens: 'min' },
    { libelle: 'Stock', texte: (p) => (p.stock <= 0 ? 'Épuisé' : p.stock <= 5 ? `Plus que ${p.stock}` : 'En stock') },
    { libelle: 'Colis', texte: (p) => p.classe },
  ]
  const specs = [...new Set(produits.flatMap((p) => p.specs.map(([k]) => k)))]
  const lignes: LigneComparee[] = mesures.map((m) => {
    const valeurs = produits.map(m.texte)
    const nombres = m.nombre ? produits.map(m.nombre) : null
    let meilleurs: number[] = []
    if (nombres && m.sens && nombres.some((x) => x !== null)) {
      const connus = nombres.filter((x): x is number => x !== null)
      const cible = m.sens === 'min' ? Math.min(...connus) : Math.max(...connus)
      if (new Set(connus).size > 1) meilleurs = nombres.flatMap((x, i) => (x === cible ? [i] : []))
    }
    return { cle: m.libelle, libelle: m.libelle, valeurs, meilleurs, egales: new Set(valeurs).size === 1 }
  })
  for (const k of specs) {
    const valeurs = produits.map((p) => p.specs.find(([x]) => x === k)?.[1] ?? '—')
    lignes.push({ cle: 'spec:' + k, libelle: k, valeurs, meilleurs: [], egales: new Set(valeurs).size === 1 })
  }
  return lignes
}

// ---------- La liste de l'appareil ----------

export function lireComparaison(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? '[]') as unknown
    return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]).slice(0, COMPARER_MAX) : []
  } catch {
    return []
  }
}
export function ecrireComparaison(ids: string[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(ids.slice(0, COMPARER_MAX)))
  } catch {
    /* stockage refusé : la comparaison vaut pour la visite */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('blv:comparer'))
}
