// Sons de l'entreprise de livraison posés une fois (main.tsx) : la marque sonore BelivaY (marque-sonore.ts, la même
// dans les cinq applications ; couleur de l'entreprise : une tierce sous le client). Tableau : logique-metier/SONS.md.
// SonsDeLEntreprise : compteurs de la session qui montent, où que l'on soit dans le portail (jamais au premier
// affichage ni au changement d'utilisateur) : incident à valider (alerte), message reçu, notification ou demande d'un
// livreur (discrète). Le nouveau paquet sonne sur la page des paquets, selon le réglage de sa zone (ENT-05/Paquets) ;
// l'incident de sécurité, avec l'alerte grave, sur la page des incidents (ENT-06/Incidents) ; le livreur hors connexion,
// sur la page des missions (ENT-06/Missions). Plage calme de l'entreprise (ENT-08) lue à la connexion et à l'enregistrement.
import { useEffect, useRef } from 'react'
import { source } from '../donnees/source'
import { useSession } from '../session'
import { reglerCalme, sonner } from './marque-sonore'

/** Heure de Yaoundé (UTC+1, sans heure d'été), de 0 à 23. */
const heureYaounde = (t: number) => new Date(t + 3_600_000).getUTCHours()
/** Vrai si l'heure h tombe dans la plage calme de → a (qui peut passer minuit). */
export const dansPlageCalme = (h: number, p: { de: number; a: number }) => (p.de < p.a ? h >= p.de && h < p.a : h >= p.de || h < p.a)

/** Plage calme de l'entreprise (Mes notifications, ENT-08) : la notification et le message se taisent ; les alertes
 * (incident, livreur hors connexion, sécurité) sonnent toujours. */
export function appliquerPlageCalme(p: { de: number; a: number } | null, maintenant: () => number = () => Date.now()) {
  reglerCalme(p ? () => dansPlageCalme(heureYaounde(maintenant()), p) : null, ['discret'])
}

export function SonsDeLEntreprise() {
  const s = useSession()
  const qui = s.utilisateur?.id ?? ''
  const { incidents, messages, notifications, demandes = 0, pieces } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  useEffect(() => {
    if (!qui) return
    let vivant = true
    source.parametres
      .notifications()
      .then((p) => vivant && appliquerPlageCalme(p.plageCalme))
      .catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [qui])
  useEffect(() => {
    const n = [incidents, messages, notifications + demandes + pieces]
    const a = avant.current
    if (a && a.qui === qui) {
      if (n[0] > a.n[0]) sonner('incident')
      else if (n[1] > a.n[1]) sonner('messageRecu')
      else if (n[2] > a.n[2]) sonner('notification')
    }
    avant.current = { qui, n }
  }, [qui, incidents, messages, notifications, demandes, pieces])
  return null
}
