// Pièces communes des écrans d'ENT-07 (argent et qualité) et d'ENT-08 (outils de l'entreprise) :
// - montants écrits par une seule fonction (« 17 840 F », « 17,840 F » en anglais), jamais saisis ;
// - dates et heures de Yaoundé en mots simples (« aujourd'hui à 17 h 05 », « lun. 12 oct. »), comptes à rebours ;
// - états de l'écran : chargement (squelettes), erreur (bandeau rouge, données gardées, Réessayer, support), vide
//   (icône, phrase, raison, action), annonce d'un geste réussi ou refusé (role=status, succès animé .blv-succes) ;
// - onglets gardés dans l'adresse (« ?onglet= ») avec leurs compteurs ; réseau du poste (hors connexion : un envoi
//   attend, la coque pose déjà le bandeau).
import './ent07.css'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { versAnglais } from '@client/i18n/texte'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { HEURE, JOUR, jourDe } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { fichier } from '../../donnees/exports'

// ── Montants ────────────────────────────────────────────────────────────────────────────────────────────────────
export function useF() {
  const { langue } = usePreferences()
  return useCallback((n: number, signe = false) => {
    const v = `${n < 0 ? '−' : signe && n > 0 ? '+' : ''}${F(Math.abs(n))} F`
    return langue === 'en' ? versAnglais(v) : v
  }, [langue])
}

// ── Dates (Yaoundé, UTC+1) ──────────────────────────────────────────────────────────────────────────────────────
const JOURS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const JOURS_L = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
const MOIS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
const local = (v: number | string) => (typeof v === 'string' ? new Date(v + 'T00:00:00Z') : new Date(v + HEURE))

export function useDates() {
  const { langue: l } = usePreferences()
  return useMemo(() => {
    const heure = (t: number) => {
      const d = local(t)
      const h = d.getUTCHours()
      const m = String(d.getUTCMinutes()).padStart(2, '0')
      return l === 'en' ? `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}` : `${h} h ${m}`
    }
    const jour = (v: number | string) => {
      const d = local(v)
      return `${JOURS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[l][d.getUTCMonth()]}`
    }
    const jourLong = (v: number | string) => {
      const d = local(v)
      return `${JOURS_L[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[l][d.getUTCMonth()]}`
    }
    const quand = (t: number, maintenant: number) => {
      const sep = l === 'en' ? ' at ' : ' à '
      const j = jourDe(t)
      const mots = j === jourDe(maintenant) ? (l === 'en' ? 'today' : 'aujourd’hui') : j === jourDe(maintenant + JOUR) ? (l === 'en' ? 'tomorrow' : 'demain') : j === jourDe(maintenant - JOUR) ? (l === 'en' ? 'yesterday' : 'hier') : jour(t)
      return mots + sep + heure(t)
    }
    /** « 28 h 12 » ; « 2 j 4 h » au-delà de deux jours. */
    const reste = (ms: number) => {
      const min = Math.max(0, Math.ceil(ms / 60000))
      const h = Math.floor(min / 60)
      if (h >= 48) return l === 'en' ? `${Math.floor(h / 24)} d ${h % 24} h` : `${Math.floor(h / 24)} j ${h % 24} h`
      return `${h} h ${String(min % 60).padStart(2, '0')}`
    }
    return { heure, jour, jourLong, quand, reste }
  }, [l])
}

// ── Réseau ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function useEnLigne() {
  const [en, setEn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setEn(true)
    const off = () => setEn(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => (window.removeEventListener('online', on), window.removeEventListener('offline', off))
  }, [])
  return en
}

// ── États de l'écran ────────────────────────────────────────────────────────────────────────────────────────────
export function Chargement({ n = 3 }: { n?: number }) {
  const { t } = usePreferences()
  return (
    <div className="e7-charge" aria-busy="true" aria-label={t('Chargement')}>
      {[...Array(n)].map((_, i) => (
        <div key={i} className="chargement" />
      ))}
    </div>
  )
}

