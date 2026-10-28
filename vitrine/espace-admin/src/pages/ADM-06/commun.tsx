// Composants partagés par les écrans du groupe S3 (ADM-06, ADM-07 et la page ajoutée « qualite ») : ils reprennent les
// aides du prototype (admK_item, admK_split, admK_rules, admK_tier, admK_sc, admK_chk, admK_ev, admK_ai, admK_ladder,
// admK_actorHead, admK_motif…) avec leurs classes (contenu.css), et la feuille de décision du groupe.
// FeuilleDecision : même feuille que DecisionMotivee (motif écrit ≥ motif_min_caracteres, compteur, avertissement des
// quatre yeux), mais la décision part par la méthode du domaine qui l'applique (KYC, palier, sanction…) : la source
// refuse elle-même (motif court, conflit d'intérêts, pièces non vues…) et journalise. Les champs propres à une
// décision (raison, pièces, événements cités) se posent dans la feuille (children). INTEGRATION.md propose d'ouvrir
// DecisionMotivee à ce cas pour n'avoir qu'une feuille.
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { RAISONS_REFUS } from '../../composants/refus'
import { Anneau, Banniere, Note, Pill, type Ton } from '../../composants/prototype'
import type { Controle, EvenementTrust, RaisonRefus } from '../../donnees/domaines/acteurs'
import { usePreferences } from '../../preferences'
import { P3, type Palier, type PalierIfa } from './calculs/regles'
import './s3.css'

/** Erreur d'une lecture : un refus de rôle remonte à la garde (« Réservé ») ; une panne garde l'écran et propose Réessayer. */
export function useErreur(e: Error | null) {
  if (e && e.name === 'AccesRefuse') throw e
  return e
}
export function BandeauErreur({ quoi, relire }: { quoi: string; relire: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <Banniere
      ton="red"
      icone="cloud-off"
      role="alert"
      bouton={
        <button type="button" className="btn secondary sm" onClick={relire}>
          <Icone nom="rotate-cw" taille={16} />
          <span>{t('Réessayer')}</span>
        </button>
      }
    >
      <b>{tf('{quoi} n’a pas pu être chargé.', { quoi: t(quoi) })}</b> {t('Rien n’est perdu : les dernières données restent affichées. Si l’erreur revient, signalez-la en Santé du système.')}
    </Banniere>
  )
}
export function Chargement() {
  const { t } = usePreferences()
  return (
    <p className="card-s mt16" role="status" aria-live="polite">
      {t('Chargement…')}
    </p>
  )
}

