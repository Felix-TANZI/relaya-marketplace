// Pièces communes aux écrans du groupe VD-11 (Boutique, compte et communication), aux classes du prototype vendeur :
// bouton (C.btn), interrupteur (.tg), feuille du bas (.veil + .sheet, adresse propre comme horaires?prog=1), saisie
// d'un code SMS à six cases (.otp ; second facteur, SEC-04), états de lecture (chargement, erreur, réservé au
// propriétaire, hors connexion), annonce brève (aria-live), mise en forme des textes à valeurs typées (heures,
// échéances, jours, créneaux, francs). Sons et animations du client, coupés en mouvement réduit (mouvementLibre).
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { env } from '@client/config/env'
import { F } from '@client/i18n/format'
import { ouvrirPhoto, reduirePhoto } from '@client/donnees/photo'
import { Icone } from '../../composants/Icone'
import { Rognage, type FormeRognage } from '../../composants/Rognage'
import { chemin } from '../../config/pages'
import type { TexteNotification } from '../../donnees/domaines/notifications'
import { echeance, entre, heure, jourCourt } from '../../i18n/temps'
// Code de la démonstration (jeu d'essai) : montré seulement quand VITE_SOURCE=demo ; l'API ne renvoie jamais le code.
import { CODE_SMS_DEMO } from '../../demo/jeu-essai'
import { usePreferences } from '../../preferences'

/** La conversation « Support BelivaY » : son identifiant au serveur (« support ») ou dans la démonstration. */
export const FIL_SUPPORT = env.source === 'api' ? 'support' : 'f-support'

// ---------- Bouton (C.btn) ----------
export function Bouton(p: { classe?: string; icone?: string; vers?: string; onClick?: (e: MouseEvent) => void; style?: CSSProperties; inactif?: boolean; type?: 'button' | 'submit'; children: ReactNode; etiquette?: string }) {
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      <span>{p.children}</span>
    </>
  )
  const classe = 'btn ' + (p.classe ?? 'primary') + (p.inactif ? ' off' : '')
  return p.vers && !p.inactif ? (
    <Link to={p.vers} style={p.style} className={classe} onClick={p.onClick} aria-label={p.etiquette}>
      {contenu}
    </Link>
  ) : (
    <button type={p.type ?? 'button'} style={p.style} className={classe} onClick={p.inactif ? undefined : p.onClick} disabled={p.inactif} aria-disabled={p.inactif || undefined} aria-label={p.etiquette}>
      {contenu}
    </button>
  )
}

// Lien texte du prototype (« Annuler », « Masquer ») : un vrai bouton, cible de 44 px.
export function LienTexte(p: { onClick: () => void; children: ReactNode; classe?: string; style?: CSSProperties; etiquette?: string }) {
  return (
    <button type="button" onClick={p.onClick} aria-label={p.etiquette} className={'t13 b7 ' + (p.classe ?? 'cor')} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, ...p.style }}>
      {p.children}
    </button>
  )
}

// ---------- Interrupteur (.tg) ----------
export function Interrupteur(p: { actif: boolean; changer?: (v: boolean) => void; libelle: string; verrou?: boolean }) {
  const { t } = usePreferences()
  return (
    <button
      type="button"
      className={'tg' + (p.actif ? ' on' : '') + (p.verrou ? ' lock' : '')}
      role="switch"
      aria-checked={p.actif}
      aria-label={t(p.libelle)}
      aria-disabled={p.verrou || undefined}
      disabled={p.verrou}
      onClick={() => {
        if (p.verrou || !p.changer) return
        jouer('interrupteur')
        p.changer(!p.actif)
      }}
    ></button>
  )
}

// ---------- Feuille du bas (C.sheet), avec son adresse ----------
/** Une feuille ouverte par un paramètre d'adresse (« ?prog=1 ») : lien profond, retour ferme, comme le prototype. */
export function useFeuilleAdresse(cle: string, valeur = '1') {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ouverte = params.get(cle) === valeur
  const ouvrir = useCallback(() => {
    const p = new URLSearchParams(params)
    p.set(cle, valeur)
    naviguer({ search: '?' + p.toString() })
  }, [params, cle, valeur, naviguer])
  const fermer = useCallback(() => {
    const p = new URLSearchParams(params)
    p.delete(cle)
    const s = p.toString()
    naviguer({ search: s ? '?' + s : '' }, { replace: true })
  }, [params, cle, naviguer])
  return { ouverte, ouvrir, fermer }
}

