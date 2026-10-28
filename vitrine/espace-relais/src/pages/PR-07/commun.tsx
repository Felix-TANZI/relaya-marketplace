// Pièces communes des écrans PR-07 (Constats et retours, Dossier, Fermeture exceptionnelle, Historique) :
// - Geste : origine, geste hors connexion (file), signal sonore et vibration, message du refus mot pour mot ;
// - PrisePhoto : l'appareil photo de l'APPLICATION (jamais la galerie, CT03 et v6 D15), heure incrustée, image
//   compressée sous PHOTO-MAX-KO ; sans appareil photo, une photo de démonstration (source de démonstration seulement) ;
//   l'aperçu ne vit qu'en mémoire, le temps de la visite ;
// - FeuillePin : PIN personnel du membre (GEN-09 : chaque geste qui change la garde est signé) ;
// - États de lecture : chargement, erreur (« Réessayer »), hors connexion.
// À l'intégration, PrisePhoto cédera la place à l'appareil photo commun de PR-04 (route camera) : même contrat
// (photo prise → identifiant).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { env } from '@client/config/env'
import { Feuille } from '@client/composants/Feuille'
import { PARAMETRES } from '../../calculs/registre'
import { DECALAGE_YAOUNDE_MS } from '../../calculs/temps'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { Origine, Photo } from '../../donnees/communs'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import type { SourceRelais } from '../../donnees/source'
import { ReseauRequis, geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

// ── Aperçus des photos prises (mémoire seulement) ───────────────────────────────────────────────────────────────
const APERCUS = new Map<string, string>()
export const apercu = (id: Photo) => APERCUS.get(id) ?? null

/** Vignette d'une photo : l'aperçu pris pendant la visite, sinon une case « photo gardée » (preuve au serveur). */
export function Vignette({ photo, legende }: { photo: Photo; legende: string }) {
  const src = apercu(photo)
  return src ? <img className="r7-vignette" src={src} alt={legende} /> : (
    <span className="r7-vignette r7-vignette-vide" role="img" aria-label={legende}>
      <Icone nom="r-appareil-photo" taille={18} />
    </span>
  )
}

// ── Geste ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Issue<T> {
  etat: 'fait' | 'en_file'
  r: T
}

/** Fait un geste métier : en ligne tout de suite, sinon en file (rejoué au retour du réseau) ; signal selon l'issue. */
export function useGeste() {
  const enLigne = useEnLigne()
  const { maintenant } = useSession()
  const [occupe, setOccupe] = useState(false)
  const faire = useCallback(
    async <T extends { ok: boolean }>(type: TypeAction, objet: string, f: (s: SourceRelais, o: Origine) => Promise<T>, options: { photos?: number; reseauRequis?: boolean } = {}): Promise<Issue<T> | null> => {
      setOccupe(true)
      try {
        const o = origine(Math.max(maintenant, Date.now()))
        const x = await geste(enLigne, type, objet, o, (s) => f(s, o), { local: true, ...options })
        signal(x.r.ok ? 'succes' : 'erreur')
        return x
      } catch (e) {
        signal('erreur')
        if (e instanceof ReseauRequis) return null
        throw e
      } finally {
        setOccupe(false)
      }
    },
    [enLigne, maintenant],
  )
  return { faire, occupe, enLigne }
}

