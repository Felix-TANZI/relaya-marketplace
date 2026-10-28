// Lit une donnée de la source et la relit quand les données changent (geste fait ici ou ailleurs : événement
// blv:donnees de la démonstration ; en API, après chaque écriture). null tant qu'elle n'est pas arrivée ; une erreur
// (réseau, accès réservé à un autre rôle) est rendue à part, jamais un écran faux.
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Lecture<T> {
  donnees: T | null
  erreur: Error | null
  /** Une lecture a abouti (même vide : « introuvable » se distingue alors de « chargement ») ; remis à faux quand les clés changent. */
  arrive: boolean
  relire(): void
}

export function useLecture<T>(lire: () => Promise<T>, cles: readonly unknown[] = []): Lecture<T> {
  const [donnees, setD] = useState<T | null>(null)
  const [erreur, setE] = useState<Error | null>(null)
  const [arrive, setA] = useState(false)
  const cle = JSON.stringify(cles)
  const [cleArrivee, setCleArrivee] = useState<string | null>(null)
  const f = useRef(lire)
  f.current = lire
  const [n, setN] = useState(0)
  const relire = useCallback(() => setN((x) => x + 1), [])
  useEffect(() => {
    let vivant = true
    f.current().then(
      (d) => vivant && (setD(d), setE(null), setA(true), setCleArrivee(cle)),
      (e: unknown) => vivant && setE(e instanceof Error ? e : new Error(String(e))),
    )
    return () => {
      vivant = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...cles])
  useEffect(() => {
    window.addEventListener('blv:donnees', relire)
    return () => window.removeEventListener('blv:donnees', relire)
  }, [relire])
  return { donnees, erreur, relire, arrive: arrive && cleArrivee === cle }
}