export function Feuille(p: { ouverte: boolean; fermer: () => void; titre: string; children: ReactNode }) {
  const { t } = usePreferences()
  const boite = useRef<HTMLDivElement>(null)
  const { fermer, ouverte } = p
  useEffect(() => {
    if (!ouverte) return
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', echap)
    const avant = document.activeElement as HTMLElement | null
    boite.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', echap)
      avant?.focus?.({ preventScroll: true })
    }
  }, [ouverte, fermer])
  if (!ouverte) return null
  return (
    <>
      <div className="veil" onClick={fermer} aria-hidden="true"></div>
      <div ref={boite} className="sheet" role="dialog" aria-modal="true" aria-label={t(p.titre)} data-feuille="" style={{ maxHeight: '88%', overflowY: 'auto' }}>
        <div className="grab"></div>
        {p.children}
      </div>
    </>
  )
}

// ---------- Code SMS à six cases (second facteur) ----------
export function CodeSms(p: {
  masque: string // « 6•• •• •• 17 »
  bouton: string
  icone?: string
  valider: (code: string) => Promise<string | null> // null : bon code ; sinon le message d'erreur
  renvoyer?: () => Promise<void>
  annuler?: () => void
}) {
  const { t, tf } = usePreferences()
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [reste, setReste] = useState(60)
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (reste <= 0) return
    const id = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [reste])
  const valider = async () => {
    if (code.length !== 6 || enCours) return
    setEnCours(true)
    const e = await p.valider(code)
    setEnCours(false)
    if (e) {
      jouer('erreur')
      setErreur(e)
      setCode('')
      champ.current?.focus()
    } else jouer('code')
  }
  return (
    <div>
      <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
        {tf('Code envoyé par SMS au {n}, votre téléphone personnel.', { n: p.masque })}
      </p>
      <label style={{ position: 'relative', display: 'block' }}>
        <span className="otp" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < code.length ? 'f' : i === code.length ? 'cur' : ''}>
              {code[i] ?? ''}
            </span>
          ))}
        </span>
        <input
          ref={champ}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label={t('Code à 6 chiffres')}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            setErreur(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && void valider()}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', fontSize: '16px' }}
        />
      </label>
      <div className="t13 center mt8" role={erreur ? 'alert' : undefined} style={{ color: erreur ? 'var(--red)' : 'var(--ink-3)', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {erreur ??
          (reste > 0 || !p.renvoyer ? (
            p.renvoyer ? tf('Renvoyer le code dans {s} s', { s: reste }) : t('Le code marche 10 minutes.')
          ) : (
            <LienTexte
              onClick={() => {
                void p.renvoyer!().then(() => setReste(60))
              }}
            >
              {t('Renvoyer le code')}
            </LienTexte>
          ))}
      </div>
      <div className="mt8">
        <Bouton icone={p.icone ?? 'check'} inactif={code.length !== 6 || enCours} onClick={() => void valider()}>
          {t(p.bouton)}
        </Bouton>
      </div>
      {p.annuler && (
        <div className="mt8">
          <Bouton classe="ghost" onClick={p.annuler}>
            {t('Annuler')}
          </Bouton>
        </div>
      )}
      {/* Aide de la démonstration seulement : avec le serveur, le code n'arrive que par SMS. */}
      {env.source === 'demo' && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Démonstration : le code est {c}.', { c: CODE_SMS_DEMO })}</span>
        </div>
      )}
    </div>
  )
}

// ---------- États de lecture ----------
export function Chargement() {
  const { t } = usePreferences()
  return (
    <div className="card" aria-busy="true" style={{ marginTop: '18px' }}>
      <div className="row t14 c3" style={{ gap: '10px' }}>
        <Icone nom="hourglass" taille={18} />
        <span>{t('Chargement…')}</span>
      </div>
    </div>
  )
}

export function ErreurLecture({ erreur, relire }: { erreur: Error; relire: () => void }) {
  const { t } = usePreferences()
  if (erreur.name === 'ReserveAuProprietaire')
    return (
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
          <Icone nom="lock" taille={20} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <div className="grow">
            <div className="b8 t15">{t('Réservé au propriétaire')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {t('Cet écran est géré par le propriétaire de la boutique. Votre accès Préparation garde tout le travail des commandes.')}
            </div>
          </div>
        </div>
        <div className="mt12">
          <Bouton classe="secondary" icone="layout-grid" vers={chemin('accueil')}>
            {t('Revenir à l’accueil')}
          </Bouton>
        </div>
      </div>
    )
  return (
    <div className="card" role="alert" style={{ marginTop: '18px', border: '1.5px solid var(--red-line)', background: 'var(--red-soft)' }}>
      <div className="row" style={{ gap: '10px' }}>
        <Icone nom="cloud-off" taille={20} style={{ color: 'var(--red)', flexShrink: '0' }} />
        <div className="grow b8 t15 cr">{t('Lecture impossible pour le moment')}</div>
      </div>
      <p className="t13 c2" style={{ margin: '8px 0 0', lineHeight: '1.45' }}>
        {t('Vérifiez votre connexion, puis réessayez. Rien n’a été changé.')}
      </p>
      <div className="mt12">
        <Bouton classe="secondary" icone="refresh-cw" onClick={relire}>
          {t('Réessayer')}
        </Bouton>
      </div>
    </div>
  )
}

/** Connexion du téléphone (événements online / offline) : bandeau « hors connexion » des écrans. */
export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const oui = () => setEnLigne(true)
    const non = () => setEnLigne(false)
    window.addEventListener('online', oui)
    window.addEventListener('offline', non)
    return () => (window.removeEventListener('online', oui), window.removeEventListener('offline', non))
  }, [])
  return enLigne
}

