// Éléments partagés par les écrans des groupes LIV-08, LIV-09 et LIV-10 (même agent) : états de lecture, héros,
// encadrés, interrupteurs, appareil photo des preuves, vignettes de preuve, bouton SOS à appui long, feuille d'appel
// masqué, pied « à jour à … ». Feuille de style : commun.css (préfixe lc-).
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { mouvementLibre } from '@client/composants/Animations'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Appel } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import './commun.css'

// ── Heure du serveur ────────────────────────────────────────────────────────────────────────────────────────

/** L'heure du serveur à l'instant (session + temps écoulé) : origine d'un geste, comptes à rebours. */
export function useMaintenant(): () => number {
  const s = useSession()
  const decalage = useRef(s.maintenant - Date.now())
  return useCallback(() => Date.now() + decalage.current, [])
}
/** Origine d'un geste (clé d'idempotence, heure du serveur, dernière position connue). */
export function useOrigine() {
  const m = useMaintenant()
  return useCallback(() => origine(m()), [m])
}
/** Un battement régulier (relecture des états qui changent avec le temps : décision, SOS, expiration). */
export function useBattement(ms: number): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return n
}

// ── Écran avec la marque ───────────────────────────────────────────────────────────────────────────────────

// ── États de lecture ────────────────────────────────────────────────────────────────────────────────────────

