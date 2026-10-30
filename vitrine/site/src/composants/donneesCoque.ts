// Données que la coque des grands écrans lit sur chaque page (en-tête de site, navigation, méga-menu, colonne
// Catégories, menu du compte) : chaque écran remonte la coque, donc la lecture est gardée le temps de la visite
// pour que les pastilles ne clignotent pas d'une page à l'autre. Rien n'est lu sur téléphone : ces composants ne
// sont montés que dès leur palier. Les nombres viennent de la source (démonstration aujourd'hui, API demain).
import { useEffect, useState } from 'react'
import { source, type DonneesMenu, type Produit } from '../donnees/source'

const gardes = new Map<string, { v?: unknown; p?: Promise<unknown>; le: number }>()
const DUREE = 60_000 // relue au plus une fois par minute

function lireGarde<T>(cle: string, lire: () => Promise<T>): Promise<T> {
  const g = gardes.get(cle)
  if (g?.p && Date.now() - g.le < DUREE) return g.p as Promise<T>
  const p = lire().then((v) => {
    gardes.set(cle, { v, p, le: Date.now() })
    return v
  })
  gardes.set(cle, { v: g?.v, p, le: Date.now() })
  return p
}

// Donnée gardée : la dernière valeur connue tout de suite, puis la valeur fraîche.
export function useGarde<T>(cle: string, lire: () => Promise<T>, actif = true): T | null {
  const [v, setV] = useState<T | null>(() => (gardes.get(cle)?.v as T | undefined) ?? null)
  useEffect(() => {
    if (!actif) return
    let vivant = true
    lireGarde(cle, lire).then((x) => vivant && setV(x))
    return () => {
      vivant = false
    }
    // La lecture est fixe pour une clé donnée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, actif])
  return v
}

// Une donnée change (notification lue, commande payée) : la prochaine lecture repart de la source.
export function oublierGarde(cle?: string) {
  if (cle) gardes.delete(cle)
  else gardes.clear()
}

export const useMenuCoque = (actif = true) => useGarde<DonneesMenu>('menu', () => source.menu(), actif)
export const useProduitsCoque = (actif = true) => useGarde<Produit[]>('produits', () => source.produits(), actif)

// Plus forte remise vraie du catalogue, calculée comme dans Promotions (prix barré et prix de l'offre).
export function remiseMax(produits: Produit[]): number {
  const r = produits.filter((p) => (p.prixBarre ?? 0) > p.prix).map((p) => Math.round((1 - p.prix / p.prixBarre!) * 100))
  return r.length ? Math.max(...r) : 0
}