// ── États de lecture ───────────────────────────────────────────────────────────────────────────────────────────
export function Chargement({ texte }: { texte?: string }) {
  const { t } = usePreferences()
  return (
    <div className="r7-charge" role="status" aria-live="polite">
      <span className="r7-roue" aria-hidden="true" />
      {texte ?? t('Chargement…')}
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  return (
    <div className="r-vide" role="alert">
      <div className="r-vide-i r-rouge">
        <Icone nom={enLigne ? 'r-alerte' : 'r-reseau'} taille={28} />
      </div>
      <h2>{enLigne ? t('Lecture impossible') : t('Hors connexion')}</h2>
      <p>{enLigne ? t('Les données n’ont pas pu être lues. Vos preuves et vos gestes en attente sont gardés.') : t('Ces données n’ont pas encore été gardées sur le téléphone. Elles s’afficheront au retour du réseau.')}</p>
      <button type="button" className="r-btn r-second r7-mt" onClick={relire}>
        <Icone nom="r-reseau" taille={18} />
        {t('Réessayer')}
      </button>
    </div>
  )
}

/** Message d'une issue (succès, refus, en file) annoncé aux lecteurs d'écran. */
export function Avis({ ton, children, id }: { ton: 'vert' | 'alerte' | 'rouge' | 'accent' | 'ambre'; children: ReactNode; id?: string }) {
  return (
    <div id={id} className={`r7-avis r-ton-${ton}`} role={ton === 'rouge' || ton === 'alerte' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

// ── Appareil photo de l'application ───────────────────────────────────────────────────────────────────────────
type EtatCam = 'ouverture' | 'video' | 'indisponible' | 'prise'

/** Image compressée sous PHOTO-MAX-KO (JPEG, qualité décroissante). */
function compresser(c: HTMLCanvasElement): string {
  const max = PARAMETRES.relais.photoMaxKo * 1024
  let q = 0.82
  let u = c.toDataURL('image/jpeg', q)
  while (u.length * 0.75 > max && q > 0.3) u = c.toDataURL('image/jpeg', (q -= 0.12))
  return u
}

/** Couleur d'un jeton (jetons.css) : même un dessin sur l'image ne porte aucune couleur écrite. */
const jeton = (nom: string) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim()

/** Heure et date incrustées dans l'image (preuve horodatée, CT03). */
function incruster(c: HTMLCanvasElement, texte: string) {
  const x = c.getContext('2d')!
  const h = Math.round(c.height * 0.07)
  x.fillStyle = jeton('--nuit-1')
  x.fillRect(0, c.height - h, c.width, h)
  x.fillStyle = jeton('--nuit-ink')
  x.font = `600 ${Math.round(h * 0.5)}px system-ui, sans-serif`
  x.fillText(texte, Math.round(h * 0.4), c.height - Math.round(h * 0.32))
}

export function PrisePhoto(p: { ouverte: boolean; fermer: () => void; consigne: string; prise: (photo: Photo) => void }) {
  const { t, langue } = usePreferences()
  const { maintenant } = useSession()
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [etat, setEtat] = useState<EtatCam>('ouverture')
  const { ouverte } = p

  useEffect(() => {
    if (!ouverte) return
    let vivant = true
    setEtat('ouverture')
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
    if (!md?.getUserMedia) {
      setEtat('indisponible')
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }).then(
      (s) => {
        if (!vivant) return s.getTracks().forEach((x) => x.stop())
        flux.current = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setEtat('video')
      },
      () => vivant && setEtat('indisponible'),
    )
    return () => {
      vivant = false
      flux.current?.getTracks().forEach((x) => x.stop())
      flux.current = null
    }
  }, [ouverte])

  const prendre = () => {
    const c = document.createElement('canvas')
    const v = video.current
    if (etat === 'video' && v && v.videoWidth) {
      c.width = Math.min(v.videoWidth, 1280)
      c.height = Math.round((c.width / v.videoWidth) * v.videoHeight)
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    } else {
      // Démonstration sans appareil photo : une image dessinée, marquée comme telle.
      c.width = 960
      c.height = 720
      const x = c.getContext('2d')!
      x.fillStyle = jeton('--heros-3')
      x.fillRect(0, 0, 960, 720)
      x.strokeStyle = jeton('--acc')
      x.lineWidth = 6
      x.strokeRect(160, 140, 640, 420)
      x.fillStyle = jeton('--heros-ink')
      x.font = '600 40px system-ui, sans-serif'
      x.fillText(p.consigne.slice(0, 36), 60, 90)
      x.fillText('Démonstration', 60, 640)
    }
    const t0 = Math.max(maintenant, Date.now())
    incruster(c, `${jourLong(t0, langue)} · ${heure(t0, langue)}`)
    const id = 'ph-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(t0)).slice(0, 13)
    APERCUS.set(id, compresser(c))
    signal('succes')
    p.prise(id)
    p.fermer()
  }

  const demo = env.source !== 'api'
  return (
    <Feuille ouverte={ouverte} fermer={p.fermer} titre={t('Appareil photo')}>
      <div className="r7-sheet-h">{p.consigne}</div>
      <div className="r7-viseur">
        {etat === 'video' ? <video ref={video} playsInline muted aria-label={t('Viseur de l’appareil photo')} /> : (
          <div className="r7-viseur-vide" role="status">
            <Icone nom={etat === 'indisponible' ? 'camera-off' : 'r-appareil-photo'} taille={30} />
            <span>{etat === 'ouverture' ? t('Ouverture de l’appareil photo…') : demo ? t('Appareil photo indisponible : une photo de démonstration sera prise.') : t('Appareil photo indisponible : autorisez la caméra dans les réglages du téléphone.')}</span>
          </div>
        )}
      </div>
      <p className="r7-note">{t('Photo prise par l’application seulement, jamais depuis la galerie : heure et lieu sont gardés avec elle. Sans réseau, elle part au retour de la connexion.')}</p>
      <button type="button" className="r-btn r-principal" onClick={prendre} disabled={etat === 'ouverture' || (etat === 'indisponible' && !demo)} data-raison={t('Appareil photo indisponible')}>
        <Icone nom="r-appareil-photo" taille={20} />
        {t('Prendre la photo')}
      </button>
    </Feuille>
  )
}

// ── PIN du membre ───────────────────────────────────────────────────────────────────────────────────────────
export function FeuillePin(p: { ouverte: boolean; fermer: () => void; titre: string; detail: string; erreur: string | null; occupe: boolean; signer: (pin: string) => void }) {
  const { t, tf } = usePreferences()
  const n = PARAMETRES.connexion.pinLongueur
  const [pin, setPin] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (p.ouverte) {
      setPin('')
      setTimeout(() => champ.current?.focus(), 50)
    }
  }, [p.ouverte])
  useEffect(() => {
    if (p.erreur) setPin('')
  }, [p.erreur])
  return (
    <Feuille ouverte={p.ouverte} fermer={p.fermer} titre={p.titre}>
      <form
        className="r7-pin"
        onSubmit={(e) => {
          e.preventDefault()
          if (pin.length === n) p.signer(pin)
        }}
      >
        <div className="r7-sheet-h">{p.titre}</div>
        <p className="r7-note">{p.detail}</p>
        <label className="r7-champ-l" htmlFor="r7-pin">
          {tf('Votre PIN personnel ({n} chiffres)', { n })}
        </label>
        <input
          ref={champ}
          id="r7-pin"
          className="r7-champ r-ref r7-champ-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={n}
          value={pin}
          aria-describedby={p.erreur ? 'r7-pin-err' : undefined}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, n))}
        />
        {p.erreur && (
          <Avis ton="rouge" id="r7-pin-err">
            {p.erreur}
          </Avis>
        )}
        <button type="submit" className="r-btn r-principal r7-mt" disabled={pin.length !== n || p.occupe} data-raison={tf('Tapez les {n} chiffres', { n })}>
          <Icone nom="r-cadenas" taille={18} />
          {p.occupe ? t('Signature…') : t('Signer avec mon PIN')}
        </button>
      </form>
    </Feuille>
  )
}