export function Chargement({ lignes = 2 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="lc-charge" aria-busy="true" aria-label={t('Chargement…')}>
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="l-carte">
          <i style={{ width: '40%' }}></i>
          <i style={{ width: '85%' }}></i>
          <i style={{ width: '60%' }}></i>
        </div>
      ))}
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  const en = useEnLigne()
  return (
    <div className="l-carte l-vide" role="alert">
      <div className="l-vide-i l-rouge">
        <Icone nom={en ? 'circle-alert' : 'wifi-off'} taille={28} />
      </div>
      <h1>{t(en ? 'Lecture impossible pour l’instant' : 'Pas de connexion')}</h1>
      <p>{t(en ? 'Le serveur n’a pas répondu. Vos données et vos gestes en attente sont gardés.' : 'Ces données ne sont pas encore sur le téléphone. Elles arriveront au retour du réseau.')}</p>
      <button type="button" className="l-btn l-second lc-mt" onClick={relire}>
        <Icone nom="rotate-cw" taille={20} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

// ── Héros, encadrés, lignes ─────────────────────────────────────────────────────────────────────────────────

export type Ton = 'nuit' | 'vert' | 'ambre' | 'rouge' | 'orange'
export function Heros(p: { ton: Ton; icone: string; kicker?: string; titre: ReactNode; children?: ReactNode; succes?: boolean; role?: 'status' | 'alert' }) {
  return (
    <section className={'lc-heros lc-' + p.ton} role={p.role}>
      <div className={'lc-heros-i' + (p.succes ? ' blv-succes' : '')}>
        <Icone nom={p.icone} taille={26} trait={2.1} />
      </div>
      <div className="l-grow">
        {p.kicker && <div className="lc-heros-k">{p.kicker}</div>}
        <h2>{p.titre}</h2>
        {p.children}
      </div>
    </section>
  )
}

export function Encadre(p: { ton?: 'neutre' | 'vert' | 'ambre' | 'rouge' | 'orange'; icone: string; titre?: string; children: ReactNode }) {
  return (
    <div className={'lc-encadre lc-e-' + (p.ton ?? 'neutre')}>
      <Icone nom={p.icone} taille={20} />
      <div className="l-grow">
        {p.titre && <b>{p.titre}</b>}
        <div>{p.children}</div>
      </div>
    </div>
  )
}

/** Ligne cliquable d'une liste (lien interne). */
export function LigneLien(p: { vers: string; icone: string; titre: ReactNode; sous?: ReactNode; fin?: ReactNode; ton?: string; etat?: object }) {
  return (
    <Link className={'lc-ligne li' + (p.ton ? ' lc-t-' + p.ton : '')} to={p.vers} state={p.etat}>
      <span className="lc-ligne-i">
        <Icone nom={p.icone} taille={20} />
      </span>
      <span className="l-grow">
        <b>{p.titre}</b>
        {p.sous && <span>{p.sous}</span>}
      </span>
      {p.fin}
      <Icone nom="chevron-right" taille={18} />
    </Link>
  )
}

export function Interrupteur(p: { on: boolean; changer?: (on: boolean) => void; libelle: string; detail?: ReactNode; verrouille?: boolean; icone: string }) {
  const { t } = usePreferences()
  const id = useId()
  return (
    <div className="lc-inter">
      <Icone nom={p.icone} taille={21} />
      <div className="l-grow">
        <b id={id}>{p.libelle}</b>
        {p.detail && <span>{p.detail}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={p.on}
        aria-labelledby={id}
        aria-disabled={p.verrouille || undefined}
        className={'lc-switch' + (p.on ? ' on' : '') + (p.verrouille ? ' off' : '')}
        onClick={() => !p.verrouille && p.changer?.(!p.on)}
      >
        <i></i>
        {p.verrouille && <Icone nom="lock" taille={12} />}
        <span className="lc-sr">{t(p.on ? 'Activé' : 'Désactivé')}</span>
      </button>
    </div>
  )
}

/** Pied « Connecté · à jour à … » / « Hors connexion · données de … ». */
export function PiedConnexion({ a, quoi }: { a: number; quoi: string }) {
  const { tf, langue } = usePreferences()
  const en = useEnLigne()
  return (
    <p className="lc-pied">
      <i className={en ? 'on' : ''}></i>
      {en ? tf('Connecté · {quoi} à jour à {h}', { quoi, h: heure(a, langue) }) : tf('Hors connexion · {quoi} du téléchargement de {h}', { quoi, h: heure(a, langue) })}
    </p>
  )
}

// ── Appareil photo des preuves ──────────────────────────────────────────────────────────────────────────────

export interface PhotoPrise {
  url: string
  ko: number
  a: number
}
const octets = (d: string) => Math.ceil(((d.length - d.indexOf(',') - 1) * 3) / 4)

/** Compresse une photo sur l'appareil sous maxKo (LIV-PHOTO-POIDS-KO) ; jamais gardée dans la galerie. */
export function compresser(f: File, maxKo: number): Promise<{ url: string; ko: number }> {
  return new Promise((ok, ko) => {
    if (!f.type.startsWith('image/')) return ko(new Error('type'))
    const u = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(u)
      for (const cote of [1280, 960, 720]) {
        const k = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * k)
        c.height = Math.round(img.naturalHeight * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        for (const q of [0.8, 0.65, 0.5]) {
          const d = c.toDataURL('image/jpeg', q)
          if (octets(d) <= maxKo * 1024) return ok({ url: d, ko: Math.round(octets(d) / 1024) })
        }
      }
      ko(new Error('lourde'))
    }
    img.onerror = () => (URL.revokeObjectURL(u), ko(new Error('lecture')))
    img.src = u
  })
}

/**
 * Photos d'une preuve : appareil photo de l'application seulement (capture arrière, jamais la galerie), compressées
 * sous maxKo ; « exigees » obligatoires, jusqu'à « max ». L'heure de prise est gardée (origine).
 */
export function ChampPhotos(p: { photos: PhotoPrise[]; changer: (x: PhotoPrise[]) => void; exigees: number; max: number; maxKo: number; maintenant: () => number; legende?: string }) {
  const { t, tf } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const prise = async (f: File | undefined) => {
    if (!f) return
    setErreur(null)
    setOccupe(true)
    try {
      const r = await compresser(f, p.maxKo)
      p.changer([...p.photos, { ...r, a: p.maintenant() }])
      signal('toucher')
    } catch (e) {
      setErreur(e instanceof Error && e.message === 'type' ? 'Ce fichier n’est pas une photo. Reprenez-la avec l’appareil photo.' : 'Cette photo ne se lit pas. Reprenez-la.')
      signal('erreur')
    } finally {
      setOccupe(false)
      if (champ.current) champ.current.value = ''
    }
  }
  const manque = Math.max(0, p.exigees - p.photos.length)
  return (
    <div className="lc-photos">
      <div className="lc-photos-l">
        {p.photos.map((x, i) => (
          <figure key={x.a + '-' + i}>
            <img src={x.url} alt={tf('Photo {n}', { n: i + 1 })} />
            <figcaption>{tf('{ko} Ko', { ko: x.ko })}</figcaption>
            <button type="button" aria-label={tf('Reprendre la photo {n}', { n: i + 1 })} onClick={() => p.changer(p.photos.filter((_, k) => k !== i))}>
              <Icone nom="rotate-ccw" taille={14} trait={2.4} />
            </button>
          </figure>
        ))}
        {p.photos.length < p.max && (
          <button type="button" className={'lc-photo-plus' + (manque ? ' exigee' : '')} disabled={occupe} onClick={() => champ.current?.click()}>
            <Icone nom="camera" taille={24} />
            <span>{t(occupe ? 'Compression…' : manque ? 'Prendre la photo' : 'Photo facultative')}</span>
          </button>
        )}
      </div>
      <input ref={champ} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void prise(e.target.files?.[0])} data-lc-photo />
      <p className="lc-aide">
        <Icone nom="image-off" taille={15} />
        {p.legende ?? t('Appareil photo de l’application seulement : jamais la galerie, rien n’est gardé dans le téléphone.')}
      </p>
      {erreur && (
        <p className="lc-erreur" role="alert">
          {t(erreur)}
        </p>
      )}
    </div>
  )
}

