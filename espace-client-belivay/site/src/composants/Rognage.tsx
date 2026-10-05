// Rognage de la photo de profil (demande du porteur, 4 oct. 2026) : feuille du bas, aux classes du site
// (veil, sheet, pg-t, btn, note, hint-l). La photo se place dans le cercle :
// - au doigt ou à la souris (glisser), au pincement à deux doigts, à la molette ou au curseur de zoom ;
// - au clavier : flèches pour déplacer (Maj : plus loin), + et − pour zoomer, R pour un quart de tour ;
// - « Tourner », « Recadrer de nouveau » (cadrage d'origine), « Annuler » (Échap aussi), « Utiliser cette photo ».
// Le cadre reste toujours plein (borner). Rendu : carré de 512 px en JPEG (donnees/photo.ts).
// Animations réduites : le cadrage suit sans transition.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { borner, rognerPhoto, tailleAffichee, ZOOM_MAX, ZOOM_MIN, type Cadrage } from '../donnees/photo'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { Bouton, Note } from './socle'

const DEPART: Cadrage = { x: 0, y: 0, zoom: 1, rotation: 0 }

export function Rognage(p: { img: HTMLImageElement; annuler: () => void; utiliser: (photo: string) => void }) {
  const { t, animationsReduites } = usePreferences()
  const { img, annuler, utiliser } = p
  const dims = { w: img.naturalWidth, h: img.naturalHeight }
  const cadre = useRef<HTMLDivElement>(null)
  const [cote, setCote] = useState(0)
  const [c, setC] = useState<Cadrage>(DEPART)
  const [glisse, setGlisse] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const pince = useRef<{ dist: number; zoom: number } | null>(null)

  const poser = (f: (c: Cadrage) => Cadrage) => setC((v) => borner(dims, f(v), cote))

  // Taille réelle du cadre (largeur de l'écran) ; à chaque changement, le cadrage reste plein.
  useEffect(() => {
    const el = cadre.current
    if (!el) return
    const mesurer = () => setCote(el.clientWidth)
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (cote) setC((v) => borner(dims, v, cote))
  }, [cote])
  useEffect(() => {
    cadre.current?.focus()
    const echap = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && annuler()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [annuler])

  const distance = () => {
    const [a, b] = [...doigts.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const appui = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (doigts.current.size === 2) pince.current = { dist: distance(), zoom: c.zoom }
    setGlisse(true)
  }
  const bouge = (e: PointerEvent<HTMLDivElement>) => {
    const avant = doigts.current.get(e.pointerId)
    if (!avant) return
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (doigts.current.size >= 2 && pince.current) {
      const { dist, zoom } = pince.current
      const d = distance()
      if (dist > 0) poser((v) => ({ ...v, zoom: (zoom * d) / dist }))
    } else if (doigts.current.size === 1) {
      const dx = e.clientX - avant.x
      const dy = e.clientY - avant.y
      poser((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    }
  }
  const leve = (e: PointerEvent<HTMLDivElement>) => {
    doigts.current.delete(e.pointerId)
    if (doigts.current.size < 2) pince.current = null
    if (!doigts.current.size) setGlisse(false)
  }
  const molette = (e: WheelEvent<HTMLDivElement>) => poser((v) => ({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }))
  const tourner = () => poser((v) => ({ ...v, x: -v.y, y: v.x, rotation: ((v.rotation + 90) % 360) as Cadrage['rotation'] }))
  const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const pas = e.shiftKey ? 32 : 8
    const fleches: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }
    if (fleches[e.key]) {
      const [dx, dy] = fleches[e.key]
      poser((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (e.key === '+' || e.key === '=') poser((v) => ({ ...v, zoom: v.zoom + 0.1 }))
    else if (e.key === '-' || e.key === '_') poser((v) => ({ ...v, zoom: v.zoom - 0.1 }))
    else if (e.key === 'r' || e.key === 'R') tourner()
    else return
    e.preventDefault()
  }
  const valider = () => {
    try {
      utiliser(rognerPhoto(img, c, cote))
    } catch {
      setErreur('Cette photo reste trop lourde même allégée : choisis-en une autre, moins détaillée.')
    }
  }

  const { echelle } = tailleAffichee(dims, c, cote || 1)
  const pct = Math.round(((c.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100)
  return (
    <>
      <div className="veil" onClick={annuler} />
      <div className="sheet long" role="dialog" aria-modal="true" aria-label={t('Recadrer ma photo')}>
        <div className="grab" />
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t('Recadrer ma photo')}
        </h2>
        <p className="pg-s">{t('Fais glisser la photo pour placer ton visage dans le cercle ; pince ou utilise le curseur pour zoomer.')}</p>
        <div
          ref={cadre}
          className="pf-rog"
          tabIndex={0}
          role="group"
          aria-label={t('Cadre de la photo : flèches pour déplacer, + et − pour zoomer, R pour tourner')}
          onPointerDown={appui}
          onPointerMove={bouge}
          onPointerUp={leve}
          onPointerCancel={leve}
          onWheel={molette}
          onKeyDown={clavier}
          style={{ cursor: glisse ? 'grabbing' : 'grab' }}
        >
          {cote > 0 && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                width: dims.w,
                height: dims.h,
                transform: `translate(-50%, -50%) translate(${c.x}px, ${c.y}px) rotate(${c.rotation}deg) scale(${echelle})`,
                transition: glisse || animationsReduites ? 'none' : 'transform .18s ease',
              }}
            />
          )}
          <span className="pf-rog-masque" aria-hidden="true" />
        </div>
        <div className="pf-rog-zoom">
          <button type="button" className="ibtn" aria-label={t('Dézoomer')} onClick={() => poser((v) => ({ ...v, zoom: v.zoom - 0.25 }))}>
            <Icone nom="minus" taille={18} />
          </button>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={c.zoom}
            aria-label={t('Zoom')}
            aria-valuetext={pct + ' %'}
            onChange={(e) => poser((v) => ({ ...v, zoom: Number(e.target.value) }))}
          />
          <button type="button" className="ibtn" aria-label={t('Zoomer')} onClick={() => poser((v) => ({ ...v, zoom: v.zoom + 0.25 }))}>
            <Icone nom="zoom-in" taille={18} />
          </button>
        </div>
        <div className="pf-rog-act">
          <Bouton genre="secondary" sm icone="rotate-cw" onClick={tourner}>
            {t('Tourner')}
          </Bouton>
          <Bouton genre="secondary" sm icone="undo-2" onClick={() => (setC(DEPART), setErreur(null))}>
            {t('Recadrer de nouveau')}
          </Bouton>
        </div>
        {erreur && (
          <Note ton="red" icone="circle-alert">
            {t(erreur)}
          </Note>
        )}
        <div className="mt14">
          <Bouton icone="check" onClick={valider}>
            {t('Utiliser cette photo')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="ghost" onClick={annuler}>
            {t('Annuler')}
          </Bouton>
        </div>
        <div className="hint-l">
          <Icone nom="keyboard" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Au clavier : flèches pour déplacer, + et − pour zoomer, R pour tourner.')}</span>
        </div>
      </div>
    </>
  )
}
