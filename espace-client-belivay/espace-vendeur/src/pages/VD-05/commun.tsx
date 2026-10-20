// Outils communs aux écrans du groupe VD-05 (Commandes et préparation) : liens qui gardent le scénario « accès
// Préparation » de la démonstration, bouton du prototype (C.btn), comptes à rebours en heures d'ouverture, états de
// lecture (chargement, erreur, introuvable), connexion (hors connexion : lecture seule, « C'est prêt » mis en file avec
// son heure d'origine, Q-93), avis après un geste (porté par la navigation), heures écrites FR / EN.
import { useCallback, useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Chiffres } from '@client/composants/Chrono'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Commande, EntreeJournal } from '../../donnees/domaines/commandes'
import { heuresOuvertes, ouverteA, ajouterOuvertes, type CalendrierBoutique } from '../../donnees/domaines/preparation'
import { enAttente, mettreEnFile as mettreEnFileCommune, useEnLigne as useEnLigneCommun, useFile } from '../../donnees/fileHorsLigne'
import { duree, echeance, heure, type Langue } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { jourDe } from '../../calculs/temps'

/** Lien vers une route ; garde « ?role=prep » (scénario de démonstration de l'accès Préparation). */
export function useLien() {
  const { search } = useLocation()
  const prep = new URLSearchParams(search).get('role') === 'prep'
  return useCallback((route: string, params: Record<string, string | number | null | undefined> = {}) => chemin(route, prep ? { ...params, role: 'prep' } : params), [prep])
}

// Bouton du prototype (C.btn) : un lien quand il mène ailleurs, un bouton quand c'est un geste.
export function Bouton(p: { classe: string; icone?: string; vers?: string; onClick?: (e: MouseEvent) => void; style?: CSSProperties; desactive?: boolean; titre?: string; children: ReactNode }) {
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
    <button type="button" style={p.style} className={'btn ' + p.classe + (p.desactive ? ' off' : '')} onClick={p.onClick} disabled={p.desactive} aria-disabled={p.desactive || undefined} title={p.titre}>
      {contenu}
    </button>
  )
}

export const LIEN_44 = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 4px' } as const

/** Heure courte le jour même, sinon « demain à … » / « mercredi 23 sept. à … ». */
export const quand = (t: number, maintenant: number, langue: Langue) => (jourDe(t) === jourDe(maintenant) ? heure(t, langue) : echeance(t, maintenant, langue))

/** Temps qui reste avant l'échéance, en heures d'ouverture de la boutique (REFVD-R134). */
export const restantOuvert = (c: Pick<Commande, 'echeance' | 'calendrier'>, maintenant: number) => (c.echeance ? heuresOuvertes(maintenant, c.echeance, c.calendrier) : 0)

/** Progression réelle de la préparation, en heures d'ouverture (PRE-04). */
export function progression(c: Pick<Commande, 'debut' | 'echeance' | 'calendrier'>, maintenant: number): number {
  if (!c.echeance) return 100
  const tout = heuresOuvertes(c.debut, c.echeance, c.calendrier)
  return tout <= 0 ? 100 : Math.min(100, Math.max(0, (heuresOuvertes(c.debut, maintenant, c.calendrier) / tout) * 100))
}

/** Urgence d'une commande à préparer : dépassement dans moins de 30 min (REFCL-R043), dépassée. */
export const urgence = (reste: number, echeanceA: number | null, maintenant: number) => (echeanceA !== null && echeanceA <= maintenant ? 'depassee' : reste <= 30 * 60 * 1000 ? 'imminente' : 'normale')

/** Reprise du décompte quand la boutique est fermée (« reprend demain à 08 h »). */
export const reprise = (cal: CalendrierBoutique, maintenant: number) => (ouverteA(maintenant, cal) ? null : ajouterOuvertes(maintenant, 0, cal))

/** Durée qui défile chiffre à chiffre comme les minuteurs du client (sans animation : même texte, d'un tenant). */
export function Duree({ ms, finir }: { ms: number; finir?: () => void }) {
  const { langue } = usePreferences()
  const avant = useRef(ms)
  useEffect(() => {
    if (avant.current > 0 && ms <= 0) {
      jouer('fin')
      finir?.()
    }
    avant.current = ms
  }, [ms, finir])
  return <Chiffres texte={duree(ms, langue)} />
}

/** Écran d'attente, d'erreur ou d'adresse sans commande (REF-VD : chargement, erreur réseau + Réessayer, vide). */
export function EtatLecture({ route, erreur, vide, relire, titre }: { route: string; erreur: Error | null; vide?: boolean; relire: () => void; titre?: string }) {
  const { t } = usePreferences()
  const lien = useLien()
  if (!erreur && !vide)
    return (
      <Ecran route={route} titre={titre}>
        <div className="card mt16" aria-busy="true" aria-label={t('Chargement')} style={{ minHeight: '120px', opacity: 0.6 }} />
        <div className="card" aria-hidden="true" style={{ minHeight: '80px', opacity: 0.4 }} />
      </Ecran>
    )
  return (
    <Ecran route={route} titre={titre}>
      <div className="card mt16">
        <div className="empty">
          <div className="ei">
            <Icone nom={erreur ? 'wifi-off' : 'package-search'} taille={26} />
          </div>
          <h3>{erreur ? t('Pas de connexion') : t('Commande introuvable')}</h3>
          <p>{erreur ? t('Les commandes s’afficheront dès le retour du réseau.') : t('Cette commande n’existe pas ou ne fait plus partie de votre boutique.')}</p>
          <div className="mt14">
            {erreur ? (
              <Bouton classe="primary" icone="rotate-cw" onClick={relire}>
                {t('Réessayer')}
              </Bouton>
            ) : (
              <Bouton classe="primary" icone="shopping-bag" vers={lien('commandes')}>
                {t('Voir mes commandes')}
              </Bouton>
            )}
          </div>
        </div>
      </div>
    </Ecran>
  )
}