/** Texte d'un refus de PIN (ARL-12 : 5 essais puis blocage). */
export function usePinRefus() {
  const { t, tf } = usePreferences()
  return (raison: string): string | null =>
    raison === 'pin_faux' ? t('PIN incorrect. Réessayez.') : raison === 'bloque' ? tf('Trop d’essais : PIN bloqué {n} minutes.', { n: PARAMETRES.connexion.pinBlocageMin }) : null
}

// ── Lecteur d'étiquette (QR, code-barres) ────────────────────────────────────────────────────────────────────────
type Detecteur = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> }
type ConstructeurDetecteur = new (o: { formats: string[] }) => Detecteur

/** Lit l'étiquette d'un colis ou d'un retour (BarcodeDetector quand le téléphone le permet), sinon saisie à la main. */
export function Scanner(p: { ouvert: boolean; fermer: () => void; consigne: string; lu: (valeur: string) => void; saisir: () => void }) {
  const { t } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const [etat, setEtat] = useState<'ouverture' | 'video' | 'indisponible'>('ouverture')
  const { ouvert, lu, fermer } = p
  useEffect(() => {
    if (!ouvert) return
    let vivant = true
    let flux: MediaStream | null = null
    let minuterie: ReturnType<typeof setInterval> | null = null
    setEtat('ouverture')
    const BD = (window as unknown as { BarcodeDetector?: ConstructeurDetecteur }).BarcodeDetector
    const md = navigator.mediaDevices
    if (!BD || !md?.getUserMedia) {
      setEtat('indisponible')
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(
      (s) => {
        if (!vivant) return s.getTracks().forEach((x) => x.stop())
        flux = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setEtat('video')
        const d = new BD({ formats: ['qr_code', 'code_128', 'data_matrix'] })
        minuterie = setInterval(() => {
          if (!video.current) return
          void d.detect(video.current).then((r) => {
            if (r[0]?.rawValue && vivant) {
              vivant = false
              signal('succes')
              lu(r[0].rawValue.trim())
              fermer()
            }
          }, () => undefined)
        }, 350)
      },
      () => vivant && setEtat('indisponible'),
    )
    return () => {
      vivant = false
      if (minuterie) clearInterval(minuterie)
      flux?.getTracks().forEach((x) => x.stop())
    }
  }, [ouvert, lu, fermer])
  return (
    <Feuille ouverte={ouvert} fermer={fermer} titre={t('Scanner l’étiquette')}>
      <div className="r7-sheet-h">{p.consigne}</div>
      <div className="r7-viseur">
        {etat === 'video' ? <video ref={video} playsInline muted aria-label={t('Viseur du scanner')} /> : (
          <div className="r7-viseur-vide" role="status">
            <Icone nom={etat === 'indisponible' ? 'camera-off' : 'r-qr'} taille={30} />
            <span>{etat === 'ouverture' ? t('Ouverture du scanner…') : t('Scanner indisponible sur ce téléphone : saisissez la référence imprimée sous le QR.')}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        className="r-btn r-second"
        onClick={() => {
          fermer()
          p.saisir()
        }}
      >
        <Icone nom="keyboard" taille={20} />
        {t('Saisir la référence à la main')}
      </button>
    </Feuille>
  )
}

// ── Libellés ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Motifs d'un dossier (texte français exact, traduit par t()). */
export const MOTIF_LIBELLE: Record<string, string> = {
  non_conforme: 'Non conforme',
  abime: 'Abîmé',
  contrefacon: 'Contrefaçon',
  manquant: 'Colis manquant',
  emballage_ouvert: 'Emballage ouvert',
  defaut_cache: 'Défaut caché',
  vice_cache: 'Vice caché',
  colis_ouvert: 'Colis remis ouvert',
}
export const CLASSE_LIBELLE: Record<string, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }

/** « 12 oct. » / « 12 Oct » : date courte (heure de Yaoundé). */
export function dateCourte(ms: number, langue: 'fr' | 'en'): string {
  const MOIS = langue === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] : ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const d = new Date(ms + DECALAGE_YAOUNDE_MS)
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`
}
