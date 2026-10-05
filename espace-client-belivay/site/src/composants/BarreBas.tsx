// Bulle de verre de la barre du bas (demande du porteur, vidéo WhatsApp iOS 26 « Liquid Glass ») : au repos,
// rien ne change (la capsule .tab.on du prototype). On saisit la bulle au doigt (ou à la souris) et on la fait
// glisser : elle grossit un peu, agrandit ce qu'elle survole (loupe : copie des onglets, agrandie, dans la
// bulle), un reflet irisé court sur son bord ; au lâcher, elle se cale avec un ressort sur l'onglet le plus
// proche, qui s'ouvre. Un simple toucher sur un onglet y fait glisser la bulle (la page suivante reprend le
// mouvement là où il était). Flèches du clavier : d'un onglet à l'autre.
// Animations réduites (réglage, téléphone, navigateur piloté) : pas de glisse animée ; la bulle, simple, se
// pose sur l'onglet sous le doigt.
import { useCallback, useLayoutEffect, useRef, useState, type DragEvent, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { mouvementLibre } from './Animations'

interface Geo {
  x: number[]
  w: number[]
  h: number
  top: number
  rayon: string
  largeur: number
  hauteur: number
  marge: string
}

// Mouvement en cours au moment de changer de page : la barre de la page suivante le reprend (une reprise par mode :
// la barre du bas du téléphone et la barre de navigation des grands écrans ne coexistent jamais, mais restent séparées).
type Reprise = { x: number; v: number; s: number; le: number } | null
const reprises: Record<string, Reprise> = { doigt: null, survol: null }

const GROS = 1.16 // bulle saisie (ressort de prise : 1 au repos, GROS une fois saisie)
// Forme de la bulle saisie (consigne du porteur, vidéo WhatsApp iOS 26) : une capsule ovale, plus large que haute,
// qui déborde de la barre en haut et en bas. Ses dimensions sont posées en vrai (largeur, hauteur, rayon = moitié de
// la hauteur) et non par une mise à l'échelle : elle reste une pilule parfaite même quand elle s'étire.
const PLUS_H = 18 // hauteur en plus (px) : 54 → 72 dans une barre de 64, 4 px de débord en haut et en bas
// Largeur saisie : 1,6 fois sa hauteur (ovale, comme dans la vidéo), sans dépasser 1,6 onglet (téléphone : 68 → 109)
// ni rester plus étroite que l'onglet + 12 px (onglets larges de la tablette : 104 → 116).
const OVALE = 1.6
const HAUT = 12 // de combien elle suit le doigt vers le haut (px)
const BAS = 6 // … et vers le bas
const LOUPE = 1.2 // agrandissement de ce qu'elle survole
const LEVE = 1.06 // grands écrans : bulle posée sur un lien survolé (autre que l'actif), un peu soulevée (verre visible)

function focusClavier(el: Element | null) {
  try {
    return !!el?.matches(':focus-visible')
  } catch {
    return true
  }
}

// Largeur de la bulle quand son bord gauche est en x : celle du lien, interpolée entre deux liens voisins.
function largeurA(g: Geo, x: number) {
  const n = g.x.length
  if (x <= g.x[0]) return g.w[0]
  let k = 0
  while (k < n - 1 && x > g.x[k + 1]) k++
  if (k >= n - 1) return g.w[n - 1]
  return g.w[k] + (g.w[k + 1] - g.w[k]) * ((x - g.x[k]) / (g.x[k + 1] - g.x[k]))
}

// Mode « survol » (barre de navigation des grands écrans, DISPOSITION-ECRANS.md § 6.5) : pas de saisie au doigt
// ni de loupe ; la capsule de verre glisse vers le lien survolé (ressort plus vif, environ 260 ms), suit le focus
// du clavier et revient au lien actif quand la souris quitte la barre. « lien » : sélecteur des liens mesurés,
// enfants directs de l'élément qui reçoit props (ref).
export function useBulle(chemins: string[], actif: number, mode: 'doigt' | 'survol' = 'doigt', lien = 'a.tab') {
  const survol = mode === 'survol'
  const nav = useRef<HTMLDivElement>(null) // la barre du bas (nav) ou le conteneur des liens (div)
  const bulle = useRef<HTMLSpanElement | null>(null)
  const loupe = useRef<HTMLSpanElement | null>(null)
  const naviguer = useNavigate()
  const actifRef = useRef(actif)
  actifRef.current = actif
  const [bouge, setBouge] = useState(false)
  const bougeRef = useRef(false)
  bougeRef.current = bouge
  const [simple, setSimple] = useState(false)
  const st = useRef({
    x: 0,
    v: 0,
    y: 0,
    vy: 0,
    doigtY: 0,
    s: 1,
    vs: 0,
    cible: 0,
    doigt: null as number | null,
    prise: 0,
    raf: 0,
    tPrec: 0,
    geo: null as Geo | null,
    pointeur: -1,
    depart: 0,
    departY: 0,
    glisse: false,
    echant: [] as [number, number][],
    annulerClic: false,
    simple: false,
    reprendre: false,
  })

  const mesurer = (): Geo | null => {
    const n = nav.current
    if (!n) return null
    const tabs = [...n.querySelectorAll<HTMLElement>(':scope > ' + lien)]
    if (!tabs.length) return null
    const cs = getComputedStyle(n)
    return {
      x: tabs.map((t) => t.offsetLeft),
      w: tabs.map((t) => t.offsetWidth),
      h: tabs[0].offsetHeight,
      top: tabs[0].offsetTop,
      rayon: getComputedStyle(tabs[0]).borderRadius,
      largeur: n.clientWidth,
      hauteur: n.clientHeight,
      marge: cs.padding,
    }
  }
  const plusProche = (g: Geo, centre: number) => {
    let i = 0
    let e = Infinity
    g.x.forEach((x, k) => {
      const d = Math.abs(x + g.w[k] / 2 - centre)
      if (d < e) {
        e = d
        i = k
      }
    })
    return i
  }

  const peindre = useCallback(() => {
    const S = st.current
    const g = S.geo
    const b = bulle.current
    if (!g || !b) return
    // Liens de largeurs différentes (grands écrans) : la bulle s'étire d'un lien à l'autre pendant la glisse
    // (onglets égaux du téléphone : largeur constante).
    const w = largeurA(g, S.x)
    // Prise : 0 au repos, 1 saisie ; le ressort la fait légèrement dépasser (la bulle « gonfle » puis se pose).
    const prise = (S.s - 1) / (GROS - 1)
    const e = Math.max(0, Math.min(1, prise))
    // Verre liquide : la bulle saisie devient une capsule ovale qui déborde de la barre, s'allonge dans le sens de la
    // glisse et se tasse en hauteur selon la vitesse, et suit légèrement le doigt vers le haut ou le bas. Même
    // comportement pour la barre des grands écrans (consigne du porteur, 5 oct. 2026).
    const etire = Math.min(0.16, Math.abs(S.v) / 4600)
    // Grands écrans (liens larges) : la bulle saisie déborde le lien de 14 px de chaque côté.
    const largeSaisie = survol ? w + 28 : Math.max(w + 12, Math.min(w * OVALE, (g.h + PLUS_H) * OVALE))
    const W = (w + (largeSaisie - w) * Math.max(0, prise)) * (1 + etire)
    const H = Math.max(g.h * 0.8, (g.h + PLUS_H * Math.max(0, prise)) * (1 - etire * 0.5))
    b.style.top = (g.top + (g.h - H) / 2).toFixed(2) + 'px'
    b.style.width = W.toFixed(2) + 'px'
    b.style.height = H.toFixed(2) + 'px'
    // Rayon = moitié de la hauteur : une pilule, jamais un carré arrondi, même étirée.
    b.style.borderRadius = (H / 2).toFixed(2) + 'px'
    b.style.transform = `translate3d(${(S.x + (w - W) / 2).toFixed(2)}px,${S.y.toFixed(2)}px,0)`
    b.style.setProperty('--e', e.toFixed(3))
    b.style.setProperty('--a', (S.x * 1.4).toFixed(1) + 'deg')
    const l = loupe.current
    if (l) {
      // Loupe : copie des onglets agrandie pareil dans les deux sens (nette), centrée sur ce qui est sous la bulle.
      // Liens larges : l'agrandissement reste dans la bulle (le libellé n'est jamais rogné).
      const m = survol ? Math.min(1 + (LOUPE - 1) * e, Math.max(1, (W - 12) / w)) : 1 + (LOUPE - 1) * e
      l.style.width = g.largeur + 'px'
      l.style.height = g.hauteur + 'px'
      l.style.padding = g.marge
      l.style.transform = `translate(${(W / 2).toFixed(2)}px,${(H / 2).toFixed(2)}px) scale(${m.toFixed(4)}) translate(${(-w / 2 - S.x).toFixed(2)}px,${(-g.h / 2 - g.top - S.y).toFixed(2)}px)`
      // Grands écrans : les copies des liens (largeurs différentes) sont posées exactement sur les liens.
      if (survol)
        [...l.children].forEach((c, k) => {
          const s = (c as HTMLElement).style
          if (k >= g.x.length) return
          s.left = g.x[k] + 'px'
          s.top = g.top + 'px'
          s.width = g.w[k] + 'px'
          s.height = g.h + 'px'
        })
    }
  }, [survol])

  const arreter = useCallback(() => {
    const S = st.current
    cancelAnimationFrame(S.raf)
    S.raf = 0
    S.v = 0
    S.vs = 0
    S.s = 1
    S.y = 0
    S.vy = 0
    setBouge(false)
  }, [])

  const boucle = useCallback(
    (t: number) => {
      const S = st.current
      const g = S.geo
      if (!g) return arreter()
      const dt = S.tPrec ? Math.min(0.034, Math.max(0.004, (t - S.tPrec) / 1000)) : 1 / 60
      S.tPrec = t
      const tenu = S.doigt !== null
      let but = S.cible
      if (tenu) {
        const min = g.x[0]
        const max = g.x[g.x.length - 1]
        but = S.doigt! - S.prise
        if (but < min) but = min - (min - but) * 0.25
        if (but > max) but = max + (but - max) * 0.25
      }
      const k = tenu ? 1100 : survol ? 760 : 430
      const z = tenu ? 0.95 : survol ? 0.8 : 0.68
      S.v += (-k * (S.x - but) - 2 * z * Math.sqrt(k) * S.v) * dt
      S.x += S.v * dt
      // Taille visée : saisie, GROS ; en route, elle gonfle avec la vitesse ; grands écrans, posée sur un lien survolé
      // autre que l'actif, un peu soulevée (LEVE).
      const ailleurs = survol && (actifRef.current < 0 || Math.abs(S.cible - g.x[actifRef.current]) > 0.5)
      let butS = 1
      if (tenu) butS = GROS
      else {
        if (Math.abs(S.x - S.cible) > 8) butS = 1 + Math.min(0.1, Math.abs(S.v) / 9000)
        if (ailleurs) butS = Math.max(butS, LEVE)
      }
      const ks = 560
      S.vs += (-ks * (S.s - butS) - 2 * 0.55 * Math.sqrt(ks) * S.vs) * dt
      S.s += S.vs * dt
      const butY = tenu ? Math.max(-HAUT, Math.min(BAS, S.doigtY * 0.3)) : 0
      S.vy += (-620 * (S.y - butY) - 2 * 0.62 * Math.sqrt(620) * S.vy) * dt
      S.y += S.vy * dt
      peindre()
      if (!tenu && Math.abs(S.x - S.cible) < 0.4 && Math.abs(S.v) < 10 && Math.abs(S.s - butS) < 0.003 && Math.abs(S.vs) < 0.05 && Math.abs(S.y) < 0.3) {
        S.x = S.cible
        S.y = 0
        // Survol posé sur un autre lien que l'actif : la capsule y reste, sans boucle.
        if (ailleurs) {
          cancelAnimationFrame(S.raf)
          S.raf = 0
          S.v = 0
          S.s = butS
          S.vs = 0
          peindre()
          return
        }
        return arreter()
      }
      S.raf = requestAnimationFrame(boucle)
    },
    [arreter, peindre, survol],
  )

  const demarrer = useCallback(
    (simpleAussi: boolean) => {
      const S = st.current
      S.simple = simpleAussi
      setSimple(simpleAussi)
      setBouge(true)
      if (!simpleAussi && !S.raf) {
        S.tPrec = 0
        S.raf = requestAnimationFrame(boucle)
      }
    },
    [boucle],
  )

  // À l'arrivée sur la page (ou au changement d'onglet), la bulle reprend le mouvement commencé.
  useLayoutEffect(() => {
    const S = st.current
    const r = reprises[mode]
    reprises[mode] = null
    if (actif < 0) return
    S.geo = mesurer()
    if (!S.geo) return
    S.cible = S.geo.x[actif]
    const reprendre = S.reprendre
    S.reprendre = false
    if (S.raf) return
    if (r && performance.now() - r.le < 1500 && mouvementLibre()) {
      S.x = r.x
      S.v = r.v
      S.s = r.s
      S.vs = 0
      S.doigt = null
      demarrer(false)
    } else if (reprendre && mouvementLibre()) {
      // Mouvement interrompu par un démontage aussitôt suivi d'un remontage (mode strict de React en
      // développement) : il repart d'où il était, au lieu de laisser la bulle figée.
      S.tPrec = 0
      S.raf = requestAnimationFrame(boucle)
    } else S.x = S.cible
    // La fonction de mesure lit le sélecteur des liens, fixe pour une barre donnée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, demarrer, boucle])
  useLayoutEffect(() => {
    const S = st.current
    return () => {
      if (!S.raf) return
      cancelAnimationFrame(S.raf)
      S.raf = 0
      S.reprendre = true
    }
  }, [])

  const lacher = (annule: boolean) => {
    const S = st.current
    const g = S.geo
    S.glisse = false
    S.pointeur = -1
    if (!g) return
    if (S.simple) {
      const i = plusProche(g, S.x + largeurA(g, S.x) / 2)
      S.doigt = null
      setBouge(false)
      if (!annule && i !== actif) naviguer(chemins[i])
      return
    }
    // Élan : la bulle lancée va un peu plus loin que le doigt.
    // Seuls les mouvements des 120 dernières ms comptent : un doigt (ou une souris) arrêté avant de lâcher ne lance pas.
    const ech = S.echant.filter(([t]) => t >= performance.now() - 120)
    const [t0, xa] = ech[0] ?? [0, 0]
    const [t1, xb] = ech[ech.length - 1] ?? [0, 0]
    const vDoigt = t1 > t0 ? ((xb - xa) / (t1 - t0)) * 1000 : 0
    S.doigt = null
    // Élan projeté : grands écrans (liens larges, souris rapide), 48 px au plus, pour se caler sur le lien visé.
    const elan = survol ? Math.max(-48, Math.min(48, vDoigt * 0.08)) : vDoigt * 0.08
    const i = annule ? Math.max(0, actif) : plusProche(g, S.x + largeurA(g, S.x) / 2 + elan)
    S.cible = g.x[i]
    S.v = S.v * 0.6 + vDoigt * 0.4
    if (!annule && i !== actif) {
      reprises[mode] = { x: S.x, v: S.v, s: S.s, le: performance.now() }
      naviguer(chemins[i])
    }
  }

  const props = {
    ref: nav,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !e.isPrimary) return
      const S = st.current
      S.pointeur = e.pointerId
      S.depart = e.clientX
      S.departY = e.clientY
      S.glisse = false
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const S = st.current
      if (e.pointerId !== S.pointeur) return
      const n = nav.current!
      const lx = e.clientX - n.getBoundingClientRect().left
      if (!S.glisse) {
        const dx = e.clientX - S.depart
        if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(e.clientY - S.departY)) return
        S.geo = mesurer()
        if (!S.geo) return
        S.glisse = true
        try {
          n.setPointerCapture(e.pointerId)
        } catch {
          /* pointeur déjà relâché */
        }
        const g = S.geo
        // Bulle déjà visible (grands écrans : posée sur le lien survolé) : on la saisit là où elle est.
        if (!S.raf && !bougeRef.current) S.x = actif >= 0 ? g.x[actif] : lx - g.w[0] / 2
        const dep = S.depart - n.getBoundingClientRect().left
        const wb = largeurA(g, S.x)
        // Saisie sur la bulle : elle garde le point de saisie ; ailleurs, elle vient sous le doigt.
        S.prise = dep >= S.x && dep <= S.x + wb ? dep - S.x : wb / 2
        S.echant = []
        demarrer(!mouvementLibre())
      }
      S.echant = [...S.echant.slice(-5), [performance.now(), lx]]
      if (S.simple) {
        const g = S.geo!
        S.x = g.x[plusProche(g, lx)]
        S.s = 1
        peindre()
      } else {
        S.doigt = lx
        S.doigtY = e.clientY - S.departY
      }
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const S = st.current
      if (e.pointerId !== S.pointeur) return
      if (S.glisse) {
        S.annulerClic = true
        window.setTimeout(() => (st.current.annulerClic = false), 60)
        lacher(false)
      }
      S.pointeur = -1
    },
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      const S = st.current
      if (e.pointerId !== S.pointeur) return
      if (S.glisse) lacher(true)
      S.pointeur = -1
    },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      const S = st.current
      if (S.annulerClic) {
        e.preventDefault()
        e.stopPropagation()
        S.annulerClic = false
        return
      }
      // Toucher un autre onglet : la bulle part de là où elle est.
      const a = (e.target as Element).closest(lien)
      const i = a ? [...nav.current!.querySelectorAll(':scope > ' + lien)].indexOf(a) : -1
      if (i >= 0 && i !== actif && actif >= 0 && mouvementLibre()) {
        const g = S.geo ?? mesurer()
        if (g) reprises[mode] = { x: S.raf ? S.x : g.x[actif], v: S.raf ? S.v : 0, s: S.s, le: performance.now() }
      }
    },
    // Un lien tiré à la souris ne part pas en glisser-déposer : c'est la bulle qu'on tire.
    onDragStart: (e: DragEvent<HTMLElement>) => e.preventDefault(),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const tabs = [...nav.current!.querySelectorAll<HTMLElement>(':scope > ' + lien)]
      const i = tabs.indexOf(document.activeElement as HTMLElement)
      if (i < 0) return
      const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
      if (j < 0) return
      e.preventDefault()
      tabs[j].focus()
    },
  }

  // Survol : la capsule vise le lien i (ou revient à l'actif, i = -1 sans lien actif : elle disparaît).
  const viser = (i: number) => {
    const S = st.current
    const g = mesurer()
    if (!g) return
    S.geo = g
    if (i < 0) {
      cancelAnimationFrame(S.raf)
      S.raf = 0
      setBouge(false)
      return
    }
    const deja = bouge || S.raf
    if (!deja) S.x = actif >= 0 ? g.x[actif] : g.x[i]
    S.cible = g.x[i]
    if (!mouvementLibre()) {
      // Animations réduites : pas de glisse, la bulle simple (sans verre) se pose directement.
      S.x = S.cible
      S.s = 1
      if (i === actif) setBouge(false)
      else {
        S.simple = true
        setSimple(true)
        setBouge(true)
        peindre()
      }
      return
    }
    if (i === actif && !deja) return
    S.simple = false
    setSimple(false)
    setBouge(true)
    if (!S.raf) {
      S.tPrec = 0
      S.raf = requestAnimationFrame(boucle)
    }
  }
  const indexDe = (el: EventTarget | null) => {
    const a = el instanceof Element ? el.closest(lien) : null
    return a && nav.current ? [...nav.current.querySelectorAll(':scope > ' + lien)].indexOf(a) : -1
  }
  // Grands écrans : la bulle suit le survol, et on peut aussi la saisir et la faire glisser (souris, trackpad,
  // écran tactile), comme sur le téléphone. Le bouton « Plus » et son menu ne la saisissent pas.
  const propsSurvol = {
    ref: nav,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if ((e.target as Element).closest('.hn-plus')) return
      props.onPointerDown(e)
    },
    onPointerUp: props.onPointerUp,
    onPointerCancel: props.onPointerCancel,
    onDragStart: props.onDragStart,
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const S = st.current
      if (e.pointerId === S.pointeur) {
        props.onPointerMove(e)
        if (S.glisse) return
      }
      if (e.pointerType !== 'mouse') return
      const i = indexDe(e.target)
      const g = st.current.geo
      if (i < 0 || (!bouge && i === actif) || (bouge && g && Math.abs(st.current.cible - g.x[i]) < 0.5)) return
      viser(i)
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' || st.current.glisse || (nav.current?.contains(document.activeElement) && focusClavier(document.activeElement))) return
      viser(actif)
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      // Focus du clavier seulement : un lien pressé à la souris prend aussi le focus, la bulle suit alors le survol.
      const i = indexDe(e.target)
      if (i >= 0 && focusClavier(e.target)) viser(i)
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      if (!nav.current?.contains(e.relatedTarget as Node | null)) viser(actif)
    },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      const S = st.current
      // Fin d'une glisse : ce n'est pas un clic (la navigation est déjà partie au lâcher).
      if (S.annulerClic) {
        e.preventDefault()
        e.stopPropagation()
        S.annulerClic = false
        return
      }
      // La page suivante reprend la bulle là où elle est.
      const i = indexDe(e.target)
      const g = S.geo ?? mesurer()
      if (i >= 0 && i !== actif && g && mouvementLibre()) reprises[mode] = { x: bouge ? S.x : actif >= 0 ? g.x[actif] : g.x[i], v: S.raf ? S.v : 0, s: 1, le: performance.now() }
    },
    onKeyDown: props.onKeyDown,
  }

  // La bulle n'existe dans la page que pendant le mouvement : au repos, la barre est celle du prototype.
  const lentille = (copie: ReactNode) =>
    bouge && (
      <span
        className={'dock-bulle' + (simple ? ' simple' : '') + (survol ? ' survol' : '')}
        aria-hidden="true"
        ref={(el) => {
          bulle.current = el
          if (el) peindre()
        }}
      >
        {!simple && (
          <span
            className="dock-loupe"
            ref={(el) => {
              loupe.current = el
              if (el) peindre()
            }}
          >
            {copie}
          </span>
        )}
        {!simple && <span className="dock-reflet" />}
      </span>
    )

  return { props: survol ? propsSurvol : props, bouge, lentille }
}
