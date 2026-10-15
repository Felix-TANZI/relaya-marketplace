// Litiges et retours (VD-07) : outils partagés par les écrans du groupe (hors composants) — réseau, dates courtes
// en français et en anglais, libellés des pièces du dossier, heure de la dernière lecture.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { PieceDossier } from '../../donnees/domaines/litiges'
import type { Retour } from '../../donnees/domaines/retours'
import { entre, heure, type Langue } from '../../i18n/temps'
import { DECALAGE_YAOUNDE_MS, jourDe } from '../../calculs/temps'

export const LIEN_44: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 6px' }

/** Le réseau : « Répondre à un litige demande le réseau » (REP-04) ; l'inspection attend le réseau (VD07-R28). */
export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setEnLigne(true)
    const off = () => setEnLigne(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return enLigne
}

const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
const JOURS_COURTS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }

/** « 15 sept. » · « 15 Sept » (heure de Yaoundé). */
export function jourMois(ms: number, langue: Langue): string {
  const d = new Date(ms + DECALAGE_YAOUNDE_MS)
  return langue === 'en' ? `${d.getUTCDate()} ${MOIS_COURTS.en[d.getUTCMonth()]}` : `${d.getUTCDate()} ${MOIS_COURTS.fr[d.getUTCMonth()]}`
}
/** « 15 sept. 14 h 20 » · « 15 Sept 2:20 pm » : horodatage d'une photo. */
export const horodatage = (ms: number, langue: Langue) => `${jourMois(ms, langue)} ${heure(ms, langue)}`
/** « sam. 19 sept. à 10 h » · « Sat 19 Sept at 10 am ». */
export function dateCourte(ms: number, langue: Langue): string {
  const d = new Date(ms + DECALAGE_YAOUNDE_MS)
  return `${JOURS_COURTS[langue][d.getUTCDay()]} ${jourMois(ms, langue)} ${langue === 'en' ? 'at' : 'à'} ${heure(ms, langue)}`
}
/** « 2026-09-25 » → « vendredi 25 septembre » (jour de versement). */
export function jourEnMots(jour: string, langue: Langue): string {
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  const JOURS = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
  const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
  return `${JOURS[langue][d.getUTCDay()]} ${j} ${MOIS[langue][m - 1]}`
}

export const libellePiece = (p: PieceDossier) =>
  p.quoi === 'ramassage' ? 'Ramassage' : p.quoi === 'scelle' ? 'Scellé' : p.quoi === 'client' ? 'Photo du client · au relais' : p.quoi === 'comptoir' ? 'Constat au comptoir' : 'Votre photo'

/** Dernière lecture des données (hors connexion : « liste du cache avec l'heure de mise à jour »). */
export function useMiseAJour(donnees: unknown, maintenant: number): number | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (donnees ? maintenant : null), [donnees])
}

/** « demain, entre 14 h et 16 h » · « mardi 22, entre 14 h et 16 h ». */
export function arriveeEnMots(r: Retour, maintenant: number, langue: 'fr' | 'en'): string {
  const a = r.arrivee!
  const jour = a.jour === jourDe(maintenant) ? (langue === 'en' ? 'today' : 'aujourd’hui') : a.jour === jourDe(maintenant + 24 * 3600 * 1000) ? (langue === 'en' ? 'tomorrow' : 'demain') : dateCourte(new Date(a.jour + 'T12:00:00+01:00').getTime(), langue).replace(/ (à|at) .*$/, '')
  return `${jour}, ${entre(a.creneau, langue)}`
}


