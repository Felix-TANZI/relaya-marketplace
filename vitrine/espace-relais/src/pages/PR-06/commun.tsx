// PR-06 · éléments communs aux écrans Stock, Fiche colis, À faire partir et Inventaire : étiquettes (STK-01), dates
// courtes, gestes (hors connexion compris), états de lecture (chargement, erreur, vide), annonce, saisie du PIN et
// appareil photo de preuve (D15). Aucune couleur ni valeur écrite ici : classes du prototype et jetons (pr06.css).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { NonDisponible } from '@client/api/erreurs'
import { env } from '@client/config/env'
import { FCFA } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { jourDe } from '../../calculs/temps'
import type { ClasseColis, Instant, Jour, Origine } from '../../donnees/communs'
import type { EtiquetteStock } from '../../donnees/domaines/stock'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import { ReseauRequis, geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { SourceRelais } from '../../donnees/source'
import { heure, type Langue } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import './pr06.css'

// ── Étiquettes (STK-01 : rouge à faire partir, ambre dernier jour, orange garde payante, bleu groupage, vert gratuit ;
// neutre : hors garde) ─────────────────────────────────────────────────────────────────────────────────────────
export const ETIQUETTES: Record<EtiquetteStock, { libelle: string; pill: string; kase: string }> = {
  a_renvoyer: { libelle: 'À renvoyer', pill: 'p-ekng8o', kase: 'p-8orn7h' },
  a_faire_partir: { libelle: 'À faire partir', pill: 'p-ekng8o', kase: 'p-8orn7h' },
  transfert: { libelle: 'Transfert', pill: 'p-ekng8o', kase: 'p-8orn7h' },
  dernier_jour: { libelle: 'Dernier jour', pill: 'p-h4wlx0', kase: 'p-fzcjrl' },
  payant: { libelle: 'Payant', pill: 'p-yw05h9', kase: 'p-dwl9ry' },
  groupage: { libelle: 'Groupage', pill: 'p-rpzy79', kase: 'p-nzpez2' },
  gratuit: { libelle: 'Gratuit', pill: 'p-nax3x4', kase: 'p-e57rxt' },
  pas_prevenu: { libelle: 'Pas encore prévenu', pill: 'p-nax3x4', kase: 'p-e57rxt' },
  incomplet: { libelle: 'Incomplet', pill: 'p-nax3x4', kase: 'p-e57rxt' },
  constat: { libelle: 'Constat', pill: 'r6-pill-neutre', kase: 'r6-case-neutre' },
  retour: { libelle: 'Retour', pill: 'r6-pill-neutre', kase: 'r6-case-neutre' },
}

export function Etiquette({ e }: { e: EtiquetteStock }) {
  const { t } = usePreferences()
  return <span className={ETIQUETTES[e].pill}>{t(ETIQUETTES[e].libelle)}</span>
}

/** « petit », « moyen », « encombrant » (CAL-20). */
export const CLASSE: Record<ClasseColis, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }
export const CLASSE_MAJ: Record<ClasseColis, string> = { S: 'Petit', M: 'Moyen', L: 'Encombrant' }

/** Montant : « 1 000 F » (espaces insécables) ; « 1,000 F » quand l'application est en anglais (html[lang]), même
 * hors d'un tf(). */
export const francs = (n: number) => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? (n < 0 ? '−' : '') + Math.round(Math.abs(n)).toLocaleString('en-US') : FCFA(n)) + '\u00a0F'

// ── Dates courtes : « sam. 17 oct. » · « Sat 17 Oct » ──────────────────────────────────────────────────────────
const JOURS_COURTS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
export function dateCourte(v: Jour | Instant, langue: Langue): string {
  const j = typeof v === 'number' ? jourDe(v) : v
  const d = new Date(j + 'T12:00:00Z')
  return `${JOURS_COURTS[langue][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[langue][d.getUTCMonth()]}`
}
/** « sam. 17 oct. · 14 h 05 ». */
export const dateHeure = (v: Instant, langue: Langue) => `${dateCourte(v, langue)} · ${heure(v, langue)}`
/** « aujourd'hui · 14 h 05 », « hier · 9 h », sinon la date courte. */
export function quand(v: Instant, maintenant: Instant, langue: Langue, t: (s: string) => string): string {
  const j = jourDe(v)
  if (j === jourDe(maintenant)) return `${t('Aujourd’hui')} · ${heure(v, langue)}`
  if (j === jourDe(maintenant - 86_400_000)) return `${t('Hier')} · ${heure(v, langue)}`
  return dateHeure(v, langue)
}
/** Rang de garde écrit : « 1er jour », « 4e jour » (« day 4 »). */
export const rangJour = (r: number, tf: (m: string, v: Record<string, string | number>) => string, t: (s: string) => string) => (r === 1 ? t('1er jour') : tf('{n}e jour', { n: r }))

// ── Gestes ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Heure du serveur (démonstration : celle du jeu d'essai), lue au moment du geste. */
export function useMaintenant(): () => number {
  const s = useSession()
  const [dec] = useState(() => s.maintenant - Date.now())
  return useCallback(() => Date.now() + dec, [dec])
}

