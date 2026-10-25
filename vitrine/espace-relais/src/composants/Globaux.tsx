// Comportements posés une fois (main.tsx) :
// - SignauxDuRelais : à l'annonce d'un lot (compteur « Réception » qui monte : un livreur arrive),
//   le son « livreur en approche » (ding-dong, vibration sensible le téléphone posé sur le comptoir) ; une notification,
//   le son discret ; un message reçu, le sien (marque sonore, signaux.ts). Jamais au premier affichage ni au changement de membre ; réglages Sons et Vibrations respectés ;
//   coupé sous navigateur piloté (signaux.ts). Les heures calmes du relais (NOT-06 : rien entre 22 h et 7 h sauf
//   l'urgent) sont tenues par le serveur, qui n'envoie rien dans ces heures.
import { useEffect, useRef } from 'react'
import { useSession } from '../session'
import { signal } from './signaux'

export function SignauxDuRelais() {
  const s = useSession()
  const qui = s.membre?.id ?? ''
  const { notifications, messages, reception } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  useEffect(() => {
    const n = [notifications, messages, reception]
    const a = avant.current
    if (a && a.qui === qui) {
      if (reception > a.n[2]) signal('livreurEnApproche')
      else if (notifications > a.n[0]) signal('notification')
      else if (messages > a.n[1]) signal('messageRecu')
    }
    avant.current = { qui, n }
  }, [qui, notifications, messages, reception])
  return null
}
