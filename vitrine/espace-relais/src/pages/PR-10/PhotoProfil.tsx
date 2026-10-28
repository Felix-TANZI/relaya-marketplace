// Photo de profil du membre connecté (page ajoutée à Paramètres, feuille « ?sheet=photo ») : chaque membre change la
// sienne, gérant comme employé. Deux sources : l'appareil photo (frontal) ou une image du téléphone — la galerie est
// permise ici, ce n'est pas une preuve (CAM-04 ne vise que les photos de preuve). Recadrage carré dans un cercle :
// glisser pour déplacer, curseur (ou flèches du clavier) pour zoomer, puis « Enregistrer » : l'image est réduite sur
// le téléphone à PHOTO_COTE px de côté (JPEG) avant l'envoi. « Retirer la photo » rend les initiales. La photo se voit
// dans l'en-tête, le Menu, les Paramètres et Mon équipe ; jamais des clients.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as PE } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import type { Membre } from '../../donnees/domaines/session'
import { usePreferences } from '../../preferences'
import { Annonce, type useGesteRelais } from './commun'

/** Côté de l'image enregistrée (px) et du cadre de recadrage à l'écran (px). */
const PHOTO_COTE = 320
const CADRE = 240
const ZOOM_MAX = 3

/** Photo ou initiales d'un membre (même rond que le prototype : la classe du bloc reste celle de l'écran). */
export function Avatar({ m, className }: { m: Pick<Membre, 'photo' | 'initiales'>; className: string }) {
  return <span className={className + (m.photo ? ' p10-avatar-photo' : '')}>{m.photo ? <img src={m.photo} alt="" /> : m.initiales}</span>
}

interface Source {
  url: string
  l: number
  h: number
}

