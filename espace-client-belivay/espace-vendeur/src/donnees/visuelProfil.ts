// Photo de profil et photo de couverture du membre connecté, lues une fois (source.compte.profil) et partagées par
// l'en-tête (avatar), la barre latérale de l'ordinateur, le tiroir et la carte de tête du Menu. Mon profil publie le
// profil enregistré (publierVisuel) : tout se met à jour aussitôt, sans relire la page.
import { useEffect, useSyncExternalStore } from 'react'
import type { Profil } from './domaines/compte'
import { source } from './source'
import { useSession } from '../session'

export interface VisuelProfil {
  photo: string | null
  couverture: string | null
}
const VIDE: VisuelProfil = { photo: null, couverture: null }

let qui: string | null = null
let valeur: VisuelProfil = VIDE
let enCours: string | null = null
const abonnes = new Set<() => void>()
const prevenir = () => abonnes.forEach((f) => f())

/** Profil enregistré (Mon profil) : photo et couverture visibles partout, tout de suite. */
export function publierVisuel(p: Pick<Profil, 'photo' | 'couverture'>) {
  valeur = { photo: p.photo ?? null, couverture: p.couverture ?? null }
  prevenir()
}

function charger(cle: string) {
  if (qui === cle || enCours === cle) return
  enCours = cle
  source.compte
    .profil()
    .then((p) => {
      if (enCours !== cle) return
      qui = cle
      publierVisuel(p)
    })
    .catch(() => undefined)
    .finally(() => {
      if (enCours === cle) enCours = null
    })
}

/** Photo et couverture du membre (cle : son identifiant et son rôle ; null sans session). */
export function useVisuelProfil(cle: string | null): VisuelProfil {
  useEffect(() => {
    if (!cle) {
      qui = null
      if (valeur !== VIDE) publierVisuel(VIDE)
      return
    }
    if (qui !== cle && valeur !== VIDE) publierVisuel(VIDE)
    charger(cle)
  }, [cle])
  return useSyncExternalStore(
    (f) => (abonnes.add(f), () => void abonnes.delete(f)),
    () => valeur,
    () => VIDE,
  )
}

/** Photo et couverture du membre connecté (session). */
export function useMonVisuel(): VisuelProfil {
  const s = useSession()
  return useVisuelProfil(s.connecte && s.membre ? `${s.membre.id}|${s.membre.role}` : null)
}
