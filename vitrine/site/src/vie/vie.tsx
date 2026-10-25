// « Vie » des espaces livreur et point relais (au niveau du client et du vendeur) : barre du haut en pastilles
// arrondies (thème : soleil ↔ lune animés ; langue : pilule FR | EN), avatar à anneau, cartes en cascade, appui qui
// s'enfonce, ombres en couches, et un relief 3D léger (≤ 4°, reflet, enfoncement à l'appui) réservé à un ou deux blocs
// importants par page — jamais sur une liste, un formulaire, un tableau ni l'écran de scan.
// Tout mouvement ne joue que si l'application l'autorise (html[data-mouv="1"] : posé par Animations, coupé par
// « Animations réduites », prefers-reduced-motion et le navigateur piloté des tests) ; sans lui, l'écran est immobile
// et identique. Couleur : celle de l'application (--vie-acc, --vie-fort : fond des pastilles actives, texte blanc AA).
import { useCallback, useRef, type CSSProperties, type PointerEvent } from 'react'
import { usePreferences } from '../preferences'

const CSS = `
.vie-rond{position:relative;flex:none;width:44px;height:44px;border-radius:999px;border:1px solid color-mix(in srgb,var(--vie-acc) 24%,transparent);background:color-mix(in srgb,var(--vie-acc) 9%,var(--card,#fff));color:var(--ink,#1c1917);display:inline-grid;place-items:center;padding:0;margin:0;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 10px -7px rgba(0,0,0,.35)}
.vie-rond:hover{background:color-mix(in srgb,var(--vie-acc) 17%,var(--card,#fff))}
.vie-rond:focus-visible{outline:3px solid var(--vie-acc);outline-offset:2px}
.vie-theme svg{position:absolute;inset:0;margin:auto}
.vie-theme .vie-soleil{color:#C77700}
html[data-theme=dark] .vie-theme .vie-soleil{color:#FFC845}
.vie-theme[data-sombre=false] .vie-soleil,.vie-theme[data-sombre=true] .vie-lune{opacity:0;transform:rotate(-90deg) scale(.4)}
.vie-langue{position:relative;flex:none;height:44px;width:50px;border-radius:999px;border:1px solid color-mix(in srgb,var(--vie-acc) 24%,transparent);background:color-mix(in srgb,var(--vie-acc) 9%,var(--card,#fff));display:inline-flex;align-items:stretch;padding:3px;margin:0;gap:0;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 10px -7px rgba(0,0,0,.35)}
.vie-langue span{flex:1;display:grid;place-items:center;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:0;color:var(--ink-2,var(--ink,#1c1917))}
.vie-langue span.on{background:var(--vie-fort);color:#fff;box-shadow:0 2px 6px -2px rgba(0,0,0,.35)}
.vie-langue:focus-visible{outline:3px solid var(--vie-acc);outline-offset:2px}
.p-hd-rang .p-hd-logo,.l-hd-rang .l-logo{flex:0 1 auto;min-width:0}
.l-hd-rang .l-logo img{max-width:100%;object-fit:contain;object-position:left center}
.p-hd-rang .p-hd-logo-img{max-width:100%;height:auto;max-height:30px}
.vie-anneau{box-shadow:0 0 0 2px var(--card,#fff),0 0 0 4px var(--vie-acc),0 6px 14px -6px color-mix(in srgb,var(--vie-acc) 70%,transparent)!important}
.vie-couches{box-shadow:0 1px 2px rgba(0,0,0,.05),0 10px 24px -14px rgba(0,0,0,.22)}
.vie-3d{position:relative;transform:perspective(900px) rotateX(var(--vie-rx,0deg)) rotateY(var(--vie-ry,0deg)) scale(var(--vie-s,1));box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 2px 4px -2px rgba(0,0,0,.25),0 14px 28px -14px rgba(0,0,0,.45),0 28px 48px -30px color-mix(in srgb,var(--vie-acc) 60%,transparent)}
@keyframes vie-monte{from{transform:translateY(10px)}to{transform:none}}
html[data-mouv="1"] .vie-rond,html[data-mouv="1"] .vie-langue{transition:transform .16s ease,background .2s ease}
html[data-mouv="1"] .vie-rond:active,html[data-mouv="1"] .vie-langue:active{transform:scale(.92)}
html[data-mouv="1"] .vie-langue span{transition:background .25s ease,color .25s ease}
html[data-mouv="1"] .vie-theme svg{transition:transform .5s cubic-bezier(.3,1.5,.5,1),opacity .3s ease}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*){animation:vie-monte .42s cubic-bezier(.2,.8,.2,1) backwards}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(2){animation-delay:.04s}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(3){animation-delay:.08s}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(4){animation-delay:.12s}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(5){animation-delay:.16s}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(6){animation-delay:.2s}
html[data-mouv="1"] :is(.vie-cascade>:not(.r-pile),.vie-cascade>.r-pile>*):nth-child(n+7){animation-delay:.24s}
html[data-mouv="1"] .vie-cascade :is(.card,.hero,.btn,.li,.livc-menu a,.p-o24hsm,.p-cevv9w):active{transform:scale(.98);transition:transform .12s ease}
html[data-mouv="1"] .vie-3d{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease;will-change:transform}
html[data-mouv="1"] .vie-3d[data-appui]{--vie-s:.985;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.25),0 8px 16px -12px rgba(0,0,0,.45)}
@media (prefers-reduced-motion:reduce){.vie-cascade *,.vie-3d,.vie-theme svg{animation:none!important;transition:none!important}}
`