/** Un geste du comptoir : une origine (clé d'idempotence, heure), en ligne ou en file (OFF-01) ; un seul à la fois. */
export function useAgir() {
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [occupe, setOccupe] = useState(false)
  const verrou = useRef(false)
  const agir = useCallback(
    async <T,>(type: TypeAction, objet: string, faire: (o: Origine, s: SourceRelais) => Promise<T>, options: { local?: boolean; photos?: number; reseauRequis?: boolean } = {}): Promise<{ etat: 'fait' | 'en_file'; r: T } | null> => {
      if (verrou.current) return null
      verrou.current = true
      setOccupe(true)
      try {
        const o = origine(maintenant())
        return await geste(enLigne, type, objet, o, (s) => faire(o, s), { local: true, ...options })
      } catch (e) {
        if (!(e instanceof ReseauRequis)) throw e
        signal('erreur')
        return null
      } finally {
        verrou.current = false
        setOccupe(false)
      }
    },
    [enLigne, maintenant],
  )
  return { agir, occupe, enLigne, maintenant }
}

// ── États de lecture ───────────────────────────────────────────────────────────────────────────────────────────
export function Chargement({ lignes = 4, titre }: { lignes?: number; titre?: string }) {
  const { t } = usePreferences()
  return (
    <div className="r6-charge" role="status" aria-busy="true" aria-label={t(titre ?? 'Chargement…')}>
      {Array.from({ length: lignes }, (_, k) => (
        <span key={k} className="r6-charge-l" />
      ))}
    </div>
  )
}

