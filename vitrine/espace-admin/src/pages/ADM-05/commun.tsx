// Briques communes des écrans d'argent (groupe S2) : montants, dates de Yaoundé, états de chargement, bandeau
// « hero » à quatre mesures, registre en partie double, lignes de contrôle et de valeur du prototype (admA-*).
import type { ReactNode } from 'react'
import './argent.css'
import { F } from '@client/i18n/format'
import { Reserve } from '../../composants/Garde'
import { Icone } from '../../composants/Icone'
import { Banniere, Pill, type Ton } from '../../composants/prototype'
import { AccesRefuse } from '../../donnees/communs'
import type { DecisionQuatreYeux } from '../../donnees/domaines/quatreyeux'
import type { Ecriture } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'

/** Montant en francs CFA (« 20 900 F »). */
export const Fr = (n: number) => `${F(n)} F`

/** Date courte de Yaoundé (« mar. 13 oct. », « 14 h 05 » avec l'heure). */
export function useDate() {
  const { langue } = usePreferences()
  const loc = langue === 'en' ? 'en-GB' : 'fr-FR'
  const jour = (le: number) => new Intl.DateTimeFormat(loc, { timeZone: 'Africa/Douala', weekday: 'short', day: 'numeric', month: 'short' }).format(le)
  const heure = (le: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(le).map((x) => [x.type, x.value]))
    return langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  }
  return { jour, heure, quand: (le: number) => `${jour(le)} · ${heure(le)}` }
}

/** Chargement, refus de rôle (403) et erreur (bandeau, Réessayer) d'une lecture ; le contenu quand elle est arrivée. */
export function Lu<T>({ l, children }: { l: Lecture<T>; children: (d: T) => ReactNode }) {
  const { t } = usePreferences()
  if (l.erreur instanceof AccesRefuse) return <Reserve roles={l.erreur.roles} />
  return (
    <>
      {l.erreur && (
        <Banniere
          ton="red"
          icone="cloud-off"
          role="alert"
          bouton={
            <button type="button" className="btn sm secondary" onClick={l.relire}>
              <Icone nom="rotate-cw" taille={16} />
              <span>{t('Réessayer')}</span>
            </button>
          }
        >
          <b>{t('Impossible de charger les données.')}</b> {l.donnees ? t('Les données affichées sont les dernières reçues ; rien n’est perdu.') : t('Vérifiez la connexion puis réessayez.')}
        </Banniere>
      )}
      {l.donnees ? (
        children(l.donnees)
      ) : !l.erreur ? (
        <div className="empty" aria-busy="true">
          <div className="ei">
            <Icone nom="hourglass" taille={26} />
          </div>
          <h3>{t('Chargement…')}</h3>
        </div>
      ) : null}
    </>
  )
}

/** Décision à quatre yeux en attente, lue si le rôle ouvre la page « Quatre yeux » (sinon : null, la ligne suffit). */
export function useDecision(id: string | null): DecisionQuatreYeux | null {
  const l = useLecture(() => (id ? source.quatreyeux.enAttente().catch(() => []) : Promise.resolve([])), [id])
  return l.donnees?.find((d) => d.id === id) ?? null
}