/** Vignette d'une preuve (image servie par une adresse signée de courte durée : jamais téléchargeable). */
export function Vignette({ legende, quand, icone = 'camera' }: { legende: string; quand: number; icone?: string }) {
  const { t, langue } = usePreferences()
  return (
    <figure className="lc-vignette" onContextMenu={(e) => e.preventDefault()} draggable={false}>
      <div aria-hidden="true">
        <Icone nom={icone} taille={26} />
      </div>
      <figcaption>
        <b>{t(legende)}</b>
        <span>{heure(quand, langue)}</span>
      </figcaption>
    </figure>
  )
}

// ── SOS : appui long ───────────────────────────────────────────────────────────────────────────────────────

/** Grand bouton SOS : maintenir appuiS secondes déclenche ; relâcher avant annule (anneau de progression). */
export function BoutonSOS({ appuiS, declencher, compact }: { appuiS: number; declencher: () => void; compact?: boolean }) {
  const { t, tf } = usePreferences()
  const [p, setP] = useState(0)
  const [astuce, setAstuce] = useState(false)
  const declenche = useRef(false)
  const debut = useRef<number | null>(null)
  const anim = useRef(0)
  const arreter = () => {
    debut.current = null
    cancelAnimationFrame(anim.current)
    setP(0)
  }
  const tick = () => {
    if (debut.current === null) return
    const x = Math.min(1, (performance.now() - debut.current) / (appuiS * 1000))
    setP(x)
    if (x >= 1) {
      arreter()
      declenche.current = true
      signal('sos')
      declencher()
    } else anim.current = requestAnimationFrame(tick)
  }
  const appuyer = () => {
    if (debut.current !== null) return
    debut.current = performance.now()
    signal('toucher')
    anim.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  // Clavier : maintenir Espace ou Entrée.
  return (
    <button
      type="button"
      className={'lc-sos' + (compact ? ' compact' : '') + (p > 0 ? ' appui' : '')}
      style={{ ['--p' as string]: String(p) }}
      onPointerDown={appuyer}
      onPointerUp={arreter}
      onPointerLeave={arreter}
      onPointerCancel={arreter}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), appuyer())}
      onKeyUp={arreter}
      onContextMenu={(e) => e.preventDefault()}
      // Un toucher bref ne déclenche rien : il rappelle qu'il faut maintenir.
      onClick={() => {
        if (declenche.current) return void (declenche.current = false)
        setAstuce(true)
        signal('toucher')
        window.setTimeout(() => setAstuce(false), 2500)
      }}
      aria-label={tf('SOS : maintenir {s} secondes', { s: appuiS })}
    >
      <span className="lc-sos-anneau" aria-hidden="true"></span>
      <Icone nom="siren" taille={compact ? 22 : 30} trait={2.2} />
      <span className="lc-sos-t">
        <b>{t('SOS')}</b>
        <span aria-live="polite">{p > 0 ? t('Relâchez pour annuler') : astuce ? tf('Maintenez {s} secondes pour déclencher', { s: appuiS }) : tf('Maintenir {s} s', { s: appuiS })}</span>
      </span>
    </button>
  )
}

/**
 * Appui long (SOS) : maintenir appuiS secondes déclenche ; relâcher avant annule. Un toucher bref appelle « toucher »
 * (fiche Sécurité, rappel). Clavier : maintenir Espace ou Entrée. p : avancement de 0 à 1 (anneau ou barre).
 */
