// Outils des écrans des groupes ENT-03 et ENT-04 (accès, tableau de bord, contrat, état du compte, zones, flotte,
// livreurs, véhicules) : dates et heures de Yaoundé en français ou en anglais, chargement, erreur de lecture (données
// gardées, Réessayer), onglets et feuilles dans l'adresse. Les briques du prototype (indicateurs, état vide, onglets,
// anneau, barre, avatar) sont celles du kit commun : src/composants/prototype.tsx.
import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './ent.css'
import { AccesLegal, AccesLiens } from '@client/compte/acces'
import { COORDONNEES } from '@client/config/coordonnees'
import { PARAMETRES } from '../../calculs/registre'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'

const ZONE = 'Africa/Douala' // heure de Yaoundé (UTC+1)

/** Formats de date et d'heure dans la langue choisie, à l'heure de Yaoundé. */
export function useDates() {
  const { langue, tf, t } = usePreferences()
  const loc = langue === 'en' ? 'en-GB' : 'fr-FR'
  const parties = (ms: number) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]))
  const heure = (ms: number) => {
    const p = parties(ms)
    return langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  }
  const date = (ms: number, annee = false) => new Intl.DateTimeFormat(loc, { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', ...(annee ? { year: 'numeric' } : {}) }).format(new Date(ms))
  const jour = (ms: number) => new Intl.DateTimeFormat(loc, { timeZone: ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms))
  const dateHeure = (ms: number) => tf('{date} à {heure}', { date: date(ms), heure: heure(ms) })
  /** Durée lisible : « 2 h 54 », « 12 min », « 3 j ». */
  const duree = (ms: number) => {
    const m = Math.max(0, Math.round(ms / 60_000))
    if (m < 60) return tf('{n} min', { n: m })
    if (m < 48 * 60) return tf('{h} h {m}', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') })
    return tf('{n} j', { n: Math.floor(m / 1440) })
  }
  /** Échéance relative : « dans 2 h 54 », « il y a 12 min ». */
  const relatif = (ms: number, maintenant: number) => (ms >= maintenant ? tf('dans {d}', { d: duree(ms - maintenant) }) : tf('il y a {d}', { d: duree(maintenant - ms) }))
  const jours = (ms: number, maintenant: number) => Math.ceil((ms - maintenant) / 86_400_000)
  /** Jour civil « AAAA-MM-JJ » → « 13 oct. ». */
  const jourCivil = (j: string) => new Intl.DateTimeFormat(loc, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(j + 'T00:00:00Z'))
  return { heure, date, jour, dateHeure, duree, relatif, jours, jourCivil, t }
}

/** Squelette de chargement (même gabarit que la page qui arrive). */
export function Chargement({ lignes = 3 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div aria-busy="true" aria-label={t('Chargement')}>
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="chargement mt10" />
      ))}
    </div>
  )
}

/** Erreur de lecture (C.loadErr du prototype) : bandeau, données affichées gardées (« données de 13 h 02 »), Réessayer. */
export function ErreurLecture({ erreur, relire, lu }: { erreur: Error; relire: () => void; lu?: number | null }) {
  const { t, tf } = usePreferences()
  const { heure } = useDates()
  if (erreur.name === 'AccesRefuse') throw erreur // la garde dit « Réservé » et à qui
  return (
    <div className="dk-banner red" role="alert">
      <Icone nom="cloud-off" taille={20} />
      <div className="grow">
        <b>{t('Impossible de charger cette page.')}</b> {lu ? tf('Les données n’ont pas pu être mises à jour : vous voyez celles de {heure}.', { heure: heure(lu) }) : t('Les données n’ont pas pu être chargées. Vérifiez la connexion, puis réessayez.')}
      </div>
      <button type="button" className="btn secondary" onClick={relire}>
        <Icone nom="rotate-cw" taille={18} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

/** Onglets dont le choix est dans l'adresse (« ?t=score ») : un lien profond ouvre le bon onglet. */
export function useOnglet<T extends string>(permis: readonly T[], defaut: T, cle = 't'): [T, (o: T) => void] {
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

/** Icône d'un type de véhicule. */
export const ICONE_VEHICULE: Record<string, string> = { moto: 'bike', velo: 'bike', tricycle: 'truck', voiture: 'car', camionnette: 'truck' }
/** Libellés des types de véhicule. */
export const NOM_VEHICULE: Record<string, string> = { moto: 'Moto', velo: 'Vélo', tricycle: 'Tricycle', voiture: 'Voiture', camionnette: 'Camionnette' }
/** Libellés des classes de colis. */
export const NOM_CLASSE: Record<string, string> = { S: 'S', M: 'M', L: 'L', XL: 'XL', HG: 'Hors gabarit' }

/** Téléphone +237 lisible : « +237 6 77 12 34 56 ». */
export const telLisible = (t: string) => {
  const c = t.replace(/\s/g, '').replace(/^\+237/, '')
  return c.length === 9 ? `+237 ${c[0]} ${c.slice(1, 3)} ${c.slice(3, 5)} ${c.slice(5, 7)} ${c.slice(7)}` : t
}
/** Téléphone masqué (anonymat, DP-61 : appel par numéro masqué via le portail). */
export const telMasque = (t: string) => '+237 6 •• •• •• ' + t.replace(/\s/g, '').slice(-2)

/**
 * Feuille posée par l'adresse (« ?sheet=fiche&z=Z6 ») avec ses paramètres : un lien profond l'ouvre ; fermer revient à
 * l'entrée d'avant si elle a été ouverte depuis l'écran, sinon retire ses paramètres.
 */
export function useFeuilleParams(nom: string, cles: string[] = []) {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const ouverte = params.get('sheet') === nom
  const ouvrir = useCallback(
    (valeurs: Record<string, string> = {}) => {
      const p = new URLSearchParams(params)
      p.set('sheet', nom)
      for (const [k, v] of Object.entries(valeurs)) p.set(k, v)
      naviguer({ search: p.toString() }, { state: { feuille: true } })
    },
    [params, nom, naviguer],
  )
  const fermer = useCallback(() => {
    if ((lieu.state as { feuille?: boolean } | null)?.feuille) return naviguer(-1)
    const p = new URLSearchParams(params)
    p.delete('sheet')
    for (const k of cles) p.delete(k)
    naviguer({ search: p.toString() }, { replace: true })
  }, [lieu.state, params, cles, naviguer])
  return { ouverte, ouvrir, fermer, param: (k: string) => params.get(k) }
}


/** Pied des pages d'accès (connexion, candidature) : aide, conditions, confidentialité, puis la mention légale. */
export function PiedAcces() {
  const { t } = usePreferences()
  return (
    <>
      <AccesLiens label={t('Liens utiles')}>
        <a href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
          {t('Aide et contact')}
        </a>
        <a href="/cgu">{t('Conditions')}</a>
        <a href="/legal-doc?d=confidentialite">{t('Confidentialité')}</a>
      </AccesLiens>
      <AccesLegal>{`${PARAMETRES.saisies.mentions.denomination} · RCCM ${PARAMETRES.saisies.mentions.rccm}`}</AccesLegal>
    </>
  )
}
