// Visionneuse des photos de preuve (ENT-P16, motif M18) : la photo telle que reçue (aucune retouche : RG-R121), en
// grand, zoom par boutons, molette, double toucher et pincer (deux doigts), déplacement quand elle est agrandie ;
// l'heure d'origine (téléphone), l'heure du serveur, le lieu et l'étiquette restent incrustés par-dessus, à toute
// taille. Clavier : ← → photo précédente / suivante, + − 0 pour le zoom, Échap pour fermer.
import { useEffect, useRef, useState, type PointerEvent as PE } from 'react'
import { Icone } from '../../composants/Icone'
import { Px } from '../../composants/prototype'
import { usePreferences } from '../../preferences'
import { useHeure, useJour } from '../ENT-05/commun'
import { Photo, type SujetPhoto } from './Photo'

export interface PhotoVue {
  id: string
  sujet: SujetPhoto
  titre: string
  le: number | null
  recuLe: number | null
  lieu: string
  etiquette: string | null
  etat: 'ok' | 'probleme'
}

const MIN = 1
const MAX = 5
const borne = (z: number) => Math.min(MAX, Math.max(MIN, z))

export function Visionneuse({ photos, id, aller, fermer }: { photos: PhotoVue[]; id: string; aller(id: string): void; fermer(): void }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const k = Math.max(0, photos.findIndex((p) => p.id === id))
  const p = photos[k]
  const [zoom, setZoom] = useState(1)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)
  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const pince = useRef<{ d: number; z: number } | null>(null)
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const fermerRef = useRef<HTMLButtonElement>(null)

  const regler = (z: number) => {
    const n = borne(z)
    setZoom(n)
    if (n === 1) (setDx(0), setDy(0))
  }
  useEffect(() => {
    regler(1)
  }, [id])
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null
    fermerRef.current?.focus()
    return () => avant?.focus?.()
  }, [])
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), fermer())
      else if (e.key === 'ArrowRight' && k < photos.length - 1) aller(photos[k + 1].id)
      else if (e.key === 'ArrowLeft' && k > 0) aller(photos[k - 1].id)
      else if (e.key === '+' || e.key === '=') setZoom((z) => borne(z + 0.5))
      else if (e.key === '-') regler(zoom - 0.5)
      else if (e.key === '0') regler(1)
    }
    window.addEventListener('keydown', f, true)
    return () => window.removeEventListener('keydown', f, true)
  })
  if (!p) return null

  const bas = (e: PE<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...doigts.current.values()]
    if (pts.length === 2) pince.current = { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: zoom }
    else glisse.current = { x: e.clientX, y: e.clientY, dx, dy }
  }
  const bouge = (e: PE<HTMLDivElement>) => {
    if (!doigts.current.has(e.pointerId)) return
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...doigts.current.values()]
    if (pts.length === 2 && pince.current) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      regler((pince.current.z * d) / Math.max(1, pince.current.d))
    } else if (glisse.current && zoom > 1) {
      setDx(glisse.current.dx + e.clientX - glisse.current.x)
      setDy(glisse.current.dy + e.clientY - glisse.current.y)
    }
  }
  const haut = (e: PE<HTMLDivElement>) => {
    doigts.current.delete(e.pointerId)
    if (doigts.current.size < 2) pince.current = null
    if (doigts.current.size === 0) glisse.current = null
  }
  const incruste = [p.le ? tf('Prise à {h} le {j} (téléphone)', { h: h(p.le), j: jour(p.le) }) : null, p.recuLe ? tf('reçue à {h} (serveur)', { h: h(p.recuLe) }) : null].filter(Boolean).join(' · ')

  return (
    <div className="lv-vis" role="dialog" aria-modal="true" aria-label={tf('Photo {k} sur {n} : {t}', { k: k + 1, n: photos.length, t: p.titre })}>
      <div className="lv-vis-t">
        <div className="grow">
          <b>{p.titre}</b>
          <span>{tf('{k} sur {n}', { k: k + 1, n: photos.length })}</span>
        </div>
        <div className="lv-vis-z" role="group" aria-label={t('Zoom')}>
          <button type="button" className="btn ghost sm" onClick={() => regler(zoom - 0.5)} disabled={zoom <= MIN} aria-label={t('Réduire')}>
            <Icone nom="minus" taille={18} />
          </button>
          <button type="button" className="btn ghost sm lv-vis-pct" onClick={() => regler(1)} aria-label={t('Taille réelle')}>
            {Math.round(zoom * 100)} %
          </button>
          <button type="button" className="btn ghost sm" onClick={() => regler(zoom + 0.5)} disabled={zoom >= MAX} aria-label={t('Agrandir')}>
            <Icone nom="zoom-in" taille={18} />
          </button>
        </div>
        <button ref={fermerRef} type="button" className="btn secondary sm" onClick={fermer} aria-label={t('Fermer la visionneuse')}>
          <Icone nom="x" taille={18} />
        </button>
      </div>
      <div
        className="lv-vis-scene"
        onPointerDown={bas}
        onPointerMove={bouge}
        onPointerUp={haut}
        onPointerCancel={haut}
        onWheel={(e) => regler(zoom - Math.sign(e.deltaY) * 0.25)}
        onDoubleClick={() => regler(zoom > 1 ? 1 : 2.5)}
        style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
      >
        <Px className="lv-vis-photo">
          <div style={{ transform: `translate(${dx}px, ${dy}px) scale(${zoom})` }} data-zoom={zoom}>
            <Photo sujet={p.sujet} le={p.le} recuLe={p.recuLe} lieu={p.lieu} etiquette={p.etiquette} etat={p.etat} />
          </div>
        </Px>
        <div className="lv-vis-inc" aria-live="polite">
          <span>
            <Icone nom="clock" taille={14} /> {incruste || t('Heure inconnue')}
          </span>
          <span>
            <Icone nom="map-pin" taille={14} /> {p.lieu}
            {p.etiquette && <> · {p.etiquette}</>}
          </span>
        </div>
      </div>
      <div className="lv-vis-b">
        <button type="button" className="btn secondary" onClick={() => aller(photos[k - 1].id)} disabled={k === 0}>
          <Icone nom="chevron-left" taille={18} />
          {t('Précédente')}
        </button>
        <span className="lv-vis-aide">{t('Pincez ou utilisez la molette pour zoomer ; aucune retouche possible.')}</span>
        <button type="button" className="btn secondary" onClick={() => aller(photos[k + 1].id)} disabled={k >= photos.length - 1}>
          {t('Suivante')}
          <Icone nom="chevron-right" taille={18} />
        </button>
      </div>
    </div>
  )
}