export function BandeauHorsLigne({ texte }: { texte?: string }) {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  if (enLigne) return null
  return (
    <div className="hint-l" role="status" data-hors-ligne="" style={{ color: 'var(--amber)' }}>
      <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{t(texte ?? 'Hors connexion : vous lisez la dernière version gardée sur le téléphone. Les changements partiront au retour du réseau.')}</span>
    </div>
  )
}

// ---------- Annonce brève (aria-live) ----------
export function useAnnonce(): [ReactNode, (texte: string, ton?: 'ok' | 'erreur') => void] {
  const [a, setA] = useState<{ texte: string; ton: 'ok' | 'erreur'; n: number } | null>(null)
  useEffect(() => {
    if (!a) return
    const id = setTimeout(() => setA(null), 4000)
    return () => clearTimeout(id)
  }, [a])
  // Un refus s'entend (son « erreur » du client) ; l'annonce glisse comme les messages du client (vendeur.css).
  const dire = useCallback((texte: string, ton: 'ok' | 'erreur' = 'ok') => {
    if (ton === 'erreur') jouer('erreur')
    setA((x) => ({ texte, ton, n: (x?.n ?? 0) + 1 }))
  }, [])
  const noeud = (
    <div
      role="status"
      aria-live="polite"
      data-annonce={a?.ton}
      style={
        a
          ? { position: 'absolute', left: '16px', right: '16px', bottom: '112px', zIndex: 60, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: a.ton === 'ok' ? 'var(--ink)' : 'var(--red)', color: a.ton === 'ok' ? 'var(--sand)' : '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.35, boxShadow: '0 12px 30px -12px rgba(0,0,0,.5)' }
          : { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }
      }
    >
      {a && (
        <>
          <Icone nom={a.ton === 'ok' ? 'circle-check' : 'circle-alert'} taille={17} />
          <span>{a.texte}</span>
        </>
      )}
    </div>
  )
  return [noeud, dire]
}

// ---------- Textes à valeurs typées (notifications, aide) ----------
export function useEcrire() {
  const { tf, langue } = usePreferences()
  return useCallback(
    (x: TexteNotification, maintenant: number) => {
      const v: Record<string, string | number> = { ...(x.valeurs ?? {}) }
      for (const [k, n] of Object.entries(x.montants ?? {})) v[k] = `${F(n)} F`
      for (const [k, n] of Object.entries(x.heures ?? {})) v[k] = heure(n, langue)
      for (const [k, n] of Object.entries(x.echeances ?? {})) v[k] = echeance(n, maintenant, langue)
      for (const [k, n] of Object.entries(x.jours ?? {})) v[k] = jourCourt(n, langue)
      for (const [k, c] of Object.entries(x.creneaux ?? {})) v[k] = entre(c, langue)
      return tf(x.modele, v)
    },
    [tf, langue],
  )
}

/** « 21 sept. 2026 », « 21 Sept 2026 » ; sans l'année : « 21 sept. ». */
export function dateCourte(jourOuInstant: string | number, langue: 'fr' | 'en', annee = false): string {
  const d = typeof jourOuInstant === 'string' ? new Date(jourOuInstant + 'T12:00:00Z') : new Date(jourOuInstant + 3600 * 1000)
  const MOIS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
  return `${d.getUTCDate()} ${MOIS[langue][d.getUTCMonth()]}${annee ? ' ' + d.getUTCFullYear() : ''}`
}

/** « il y a 5 jours », « il y a 3 semaines », « aujourd'hui ». */
export function ilYa(ms: number, maintenant: number, langue: 'fr' | 'en'): string {
  // En jours civils de Yaoundé (UTC+1) : un avis d'hier soir est « hier », même 12 h après.
  const jour = (x: number) => Math.floor((x + 3600 * 1000) / 86400000)
  const j = jour(maintenant) - jour(ms)
  if (langue === 'en') return j <= 0 ? 'today' : j === 1 ? 'yesterday' : j < 14 ? `${j} days ago` : `${Math.floor(j / 7)} weeks ago`
  return j <= 0 ? 'aujourd’hui' : j === 1 ? 'hier' : j < 14 ? `il y a ${j} jours` : `il y a ${Math.floor(j / 7)} semaines`
}

// ---------- Horaires en une ligne (« Lun – ven 08 h – 18 h · sam 08 h – 14 h ») ----------
const JOURS_COURTS = { fr: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
export const JOURS_LONGS = { fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }
export function resumeHoraires(h: { jour: number; ouvert: boolean; de: string; a: string }[], langue: 'fr' | 'en'): string {
  const tri = [...h].sort((a, b) => a.jour - b.jour)
  const groupes: { de: number; a: number; h: string }[] = []
  for (const x of tri) {
    if (!x.ouvert) continue
    const plage = `${heure(x.de, langue)} – ${heure(x.a, langue)}`
    const g = groupes.at(-1)
    if (g && g.a === x.jour - 1 && g.h === plage) g.a = x.jour
    else groupes.push({ de: x.jour, a: x.jour, h: plage })
  }
  if (!groupes.length) return langue === 'en' ? 'Closed every day' : 'Fermée tous les jours'
  const j = JOURS_COURTS[langue]
  const s = groupes.map((g) => `${g.de === g.a ? j[g.de] : `${j[g.de]} – ${j[g.a]}`} ${g.h}`).join(' · ')
  return s[0].toUpperCase() + s.slice(1)
}

// ---------- Choisir une photo (prendre ou choisir ; rognée au cercle si demandé) ----------
/** Bouton « Prendre ou choisir une photo » et, pour un logo ou un portrait, la feuille de rognage (à poser dans
 *  `fixes` de l'écran). Erreurs dites en mots : type, poids, lecture. */
export function usePhoto(p: { rogner: boolean; forme?: FormeRognage; utiliser: (photo: string) => void | Promise<void>; erreur: (texte: string) => void }) {
  const { t } = usePreferences()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const raison = (e: unknown) => {
    const m = e instanceof Error ? e.message : ''
    p.erreur(t(m === 'type' ? 'Photo refusée : JPG, PNG ou WebP seulement.' : m === 'taille' ? 'Photo trop lourde : 10 Mo au plus.' : 'Photo illisible : essayez-en une autre.'))
  }
  const choisir = async (f: File | undefined) => {
    if (!f) return
    try {
      if (p.rogner) setImg((await ouvrirPhoto(f)).img)
      else await p.utiliser(await reduirePhoto(f))
    } catch (e) {
      raison(e)
    }
  }
  const bouton = (libelle: string, classe = 'secondary sm', icone = 'camera') => (
    <label className={'btn ' + classe} style={{ cursor: 'pointer' }}>
      <Icone nom={icone} taille={18} />
      <span>{t(libelle)}</span>
      <input type="file" accept="image/*" onChange={(e) => (void choisir(e.target.files?.[0]), (e.target.value = ''))} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />
    </label>
  )
  const feuille = img ? (
    <Rognage
      img={img}
      forme={p.forme}
      annuler={() => setImg(null)}
      utiliser={(photo) => {
        setImg(null)
        void p.utiliser(photo)
      }}
    />
  ) : null
  return { bouton, feuille }
}

/** « jeu. 24 déc. » / « Thu 24 Dec » (jour civil « 2026-12-24 » ou instant). */
export function jourDate(j: string | number, langue: 'fr' | 'en'): string {
  const d = typeof j === 'string' ? new Date(j + 'T12:00:00Z') : new Date(j + 3600 * 1000)
  const J = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
  return `${J[langue][d.getUTCDay()]} ${dateCourte(j, langue)}`
}

/** Champ posé dans une case .inp du prototype (16 px : pas de zoom du téléphone). */
export const CHAMP: CSSProperties = { border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '16px', color: 'var(--ink)', minWidth: 0, flex: 1, height: '100%', padding: 0 }
/** Zone de texte aux couleurs d'une case .inp. */
export const ZONE: CSSProperties = { width: '100%', minHeight: '88px', borderRadius: '12px', border: '1.5px solid var(--input-line)', background: 'var(--input-bg)', padding: '12px 13px', font: 'inherit', fontSize: '16px', color: 'var(--ink)', resize: 'vertical', boxSizing: 'border-box' }