/** Styles de la « vie », posés une fois par la coque ; `acc` : accent, `fort` : fond plein des pastilles actives. */
export function StylesVie({ acc, fort }: { acc: string; fort: string }) {
  return <style>{`:root{--vie-acc:${acc};--vie-fort:${fort}}` + CSS}</style>
}

const Soleil = () => (
  <svg className="vie-soleil" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity=".25" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const Lune = () => (
  <svg className="vie-lune" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" fill="currentColor" fillOpacity=".12" />
  </svg>
)

/** Bouton du thème : pastille ronde, soleil et lune qui tournent l'un vers l'autre. */
export function BoutonThemeVivant() {
  const { t, theme, setTheme } = usePreferences()
  const sombre = theme === 'dark'
  return (
    <button type="button" className="vie-rond vie-theme" data-sombre={sombre} onClick={() => setTheme(sombre ? 'light' : 'dark')} aria-label={t(sombre ? 'Thème clair' : 'Thème sombre')}>
      <Soleil />
      <Lune />
    </button>
  )
}

/** Langue : pilule segmentée FR | EN (un seul bouton de 44 px de haut, la langue active en plein). */
export function PiluleLangue() {
  const { langue, setLangue } = usePreferences()
  const en = langue === 'en'
  return (
    <button type="button" className="vie-langue" onClick={() => setLangue(en ? 'fr' : 'en')} aria-label={en ? 'Language: English. Switch to French' : 'Langue : français. Passer en anglais'}>
      <span className={en ? '' : 'on'} aria-hidden="true">
        FR
      </span>
      <span className={en ? 'on' : ''} aria-hidden="true">
        EN
      </span>
    </button>
  )
}

const mouvement = () => typeof document !== 'undefined' && document.documentElement.dataset.mouv === '1'

/** Relief 3D d'un bloc important : inclinaison au doigt (4° au plus), enfoncement à l'appui. */
export function useRelief(): { className: string; style?: CSSProperties; onPointerMove: (e: PointerEvent<HTMLElement>) => void; onPointerLeave: (e: PointerEvent<HTMLElement>) => void; onPointerDown: (e: PointerEvent<HTMLElement>) => void; onPointerUp: (e: PointerEvent<HTMLElement>) => void } {
  const cadre = useRef<number | null>(null)
  const poser = (el: HTMLElement, rx: number, ry: number) => {
    if (cadre.current) cancelAnimationFrame(cadre.current)
    cadre.current = requestAnimationFrame(() => {
      el.style.setProperty('--vie-rx', rx.toFixed(2) + 'deg')
      el.style.setProperty('--vie-ry', ry.toFixed(2) + 'deg')
    })
  }
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!mouvement()) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    poser(e.currentTarget, Math.max(-4, Math.min(4, -y * 8)), Math.max(-4, Math.min(4, x * 8)))
  }, [])
  const onPointerLeave = useCallback((e: PointerEvent<HTMLElement>) => {
    delete e.currentTarget.dataset.appui
    poser(e.currentTarget, 0, 0)
  }, [])
  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (mouvement()) e.currentTarget.dataset.appui = '1'
  }, [])
  const onPointerUp = useCallback((e: PointerEvent<HTMLElement>) => {
    delete e.currentTarget.dataset.appui
  }, [])
  return { className: ' vie-3d', onPointerMove, onPointerLeave, onPointerDown, onPointerUp }
}
