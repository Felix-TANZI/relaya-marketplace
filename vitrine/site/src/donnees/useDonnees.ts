// Lit une donnée de la source (démonstration aujourd'hui, API demain) ; null tant qu'elle n'est pas arrivée. Relue
// quand une autre interface a écrit (pont de démonstration : événement « blv:donnees » ; en production, le temps réel).
import { useEffect, useState } from 'react'

/** Compteur qui avance quand une autre interface a écrit : à mettre dans les dépendances d'une lecture. */
export function useRafraichi(): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    const f = () => setN((x) => x + 1)
    window.addEventListener('blv:donnees', f)
    return () => window.removeEventListener('blv:donnees', f)
  }, [])
  return n
}

export function useDonnees<T>(lire: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null)
  const n = useRafraichi()
  useEffect(() => {
    let vivant = true
    lire().then((d) => vivant && setV(d))
    return () => {
      vivant = false
    }
    // La fonction de lecture est fixe pour un écran donné.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return v
}
