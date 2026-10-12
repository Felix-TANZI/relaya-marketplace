// Ce que partagent les écrans du groupe VD-10 (Trust Score, paliers, croissance) : boutons du prototype, segments,
// blocs repliés, états de lecture (chargement en squelette, erreur avec « Réessayer », hors connexion, réservé au
// propriétaire), compteurs qui défilent, anneau du score, courbe, feuille du bas, message bref, dates courtes.
// Animations de la famille du client : coupées en mouvement réduit et sous navigateur piloté (mouvementLibre()).
import './vd10.css'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { mouvementLibre } from '@client/composants/Animations'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { heure } from '../../i18n/temps'
import { DECALAGE_YAOUNDE_MS, jourDe } from '../../calculs/temps'

// ---------- Boutons, liens, blocs ----------

/** Bouton du prototype (C.btn) : un lien quand il mène ailleurs, un bouton quand c'est un geste. */
export function Bouton(p: { classe: string; icone?: string; vers?: string; onClick?: (e: MouseEvent) => void; style?: CSSProperties; desactive?: boolean; raison?: string; children: ReactNode }) {
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      <span>{p.children}</span>
    </>
  )
  if (p.vers && !p.desactive)
    return (
      <Link to={p.vers} style={p.style} className={'btn ' + p.classe} onClick={p.onClick}>
        {contenu}
      </Link>
    )
  return (
    <button type="button" style={p.style} className={'btn ' + p.classe} onClick={p.onClick} disabled={p.desactive} title={p.desactive ? p.raison : undefined}>
      {contenu}
    </button>
  )
}

/** Bloc replié du prototype (C.more) : fermé à l'ouverture, texte présent pour les lecteurs d'écran. */
export function Plus({ titre, icone = 'info', plat, children, ouvert }: { titre: string; icone?: string; plat?: boolean; ouvert?: boolean; children: ReactNode }) {
  return (
    <details className={'more' + (plat ? ' flat' : '')} open={ouvert}>
      <summary>
        <Icone nom={icone} taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{titre}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">{children}</div>
    </details>
  )
}

/** Segments du prototype : des liens (la pastille glisse : Animations du client). */
export function Segments({ items, actif }: { items: [string, string][]; actif: string }) {
  const { t } = usePreferences()
  return (
    <div className="seg">
      {items.map(([route, libelle]) => (
        <Link key={route} to={chemin(route)} className={route === actif ? 'on' : ''} aria-current={route === actif ? 'page' : undefined} replace>
          {t(libelle)}
        </Link>
      ))}
    </div>
  )
}
export const SEG_TRUST: [string, string][] = [
  ['palier', 'Mon palier'],
  ['score', 'Mon score'],
  ['paliers', 'Les paliers'],
]
export const SEG_PLANS: [string, string][] = [
  ['plans_liste', 'Les plans'],
  ['plans', 'Simulateur'],
]

/** Ligne-lien de 56 px (li du prototype). */
export function Ligne({ vers, icone, ton = '', titre, sous, droite, children }: { vers: string; icone?: string; ton?: string; titre: string; sous?: ReactNode; droite?: ReactNode; children?: ReactNode }) {
  return (
    <Link to={vers} className="li">
      {icone && (
        <span className={'ic ' + ton}>
          <Icone nom={icone} taille={20} />
        </span>
      )}
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {titre}
        </span>
        {sous && (
          <span className="ls" style={{ display: 'block' }}>
            {sous}
          </span>
        )}
        {children}
      </span>
      {droite ?? (
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      )}
    </Link>
  )
}

// ---------- Montants, dates ----------

/** Montant en un seul nœud (« 17 840 F », en anglais « 17,840 F »). */
export function useMontant() {
  const { t } = usePreferences()
  return (n: number) => t(`${F(n)} F`)
}

const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
const JOURS = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
/** Jour civil « 2026-11-27 » → « 27 nov. » / « 27 Nov ». */
export function dateCourte(jour: string, langue: 'fr' | 'en'): string {
  const [, m, d] = jour.split('-').map(Number)
  return `${d} ${MOIS_COURTS[langue][m - 1]}`
}
/** Instant → « vendredi 18 septembre à 10 h 12 » / « Friday 18 Sept at 10:12 am ». */
export function dateEtHeure(ms: number, langue: 'fr' | 'en'): string {
  const d = new Date(ms + DECALAGE_YAOUNDE_MS)
  const jour = `${JOURS[langue][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[langue][d.getUTCMonth()]}`
  return `${jour} ${langue === 'en' ? 'at' : 'à'} ${heure(ms, langue)}`
}
/** Instant → « 18 sept. » */
export const dateCourteDe = (ms: number, langue: 'fr' | 'en') => dateCourte(jourDe(ms), langue)
export const virgule = (n: number, d = 1) => n.toFixed(d).replace('.', ',')

