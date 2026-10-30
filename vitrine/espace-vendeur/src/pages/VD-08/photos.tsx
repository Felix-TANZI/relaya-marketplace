// Photos réelles sur le téléphone (PHO-01 à PHO-03) : contrôle de taille (800 × 800 px au moins), allègement avant
// l'envoi (côté long 1 600 px, JPEG 0,8 : COMPRESSION_COTE_PX, COMPRESSION_JPEG_Q), vignette gardée sur l'appareil,
// heure et lieu de la prise. En API, la photo allégée est envoyée (POST /offers/{id}/photos) ; la démonstration garde
// sa vignette (le poids allégé réel est noté, pour « 6,3 Mo → 540 Ko »).
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { PhotoPrise, Reglages } from '../../donnees/domaines/offres'
import { usePreferences } from '../../preferences'
import { Bouton } from './commun'

export interface Cadre {
  x: number
  y: number
  cote: number // carré, en px de l'image source
}

const VIGNETTE = 480

function versBlob(toile: HTMLCanvasElement, qualite: number): Promise<Blob | null> {
  return new Promise((ok) => toile.toBlob((b) => ok(b), 'image/jpeg', qualite))
}

/** Position de la prise (PHO-03), si l'appareil la donne vite ; sinon null (rien n'est inventé). */
export function positionDeLaPrise(): Promise<PhotoPrise['position']> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null)
    const fin = window.setTimeout(() => ok(null), 4000)
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => (window.clearTimeout(fin), ok({ lat: p.coords.latitude, lon: p.coords.longitude })),
        () => (window.clearTimeout(fin), ok(null)),
        { timeout: 4000, maximumAge: 120_000 },
      )
    } catch {
      window.clearTimeout(fin)
      ok(null)
    }
  })
}

/** Image (ou zone carrée) → photo allégée prête à envoyer ; « petite » sous 800 × 800 px (rien n'est agrandi). */
export async function preparerPhoto(
  image: CanvasImageSource,
  largeur: number,
  hauteur: number,
  cadre: Cadre | null,
  r: Pick<Reglages, 'photoMinPx' | 'compression'>,
  octetsAvant: number | null,
  prise: number,
  position: PhotoPrise['position'],
): Promise<PhotoPrise | 'petite'> {
  const [sx, sy, sw, sh] = cadre ? [cadre.x, cadre.y, cadre.cote, cadre.cote] : [0, 0, largeur, hauteur]
  if (Math.round(sw) < r.photoMinPx || Math.round(sh) < r.photoMinPx) return 'petite'
  const k = Math.min(1, r.compression.cote / Math.max(sw, sh))
  const [w, h] = [Math.round(sw * k), Math.round(sh * k)]
  const toile = document.createElement('canvas')
  toile.width = w
  toile.height = h
  const ctx = toile.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h)
  const allegee = await versBlob(toile, r.compression.qualite)
  const kv = Math.min(1, VIGNETTE / Math.max(w, h))
  const vignette = document.createElement('canvas')
  vignette.width = Math.round(w * kv)
  vignette.height = Math.round(h * kv)
  vignette.getContext('2d')!.drawImage(toile, 0, 0, vignette.width, vignette.height)
  return {
    image: vignette.toDataURL('image/jpeg', 0.72),
    prise,
    largeur: w,
    hauteur: h,
    octetsAvant: octetsAvant ?? Math.round(largeur * hauteur * 0.45), // capture vidéo : poids d'une photo brute équivalente
    octetsApres: allegee?.size ?? null,
    position,
  }
}

/** Lit un fichier image choisi (galerie ou appareil photo du système) : type et poids contrôlés. */
export function lireImage(fichier: File): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(fichier.type)) return ko(new Error('type'))
    if (fichier.size > 25 * 1024 * 1024) return ko(new Error('taille'))
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => (img.naturalWidth ? ok(img) : ko(new Error('lecture')))
    img.onerror = () => (URL.revokeObjectURL(url), ko(new Error('lecture')))
    img.src = url
  })
}

/** « Choisir dans la galerie » : la photo entière, allégée ; l'heure est celle du fichier (prise), le lieu inconnu. */
export function choisirDansLaGalerie(r: Pick<Reglages, 'photoMinPx' | 'compression'>, ajouter: (p: PhotoPrise) => Promise<void>, erreur: (texte: string) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp,image/heic'
  input.onchange = async () => {
    const f = input.files?.[0]
    if (!f) return
    try {
      const img = await lireImage(f)
      const p = await preparerPhoto(img, img.naturalWidth, img.naturalHeight, null, r, f.size, f.lastModified || Date.now(), null)
      if (p === 'petite') return erreur('Moins de 800 × 800 px : choisissez une photo plus grande.')
      await ajouter(p)
    } catch (e) {
      erreur((e as Error).message === 'type' ? 'Choisissez une photo (JPG, PNG, WebP ou HEIC).' : (e as Error).message === 'taille' ? 'Photo trop lourde : 25 Mo au plus.' : 'Cette photo ne s’ouvre pas sur ce téléphone : prenez-la avec la caméra.')
    }
  }
  input.click()
}

/** Aucun brouillon en cours (étape ouverte sans « ?b= » ou brouillon supprimé). */
export function SansBrouillon({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="empty">
          <div className="ei">
            <Icone nom="package-search" taille={24} />
          </div>
          <h3>{t('Aucune offre en cours')}</h3>
          <p>{t('Commencez par chercher le produit au catalogue : un geste suffit s’il y est déjà.')}</p>
        </div>
        <Bouton classe="primary" icone="plus" vers={chemin('offre1')}>
          {t('Ajouter un produit')}
        </Bouton>
      </div>
    </Ecran>
  )
}
