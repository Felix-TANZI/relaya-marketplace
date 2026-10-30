// Comportements posés une fois (main.tsx) :
// - SignauxDuLivreur : compteurs de la session qui montent : un nouveau paquet dans la tournée, le son « nouveau
//   paquet » (vibration longue, sensible téléphone en poche) ; une notification, le son discret ; un message reçu, le
//   sien (marque sonore, signaux.ts). Jamais
//   au premier affichage ni au changement de livreur ; réglages Sons et Vibrations respectés ; coupé sous navigateur
//   piloté (signaux.ts). Heures calmes (réglage « Sons et confort ») : un message reçu entre 21 h et 6 h arrive sans
//   son ni vibration ; la tournée et les notifications sonnent toujours.
import { useEffect, useRef } from 'react'
import { minutesDuJour } from '../calculs/temps'
import { HEURES_CALMES, usePreferences } from '../preferences'
import { useSession } from '../session'
import { signal } from './signaux'

/** Dans les heures calmes (21 h → 6 h, heure de Yaoundé) ? */
export function calme(instant: number): boolean {
  const h = minutesDuJour(instant) / 60
  const [de, a] = HEURES_CALMES
  return h >= de || h < a
}

export function SignauxDuLivreur() {
  const s = useSession()
  const { heuresCalmes } = usePreferences()
  const qui = s.livreur?.id ?? ''
  const { notifications, messages, tournee } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  useEffect(() => {
    const n = [notifications, messages, tournee]
    const a = avant.current
    if (a && a.qui === qui) {
      if (tournee > a.n[2]) signal('nouveauPaquet')
      else if (notifications > a.n[0]) signal('notification')
      else if (messages > a.n[1] && !(heuresCalmes && calme(Date.now()))) signal('messageRecu')
    }
    avant.current = { qui, n }
  }, [qui, notifications, messages, tournee, heuresCalmes])
  return null
}