export function useAppuiLong(appuiS: number, declencher: () => void, toucher?: () => void) {
  const [p, setP] = useState(0)
  const declenche = useRef(false)
  const debut = useRef<number | null>(null)
  const anim = useRef(0)
  const arreter = () => {
    debut.current = null
    cancelAnimationFrame(anim.current)
    setP(0)
  }
  const tick = () => {
    if (debut.current === null) return
    const x = Math.min(1, (performance.now() - debut.current) / (appuiS * 1000))
    setP(x)
    if (x >= 1) {
      arreter()
      declenche.current = true
      signal('sos')
      declencher()
    } else anim.current = requestAnimationFrame(tick)
  }
  const appuyer = () => {
    if (debut.current !== null) return
    debut.current = performance.now()
    signal('toucher')
    anim.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  return {
    p,
    props: {
      onPointerDown: appuyer,
      onPointerUp: arreter,
      onPointerLeave: arreter,
      onPointerCancel: arreter,
      onKeyDown: (e: KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), appuyer()),
      onKeyUp: arreter,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
      onClick: () => {
        if (declenche.current) return void (declenche.current = false)
        toucher?.()
      },
      style: { ['--p' as string]: String(p), touchAction: 'none' } as CSSProperties,
    },
  }
}

// ── Balisage du prototype (livc_*, hero) ─────────────────────────────────────────────────────────────────────

