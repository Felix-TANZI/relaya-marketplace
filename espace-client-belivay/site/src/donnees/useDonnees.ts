// Lit une donnée de la source (démonstration aujourd'hui, API demain) ; null tant qu'elle n'est pas arrivée.
import { useEffect, useState } from 'react'

export function useDonnees<T>(lire: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null)
  useEffect(() => {
    let vivant = true
    lire().then((d) => vivant && setV(d))
    return () => {
      vivant = false
    }
    // La fonction de lecture est fixe pour un écran donné.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return v
}
