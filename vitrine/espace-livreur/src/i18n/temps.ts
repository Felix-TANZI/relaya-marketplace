// Heures, durées et dates écrites comme dans le prototype livreur, à l'heure de Yaoundé (UTC+1), en français et en
// anglais (conventions du dictionnaire EN du prototype) :
//   heure       « 12 h 42 », « 18 h »          · « 12:42 pm », « 6 pm », « noon »
//   duree       « 2 h 54 »                      · « 2 h 54 min »
//   creneau     « 14 h – 16 h »                 · « 2 – 4 pm »
//   entre       « entre 14 h et 16 h »          · « between 2 and 4 pm »
//   echeance    « demain à 05 h 30 », « mercredi 23 sept. à 06 h 02 » · « tomorrow at 5:30 am », « Wednesday 23 Sept at 6:02 am »
//   jourLong    « lundi 21 septembre »          · « Monday 21 September »
//   jourCourt   « mardi 22 »                    · « Tuesday 22 »
import { DECALAGE_YAOUNDE_MS, jourDe } from '../calculs/temps'

export type Langue = 'fr' | 'en'
const local = (ms: number) => new Date(ms + DECALAGE_YAOUNDE_MS)
const JOURS = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }

/** « 14:00 » → [14, 0] ; un instant → heure de Yaoundé. */
const hm = (v: number | string): [number, number] => {
  if (typeof v === 'string') {
    const [h, m] = v.split(':').map(Number)
    return [h, m]
  }
  const d = local(v)
  return [d.getUTCHours(), d.getUTCMinutes()]
}

export function heure(v: number | string, langue: Langue): string {
  const [h, m] = hm(v)
  if (langue === 'en') {
    if (h === 12 && m === 0) return 'noon'
    return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`
  }
  return `${String(h).padStart(2, '0')} h${m ? ' ' + String(m).padStart(2, '0') : ''}`
}

/** Temps qui reste, à la minute supérieure (« il reste 2 h 54 » jusqu'à la dernière seconde de 2 h 54). */
export function duree(ms: number, langue: Langue): string {
  const min = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(min / 60)
  const m = String(min % 60).padStart(2, '0')
  return langue === 'en' ? `${h} h ${m} min` : `${h} h ${m}`
}

export function creneau([de, a]: [string, string], langue: Langue): string {
  if (langue === 'en') {
    const [x, y] = [heure(de, 'en'), heure(a, 'en')]
    const meme = x.slice(-2) === y.slice(-2)
    return `${meme ? x.slice(0, -3) : x} – ${y}`
  }
  return `${heure(de, 'fr')} – ${heure(a, 'fr')}`
}

export function entre([de, a]: [string, string], langue: Langue): string {
  if (langue === 'en') {
    const [x, y] = [heure(de, 'en'), heure(a, 'en')]
    return `between ${x.slice(-2) === y.slice(-2) ? x.slice(0, -3) : x} and ${y}`
  }
  return `entre ${heure(de, 'fr')} et ${heure(a, 'fr')}`
}

/** « jeudi 3 septembre », avec l'année quand ce n'est pas l'année en cours (« dimanche 14 mars 2027 »). */
export function jourLong(ms: number, langue: Langue): string {
  const d = local(ms)
  const an = d.getUTCFullYear() !== local(Date.now()).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : ''
  return `${JOURS[langue][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[langue][d.getUTCMonth()]}${an}`
}

export function jourCourt(ms: number, langue: Langue): string {
  const d = local(ms)
  return `${JOURS[langue][d.getUTCDay()]} ${d.getUTCDate()}`
}

/** « demain à 05 h 30 » le lendemain, « aujourd'hui à … » le jour même, sinon « mercredi 23 sept. à 06 h 02 ». */
export function echeance(ms: number, maintenant: number, langue: Langue): string {
  const j = jourDe(ms)
  const a = langue === 'en' ? 'at' : 'à'
  if (j === jourDe(maintenant)) return `${langue === 'en' ? 'today' : 'aujourd’hui'} ${a} ${heure(ms, langue)}`
  if (j === jourDe(maintenant + 24 * 3600 * 1000)) return `${langue === 'en' ? 'tomorrow' : 'demain'} ${a} ${heure(ms, langue)}`
  const d = local(ms)
  return `${JOURS[langue][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[langue][d.getUTCMonth()]} ${a} ${heure(ms, langue)}`
}
