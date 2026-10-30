// Recadrage d’une photo de la console (copie de celui de l’espace entreprise) : le Rognage du client (site/src/composants/Rognage.tsx, mêmes gestes,
// mêmes classes pf-rog), étendu à deux formes :
// - « rond » : photo de profil, placée dans le cercle, rendue en carré de 512 px (comme le client) ;
// - « couverture » : bandeau 3:1 (carte de l’entreprise, barre latérale, Paramètres), rendu en 1200 × 400 px.
// Gestes : glisser (doigt, souris), pincer, molette, curseur ; clavier : flèches (Maj : plus loin), + et −, R pour un
// quart de tour ; « Tourner », « Recadrer de nouveau », « Annuler » (Échap aussi), « Utiliser cette photo ».
// Le cadre reste toujours plein (borner). JPEG 0,85, allégé deux fois au besoin, puis refus net (« lourde »).
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export type FormeRognage = 'rond' | 'couverture'
interface Cadrage {
  x: number
  y: number
  zoom: number
  rotation: 0 | 90 | 180 | 270
}
const DEPART: Cadrage = { x: 0, y: 0, zoom: 1, rotation: 0 }
const ZOOM_MIN = 1
const ZOOM_MAX = 4
const FORMES: Record<FormeRognage, { ratio: number; sortie: [number, number]; maxOctets: number }> = {
  rond: { ratio: 1, sortie: [512, 512], maxOctets: 300 * 1024 },
  couverture: { ratio: 3, sortie: [1200, 400], maxOctets: 450 * 1024 },
}

type Dims = { w: number; h: number }
// Taille affichée de l'image tournée : elle couvre tout le cadre (W × H).
function taille(img: Dims, c: Pick<Cadrage, 'zoom' | 'rotation'>, W: number, H: number) {
  const tourne = c.rotation % 180 !== 0
  const w = tourne ? img.h : img.w
  const h = tourne ? img.w : img.h
  const echelle = Math.max(W / w, H / h) * c.zoom
  return { echelle, largeur: w * echelle, hauteur: h * echelle }
}
function borner(img: Dims, c: Cadrage, W: number, H: number): Cadrage {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom))
  const t = taille(img, { zoom, rotation: c.rotation }, W, H)
  const mx = Math.max(0, (t.largeur - W) / 2)
  const my = Math.max(0, (t.hauteur - H) / 2)
  return { ...c, zoom, x: Math.min(mx, Math.max(-mx, c.x)), y: Math.min(my, Math.max(-my, c.y)) }
}
const octets = (d: string) => Math.ceil(((d.length - d.indexOf(',') - 1) * 3) / 4)
function rogner(img: HTMLImageElement, c: Cadrage, W: number, H: number, forme: FormeRognage): string {
  const { sortie, maxOctets } = FORMES[forme]
  const [n, m] = sortie
  const k = n / W
  const dims = { w: img.naturalWidth, h: img.naturalHeight }
  const { echelle } = taille(dims, c, W, H)
  const toile = document.createElement('canvas')
  toile.width = n
  toile.height = m
  const ctx = toile.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, n, m)
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(n / 2 + c.x * k, m / 2 + c.y * k)
  ctx.rotate((c.rotation * Math.PI) / 180)
  ctx.scale(echelle * k, echelle * k)
  ctx.drawImage(img, -dims.w / 2, -dims.h / 2)
  for (const q of [0.85, 0.72, 0.6]) {
    const d = toile.toDataURL('image/jpeg', q)
    if (octets(d) <= maxOctets) return d
  }
  throw new Error('lourde')
}

export function Rognage(p: { img: HTMLImageElement; forme?: FormeRognage; annuler: () => void; utiliser: (photo: string) => void }) {
  const { t, animationsReduites } = usePreferences()
  const { img, annuler, utiliser } = p
  const forme = p.forme ?? 'rond'
  const { ratio } = FORMES[forme]
  const dims = { w: img.naturalWidth, h: img.naturalHeight }
  const cadre = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(0)
  const H = W / ratio
  const [c, setC] = useState<Cadrage>(DEPART)
  const [glisse, setGlisse] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const pince = useRef<{ dist: number; zoom: number } | null>(null)
  const poser = (f: (c: Cadrage) => Cadrage) => setC((v) => borner(dims, f(v), W, H))

  useEffect(() => {
    const el = cadre.current
    if (!el) return
    const mesurer = () => setW(el.clientWidth)
    mesurer()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (W) setC((v) => borner(dims, v, W, W / ratio))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W])
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
      utiliser(rogner(img, c, W, H, forme))
    } catch {
      setErreur('Cette photo reste trop lourde même allégée : choisissez-en une autre, moins détaillée.')
    }
  }

  const { echelle } = taille(dims, c, W || 1, H || 1)
  const pct = Math.round(((c.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100)
  const titre = forme === 'couverture' ? 'Recadrer la couverture' : 'Recadrer ma photo'
  return (
    <>
      <div className="veil" onClick={annuler} />
      <div className="sheet long" data-forme={forme === 'couverture' ? 'large' : undefined} role="dialog" aria-modal="true" aria-label={t(titre)}>
        <div className="grab" />
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t(titre)}
        </h2>
        <p className="pg-s">{t(forme === 'couverture' ? 'Faites glisser la photo dans le bandeau ; pincez ou utilisez le curseur pour zoomer.' : 'Faites glisser la photo pour placer votre visage dans le cercle ; pincez ou utilisez le curseur pour zoomer.')}</p>
        <div
          ref={cadre}
          className={'pf-rog' + (forme === 'couverture' ? ' vd-rog-couv' : '')}
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
          {W > 0 && (
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
        <div className={'pf-rog-zoom' + (forme === 'couverture' ? ' vd-rog-couv-z' : '')}>
          <button type="button" className="ibtn" aria-label={t('Dézoomer')} onClick={() => poser((v) => ({ ...v, zoom: v.zoom - 0.25 }))}>
            <Icone nom="minus" taille={18} />
          </button>
          <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={c.zoom} aria-label={t('Zoom')} aria-valuetext={pct + ' %'} onChange={(e) => poser((v) => ({ ...v, zoom: Number(e.target.value) }))} />
          <button type="button" className="ibtn" aria-label={t('Zoomer')} onClick={() => poser((v) => ({ ...v, zoom: v.zoom + 0.25 }))}>
            <Icone nom="zoom-in" taille={18} />
          </button>
        </div>
        <div className="pf-rog-act">
          <button type="button" className="btn secondary sm" onClick={tourner}>
            <Icone nom="rotate-cw" taille={18} />
            <span>{t('Tourner')}</span>
          </button>
          <button type="button" className="btn secondary sm" onClick={() => (setC(DEPART), setErreur(null))}>
            <Icone nom="undo-2" taille={18} />
            <span>{t('Recadrer de nouveau')}</span>
          </button>
        </div>
        {erreur && (
          <div className="note red" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(erreur)}</div>
          </div>
        )}
        <div className="mt14">
          <button type="button" className="btn primary" onClick={valider}>
            <Icone nom="check" taille={18} />
            <span>{t('Utiliser cette photo')}</span>
          </button>
        </div>
        <div className="mt10">
          <button type="button" className="btn ghost" onClick={annuler}>
            <span>{t('Annuler')}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="keyboard" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Au clavier : flèches pour déplacer, + et − pour zoomer, R pour tourner.')}</span>
        </div>
      </div>
    </>
  )
}
