// Feuille du bas, balisage de C.sheet du prototype (CNV-11, CDS-20) : voile, feuille, poignée.
// Chaque feuille a son adresse (paramètre « sheet » de l'écran) : un lien profond l'ouvre. Elle se ferme
// par le voile ou le bouton retour, qui ramène à l'écran de dessous ; l'écran derrière ne défile pas.
// Grands écrans (DISPOSITION-ECRANS.md § 3.9) : dès 768 px, la feuille devient une modale centrée (« modale »,
// 560 px), une grande modale (« large » : 720 px, puis 920 px en deux colonnes dès 1024 px) ou un tiroir latéral
// (« tiroir » : modale en tablette portrait, panneau de 440 px à droite dès 1024 px). Même adresse, même contenu,
// même voile ; bouton « Fermer » (×) en haut à droite ; focus enfermé et rendu au déclencheur à la fermeture.
// Les feuilles écrites en balisage brut (<div className="sheet">) reçoivent la même forme par l'attribut
// data-forme, et le même comportement par <FeuillesLarges />, posé une fois (main.tsx).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { usePreferences } from '../preferences'
import { useDes } from './ecran'
import { Icone } from './Icone'

export type FormeFeuille = 'modale' | 'large' | 'tiroir'

export function useFeuille(nom: string) {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const ouverte = params.get('sheet') === nom
  const ouvrir = useCallback(() => {
    const p = new URLSearchParams(params)
    p.set('sheet', nom)
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }, [params, nom, naviguer])
  const fermer = useCallback(() => {
    // Ouverte depuis l'écran : on revient à l'entrée d'avant ; ouverte par un lien : on retire le paramètre.
    if ((lieu.state as { feuille?: boolean } | null)?.feuille) return naviguer(-1)
    const p = new URLSearchParams(params)
    p.delete('sheet')
    naviguer({ search: p.toString() }, { replace: true })
  }, [lieu.state, params, naviguer])
  return { ouverte, ouvrir, fermer }
}

// Bouton « Fermer » (×) des grands écrans, en haut à droite de la feuille. Absent sur téléphone (la poignée et le
// voile y suffisent, rien ne change).
function BoutonFermer({ fermer }: { fermer: () => void }) {
  const { t } = usePreferences()
  return (
    <button type="button" className="sheet-x" aria-label={t('Fermer')} onClick={fermer}>
      <Icone nom="x" taille={20} />
    </button>
  )
}