/** Panneau « Règles appliquées sur cet écran » (admK_rules). */
export function Regles({ liste }: { liste: [string, string][] }) {
  const { t, tf } = usePreferences()
  return (
    <details className="a-plie mt16">
      <summary>{tf('Règles appliquées · {n}', { n: liste.length })}</summary>
      <div className="a-plie-c admk-rules">
        {liste.map(([id, texte]) => (
          <div key={id} className="admk-rule">
            <span className="id no-tr">{id}</span>
            <span>{t(texte)}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

/** File à gauche (ordinateur) et dossier à droite ; au téléphone, puces au-dessus du dossier. */
export function Partage({ file, puces, children }: { file: ReactNode; puces: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="s3-file-courte chips scroll">{puces}</div>
      <div className="s3-split">
        <div className="admk-list">{file}</div>
        <div>{children}</div>
      </div>
    </>
  )
}
export function Kick({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={'admk-kick ' + (className ?? '')}>{children}</div>
}
/** Carte d'une file (admK_item). */
export function Item(p: { to: string; on?: boolean; late?: boolean; av: ReactNode; t: ReactNode; pill?: ReactNode; s?: ReactNode; x?: ReactNode; xTon?: 'amber' | 'red' | 'green' | 'ink'; d?: ReactNode; r?: ReactNode }) {
  return (
    <Link className={'admk-item' + (p.on ? ' on' : '') + (p.late ? ' late' : '')} to={p.to} replace aria-current={p.on ? 'true' : undefined}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {p.av}
        <div className="grow">
          <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
            <span className="t">{p.t}</span>
            {p.pill}
          </div>
          {p.s && <div className="s">{p.s}</div>}
        </div>
      </div>
      {p.x && (
        <div className="row mt8 t13 b7" style={{ gap: 6, color: `var(--${p.xTon === 'red' ? 'red' : p.xTon === 'green' ? 'green' : p.xTon === 'ink' ? 'ink-2' : 'amber'})` }}>
          <span>{p.x}</span>
        </div>
      )}
      {(p.d || p.r) && (
        <div className="row mt8" style={{ justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink-3)', fontWeight: 700, gap: 8 }}>
          <span>{p.d}</span>
          <span>{p.r}</span>
        </div>
      )}
    </Link>
  )
}
export function Puce({ to, on, children }: { to: string; on?: boolean; children: ReactNode }) {
  return (
    <Link to={to} replace className={'chip' + (on ? ' on' : '')} aria-current={on ? 'true' : undefined}>
      {children}
    </Link>
  )
}
/** Avatar à initiales (admK_shop) ou icône d'acteur. */
export function Av({ nom, icone, taille = 40 }: { nom?: string; icone?: string; taille?: number }) {
  if (icone)
    return (
      <span className="admk-av ic" style={{ width: taille, height: taille }} aria-hidden="true">
        <Icone nom={icone} taille={Math.round(taille / 2)} />
      </span>
    )
  const init = (nom ?? '').replace(/^(Chez|Relais|Client)\s+/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="admk-shop" style={{ width: taille, height: taille, background: 'var(--e-soft)', color: 'var(--e-txt)', fontSize: Math.round(taille / 2.9) }} aria-hidden="true">
      {init}
    </span>
  )
}

const NOM_PALIER: Record<Palier, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine', nouveau: 'Nouveau', confirme: 'Confirmé' }
export const nomPalier = (p: Palier) => NOM_PALIER[p]
export function Tier({ palier }: { palier: Palier }) {
  const { t } = usePreferences()
  return (
    <span className={'admk-tier ' + palier}>
      <i></i>
      {t(NOM_PALIER[palier])}
    </span>
  )
}
const IFA: Record<PalierIfa, [string, Ton]> = { eleve: ['Élevé', 'green'], standard: ['Standard', 'acc'], a_instruire: ['À instruire', 'amber'], plafonne: ['Plafonné', 'red'] }
export const nomIfa = (p: PalierIfa) => IFA[p][0]
export function Ifa({ palier, pill }: { palier: PalierIfa; pill?: boolean }) {
  const { t, tf } = usePreferences()
  if (pill)
    return (
      <Pill ton={IFA[palier][1]} sm>
        {t(IFA[palier][0])}
      </Pill>
    )
  return (
    <span className="admk-tier">
      <i style={{ background: `var(--${IFA[palier][1] === 'acc' ? 'acc' : IFA[palier][1]})` }}></i>
      {tf('IFA {palier}', { palier: t(IFA[palier][0]) })}
    </span>
  )
}
/** Anneau du Trust Score (rouge : veto ou sous 40 ; ambre : sous le seuil du palier). */
export const couleurScore = (v: number | null, seuil: number | null) => (v === null ? 'var(--ink-4)' : v <= P3.veto ? 'var(--red)' : seuil !== null && v < seuil ? 'var(--amber)' : 'var(--acc)')
export function Score({ v, seuil, taille = 38 }: { v: number | null; seuil: number | null; taille?: number }) {
  const { tf, t } = usePreferences()
  return (
    <span className="admk-sc">
      <Anneau v={v} couleur={couleurScore(v, seuil)} taille={taille} libelle={v === null ? '—' : String(v).replace('.', ',')} aria={v === null ? t('Trust Score pas encore calculé') : tf('Trust Score {v}', { v: String(v).replace('.', ',') })} />
    </span>
  )
}
/** Ligne de contrôle (admK_chk) : ok, doute, ko, info. */
export function Chk({ ton, icone, children }: { ton: Controle['ton'] | ''; icone?: string; children: ReactNode }) {
  const c = ton === 'doute' ? 'w' : ton === 'ko' ? 'b' : ton === 'info' ? 'n' : ''
  return (
    <div className="admk-chk">
      <span className={'i ' + c}>
        <Icone nom={icone ?? (ton === 'doute' ? 'triangle-alert' : ton === 'ko' ? 'x' : ton === 'info' ? 'info' : 'check')} taille={14} />
      </span>
      <span className="grow">{children}</span>
    </div>
  )
}
export function Controles({ l }: { l: Controle[] }) {
  return (
    <>
      {l.map((c, i) => (
        <Chk key={i} ton={c.ton}>
          {c.texte}
        </Chk>
      ))}
    </>
  )
}
/** Événement du Trust Score (admK_ev). */
export function Ev({ e }: { e: EvenementTrust }) {
  const { t } = usePreferences()
  return (
    <div className="admk-ev">
      <span className={'g ' + e.gravite}>{e.gravite === 'ok' ? t('Succès') : e.gravite === 'veto' ? 'VETO' : e.gravite}</span>
      <div className="grow">
        <div className="t">{e.titre}</div>
        <div className="s">{e.detail}</div>
      </div>
    </div>
  )
}
/** Proposition du système ou de l'assistant (admK_ai) : un avis, jamais une décision. */
export function Ai({ texte, confiance, titre = 'Proposition du système' }: { texte: string; confiance: number; titre?: string }) {
  const { t, tf } = usePreferences()
  const pct = Math.round(confiance * 100)
  return (
    <div className="admk-ai">
      <span className="ai">
        <Icone nom="sparkles" taille={18} />
      </span>
      <div className="grow">
        <div className="t">
          <b>{t(titre)} :</b> {texte}
        </div>
        <div className="admk-conf">
          <i style={{ ['--w' as string]: pct + '%' }}></i>
          {tf('Confiance {c}', { c: (confiance >= 0.8 ? t('élevée') : confiance >= 0.6 ? t('moyenne') : t('faible')) + ' · ' + confiance.toFixed(2).replace('.', ',') })}
        </div>
      </div>
    </div>
  )
}
/** Échelle des sanctions en 4 marches (admK_ladder). */
export function Echelle({ niveau, rouge }: { niveau: number; rouge?: boolean }) {
  const { t, tf } = usePreferences()
  const m: [string, string][] = [
    ['Avertissement', 'Motif écrit, trace au dossier'],
    ['Visibilité ou accès réduit', 'Validé par un humain, recours une fois'],
    ['Suspension', tf('Score gelé, période probatoire de {j} jours', { j: P3.probatoireJ })],
    ['Exclusion et liste noire', 'Quatre yeux, CNI · appareil · numéro · RCCM'],
  ]
  return (
    <div className="admk-ladder" role="list" aria-label={t('Échelle des sanctions')}>
      {m.map(([titre, sous], i) => (
        <div key={titre} role="listitem" className={'admk-step ' + (i + 1 === niveau ? (i === 3 || (i === 2 && rouge) ? 'red' : 'on') : '')} aria-current={i + 1 === niveau ? 'step' : undefined}>
          <span className="n">{i + 1}</span>
          <div className="t">{t(titre)}</div>
          <div className="s">{t(sous)}</div>
        </div>
      ))}
    </div>
  )
}
export function Mini({ k, v, s }: { k: ReactNode; v: ReactNode; s?: ReactNode }) {
  return (
    <div className="admk-mini">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}
export function Seen({ k, children, className }: { k: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={'admk-seen ' + (className ?? '')}>
      <div className="k">{k}</div>
      {children}
    </div>
  )
}
/** En-tête d'un dossier (admK_actorHead). */
export function Tete({ av, nom, sous, pills, droite }: { av: ReactNode; nom: ReactNode; sous: ReactNode; pills?: ReactNode; droite?: ReactNode }) {
  return (
    <div className="s3-tete">
      {av}
      <div className="grow" style={{ minWidth: 200 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <h3>{nom}</h3>
          {pills}
        </div>
        <div className="t13 c3 mt4" style={{ lineHeight: 1.45 }}>
          {sous}
        </div>
      </div>
      {droite && <div className="droite">{droite}</div>}
    </div>
  )
}
/** Conflit d'intérêts (A-33) : l'agent voit le dossier, il ne décide pas. */
export function NoteConflit() {
  const { t } = usePreferences()
  return (
    <Note ton="amber" icone="user-x" className="mt14" role="note">
      <b>{t('Conflit d’intérêts.')}</b> {t('Décision réservée à un autre agent')}
    </Note>
  )
}
/** Lecture seule ou geste d'un autre rôle : pourquoi les boutons manquent. */
export function NoteLecture({ texte }: { texte: string }) {
  const { t } = usePreferences()
  return (
    <details className="a-plie mt14">
      <summary>
        <Icone nom="eye" taille={16} /> {t('Lecture seule')}
      </summary>
      <div className="a-plie-c t13 c3">{t(texte)}</div>
    </details>
  )
}
export function BandeauOk({ children, bouton }: { children: ReactNode; bouton?: ReactNode }) {
  return (
    <div className="admk-banner-ok mt16" role="status">
      <Icone nom="circle-check" taille={20} />
      <div className="grow">{children}</div>
      {bouton}
    </div>
  )
}

/** Courbe d'un Trust Score sur 30 jours, avec le seuil et le seuil de descente. */
export function CourbeScore({ valeurs, seuil, descente, aria }: { valeurs: number[]; seuil: number | null; descente: number | null; aria: string }) {
  if (valeurs.length < 2) return null
  const L = 600
  const Hh = 150
  const tout = [...valeurs, ...(seuil !== null ? [seuil] : []), ...(descente !== null ? [descente] : [])]
  const min = Math.floor(Math.min(...tout) - 3)
  const max = Math.ceil(Math.max(...tout) + 3)
  const y = (v: number) => Hh - 10 - ((Hh - 20) * (v - min)) / Math.max(1, max - min)
  const x = (i: number) => 30 + ((L - 40) * i) / (valeurs.length - 1)
  return (
    <svg className="s3-courbe" viewBox={`0 0 ${L} ${Hh}`} role="img" aria-label={aria} preserveAspectRatio="none">
      {seuil !== null && <line className="seuil" x1={30} x2={L - 10} y1={y(seuil)} y2={y(seuil)} />}
      {seuil !== null && (
        <text x={2} y={y(seuil) + 4}>
          {seuil}
        </text>
      )}
      {descente !== null && descente !== seuil && <line className="descente" x1={30} x2={L - 10} y1={y(descente)} y2={y(descente)} />}
      {descente !== null && descente !== seuil && (
        <text x={2} y={y(descente) + 4}>
          {descente}
        </text>
      )}
      <path className="ligne" vectorEffect="non-scaling-stroke" d={valeurs.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')} />
    </svg>
  )
}

export function useRefus() {
  const { t, tf } = usePreferences()
  return (r: RaisonRefus | string) => (r === 'motif_court' ? tf('Le motif doit compter au moins {n} caractères.', { n: P3.motifMin }) : t(RAISONS_REFUS[r] ?? 'La décision n’a pas pu être enregistrée.'))
}

/** Choix exclusif dans une feuille (raison d'un rejet, décision d'un recours). */
export function Radios<T extends string>({ nom, valeur, choisir, options }: { nom: string; valeur: T; choisir: (v: T) => void; options: { v: T; t: string; s?: string }[] }) {
  const { t } = usePreferences()
  return (
    <fieldset className="s3-radios" style={{ border: 0, padding: 0, margin: '8px 0 0' }}>
      <legend className="fld-t">{t(nom)}</legend>
      {options.map((o) => (
        <label key={o.v} className="s3-radio">
          <input type="radio" name={nom} checked={valeur === o.v} onChange={() => choisir(o.v)} />
          <span>
            <b>{t(o.t)}</b>
            {o.s && <small>{t(o.s)}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
/** Cases à cocher (pièces concernées, événements cités). */
export function Cases({ legende, items, cochees, changer }: { legende: string; items: { id: string; t: ReactNode }[]; cochees: string[]; changer: (l: string[]) => void }) {
  const { t } = usePreferences()
  return (
    <fieldset className="fld fld-g mt14">
      <legend className="fld-t">{t(legende)}</legend>
      {items.map((x) => (
        <label key={x.id} className="e-case">
          <input type="checkbox" checked={cochees.includes(x.id)} onChange={(e) => changer(e.target.checked ? [...cochees, x.id] : cochees.filter((y) => y !== x.id))} />
          <span>{x.t}</span>
        </label>
      ))}
    </fieldset>
  )
}

/** Date et heure de Yaoundé (« mar. 13 oct. 14 h 05 » ; « Tue 13 Oct 14:05 »). */
export function Quand({ le, jour = true }: { le: number; jour?: boolean }) {
  const { langue } = usePreferences()
  const p = Object.fromEntries(new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(le)).map((x) => [x.type, x.value]))
  const h = langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  return <time dateTime={new Date(le).toISOString()}>{jour ? `${p.weekday} ${p.day} ${p.month} · ${h}` : h}</time>
}
/** Date seule (« 13 oct. 2026 »). */
export function Jour({ le }: { le: number }) {
  const { langue } = usePreferences()
  return <time dateTime={new Date(le).toISOString()}>{new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(le))}</time>
}
/** Frise d'historique (C.tl). */
export function Historique({ l }: { l: { titre: string; le: number; par?: string; ton?: 'done' | 'cur' | 'bad' }[] }) {
  return (
    <div className="tl">
      {l.map((x, i) => (
        <div key={i} className={'ti ' + (x.ton ?? 'done')}>
          <div className="tt">{x.titre}</div>
          <div className="td">
            <Quand le={x.le} />
            {x.par ? ` · ${x.par}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
