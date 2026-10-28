// Batterie du téléphone, détectée sans bouton (API Battery quand le navigateur l'offre ; sinon rien ne change) :
// sous BATTERIE-SOBRE (20 %) et hors charge, le mode sobre se pose sur <html data-sobre> (aucune animation, pas de
// carte animée, flous retirés) et une pastille discrète le dit. Seuil d'écran, pas une règle métier.
import { useEffect, useState } from 'react'

export const BATTERIE_SOBRE = 0.2

interface Batterie extends EventTarget {
  level: number
  charging: boolean
}

let etat: { faible: boolean } = { faible: false }
const abonnes = new Set<(f: boolean) => void>()
let lancee = false

function poser(b: Batterie) {
  const faible = !b.charging && b.level <= BATTERIE_SOBRE
  if (faible === etat.faible) return
  etat = { faible }
  if (typeof document !== 'undefined') {
    if (faible) document.documentElement.dataset.sobre = '1'
    else delete document.documentElement.dataset.sobre
  }
  for (const f of abonnes) f(faible)
}

function lancer() {
  if (lancee || typeof navigator === 'undefined') return
  lancee = true
  const lire = (navigator as unknown as { getBattery?: () => Promise<Batterie> }).getBattery
  if (typeof lire !== 'function') return
  lire.call(navigator).then(
    (b) => {
      poser(b)
      b.addEventListener('levelchange', () => poser(b))
      b.addEventListener('chargingchange', () => poser(b))
    },
    () => undefined,
  )
}

/** Vrai quand la batterie est faible et hors charge (mode sobre posé). */
export function useBatterieFaible(): boolean {
  const [faible, setFaible] = useState(etat.faible)
  useEffect(() => {
    lancer()
    abonnes.add(setFaible)
    setFaible(etat.faible)
    return () => void abonnes.delete(setFaible)
  }, [])
  return faible
}
