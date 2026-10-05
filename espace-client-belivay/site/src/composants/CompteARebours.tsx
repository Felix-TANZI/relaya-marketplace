// Compte à rebours d'une vente (accueil, « Fin dans 09:45:00 »), comme celui du prototype : une seconde de moins
// chaque seconde, jamais négatif ; un son discret quand il arrive à zéro. La fin vient du serveur (vraie fin, CAC-…) ; ici, les secondes restantes.
import { useEffect, useRef, useState } from 'react'
import { Chrono } from './Chrono'
import { jouer } from './Sons'

const deux = (n: number) => (n < 10 ? '0' : '') + n
export const horloge = (s: number) => deux(Math.floor(s / 3600)) + ':' + deux(Math.floor((s % 3600) / 60)) + ':' + deux(s % 60)

export function CompteARebours({ secondes, classe = 'h0-cd' }: { secondes: number; classe?: string }) {
  const [reste, setReste] = useState(Math.max(0, secondes))
  useEffect(() => {
    const minuterie = setInterval(() => setReste((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(minuterie)
  }, [])
  // Arrivé à zéro sous les yeux du client (pas déjà fini à l'ouverture) : le son de fin (composants/Sons.ts).
  const courait = useRef(secondes > 0)
  useEffect(() => {
    if (reste === 0 && courait.current) {
      courait.current = false
      jouer('fin')
    }
  }, [reste])
  return <Chrono secondes={reste} classe={classe} />
}