/** livc_ic : icône dans une pastille teintée. */
export function IcTeinte({ nom, ton = 'ink', taille = 40 }: { nom: string; ton?: string; taille?: number }) {
  return (
    <span className={'livc-ic ' + ton} style={{ width: taille, height: taille }}>
      <Icone nom={nom} taille={Math.round(taille / 2)} />
    </span>
  )
}
/** livc_lab : libellé de section (majuscules) avec un repère à droite. */
export function Lab({ children, droite, id }: { children: ReactNode; droite?: ReactNode; id?: string }) {
  return (
    <div className="livc-lab">
      <span id={id}>{children}</span>
      {droite}
    </div>
  )
}
/** livc_sh : en-tête de la feuille (icône, titre, sous-titre, fermer). */
export function EnTeteFeuille(p: { titre: ReactNode; sous?: ReactNode; icone?: string; ton?: string; fermer: string | (() => void) }) {
  const { t } = usePreferences()
  return (
    <div className="livc-sh-h">
      {p.icone && <IcTeinte nom={p.icone} ton={p.ton} taille={46} />}
      <div className="grow">
        <h2>{p.titre}</h2>
        {p.sous && <p>{p.sous}</p>}
      </div>
      {typeof p.fermer === 'string' ? (
        <Link className="livc-x" to={p.fermer} aria-label={t('Fermer')}>
          <Icone nom="x" taille={20} />
        </Link>
      ) : (
        <button type="button" className="livc-x" onClick={p.fermer} aria-label={t('Fermer')}>
          <Icone nom="x" taille={20} />
        </button>
      )}
    </div>
  )
}
/** .hero du prototype (nuit, vert, rouge, ambre, accent) : kicker, titre, texte. */
export function HeroProto(p: { ton: 'night' | 'green' | 'red' | 'amber' | 'acc' | 'orange'; hk?: ReactNode; ht?: ReactNode; hs?: ReactNode; children?: ReactNode; role?: 'status' | 'alert'; className?: string }) {
  return (
    <div className={'hero ' + p.ton + (p.className ? ' ' + p.className : '')} role={p.role ?? 'status'}>
      {p.hk && <div className="hk">{p.hk}</div>}
      {p.ht && <div className="ht">{p.ht}</div>}
      {p.children}
      {p.hs && <div className="hs">{p.hs}</div>}
    </div>
  )
}
/** C.tl : frise (fait, en cours, refusé, à venir). */
export function Frise({ items }: { items: { t: ReactNode; d?: ReactNode; st?: 'done' | 'cur' | 'bad' | '' }[] }) {
  return (
    <div className="tl">
      {items.map((i, k) => (
        <div key={k} className={'ti ' + (i.st ?? '')}>
          <div className="tt">{i.t}</div>
          {i.d && <div className="td">{i.d}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Appel masqué ───────────────────────────────────────────────────────────────────────────────────────────

const RAISONS_APPEL: Record<string, string> = {
  fil_ferme: 'La mission est close : la ligne masquée est fermée.',
  pas_encore: 'La ligne s’ouvre quand vous partez vers cet arrêt.',
  hors_horaires: 'Le support répond pendant ses horaires ; écrivez-lui, il vous répondra.',
  indisponible: 'L’appel n’a pas pu partir. Réessayez dans un instant.',
}

/** Appel masqué (page Appel, DP-61) : ni votre numéro ni le sien ne sont montrés ; durée journalisée. */
export function useAppel() {
  const [appel, setAppel] = useState<Appel | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const o = useOrigine()
  const m = useMaintenant()
  const en = useEnLigne()
  const appeler = async (cible: string) => {
    setRefus(null)
    if (!en) {
      setRefus('Sans données, l’appel masqué passe par le réseau téléphonique : réessayez quand le signal revient.')
      signal('erreur')
      return
    }
    const r = await source.messages.appeler(cible, o())
    if (r.ok) {
      setAppel(r.appel)
      signal('toucher')
    } else {
      setRefus(RAISONS_APPEL[r.raison] ?? RAISONS_APPEL.indisponible)
      signal('erreur')
    }
  }
  const raccrocher = async () => {
    if (appel) await source.messages.raccrocher(appel.id, m())
    setAppel(null)
  }
  return { appel, refus, appeler, raccrocher, effacer: () => setRefus(null) }
}

export function FeuilleAppel({ a }: { a: ReturnType<typeof useAppel> }) {
  const { t } = usePreferences()
  const m = useMaintenant()
  useBattement(1000)
  const ouvert = !!a.appel || !!a.refus
  const duree = a.appel ? Math.max(0, Math.floor((m() - a.appel.debut) / 1000)) : 0
  const relie = duree >= 2
  return (
    <Feuille ouverte={ouvert} fermer={() => (a.appel ? void a.raccrocher() : a.effacer())} titre={t('Appel masqué')}>
      {a.appel ? (
        <div className="lc-appel" role="status">
          <div className={'lc-appel-i' + (relie ? ' on' : '')}>
            <Icone nom="phone-call" taille={30} />
          </div>
          <h2>{t(a.appel.titre)}</h2>
          <p className="lc-appel-d">{relie ? `${String(Math.floor(duree / 60)).padStart(2, '0')}:${String(duree % 60).padStart(2, '0')}` : t('Mise en relation par BelivaY…')}</p>
          <p className="lc-pill-m">
            <Icone nom="shield-check" taille={15} />
            {t('Numéro masqué des deux côtés')}
          </p>
          <p className="lc-aide">{t('L’appel est noté au journal (heure et durée, jamais son contenu).')}</p>
          <button type="button" className="l-btn l-alerte" onClick={() => void a.raccrocher()}>
            <Icone nom="phone" taille={20} />
            <span>{t('Raccrocher')}</span>
          </button>
        </div>
      ) : (
        <div className="lc-appel" role="alert">
          <div className="lc-appel-i ko">
            <Icone nom="phone" taille={30} />
          </div>
          <h2>{t('Appel impossible')}</h2>
          <p>{a.refus ? t(a.refus) : ''}</p>
          <button type="button" className="l-btn l-second" onClick={a.effacer}>
            {t('Compris')}
          </button>
        </div>
      )}
    </Feuille>
  )
}

// ── Lecture vocale (synthèse du téléphone, voix hors connexion) ─────────────────────────────────────────────

export function useLecteur() {
  const { langue } = usePreferences()
  const [lit, setLit] = useState<string | null>(null)
  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  const lire = (id: string, texte: string) => {
    const s = window.speechSynthesis
    if (lit === id) {
      s?.cancel()
      setLit(null)
      return
    }
    setLit(id)
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') return
    s.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = langue === 'en' ? 'en-GB' : 'fr-FR'
    u.onend = () => setLit((x) => (x === id ? null : x))
    s.speak(u)
  }
  return { lit, lire }
}

/**
 * Montée douce d'une valeur entière (jauges : 700 ms, sortie douce) ; immédiate en mouvement réduit. Chaque image est un
 * entier, la dernière est exactement la cible ; une nouvelle cible part de la valeur affichée (jamais de retour à 0 à
 * chaque rafraîchissement) ; une cible illisible (NaN, infinie) vaut 0.
 */
export function useMontee(cible: number): number {
  const fin = Number.isFinite(cible) ? Math.round(cible) : 0
  const [v, setV] = useState(() => (mouvementLibre() ? 0 : fin))
  const affiche = useRef(v)
  useEffect(() => {
    const de = affiche.current
    if (!mouvementLibre() || de === fin) {
      affiche.current = fin
      setV(fin)
      return
    }
    let id = 0
    const t0 = performance.now()
    const pas = () => {
      const k = Math.min(1, (performance.now() - t0) / 700)
      const x = k < 1 ? Math.round(de + (fin - de) * (1 - Math.pow(1 - k, 3))) : fin
      affiche.current = x
      setV(x)
      if (k < 1) id = requestAnimationFrame(pas)
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [fin])
  return v
}

/** Lien interne simple vers une route. */
export const vers = (route: string, params?: Record<string, string | number | undefined | null>) => chemin(route, params)