// ---------- Mouvement ----------

/** Nombre qui monte de zéro jusqu'à sa valeur (700 ms), comme les compteurs du client ; immobile sinon. */
export function useCompteur(cible: number, duree = 700): number {
  const [v, setV] = useState(() => (mouvementLibre() ? 0 : cible))
  const depuis = useRef(0)
  useEffect(() => {
    if (!mouvementLibre()) {
      setV(cible)
      return
    }
    const de = depuis.current
    const t0 = performance.now()
    let id = 0
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree)
      const e = 1 - Math.pow(1 - k, 3)
      setV(de + (cible - de) * e)
      if (k < 1) id = requestAnimationFrame(pas)
      else depuis.current = cible
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [cible, duree])
  return v
}

/** Vrai au premier rendu suivant : laisse une jauge partir de zéro, puis glisser jusqu'à sa valeur. */
export function useApparu(): boolean {
  const [ok, setOk] = useState(() => !mouvementLibre())
  useEffect(() => {
    if (ok) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOk(true)))
    return () => cancelAnimationFrame(id)
  }, [ok])
  return ok
}

/** Anneau du score (dessin du prototype : r 34, trait 6) dont l'arc se dessine. */
export function Anneau({ valeur, taille = 76, texte }: { valeur: number; taille?: number; texte: string }) {
  const apparu = useApparu()
  const c = 2 * Math.PI * 34
  const plein = (Math.max(0, Math.min(100, valeur)) / 100) * c
  return (
    <div className="ring vd10-ring" style={{ width: taille + 'px', height: taille + 'px' }} role="img" aria-label={texte}>
      <svg width={taille} height={taille} viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="34" fill="none" stroke="var(--sand-3)" strokeWidth="6"></circle>
        <circle className="arc" cx="38" cy="38" r="34" fill="none" stroke="var(--braise-1)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(apparu ? plein : 0).toFixed(1)} ${c.toFixed(1)}`}></circle>
      </svg>
      <b aria-hidden="true">{texte}</b>
    </div>
  )
}

/** Courbe d'une série (score de la nuit), avec la ligne d'un seuil. */
export function Courbe({ valeurs, seuil, min = 40, max = 80, legende }: { valeurs: number[]; seuil: number | null; min?: number; max?: number; legende: [string, string] }) {
  const L = 300
  const H = 76
  const y = (v: number) => H - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * H
  const x = (i: number) => (valeurs.length > 1 ? (i / (valeurs.length - 1)) * L : 0)
  const d = valeurs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <>
      <svg className="vd10-courbe" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {seuil !== null && <line className="seuil" x1="0" x2={L} y1={y(seuil)} y2={y(seuil)} vectorEffect="non-scaling-stroke" />}
        <path className="aire" d={`${d} L${L} ${H} L0 ${H} Z`} />
        <path className="ligne" d={d} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="vd10-courbe-l">
        <span>{legende[0]}</span>
        <span>{legende[1]}</span>
      </div>
    </>
  )
}

// ---------- Réseau, lecture ----------

/** En ligne ou non (navigator.onLine), suivi en direct. */
export function useEnLigne(): boolean {
  const [v, setV] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setV(true)
    const off = () => setV(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => (window.removeEventListener('online', on), window.removeEventListener('offline', off))
  }, [])
  return v
}

/** Bandeau hors connexion : lecture seule, l'heure des données affichées (VD10-R09). */
export function HorsLigne({ depuis }: { depuis?: number }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="vd10-hl" role="status" data-hors-ligne="">
      <Icone nom="wifi-off" taille={16} />
      <span>
        <b>{t('Pas de connexion.')}</b> {depuis ? tf('Dernières données connues, calculées {quand}. Les gestes attendent le réseau.', { quand: dateEtHeure(depuis, langue) }) : t('Les gestes attendent le réseau.')}
      </span>
    </div>
  )
}

/** Squelette de chargement (scintille comme le client). */
export function Squelette({ lignes = [150, 96, 96] }: { lignes?: number[] }) {
  const { t } = usePreferences()
  return (
    <div aria-busy="true" aria-label={t('Chargement')}>
      {lignes.map((h, i) => (
        <i key={i} className="vd10-skel cl13-skel" style={{ height: h + 'px' }}></i>
      ))}
    </div>
  )
}

