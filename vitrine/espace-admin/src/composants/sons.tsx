// Sons de la console posés une fois (coque) : la marque sonore BelivaY (marque-sonore.ts, la même dans les six
// applications ; couleur de la console : une quarte sous le client). Les compteurs de la session qui montent, où que
// l'on soit (jamais au premier affichage ni au changement de rôle ou d'agent) : panne déclarée (alerte grave), alerte
// de fraude (alerte), litige à arbitrer (arrivée), nouvelle carte dans la file (arrivée). Les décisions sonnent dans
// DecisionMotivee (décision, versement, remboursement, compte activé) et CarteQuatreYeux (contreseing).
import { useEffect, useRef } from 'react'
import { useSession } from '../session'
import { sonner } from './marque-sonore'

export function SonsDeLaConsole() {
  const s = useSession()
  const qui = s.connecte ? `${s.agent?.id ?? ''}:${s.role}` : ''
  const { panne, fraude, litige, file } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  useEffect(() => {
    const n = [panne, fraude, litige, file]
    const a = avant.current
    if (qui && a && a.qui === qui) {
      if (n[0] > a.n[0]) sonner('panne')
      else if (n[1] > a.n[1]) sonner('alerteFraude')
      else if (n[2] > a.n[2]) sonner('litigeOuvert')
      else if (n[3] > a.n[3]) sonner('nouvelleCarte')
    }
    avant.current = { qui, n }
  }, [qui, panne, fraude, litige, file])
  return null
}
