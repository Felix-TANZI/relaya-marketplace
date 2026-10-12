// Comportements posés une fois (main.tsx) :
// - ActionsPrototype : les commandes data-act du prototype (thème, langue, taille du texte) marchent partout, y compris
//   dans les pages provisoires (balisage du prototype tel quel) : même effet que le script du prototype ;
// - Lancement : l'animation d'ouverture « Espace vendeur » (V3) au premier affichage de la visite, 2 s puis fondu ;
//   jamais sous navigateur piloté (tests) ni avec les animations réduites ;
// - SonsDuVendeur : à l'arrivée d'une commande (compteur « à préparer » de la session qui monte), le son des pièces
//   qui s'entrechoquent (sonPieces.ts) ; une notification ou un message reçus : le son « notification » du client
//   (Sons.ts). Jamais au premier affichage ni au changement de membre ; réglage « Sons », « Son distinct » et silence
//   de la nuit (Paramètres) respectés ; coupé sous navigateur piloté.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { mouvementLibre } from '@client/composants/Animations'
import { jouer } from '@client/composants/Sons'
import { usePreferences, type ChoixTheme, type TailleTexte } from '../preferences'
import { useSession } from '../session'
import { Icone } from './Icone'
import { installerSonPieces, jouerPieces, reglerSilence, reglerSonPieces } from './sonPieces'
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

const CLE = 'blv_v_lance'
function dejaLance(): boolean {
  try {
    if (sessionStorage.getItem(CLE)) return true
    sessionStorage.setItem(CLE, '1')
  } catch {
    return true
  }
  return false
}

export function Lancement() {
  const { t } = usePreferences()
  const [phase, setPhase] = useState<'cache' | 'run' | 'out'>(() => (typeof window !== 'undefined' && mouvementLibre() && !dejaLance() ? 'run' : 'cache'))
  // Le dessin se charge avec les illustrations des écrans (hors du paquet principal), le temps de la première image.
  const [svg, setSvg] = useState<string | null>(null)
  useEffect(() => {
    if (phase !== 'cache') void import('../genere/illustrations.json').then((m) => setSvg(m.default.lancement))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const nm = useRef<HTMLSpanElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (phase === 'run' && nm.current && boite.current) boite.current.style.setProperty('--nw', nm.current.scrollWidth + 'px')
  }, [phase])
  useEffect(() => {
    if (phase === 'cache') return
    const a = setTimeout(() => setPhase('out'), 2000)
    const b = setTimeout(() => setPhase('cache'), 2480)
    return () => (clearTimeout(a), clearTimeout(b))
  }, [phase === 'cache']) // eslint-disable-line react-hooks/exhaustive-deps
  if (phase === 'cache') return null
  return (
    <div ref={boite} className={'blv-spl run' + (phase === 'out' ? ' out' : '')} role="img" aria-label={'BelivaY · ' + t('Espace vendeur')} style={{ position: 'fixed' }}>
      <div className="lu">
        {svg && <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />}
        <span className="nm">
          <span ref={nm}>BelivaY</span>
        </span>
      </div>
      <p className="spl-tg">
        <Icone nom="store" taille={15} />
        {t('Espace vendeur')}
      </p>
    </div>
  )
}

export function SonsDuVendeur() {
  const s = useSession()
  const { sons } = usePreferences()
  const qui = `${s.membre?.id ?? ''}|${s.membre?.role ?? ''}`
  const { notifications, commandes, messages } = s.badges
  const avant = useRef<{ qui: string; n: number[] } | null>(null)
  useEffect(() => installerSonPieces(), [])
  useEffect(() => reglerSonPieces(sons), [sons])
  // Silence la nuit et « son distinct » des commandes : réglages des notifications (lus une fois par membre).
  useEffect(() => {
    if (!s.connecte) return
    let vivant = true
    source.notifications
      .reglages()
      .then((r) => vivant && reglerSilence(r.silence, r.sonDistinct))
      .catch(() => undefined)
    return () => void (vivant = false)
  }, [s.connecte, qui])
  useEffect(() => {
    const n = [notifications, commandes, messages]
    const a = avant.current
    if (a && a.qui === qui) {
      if (commandes > a.n[1]) jouerPieces(s.maintenant)
      else if (n.some((x, i) => x > a.n[i])) jouer('notification')
    }
    avant.current = { qui, n }
  }, [qui, notifications, commandes, messages]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