/** Erreur de lecture : bandeau rouge, les données déjà affichées restent visibles ; Réessayer ; support. */
export function ErreurLecture({ erreur, relire }: { erreur: Error | null; relire: () => void }) {
  const { t } = usePreferences()
  if (!erreur) return null
  return (
    <div className="bandeau rouge" role="alert">
      <Icone nom="circle-alert" taille={18} />
      <span className="grow">
        {t('Les données n’ont pas pu être chargées. Ce qui est affiché reste valable.')} <Link to={chemin('messages', { sheet: 'nouveau' })}>{t('Écrire au support')}</Link>
      </span>
      <button type="button" className="btn sm ghost" onClick={relire}>
        <Icone nom="rotate-cw" taille={16} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

export function Vide({ icone, titre, texte, children }: { icone: string; titre: string; texte: string; children?: ReactNode }) {
  return (
    <div className="vide">
      <div className="ei">
        <Icone nom={icone} taille={26} />
      </div>
      <h3>{titre}</h3>
      <p>{texte}</p>
      {children && <div className="btns mt10">{children}</div>}
    </div>
  )
}

/** Annonce d'un geste : succès (vert, animé) ou refus (rouge), lue par les lecteurs d'écran. */
export function useAnnonce() {
  const [a, setA] = useState<{ ok: boolean; texte: string; n: number } | null>(null)
  const minuteur = useRef<number | undefined>(undefined)
  const annoncer = useCallback((ok: boolean, texte: string) => {
    setA((x) => ({ ok, texte, n: (x?.n ?? 0) + 1 }))
    jouer(ok ? 'valide' : 'erreur')
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setA(null), 6000)
  }, [])
  useEffect(() => () => window.clearTimeout(minuteur.current), [])
  const vue = a && (
    <div key={a.n} className={'e7-annonce ' + (a.ok ? 'ok blv-succes' : 'non')} role="status">
      <Icone nom={a.ok ? 'circle-check' : 'circle-alert'} taille={18} />
      <span>{a.texte}</span>
    </div>
  )
  return { annoncer, vue }
}

// ── Onglets gardés dans l'adresse ───────────────────────────────────────────────────────────────────────────────
export function useOnglet<T extends string>(permis: readonly T[], defaut: T, cle = 'onglet'): [T, (o: T) => void] {
  const [params, setParams] = useSearchParams()
  const v = params.get(cle) as T | null
  const actif = v && permis.includes(v) ? v : defaut
  const choisir = (o: T) => {
    const p = new URLSearchParams(params)
    if (o === defaut) p.delete(cle)
    else p.set(cle, o)
    setParams(p, { replace: true })
  }
  return [actif, choisir]
}

export function Onglets<T extends string>({ onglets, actif, choisir, aria }: { onglets: { id: T; titre: string; n?: number | null; ton?: 'alerte' }[]; actif: T; choisir: (o: T) => void; aria: string }) {
  const { t } = usePreferences()
  return (
    <div className="e7-onglets" role="tablist" aria-label={aria}>
      {onglets.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={o.id === actif} className={o.id === actif ? 'on' : ''} onClick={() => choisir(o.id)}>
          <span>{t(o.titre)}</span>
          {o.n ? <b className={'compteur' + (o.ton === 'alerte' ? ' alerte' : '')}>{o.n}</b> : null}
        </button>
      ))}
    </div>
  )
}

/** Mention des éléments fixés par BelivaY (ENT-UIX-06). */
export function FixeParBelivay() {
  const { t } = usePreferences()
  return (
    <span className="pill e7-fixe">
      <Icone nom="lock" taille={12} />
      {t('Fixé par BelivaY')}
    </span>
  )
}

/** Télécharge un contenu produit par la source (CSV, JSON, PDF en chaîne d'octets) sous un nom de fichier. */
export function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(fichier(contenu, type))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

