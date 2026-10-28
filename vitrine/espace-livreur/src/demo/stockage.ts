// DONNÉES DE DÉMONSTRATION — le « serveur » de la démonstration : chaque domaine garde son état en mémoire et sur
// l'appareil (localStorage, clé blv_l_demo_<domaine>), partant du jeu d'essai. Un appareil neuf montre le jeu
// d'essai ; chaque geste modifie l'état et prévient les écrans (événement blv:donnees), qui relisent la source.
// VERSION change quand la forme d'un état change : l'ancien état gardé est alors oublié. En plus, chaque état gardé
// porte l'empreinte de la forme de son état initial (ses clés de premier niveau et leur type ; les tables indexées
// par référence, qui grandissent avec les gestes, n'y entrent pas) : si un écran change la forme sans
// changer VERSION, l'état d'un appareil qui a visité une version précédente est oublié au lieu de faire tomber la page.
const VERSION = 1
const ECOUTEURS = new Set<(domaine: string) => void>()

function empreinte(v: unknown, profondeur = 0): string {
  if (profondeur > 1 || v === null || typeof v !== 'object') return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
  if (Array.isArray(v)) return `[${v.length ? empreinte(v[0], profondeur + 1) : ''}]`
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${k}:${empreinte((v as Record<string, unknown>)[k], profondeur + 1)}`)
    .join(',')}}`
}

export function quandDonneesChangent(f: (domaine: string) => void): () => void {
  ECOUTEURS.add(f)
  return () => ECOUTEURS.delete(f)
}

export interface Magasin<T> {
  lire(): T
  ecrire(f: (etat: T) => void): T
  reinitialiser(): void
}

export function magasin<T>(domaine: string, initial: () => T): Magasin<T> {
  const cle = `blv_l_demo_${domaine}`
  let etat: T | null = null
  let forme: string | null = null
  const formeInitiale = (): string => (forme ??= empreinte(initial()))
  const lire = (): T => {
    if (etat) return etat
    // L'empreinte se prend sur l'état initial du jeu d'essai, avant tout geste : une table qui grandit pendant la
    // visite (paquets, colis ou commandes venus du pont) ne doit pas entrer dans la forme gardée avec l'état.
    formeInitiale()
    try {
      const brut = localStorage.getItem(cle)
      const v = brut ? (JSON.parse(brut) as { version: number; forme?: string; etat: T }) : null
      // Sans empreinte (état écrit à la main : outils, tests), la forme de l'état lui-même fait foi.
      etat = v && v.version === VERSION && (v.forme ?? empreinte(v.etat)) === formeInitiale() ? v.etat : initial()
    } catch {
      etat = initial()
    }
    return etat
  }
  return {
    lire,
    ecrire(f) {
      const e = structuredClone(lire())
      f(e)
      etat = e
      try {
        localStorage.setItem(cle, JSON.stringify({ version: VERSION, forme: formeInitiale(), etat: e }))
      } catch {
        /* stockage refusé : l'état vaut pour la visite */
      }
      for (const g of ECOUTEURS) g(domaine)
      window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine } }))
      return e
    },
    reinitialiser() {
      etat = null
      try {
        localStorage.removeItem(cle)
      } catch {
        /* rien */
      }
    },
  }
}

/** Réponse de la démonstration : un petit délai, comme un vrai serveur (jamais sous navigateur piloté). */
export const repondre = <T>(v: T): Promise<T> => Promise.resolve(structuredClone(v))