/**
 * Écran qui attend sa lecture : squelette tant qu'elle arrive ; erreur réseau avec « Réessayer » ; accès réservé au
 * propriétaire (403 owner_only) ; puis le contenu.
 */
export function Attente<T>({ route, lecture, titre, children }: { route: string; lecture: Lecture<T>; titre?: string; children: (d: T) => ReactNode }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  if (lecture.erreur) {
    const reserve = lecture.erreur.name === 'ReserveAuProprietaire'
    return (
      <Ecran route={route} titre={titre}>
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className={'ic ' + (reserve ? '' : 'red')} style={{ background: reserve ? 'var(--sand-2)' : undefined }}>
              <Icone nom={reserve ? 'lock' : 'wifi-off'} taille={20} />
            </span>
            <div className="grow">
              <div className="b8 t15">{reserve ? t('Réservé au propriétaire') : t('Pas de connexion')}</div>
              <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
                {reserve
                  ? tf('Les plans, les montants et les chiffres de la boutique sont réservés à {nom}, propriétaire.', { nom: s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : '' })
                  : t('Ces informations n’ont pas pu arriver. Vérifiez votre réseau, puis réessayez.')}
              </div>
            </div>
          </div>
          <div className="mt12">
            {reserve ? (
              <Bouton classe="secondary" icone="layout-grid" vers={chemin('accueil')} style={{ height: '44px' }}>
                {t('Retour à l’accueil')}
              </Bouton>
            ) : (
              <Bouton classe="secondary" icone="refresh-cw" onClick={lecture.relire} style={{ height: '44px' }}>
                {t('Réessayer')}
              </Bouton>
            )}
          </div>
        </div>
      </Ecran>
    )
  }
  if (lecture.donnees === null)
    return (
      <Ecran route={route} titre={titre}>
        <Squelette />
      </Ecran>
    )
  return <>{children(lecture.donnees)}</>
}

// ---------- Feuille, message bref ----------

/** Feuille du bas du prototype (voile + feuille) : Échap ou le voile la ferment ; on la tire vers le bas (client). */
export function Feuille({ titre, fermer, children }: { titre: string; fermer: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    document.addEventListener('keydown', k)
    ref.current?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true })
    return () => document.removeEventListener('keydown', k)
  }, [fermer])
  return (
    <>
      <div className="veil" onClick={fermer}></div>
      <div className="sheet vd10-feuille" role="dialog" aria-modal="true" aria-label={titre} ref={ref}>
        <div className="grab"></div>
        <div className="row" style={{ gap: '8px' }}>
          <h3 tabIndex={-1} style={{ margin: '0', fontSize: '19px', fontWeight: '800', outline: 'none' }}>
            {titre}
          </h3>
        </div>
        {children}
      </div>
    </>
  )
}

/** Ligne d'une feuille (icône ronde, texte). */
export function LigneFeuille({ icone, ton = '', children }: { icone: string; ton?: string; children: ReactNode }) {
  return (
    <div className="li" style={{ minHeight: '0', padding: '11px 0', alignItems: 'flex-start' }}>
      <span className={'ic ' + ton} style={{ width: '36px', height: '36px', borderRadius: '50%', ...(ton ? {} : { background: 'var(--sand-3)' }) }}>
        <Icone nom={icone} taille={18} />
      </span>
      <span className="grow t14 c2" style={{ lineHeight: '1.45', paddingTop: '7px' }}>
        {children}
      </span>
    </div>
  )
}

/** Message bref (3,5 s) en bas de l'écran. Succès (achat payé) : coche dessinée et gerbe du client (.blv-succes). */
export function useToast(): [ReactNode, (t: string, succes?: boolean) => void] {
  const [message, setMessage] = useState<{ texte: string; succes: boolean } | null>(null)
  const texte = message?.texte ?? null
  const setTexte = useCallback((t: string | null, succes = false) => setMessage(t ? { texte: t, succes } : null), [])
  useEffect(() => {
    if (!texte) return
    const x = setTimeout(() => setTexte(null), 3500)
    return () => clearTimeout(x)
  }, [texte])
  const app = typeof document !== 'undefined' ? document.getElementById('app') : null
  const noeud =
    texte && app
      ? createPortal(
          <div className={'vd10-toast' + (message?.succes ? ' blv-succes' : '')} role="status">
            <Icone nom="circle-check" taille={20} />
            <span>{texte}</span>
          </div>,
          app,
        )
      : null
  return [noeud, setTexte]
}
