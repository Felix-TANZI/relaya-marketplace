// Comportements posés une fois (main.tsx) :
// - ActionsPrototype : les commandes data-act du prototype (thème, langue, taille du texte) marchent partout, y compris
//   dans les pages provisoires (balisage du prototype tel quel) : même effet que le script du prototype ;
// - (plus d'animation d'ouverture « Espace vendeur » : consigne du porteur, 25 oct. 2026, l'application ouvre
//   directement son premier écran) ;
// - SonsDuVendeur : à l'arrivée d'une commande (compteur « à préparer » de la session qui monte), le son des pièces
//   qui s'entrechoquent puis une cloche ; une notification ou un message reçus : le son de ce qu'ils annoncent
//   (sons.ts, marque sonore BelivaY). Jamais au premier affichage ni au changement de membre ; réglage « Sons »,
//   « Son distinct » et silence de la nuit (Paramètres) respectés ; coupé sous navigateur piloté.
import { useEffect, useRef } from 'react'
import { usePreferences, type ChoixTheme, type TailleTexte } from '../preferences'
import { useSession } from '../session'
import { reglerSilence, sonsDesBadges } from './sons'
import { source } from '../donnees/source'

export function ActionsPrototype() {
  const { theme, setTheme, langue, setLangue, setTaille } = usePreferences()
  const etat = useRef({ theme, langue })
  useEffect(() => {
    etat.current = { theme, langue }
  }, [theme, langue])
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('[data-act]')
      if (!a) return
      const act = a.getAttribute('data-act')
      const v = a.getAttribute('data-v') ?? ''
      if (act === 'theme') setTheme(etat.current.theme === 'dark' ? 'light' : 'dark')
      else if (act === 'lang') setLangue(etat.current.langue === 'en' ? 'fr' : 'en')
      else if (act === 'set-theme' && ['light', 'dark', 'auto'].includes(v)) setTheme(v as ChoixTheme)
      else if (act === 'set-lang' && (v === 'fr' || v === 'en')) setLangue(v)
      else if (act === 'set-text' && ['normale', 'grande', 'tres'].includes(v)) setTaille(v as TailleTexte)
      else return
      e.preventDefault()
    }
    document.addEventListener('click', clic)
    return () => document.removeEventListener('click', clic)
  }, [setTheme, setLangue, setTaille])
  return null
}

export function SonsDuVendeur() {
  const s = useSession()
  const qui = `${s.membre?.id ?? ''}|${s.membre?.role ?? ''}`
  const maintenant = useRef(s.maintenant)
  maintenant.current = s.maintenant
  const { notifications, commandes, messages } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  // Silence la nuit et « son distinct » des commandes : réglages des notifications (lus une fois par membre).
  useEffect(() => {
    if (!s.connecte) return
    let vivant = true
    source.notifications
      .reglages()
      .then((r) => vivant && reglerSilence(r.silence, r.sonDistinct, () => maintenant.current))
      .catch(() => undefined)
    return () => void (vivant = false)
  }, [s.connecte, qui])
  useEffect(() => {
    const n = [notifications, commandes, messages]
    const a = avant.current
    if (a && a.qui === qui) sonsDesBadges(a.n, n)
    avant.current = { qui, n }
  }, [qui, notifications, commandes, messages]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
