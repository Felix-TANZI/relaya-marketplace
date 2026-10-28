// Ligne du journal d'audit (ADM-P31) : heure, agent et rôle sous lequel il a agi (ADM-ROL-02), action, objet, motif,
// zone, empreinte chaînée (les 10 premiers caractères ; l'empreinte entière en infobulle). Réutilisée par le journal,
// les fiches (historique d'un dossier) et le Profil (mes derniers gestes).
import { NOM_ROLE } from '../config/libelles'
import type { LigneJournal as Ligne } from '../donnees/domaines/gouvernance'
import { usePreferences } from '../preferences'
import { useHorloge } from '../session'
import { Icone } from './Icone'

/** Heure courte de Yaoundé (« 14 h 05 », « 14:05 »), précédée du jour s'il n'est pas celui de la session. */
export function Heure({ le, seule }: { le: number; seule?: boolean }) {
  const { langue } = usePreferences()
  const n = useHorloge()
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(le)).map((x) => [x.type, x.value]))
  const h = langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  const jour = (x: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Douala' }).format(new Date(x))
  const j = seule || jour(le) === jour(n) ? '' : new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short' }).format(new Date(le)) + ' · '
  return <time dateTime={new Date(le).toISOString()}>{j + h}</time>
}
/** Ancien nom du groupe S1 (même rendu : le jour quand ce n'est pas aujourd'hui). */
export const Quand = Heure

export function LigneJournal({ l }: { l: Ligne }) {
  const { t } = usePreferences()
  return (
    <li className="e-lj">
      <span className="e-lj-n" aria-label={t('Rang dans la chaîne')}>
        {`#${l.n}`}
      </span>
      <span className="grow">
        <b>{l.action}</b> · {l.objet}
        <span className="e-lj-s">
          {`${l.agent} · ${t(NOM_ROLE[l.role])}`}
          {l.zone ? ` · ${l.zone}` : ''} · <Heure le={l.le} />
        </span>
        {l.motif && <span className="e-lj-m">{`« ${l.motif} »`}</span>}
      </span>
      <code className="e-lj-e" title={l.empreinte}>
        <Icone nom="link" taille={13} />
        {l.empreinte.slice(0, 10)}
      </code>
    </li>
  )
}