export function ErreurLecture({ erreur, relire }: { erreur: Error; relire: () => void }) {
  const { t } = usePreferences()
  const absent = erreur instanceof NonDisponible
  return (
    <div className="r-vide" role="alert">
      <div className="r-vide-i r-rouge">
        <Icone nom={absent ? 'cloud-off' : 'triangle-alert'} taille={28} />
      </div>
      <h2>{t(absent ? 'Service pas encore branché' : 'Lecture impossible')}</h2>
      <p>{t(absent ? 'Le serveur ne sert pas encore cet écran. Vos colis et vos preuves restent sur le téléphone.' : 'Les données du stock n’ont pas pu être lues. Vérifiez le réseau, puis réessayez : rien n’est perdu.')}</p>
      <button type="button" className="r-btn r-second r6-reessayer" onClick={relire}>
        <Icone nom="rotate-cw" taille={20} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

export function Vide({ icone, titre, texte, children }: { icone: string; titre: string; texte: string; children?: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="r-vide r6-vide">
      <div className="r-vide-i">
        <Icone nom={icone} taille={28} />
      </div>
      <h2>{t(titre)}</h2>
      <p>{texte}</p>
      {children}
    </div>
  )
}

// ── Annonce (toast) : succès, refus, mise en file ─────────────────────────────────────────────────────────────
export interface Avis {
  ton: 'ok' | 'erreur' | 'file'
  texte: string
}
export function useAnnonce() {
  const [avis, setAvis] = useState<Avis | null>(null)
  useEffect(() => {
    if (!avis) return
    const id = setTimeout(() => setAvis(null), 4500)
    return () => clearTimeout(id)
  }, [avis])
  return { avis, annoncer: setAvis }
}
export function Annonce({ avis }: { avis: Avis | null }) {
  return (
    <div className="r6-annonce-z" role="status" aria-live="polite">
      {avis && (
        <div className={'r6-annonce r6-' + avis.ton}>
          <Icone nom={avis.ton === 'ok' ? 'circle-check' : avis.ton === 'file' ? 'cloud-upload' : 'circle-alert'} taille={20} />
          <span>{avis.texte}</span>
        </div>
      )}
    </div>
  )
}

// ── PIN du membre (GEN-09 ; PIN-LONGUEUR) ─────────────────────────────────────────────────────────────────────
export function ChampPin({ id, longueur, valeur, changer, erreur, valider }: { id: string; longueur: number; valeur: string; changer: (v: string) => void; erreur?: string | null; valider?: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <div className="r6-pin">
      <label htmlFor={id} className="r6-label">
        {tf('Votre PIN ({n} chiffres)', { n: longueur })}
      </label>
      <input
        id={id}
        className="r6-champ r-ref"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={longueur}
        value={valeur}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? id + '-e' : undefined}
        onChange={(e) => changer(e.target.value.replace(/\D/g, '').slice(0, longueur))}
        onKeyDown={(e) => e.key === 'Enter' && valider?.()}
      />
      {erreur && (
        <p id={id + '-e'} className="r6-erreur">
          {t(erreur)}
        </p>
      )}
    </div>
  )
}

// ── Appareil photo de preuve (v6 D15 : photo à chaque changement de main, jamais la galerie) ────────────────
// Prise dans l'application (flux de la caméra arrière), heure incrustée, compressée sous PHOTO-MAX-KO ; l'aperçu ne vit
// qu'en mémoire. Sans appareil photo (ordinateur, refus), en démonstration : une photo de démonstration.
// À l'intégration, l'appareil photo plein écran commun (route « camera », PR-04) pourra le remplacer.
const APERCUS = new Map<string, string>()
/** Couleur d'un jeton (jetons.css) pour dessiner dans l'image : aucune couleur écrite ici. */
const jeton = (nom: string) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || 'gray'
export const apercu = (id: string | null) => (id ? (APERCUS.get(id) ?? null) : null)

export function PrisePhoto({ consigne, photo, prise, maxKo }: { consigne: string; photo: string | null; prise: (id: string) => void; maxKo: number }) {
  const { t, langue } = usePreferences()
  const maintenant = useMaintenant()
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [etat, setEtat] = useState<'repos' | 'ouverture' | 'video' | 'indisponible'>('repos')
  const arreter = () => {
    flux.current?.getTracks().forEach((x) => x.stop())
    flux.current = null
  }
  useEffect(() => arreter, [])
  const ouvrir = async () => {
    setEtat('ouverture')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('indisponible')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      flux.current = s
      setEtat('video')
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
      })
    } catch {
      setEtat('indisponible')
    }
  }
  const enregistrer = (c: HTMLCanvasElement) => {
    const x = c.getContext('2d')!
    const bande = Math.round(c.height * 0.08)
    x.fillStyle = jeton('--noir-55')
    x.fillRect(0, c.height - bande, c.width, bande)
    x.fillStyle = jeton('--nuit-ink')
    x.font = `600 ${Math.round(bande * 0.42)}px system-ui, sans-serif`
    x.fillText(`BelivaY · ${dateHeure(maintenant(), langue)}`, Math.round(bande * 0.4), c.height - Math.round(bande * 0.35))
    let q = 0.82
    let url = c.toDataURL('image/jpeg', q)
    const taille = (u: string) => Math.floor((u.length - u.indexOf(',') - 1) * 0.75)
    while (taille(url) > maxKo * 1024 && q > 0.3) url = c.toDataURL('image/jpeg', (q -= 0.12))
    const id = 'ph-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()))
    APERCUS.set(id, url)
    arreter()
    setEtat('repos')
    signal('succes')
    prise(id)
  }
  const declencher = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    const k = Math.min(1, 1280 / v.videoWidth)
    c.width = Math.round(v.videoWidth * k)
    c.height = Math.round(v.videoHeight * k)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    enregistrer(c)
  }
  const demo = () => {
    const c = document.createElement('canvas')
    c.width = 960
    c.height = 720
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 960, 720)
    g.addColorStop(0, jeton('--acc-soft'))
    g.addColorStop(1, jeton('--acc-line'))
    x.fillStyle = g
    x.fillRect(0, 0, 960, 720)
    x.fillStyle = jeton('--ink')
    x.font = 'bold 40px system-ui, sans-serif'
    x.fillText(t(consigne).slice(0, 40), 48, 96)
    enregistrer(c)
  }
  const url = apercu(photo)
  return (
    <div className="r6-photo">
      {photo ? (
        <div className="r6-photo-ok">
          <span className="r6-vignette">{url ? <img src={url} alt={t(consigne)} /> : <Icone nom="image" taille={28} />}</span>
          <span className="r-grow">
            <b>{t('Photo prise')}</b>
            <span>{t('Prise avec l’appareil photo de l’application ; heure enregistrée.')}</span>
          </span>
          <button type="button" className="r6-lien" onClick={() => void ouvrir()}>
            {t('Reprendre')}
          </button>
        </div>
      ) : etat === 'video' ? (
        <div className="r6-camera">
          <video ref={video} playsInline muted aria-label={t(consigne)} />
          <div className="r6-camera-b">
            <button type="button" className="r-btn r-second" onClick={() => (arreter(), setEtat('repos'))}>
              {t('Annuler')}
            </button>
            <button type="button" className="r-btn r-principal" onClick={declencher}>
              <Icone nom="camera" taille={20} />
              <span>{t('Déclencher')}</span>
            </button>
          </div>
        </div>
      ) : etat === 'indisponible' ? (
        <div className="r6-camera-off" role="alert">
          <p>{t('Appareil photo indisponible : autorisez la caméra dans les réglages du téléphone. La galerie n’est jamais acceptée.')}</p>
          {env.source !== 'api' && (
            <button type="button" className="r-btn r-second" onClick={demo}>
              <Icone nom="image-plus" taille={20} />
              <span>{t('Photo de démonstration')}</span>
            </button>
          )}
          <button type="button" className="r6-lien" onClick={() => void ouvrir()}>
            {t('Réessayer la caméra')}
          </button>
        </div>
      ) : (
        <button type="button" className="r6-prise" onClick={() => void ouvrir()} disabled={etat === 'ouverture'}>
          <span className="r6-prise-i">
            <Icone nom="camera" taille={24} />
          </span>
          <span className="r-grow">
            <b>{t(consigne)}</b>
            <span>{t('Obligatoire : l’étape reste bloquée sans photo.')}</span>
          </span>
        </button>
      )}
    </div>
  )
}

/** Un colis sur une ligne de liste : référence en chasse fixe (DS-01). */
export const Ref = ({ children }: { children: ReactNode }) => <span className="r-ref">{children}</span>
