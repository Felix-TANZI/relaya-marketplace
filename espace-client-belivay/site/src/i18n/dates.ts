// Dates et heures écrites comme dans le prototype, à l'heure de Yaoundé (Africa/Douala, UTC+1, sans heure
// d'été) : « mar. 22 sept. · 18 h 05 » en français, « Tue 22 Sept · 6:05 pm » en anglais (CCH-32 : en mots).
import type { Langue } from '../preferences'

const JOURS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const MOIS = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
}

// Heure de Yaoundé : UTC+1 toute l'année.
const yaounde = (ms: number) => new Date(ms + 60 * 60 * 1000)

export function dateHeure(ms: number, langue: Langue): string {
  const d = yaounde(ms)
  const n = d.getUTCDate()
  const jour = `${JOURS[langue][d.getUTCDay()]} ${langue === 'fr' && n === 1 ? '1er' : n} ${MOIS[langue][d.getUTCMonth()]}`
  const h = d.getUTCHours()
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  if (langue === 'en') return `${jour} · ${h % 12 || 12}:${m}\u00A0${h < 12 ? 'am' : 'pm'}`
  return `${jour} · ${String(h).padStart(2, '0')} h ${m}`
}

// « jeu. 25 sept. à 18 h 05 » / « Thu 25 Sept at 6:05 pm ».
export const dateA = (ms: number, langue: Langue) => dateHeure(ms, langue).replace(' · ', langue === 'en' ? ' at ' : ' à ')

// « aujourd'hui à 10 h 32 » le jour même (à l'heure donnée), sinon « sam. 19 sept. à 11 h 32 ».
export function quand(ms: number, maintenant: number, langue: Langue): string {
  const jour = (x: number) => yaounde(x).toISOString().slice(0, 10)
  if (jour(ms) === jour(maintenant)) return (langue === 'en' ? 'today' : 'aujourd’hui') + dateA(ms, langue).replace(/^.* (à|at) /, langue === 'en' ? ' at ' : ' à ')
  return dateA(ms, langue)
}

// « ven. 28 août » (sans l'heure).
export const jourSeul = (ms: number, langue: Langue) => dateHeure(ms, langue).split(' · ')[0]

// Heure seule : « 17 h 15 » / « 5:15 pm ».
export const heureSeule = (ms: number, langue: Langue) => dateHeure(ms, langue).split(' · ')[1]

const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// En-tête de jour d'une conversation : « Aujourd'hui », « Hier · mer. 23 sept. », « Ven. 18 sept. ».
export function jourConversation(ms: number, maintenant: number, langue: Langue): string {
  const jour = (x: number) => yaounde(x).toISOString().slice(0, 10)
  if (jour(ms) === jour(maintenant)) return langue === 'en' ? 'Today' : 'Aujourd’hui'
  if (jour(ms) === jour(maintenant - 24 * 3600 * 1000)) return (langue === 'en' ? 'Yesterday · ' : 'Hier · ') + jourSeul(ms, langue)
  return capitale(jourSeul(ms, langue))
}

// Étiquette d'une photo : « Jeu. 24 sept. · 10 h 12 ».
export const datePhoto = (ms: number, langue: Langue) => capitale(dateHeure(ms, langue))

// Colonne de la liste des conversations : l'heure le jour même, sinon le jour de la semaine (« sam. »), sinon la date.
export function quandCourt(ms: number, maintenant: number, langue: Langue): string {
  const jour = (x: number) => yaounde(x).toISOString().slice(0, 10)
  if (jour(ms) === jour(maintenant)) return heureSeule(ms, langue)
  if (maintenant - ms < 6 * 24 * 3600 * 1000) return jourSeul(ms, langue).split(' ')[0]
  return jourSeul(ms, langue)
}

// Date longue, sans le jour de la semaine : « 1er août 2026 », « 2 août 2026 » / « 1 August 2026 ».
const MOIS_LONGS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
export function dateLongue(ms: number, langue: Langue): string {
  const d = yaounde(ms)
  const n = d.getUTCDate()
  return `${langue === 'fr' && n === 1 ? '1er' : n}\u00A0${MOIS_LONGS[langue][d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