/** Bandeau sombre du prototype (hero night) : surtitre, grand montant, phrase, mesures. */
export function Hero({ k, v, s, droite, mesures, children }: { k: ReactNode; v: ReactNode; s?: ReactNode; droite?: ReactNode; mesures: { l: ReactNode; v: ReactNode; s?: ReactNode; icone: string }[]; children?: ReactNode }) {
  return (
    <div className="hero night vie-relief" style={{ marginTop: 0 }}>
      <div className="row admA-hrow" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="hk">{k}</div>
          <div className="big">
            {v}
            <small>F</small>
          </div>
          {s && <div className="hs">{s}</div>}
        </div>
        {droite && <div className="right">{droite}</div>}
      </div>
      {children}
      <div className="admA-hero4">
        {mesures.map((m, i) => (
          <div className="m4" key={i}>
            <div className="l">
              <Icone nom={m.icone} taille={14} />
              {m.l}
            </div>
            <div className="v">{m.v}</div>
            {m.s && <div className="s">{m.s}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Ligne de contrôle (admA-chk) : pastille d'état, titre, détail, élément à droite. */
export function Chk({ ton, icone, t, s, droite }: { ton: 'g' | 'a' | 'r' | 'v' | ''; icone: string; t: ReactNode; s?: ReactNode; droite?: ReactNode }) {
  return (
    <div className="admA-chk">
      <span className={'i ' + ton}>
        <Icone nom={icone} taille={15} />
      </span>
      <span className="grow">
        <b>{t}</b>
        {s && <span>{s}</span>}
      </span>
      {droite}
    </div>
  )
}

/** Ligne clé · valeur (admA-mv) ; `tot` pour un total. */
export const Mv = ({ k, v, tot }: { k: ReactNode; v: ReactNode; tot?: boolean }) => (
  <div className={'admA-mv' + (tot ? ' tot' : '')}>
    <span className="k">{k}</span>
    <span className="v">{v}</span>
  </div>
)

/** Petit tableau de rapprochement (admA-xt) : la dernière colonne en alerte si non nulle. */
export function Xt({ tete, lignes, alerte }: { tete: ReactNode[]; lignes: ReactNode[][]; alerte?: (i: number) => boolean }) {
  return (
    <table className="admA-xt">
      <thead>
        <tr>
          {tete.map((h, i) => (
            <th key={i} style={i === 0 ? { width: tete.length > 3 ? '30%' : '38%' } : undefined}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={j === r.length - 1 && alerte?.(i) ? 'w' : undefined}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const COULEUR: Record<string, string> = { Client: 'var(--blue)', Escrow: 'var(--acc)', Vendeur: 'var(--or)', BelivaY: 'var(--gold)', Relais: 'var(--green)', Transport: 'var(--ink-3)', Wallet: 'var(--blue)', Transit: 'var(--ink-3)', Agrégateur: 'var(--ink-3)', Versé: 'var(--green)' }
const Compte = ({ n }: { n: string }) => (
  <span className="admA-acc">
    <i style={{ background: COULEUR[n.split(' ')[0]] ?? 'var(--ink-3)' }}></i>
    {n}
  </span>
)
/** Registre en partie double (admA-led) : débit = compte qui reçoit ; écritures futures en gris ; Σ débits = Σ crédits. */
export function Registre({ ecritures, total, heure }: { ecritures: Ecriture[]; total: ReactNode; heure: (le: number) => string }) {
  const { t } = usePreferences()
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admA-led">
        <thead>
          <tr>
            <th>{t('Horodatage')}</th>
            <th>{t('Écriture')}</th>
            <th>{t('Débit')}</th>
            <th>{t('Crédit')}</th>
            <th className="r">{t('Montant')}</th>
            <th className="hide-m2">{t('Clé d’idempotence')}</th>
          </tr>
        </thead>
        <tbody>
          {ecritures.map((e) => (
            <tr key={e.cle} className={e.future ? 'fut' : ''}>
              <td className="nw">{e.le !== null ? heure(e.le) : t(e.quand ?? '')}</td>
              <td>{e.libelle}</td>
              <td>
                <Compte n={e.debit} />
              </td>
              <td>
                <Compte n={e.credit} />
              </td>
              <td className="r">{Fr(e.montant)}</td>
              <td className="hide-m2">
                <span className="key">{e.cle}</span>
              </td>
            </tr>
          ))}
          <tr className="tot">
            <td colSpan={2}>{t('Σ débits = Σ crédits')}</td>
            <td colSpan={2}>{total}</td>
            <td className="r">
              <Icone nom="check" taille={14} /> {t('équilibré')}
            </td>
            <td className="hide-m2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Barre des quatre étapes du vendredi (admA-stepbar). */
export function Etapes({ etapes, cur, fini }: { etapes: [string, string][]; cur: number; fini?: boolean }) {
  const { t } = usePreferences()
  return (
    <div className="admA-stepbar">
      {etapes.map(([a, b], i) => (
        <div key={a} className={'s ' + (i < cur || fini ? 'done' : i === cur ? 'cur' : '')}>
          <span className="n">{i < cur || fini ? <Icone nom="check" taille={13} /> : i + 1}</span>
          <b>{t(a)}</b>
          <span>{t(b)}</span>
        </div>
      ))}
    </div>
  )
}

export const PillEtat = ({ t, ton }: { t: ReactNode; ton: Ton }) => (
  <Pill ton={ton} sm dot>
    {t}
  </Pill>
)

/** C.stepper : étapes numérotées (faites, en cours). */
export function Stepper({ etapes, cur }: { etapes: string[]; cur: number }) {
  const { t } = usePreferences()
  return (
    <div className="stepper">
      {etapes.map((l, i) => (
        <div key={l} className={'st' + (i < cur ? ' done' : i === cur ? ' cur' : '')}>
          <b>{i < cur ? <Icone nom="check" taille={14} /> : i + 1}</b>
          <span>{t(l)}</span>
        </div>
      ))}
    </div>
  )
}