export function Feuille(p: { ouverte: boolean; fermer: () => void; titre: string; classe?: string; forme?: FormeFeuille; children: ReactNode }) {
  const { ouverte, fermer } = p
  const large = useDes('tab')
  useEffect(() => {
    if (!ouverte) return
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [ouverte, fermer])
  if (!ouverte) return null
  return (
    <>
      <div className="veil" onClick={fermer} />
      <div className={'sheet' + (p.classe ? ' ' + p.classe : '')} role="dialog" aria-modal="true" aria-label={p.titre} data-forme={p.forme ?? 'modale'} data-feuille="">
        <div className="grab" />
        {large && <BoutonFermer fermer={fermer} />}
        {p.children}
      </div>
    </>
  )
}

// Comportement commun des feuilles sur grand écran (dès 768 px), y compris celles écrites en balisage brut :
// - à l'ouverture, le focus va dans la feuille (sa première commande), et revient au déclencheur à la fermeture ;
// - Tab et Maj+Tab restent dans la feuille ;
// - Échap ferme une feuille en balisage brut par son voile (une <Feuille> a déjà son Échap) ;
// - le bouton « Fermer » (×) s'ajoute aux feuilles en balisage brut qui n'en ont pas ; il ferme par le voile, comme
//   un toucher dehors.
const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])'
const visibles = (el: Element) => [...el.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((x) => x.offsetParent !== null || x === document.activeElement)
const voileDe = (f: Element) => (f.previousElementSibling?.matches('.veil') ? f.previousElementSibling : document.querySelector('#app .veil')) as HTMLElement | null
// Place du bouton « Fermer » d'une feuille en balisage brut : un repère sans boîte (display:contents) posé en tête
// de la feuille (après la poignée), comme dans <Feuille> : le × est le premier élément, en haut à droite.
const zones = new WeakMap<Element, HTMLElement>()
function zoneDe(f: Element) {
  let z = zones.get(f)
  if (!z || z.parentElement !== f) {
    z = document.createElement('span')
    z.className = 'sheet-x-z'
    z.style.display = 'contents'
    const poignee = f.querySelector(':scope>.grab')
    f.insertBefore(z, poignee ? poignee.nextSibling : f.firstChild)
    zones.set(f, z)
  }
  return z
}

export function FeuillesLarges() {
  const large = useDes('tab')
  const [brutes, setBrutes] = useState<HTMLElement[]>([])
  const naviguer = useNavigate()
  // Fermer une feuille en balisage brut : comme un toucher dehors (son voile). Si le voile ne fait rien (pas de
  // gestionnaire) et que la feuille est encore là au tour suivant, on la ferme par l'adresse : sans « sheet »
  // (feuille ouverte par l'adresse), sinon le retour de l'historique (feuille posée sur un écran).
  const fermerBrute = useCallback(
    (f: Element) => {
      const avant = location.href
      voileDe(f)?.click()
      setTimeout(() => {
        // Le voile a agi (feuille retirée, ou navigation lancée) : rien de plus.
        if (!f.isConnected || location.href !== avant) return
        const p = new URLSearchParams(location.search)
        if (p.has('sheet')) {
          p.delete('sheet')
          naviguer({ search: p.toString() }, { replace: true })
        } else history.back()
      }, 120)
    },
    [naviguer],
  )
  const refFermer = useRef(fermerBrute)
  useEffect(() => {
    refFermer.current = fermerBrute
  })
  useEffect(() => {
    if (!large) return
    const avant = new Map<Element, Element | null>()
    const relever = () => {
      const feuilles = [...document.querySelectorAll<HTMLElement>('#app .sheet')]
      for (const f of feuilles)
        if (!avant.has(f)) {
          // Déclencheur : ce qui avait le focus (sinon le dernier élément touché) au moment où la feuille paraît.
          avant.set(f, document.activeElement && document.activeElement !== document.body ? document.activeElement : dernierTouche)
          if (!f.contains(document.activeElement)) {
            const premier = visibles(f).find((x) => !x.matches('.sheet-x')) ?? visibles(f)[0]
            if (premier) premier.focus({ preventScroll: true })
            else {
              f.tabIndex = -1
              f.focus({ preventScroll: true })
            }
          }
        }
      for (const [f, declencheur] of avant)
        if (!f.isConnected) {
          avant.delete(f)
          if (declencheur instanceof HTMLElement && declencheur.isConnected && !document.querySelector('#app .sheet')) declencheur.focus({ preventScroll: true })
        }
      setBrutes((b) => {
        // Une feuille qui a déjà son bouton de fermeture n'en reçoit pas un second.
        const n = feuilles.filter((f) => !f.hasAttribute('data-feuille') && !f.querySelector(':is([aria-label="Fermer"], [aria-label="Close"]):not(.sheet-x)'))
        n.forEach(zoneDe)
        return n.length === b.length && n.every((x, i) => x === b[i]) ? b : n
      })
    }
    let dernierTouche: Element | null = null
    const toucher = (e: PointerEvent) => (dernierTouche = e.target as Element)
    const clavier = (e: KeyboardEvent) => {
      const feuilles = [...document.querySelectorAll<HTMLElement>('#app .sheet')]
      const f = feuilles[feuilles.length - 1]
      if (!f) return
      if (e.key === 'Escape' && !f.hasAttribute('data-feuille')) {
        refFermer.current(f)
        return
      }
      if (e.key !== 'Tab') return
      const liste = visibles(f)
      if (!liste.length) return e.preventDefault()
      const i = liste.indexOf(document.activeElement as HTMLElement)
      if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === liste.length - 1)) {
        e.preventDefault()
        liste[e.shiftKey ? (i <= 0 ? liste.length - 1 : i - 1) : 0].focus()
      }
    }
    const mo = new MutationObserver(relever)
    const app = document.getElementById('root') ?? document.body
    mo.observe(app, { childList: true, subtree: true })
    relever()
    window.addEventListener('pointerdown', toucher, true)
    window.addEventListener('keydown', clavier)
    return () => {
      mo.disconnect()
      window.removeEventListener('pointerdown', toucher, true)
      window.removeEventListener('keydown', clavier)
      setBrutes([])
      document.querySelectorAll('#app .sheet-x-z').forEach((z) => z.remove())
    }
  }, [large])
  if (!large) return null
  return <>{brutes.map((f, i) => f.isConnected && createPortal(<BoutonFermer fermer={() => fermerBrute(f)} />, zoneDe(f), 'x' + i))}</>
}