export function FeuillePhoto({ m, fermer, g }: { m: Membre; fermer: () => void; g: ReturnType<typeof useGesteRelais> }) {
  const { t } = usePreferences()
  const [src, setSrc] = useState<Source | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const galerie = useRef<HTMLInputElement>(null)
  useEffect(() => () => void (src && URL.revokeObjectURL(src.url)), [src])

  const lire = (f: File | undefined) => {
    setRefus(null)
    if (!f) return
    if (!f.type.startsWith('image/')) return setRefus(t('Ce fichier n’est pas une image : choisissez une photo.'))
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setSrc({ url, l: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => (URL.revokeObjectURL(url), setRefus(t('Image illisible : essayez une autre photo.')))
    img.src = url
  }
  const enregistrer = (photo: string | null) =>
    g.faire('reglage', 'photo-profil', (s, o) => s.relais.changerPhoto(photo, o), { ok: photo ? 'Photo de profil enregistrée.' : 'Photo retirée : vos initiales s’affichent.', file: 'Hors connexion : la photo partira au retour du réseau.' }).then((ok) => ok && fermer())

  return (
    <Feuille ouverte fermer={fermer} titre={t('Photo de profil')} classe="p10-feuille">
      <h2>{t('Photo de profil')}</h2>
      <input ref={camera} type="file" accept="image/*" capture="user" hidden data-test="photo-camera" onChange={(e) => (lire(e.target.files?.[0]), (e.target.value = ''))} />
      <input ref={galerie} type="file" accept="image/*" hidden data-test="photo-galerie" onChange={(e) => (lire(e.target.files?.[0]), (e.target.value = ''))} />
      {src ? (
        <Recadrage src={src} enCours={g.enCours} enregistrer={(x) => void enregistrer(x)} autre={() => setSrc(null)} />
      ) : (
        <div className="p10-col">
          <div className="p10-photo-apercu">
            <Avatar m={m} className="p-2wt0am" />
          </div>
          <p className="p-81u2s6 p10-txt">{t('Vue par votre équipe et par BelivaY, jamais par les clients. Un visage net, de face, aide l’agent BelivaY qui vous appelle.')}</p>
          <button type="button" className="p-ncx7qc" onClick={() => camera.current?.click()}>
            <Icone nom="r-appareil-photo" taille={18} />
            {t('Prendre une photo')}
          </button>
          <button type="button" className="p-rbzobc" onClick={() => galerie.current?.click()}>
            <Icone nom="image" taille={18} className="p-emic6i" />
            {t('Choisir une image du téléphone')}
          </button>
          {m.photo && (
            <button type="button" className="p-rbzobc" disabled={g.enCours} onClick={() => void enregistrer(null)}>
              <Icone nom="trash-2" taille={18} className="p-emic6i" />
              {t('Retirer la photo')}
            </button>
          )}
          {refus && <Annonce message={{ ton: 'ko', texte: refus }} />}
          <Annonce message={g.message} />
          <button type="button" className="p-rbzobc" onClick={fermer}>
            {t('Fermer')}
          </button>
        </div>
      )}
    </Feuille>
  )
}

/** Recadrage carré : l'image couvre toujours le cadre (jamais de bord vide) ; glisser, zoomer, flèches du clavier. */
function Recadrage({ src, enCours, enregistrer, autre }: { src: Source; enCours: boolean; enregistrer: (photo: string) => void; autre: () => void }) {
  const { t, tf } = usePreferences()
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const glisse = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const echelle = (CADRE / Math.min(src.l, src.h)) * zoom
  const L = src.l * echelle
  const H = src.h * echelle
  // Décalage permis : l'image ne découvre jamais le cadre.
  const borner = (p: { x: number; y: number }, l = L, h = H) => ({ x: Math.max(-(l - CADRE) / 2, Math.min((l - CADRE) / 2, p.x)), y: Math.max(-(h - CADRE) / 2, Math.min((h - CADRE) / 2, p.y)) })
  const zoomer = (z: number) => {
    const n = Math.max(1, Math.min(ZOOM_MAX, z))
    const e = (CADRE / Math.min(src.l, src.h)) * n
    setZoom(n)
    setPos((p) => borner(p, src.l * e, src.h * e))
  }
  const bas = (e: PE<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    glisse.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
  }
  const bouge = (e: PE<HTMLDivElement>) => {
    const d = glisse.current
    if (d) setPos(borner({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }))
  }
  const fini = () => void (glisse.current = null)
  const clavier = (e: KeyboardEvent) => {
    const pas = 12
    const v = ({ ArrowLeft: [pas, 0], ArrowRight: [-pas, 0], ArrowUp: [0, pas], ArrowDown: [0, -pas] } as Record<string, [number, number]>)[e.key]
    if (v) {
      e.preventDefault()
      setPos((p) => borner({ x: p.x + v[0], y: p.y + v[1] }))
    }
    if (e.key === '+' || e.key === '=') zoomer(zoom + 0.2)
    if (e.key === '-') zoomer(zoom - 0.2)
  }
  const gauche = (CADRE - L) / 2 + pos.x
  const haut = (CADRE - H) / 2 + pos.y
  const valider = () => {
    const c = document.createElement('canvas')
    c.width = c.height = PHOTO_COTE
    const img = new Image()
    img.onload = () => {
      const x = c.getContext('2d')
      if (!x) return
      x.drawImage(img, -gauche / echelle, -haut / echelle, CADRE / echelle, CADRE / echelle, 0, 0, PHOTO_COTE, PHOTO_COTE)
      enregistrer(c.toDataURL('image/jpeg', 0.85))
    }
    img.src = src.url
  }
  return (
    <div className="p10-col">
      <div
        className="p10-recadre"
        role="img"
        tabIndex={0}
        aria-label={tf('Recadrage de la photo, zoom {z} : glissez ou utilisez les flèches pour déplacer', { z: zoom.toFixed(1) })}
        style={{ width: CADRE, height: CADRE }}
        onPointerDown={bas}
        onPointerMove={bouge}
        onPointerUp={fini}
        onPointerCancel={fini}
        onKeyDown={clavier}
        data-zoom={zoom.toFixed(2)}
        data-x={Math.round(pos.x)}
        data-y={Math.round(pos.y)}
      >
        <img src={src.url} alt="" draggable={false} style={{ width: L, height: H, transform: `translate(${gauche}px, ${haut}px)` }} />
        <span className="p10-recadre-rond" aria-hidden="true" />
      </div>
      <label className="p-ky12xr">
        {t('ZOOM')}
        <input type="range" min={1} max={ZOOM_MAX} step={0.05} value={zoom} onChange={(e) => zoomer(Number(e.target.value))} className="p10-zoom" />
      </label>
      <p className="p-81u2s6 p10-txt">{t('Glissez la photo pour placer votre visage dans le cercle.')}</p>
      <button type="button" className="p-ncx7qc" disabled={enCours} onClick={valider}>
        {t('Enregistrer la photo')}
      </button>
      <button type="button" className="p-rbzobc" onClick={autre}>
        {t('Choisir une autre photo')}
      </button>
    </div>
  )
}
