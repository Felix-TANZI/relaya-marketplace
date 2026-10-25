// Outils communs aux écrans PR-08 (Notifications, Messagerie, Aide et leurs pages ajoutées) : états de lecture
// (chargement, erreur), heure relative comme le prototype (« 09:48 », « hier », « ven. »), texte d'un modèle dans la
// langue choisie, photo prise par l'appareil photo de l'application (jamais la galerie : capture arrière) et compressée
// sous PHOTO-MAX-KO avant envoi (OFF-04, MSG-04).
import { useRef, useState } from 'react'
import { PARAMETRES } from '../../calculs/registre'
import { jourDe } from '../../calculs/temps'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { Texte } from '../../donnees/domaines/notifications'
import { heure } from '../../i18n/temps'
import { usePreferences, type Langue } from '../../preferences'

/** Texte d'un modèle du serveur (français et anglais) dans la langue choisie. */
export function useTexte(): (x: Texte | null | undefined) => string {
  const { langue } = usePreferences()
  return (x) => (x ? x[langue] : '')
}

const COURTS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const MOIS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }

/** Heure d'une notification ou d'un fil, comme le prototype : aujourd'hui « 09:48 », hier « hier », cette semaine
 * « ven. », sinon « 2 oct. ». */
export function quand(t: number, maintenant: number, langue: Langue): string {
  const j = jourDe(t)
  if (j === jourDe(maintenant)) {
    const d = new Date(t + 3600_000)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }
  if (j === jourDe(maintenant - 86_400_000)) return langue === 'en' ? 'yesterday' : 'hier'
  const d = new Date(t + 3600_000)
  if (maintenant - t < 6 * 86_400_000) return COURTS[langue][d.getUTCDay()]
  return langue === 'en' ? `${d.getUTCDate()} ${MOIS.en[d.getUTCMonth()]}` : `${d.getUTCDate()} ${MOIS.fr[d.getUTCMonth()]}`
}

/** « 08:12 » pour une bulle (heure de Yaoundé), avec le jour s'il n'est pas aujourd'hui. */
export function heureBulle(t: number, maintenant: number, langue: Langue): string {
  const q = quand(t, maintenant, langue)
  return jourDe(t) === jourDe(maintenant) ? q : `${q} ${heure(t, langue)}`
}

export function Chargement({ lignes = 3 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="pr08-squelette" role="status" aria-busy="true" aria-label={t('Chargement…')}>
      {Array.from({ length: lignes }, (_, i) => (
        <i key={i} aria-hidden="true" />
      ))}
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="r-vide pr08-etat" role="alert">
      <div className="r-vide-i r-rouge">
        <Icone nom="r-reseau" taille={28} />
      </div>
      <h2>{t('Lecture impossible')}</h2>
      <p>{t('Le serveur ne répond pas. Vos messages et vos opérations en attente sont gardés sur le téléphone.')}</p>
      <button type="button" className="r-btn r-second" onClick={relire} style={{ marginTop: 16 }}>
        <Icone nom="refresh-cw" taille={18} />
        {t('Réessayer')}
      </button>
    </div>
  )
}

const octets = (d: string) => Math.ceil(((d.length - d.indexOf(',') - 1) * 3) / 4)

/** Compresse une photo sur l'appareil sous maxKo (OFF-04) ; jamais gardée dans la galerie. */
export function compresser(f: File, maxKo: number): Promise<string> {
  return new Promise((ok, ko) => {
    if (!f.type.startsWith('image/')) return ko(new Error('type'))
    const u = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(u)
      for (const cote of [1280, 960, 720, 480]) {
        const k = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement('canvas')
        c.width = Math.max(1, Math.round(img.naturalWidth * k))
        c.height = Math.max(1, Math.round(img.naturalHeight * k))
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        for (const q of [0.8, 0.65, 0.5]) {
          const d = c.toDataURL('image/jpeg', q)
          if (octets(d) <= maxKo * 1024) return ok(d)
        }
      }
      ko(new Error('lourde'))
    }
    img.onerror = () => (URL.revokeObjectURL(u), ko(new Error('lecture')))
    img.src = u
  })
}

/** Bouton « photo » : ouvre l'appareil photo (capture arrière), compresse, rend la photo prise. */
export function usePrisePhoto(prise: (photo: string) => void) {
  const { t } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const lire = async (f: File | undefined) => {
    if (!f) return
    setErreur(null)
    setOccupe(true)
    try {
      prise(await compresser(f, PARAMETRES.relais.photoMaxKo))
      signal('toucher')
    } catch (e) {
      setErreur(t(e instanceof Error && e.message === 'type' ? 'Ce fichier n’est pas une photo. Reprenez-la avec l’appareil photo.' : 'Cette photo ne se lit pas. Reprenez-la.'))
      signal('erreur')
    } finally {
      setOccupe(false)
      if (champ.current) champ.current.value = ''
    }
  }
  const input = <input ref={champ} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} aria-hidden="true" onChange={(e) => void lire(e.target.files?.[0])} />
  return { ouvrir: () => champ.current?.click(), input, erreur, occupe }
}
