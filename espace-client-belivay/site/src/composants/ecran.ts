// Paliers de largeur (DISPOSITION-ECRANS.md § 2.1) : téléphone, grand téléphone, tablette portrait, tablette
// paysage et petit ordinateur, ordinateur, grand écran. Lus de façon synchrone au démarrage (matchMedia), pour
// que les colonnes aient leur largeur dès le premier rendu, puis suivis en direct (fenêtre redimensionnée, zoom
// du navigateur). Le palier est aussi posé sur html[data-ecran] pour le CSS (src/styles/larges.css).
// Les valeurs sont celles de larges.css : 600, 768, 1024, 1200, 1600.
import { useSyncExternalStore } from 'react'

export type Palier = 'tel' | 'tel-l' | 'tab' | 'tab-l' | 'pc' | 'pc-xl'
export const PALIERS: Palier[] = ['tel', 'tel-l', 'tab', 'tab-l', 'pc', 'pc-xl']
const SEUILS: [Palier, number][] = [
  ['pc-xl', 1600],
  ['pc', 1200],
  ['tab-l', 1024],
  ['tab', 768],
  ['tel-l', 600],
]

const requetes = typeof matchMedia === 'function' ? SEUILS.map(([p, w]) => [p, matchMedia(`(min-width: ${w}px)`)] as const) : []

function lire(): Palier {
  for (const [p, m] of requetes) if (m.matches) return p
  return 'tel'
}

let actuel: Palier = lire()
const poser = () => {
  if (typeof document !== 'undefined') document.documentElement.dataset.ecran = actuel
}
poser()

const abonnes = new Set<() => void>()
for (const [, m] of requetes)
  m.addEventListener('change', () => {
    const p = lire()
    if (p === actuel) return
    actuel = p
    poser()
    abonnes.forEach((f) => f())
  })

function abonner(f: () => void) {
  abonnes.add(f)
  return () => abonnes.delete(f)
}

// Palier courant ; le composant se redessine quand il change.
export function useEcran(): Palier {
  return useSyncExternalStore(abonner, () => actuel, () => 'tel')
}

// Le palier « p » est-il atteint ? auMoins(ecran, 'tab-l') : 1024 px et plus.
export const auMoins = (ecran: Palier, p: Palier) => PALIERS.indexOf(ecran) >= PALIERS.indexOf(p)

// Raccourci : vrai dès le palier donné.
export function useDes(p: Palier): boolean {
  return auMoins(useEcran(), p)
}