// ---------- Connexion et file d'attente hors connexion (Q-93 : « C'est prêt » en file 72 h) ----------

// La file vit dans le module commun (src/donnees/fileHorsLigne.ts, domaine accueil) : une seule file pour l'accueil,
// les commandes, la remise et les autres gestes ; elle part toute seule au retour du réseau (App.tsx).

/** Garde un « C'est prêt » touché sans réseau, avec son heure d'origine (heure du serveur, origin_time). */
export function mettreEnFile(ref: string) {
  void mettreEnFileCommune('pret', ref)
}

/** Réseau de l'écran et « C'est prêt » gardés en file (référence de chaque commande). */
export function useEnLigne() {
  const enLigne = useEnLigneCommun()
  const file = enAttente(useFile(), 'pret').map((a) => ({ ref: a.objet, a: a.origine }))
  return { enLigne, file }
}

/** Bandeau hors connexion (OFF-01, VD05-R07) : liste gardée et son heure, actions en attente d'envoi. */
export function HorsLigne({ lueA, enFile }: { lueA: number; enFile: number }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="offline-banner" role="status">
      <Icone nom="wifi-off" taille={18} />
      <span>
        {tf('Hors connexion · liste de {h}', { h: heure(lueA, langue) })}
        {enFile > 0 ? ' · ' + tf(enFile > 1 ? '{n} actions en attente d’envoi' : '{n} action en attente d’envoi', { n: enFile }) : ''}
        <br />
        {t('« C’est prêt » part dès le retour du réseau, avec son heure.')}
      </span>
    </div>
  )
}

// ---------- Avis après un geste (porté par la navigation : « Rupture signalée », « Nouvelle heure ») ----------

export interface AvisGeste {
  ton: 'green' | 'or' | 'ink'
  texte: string
}

export function useAvisRecu(): [AvisGeste | null, () => void] {
  const lieu = useLocation()
  const naviguer = useNavigate()
  const avis = (lieu.state as { avis?: AvisGeste } | null)?.avis ?? null
  const fermer = useCallback(() => naviguer(lieu.pathname + lieu.search, { replace: true, state: null }), [lieu.pathname, lieu.search, naviguer])
  return [avis, fermer]
}

export function Avis({ avis, fermer }: { avis: AvisGeste; fermer: () => void }) {
  const { t } = usePreferences()
  return (
    <div className={'note ' + avis.ton + (avis.ton === 'green' ? ' blv-succes' : '')} role="status">
      <Icone nom={avis.ton === 'green' ? 'circle-check' : 'info'} taille={18} />
      <div className="grow">{avis.texte}</div>
      <button type="button" className="ibtn" aria-label={t('Fermer')} onClick={fermer} style={{ width: '32px', height: '32px', margin: '-6px -6px -6px 0', color: 'inherit' }}>
        <Icone nom="x" taille={16} />
      </button>
    </div>
  )
}

// ---------- Journal : ce qui s'écrit d'une ligne (action, auteur et rôle, avant → après) ----------

export const ROLES: Record<EntreeJournal['role'], string> = { proprietaire: 'propriétaire', preparation: 'accès préparation', systeme: 'Système BelivaY' }

/** Valeur avant / après : un nombre est une heure (Plus de temps), sinon le texte tel quel (stock). */
export const valeurJournal = (v: string | number, maintenant: number, langue: Langue) => (typeof v === 'number' ? quand(v, maintenant, langue) : v)

const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
const JOURS_COURTS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }

/** « 18 sept. » / « 18 Sept » (un instant ou un jour « AAAA-MM-JJ »). */
export function jourMois(v: number | string, langue: Langue): string {
  const d = new Date(typeof v === 'string' ? v + 'T12:00:00Z' : v + 3600 * 1000)
  return `${d.getUTCDate()} ${MOIS_COURTS[langue][d.getUTCMonth()]}`
}

/** « mar. 22 » / « Tue 22 ». */
export function jourCourtNum(v: number | string, langue: Langue): string {
  const d = new Date(typeof v === 'string' ? v + 'T12:00:00Z' : v + 3600 * 1000)
  return `${JOURS_COURTS[langue][d.getUTCDay()]} ${d.getUTCDate()}`
}

/** « lun. 21 sept. » / « Mon 21 Sept ». */
export function jourDate(v: number, langue: Langue): string {
  const d = new Date(v + 3600 * 1000)
  return `${JOURS_COURTS[langue][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[langue][d.getUTCMonth()]}`
}

/** « 14:00 » d'un instant (heure de Yaoundé), pour les créneaux (entre(), creneau()). */
export function hhmm(t: number): string {
  const d = new Date(t + 3600 * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
