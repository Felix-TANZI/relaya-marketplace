// Briques du CONTENU des écrans repris sur le prototype (même kit que l'entreprise et le livreur ; console : data-app=adm) (BRIEF-PROTOTYPE.md) : mêmes balises et mêmes
// classes que les composants « C.* » du prototype (C.panel, C.kpi, C.li, C.kv, C.table, C.tabs…), styles dans
// src/styles/contenu.css (outils/contenu-prototype.mjs, sous « .px »). Un écran repris enveloppe son contenu dans
// <Px> ; ses blocs gardent l'ordre et les titres du prototype ; ce qui est en plus va dans une page ajoutée.
// Différences voulues : titres de section en h2 (la coque pose le h1), liens du routeur, boutons de l'application.
import { Children, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { useDes } from '@client/composants/ecran'
import { dateHeure } from '@client/i18n/dates'
import { ROUTES } from '../config/routes'
import { usePreferences } from '../preferences'
import { useHorloge } from '../session'
import type { Role } from '../donnees/communs'
import { NOM_ROLE } from '../config/libelles'
import { csv, fichier, pdf, telecharger, type LignePdf } from '../donnees/exports'
import { enLigneMaintenant, envoyerLaFile, oublierRefus, retirerDeLaFile, useFile } from '../donnees/fileHorsLigne'
import { Icone } from './Icone'
import { useSecondaire } from './rang'
import '../styles/contenu.css'
import '../styles/enrichi.css'

export type Ton = 'acc' | 'or' | 'red' | 'green' | 'amber' | 'blue' | 'ink' | 'violet'
const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Racine du contenu d'un écran repris (porte les styles du prototype). */
export function Px({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cls('px', className)}>{children}</div>
}

/** Ordinateur et tablette (dès 768 px) : la coque pose le titre et les actions dans sa barre de titre. */
export function useLarge(): boolean {
  return useDes('tab')
}

/** Surtitre daté du prototype (« Samedi 26 septembre · 13 h 05 ») : jour et heure de Yaoundé, à l'heure du serveur. */
export function useSurtitre(): string {
  const { langue } = usePreferences()
  const n = useHorloge()
  const d = dateHeure(n, langue)
  return d.charAt(0).toUpperCase() + d.slice(1)
}

/**
 * Tête de page du prototype (page() → dk-head : surtitre, titre, sous-titre, actions). La coque pose déjà le titre
 * (h1) : au téléphone, une page secondaire le répète dans le contenu comme le prototype (en h2) ; les actions vont
 * ici au téléphone et dans la barre de titre de la coque dès 768 px (passer `actions={large ? acts : undefined}` à Ecran).
 */
export function Tete({ route, titre, surtitre, sous, actes }: { route: string; titre?: string; surtitre?: ReactNode; sous?: ReactNode; actes?: ReactNode }) {
  const large = useLarge()
  const secondaire = !!ROUTES[route]?.parent
  const montrerTitre = !large && secondaire && titre
  if (!surtitre && !sous && !montrerTitre && (large || !actes)) return null
  return (
    <div className="dk-head">
      <div className="grow">
        <div className="pg">
          {surtitre && <div className="pg-k">{surtitre}</div>}
          {montrerTitre && <h2 className="pg-t">{titre}</h2>}
          {sous && <p className="pg-s">{sous}</p>}
        </div>
      </div>
      {!large && actes && <div className="acts">{actes}</div>}
    </div>
  )
}

/** C.panel : panneau à en-tête (icône, titre h2, lien ou éléments à droite). */
export function Panel(p: { titre?: ReactNode; icone?: string; tonIcone?: Ton; a?: { t: ReactNode; to: string }; droite?: ReactNode; className?: string; style?: CSSProperties; id?: string; children?: ReactNode; aria?: string; niveau?: 2 | 3 }) {
  const H = p.niveau === 3 ? 'h3' : 'h2'
  return (
    <section className={cls('panel', p.className)} style={p.style} id={p.id} aria-label={p.aria}>
      {p.titre && (
        <div className="ph">
          {p.icone && (
            <span className={cls('ic', p.tonIcone ?? 'acc')} style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icone nom={p.icone} taille={18} />
            </span>
          )}
          <H>{p.titre}</H>
          {p.droite}
          {p.a && (
            <Link className="a" to={p.a.to}>
              {p.a.t}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          )}
        </div>
      )}
      {p.children}
    </section>
  )
}

/** C.kpi : indicateur (libellé, valeur, unité, complément, icône) ; lien s'il mène quelque part. */
export function Kpi(p: { k: ReactNode; v: ReactNode; u?: ReactNode; s?: ReactNode; icone?: string; ton?: 'acc' | 'night' | 'or' | ''; iton?: Ton | ''; to?: string; className?: string; aria?: string }) {
  // Page secondaire (composants/rang.ts) : un élément de la ligne de résumé (chiffre, libellé), jamais une tuile ; la
  // précision reste lue par les lecteurs d'écran et en infobulle.
  const secondaire = useSecondaire()
  if (secondaire) {
    const resume = (
      <>
        <span className="kr-v">
          {p.v}
          {p.u !== undefined && p.u !== null && <small>{p.u}</small>}
        </span>
        <span className="kr-k">{p.k}</span>
        {p.s && <span className="vh">{p.s}</span>}
      </>
    )
    const titre = typeof p.s === 'string' ? p.s : undefined
    const c = cls('kpi-r', p.iton && 'kr-' + p.iton, p.className)
    return p.to ? (
      <Link className={c} to={p.to} aria-label={p.aria} title={titre}>
        {resume}
      </Link>
    ) : (
      <div className={c} title={titre}>
        {resume}
      </div>
    )
  }
  const corps = (
    <>
      {p.icone && (
        <span className={cls('i', p.iton)}>
          <Icone nom={p.icone} taille={18} />
        </span>
      )}
      <div className="k">{p.k}</div>
      <div className="v">
        {p.v}
        {p.u !== undefined && p.u !== null && <small>{p.u}</small>}
      </div>
      {p.s && <div className="s">{p.s}</div>}
    </>
  )
  const c = cls('kpi', p.ton, p.className)
  return p.to ? (
    <Link className={c} to={p.to} aria-label={p.aria}>
      {corps}
    </Link>
  ) : (
    <div className={c}>{corps}</div>
  )
}

/** C.li : ligne (icône teintée, titre, sous-titre, valeur à droite, chevron si lien). */
export function Li(p: { icone?: string; ton?: Ton | 'accs' | 'night'; t: ReactNode; s?: ReactNode; gauche?: ReactNode; droite?: ReactNode; rv?: ReactNode; to?: string; onClick?: () => void; style?: CSSProperties; className?: string; aria?: string; chevron?: boolean }) {
  const corps = (
    <>
      {p.icone && (
        <span className={cls('ic', p.ton)}>
          <Icone nom={p.icone} taille={20} />
        </span>
      )}
      {p.gauche}
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {p.t}
        </span>
        {p.s && (
          <span className="ls" style={{ display: 'block' }}>
            {p.s}
          </span>
        )}
      </span>
      {p.rv !== undefined && <span className="rv">{p.rv}</span>}
      {p.droite}
      {(p.to || p.onClick) && p.chevron !== false && (
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      )}
    </>
  )
  if (p.to)
    return (
      <Link className={cls('li', p.className)} to={p.to} style={p.style} aria-label={p.aria}>
        {corps}
      </Link>
    )
  if (p.onClick)
    return (
      <button type="button" className={cls('li', p.className)} onClick={p.onClick} style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit', ...p.style }} aria-label={p.aria}>
        {corps}
      </button>
    )
  return (
    <div className={cls('li', p.className)} style={p.style}>
      {corps}
    </div>
  )
}

/** C.kv : clé · valeur. */
export function Kv({ k, v, cls: c }: { k: ReactNode; v: ReactNode; cls?: string }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className={cls('v', c)}>{v}</span>
    </div>
  )
}

/** C.pill ; `dot` + `sm` = ST() du prototype (pastille d'état métier). */
export function Pill({ ton = 'ink', sm, dot, icone, children, className }: { ton?: Ton | 'solid-acc' | 'solid-or' | 'bronze' | 'gold' | 'dk'; sm?: boolean; dot?: boolean; icone?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cls('pill', ton, sm && 'sm', className)}>
      {dot && <i className="d"></i>}
      {icone && <Icone nom={icone} taille={13} />}
      {children}
    </span>
  )
}
export const St = ({ t, ton }: { t: ReactNode; ton?: Ton }) => (
  <Pill ton={ton ?? 'ink'} dot sm>
    {t}
  </Pill>
)

/** C.note : encadré teinté. */
export function Note({ ton, icone, children, className, role }: { ton: Ton; icone: string; children: ReactNode; className?: string; role?: string }) {
  return (
    <div className={cls('note', ton, className)} role={role}>
      <Icone nom={icone} taille={18} />
      <div>{children}</div>
    </div>
  )
}

/** C.banner : bandeau de console (dk-banner) avec bouton à droite. */
export function Banniere({ ton, icone, children, bouton, className, role }: { ton: 'red' | 'amber' | 'acc' | 'night'; icone: string; children: ReactNode; bouton?: ReactNode; className?: string; role?: string }) {
  return (
    <div className={cls('dk-banner', ton, className)} role={role}>
      <Icone nom={icone} taille={20} />
      <div className="grow">{children}</div>
      {bouton}
    </div>
  )
}

/** C.empty : état vide (icône, titre, raison, action). */
export function Vide({ icone, t, s, children, action }: { icone: string; t: ReactNode; s?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ei">
        <Icone nom={icone} taille={26} />
      </div>
      <h3>{t}</h3>
      {s && <p>{s}</p>}
      {children}
      {action && <div className="btns">{action}</div>}
    </div>
  )
}

/** C.sec : titre de section (h2) et lien. */
export function Sec({ t, a, to, id }: { t: ReactNode; a?: ReactNode; to?: string; id?: string }) {
  return (
    <div className="sec">
      <h2 id={id}>{t}</h2>
      {a && to && (
        <Link className="a" to={to}>
          {a}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      )}
    </div>
  )
}

export interface Colonne<R> {
  k: string
  t: ReactNode
  /** Libellé écrit avant la valeur au téléphone (le tableau devient une liste de cartes) : texte du titre. */
  l?: string
  cls?: string
  main?: boolean
  hideM?: boolean
  rendu: (r: R) => ReactNode
}
/** C.table : tableau de données (dt-wrap, outils, pied) ; au téléphone, chaque ligne devient une carte. */
export function Table<R>({ cols, rows, cle, ligneCls, outils, pied, className, legende, vide }: { cols: Colonne<R>[]; rows: R[]; cle: (r: R) => string; ligneCls?: (r: R) => string | undefined; outils?: ReactNode; pied?: ReactNode; className?: string; legende?: string; vide?: ReactNode }) {
  return (
    <div className={cls('dt-wrap', className)}>
      {outils && <div className="dt-tools">{outils}</div>}
      {rows.length === 0 && vide ? (
        vide
      ) : (
        <table className="dt">
          {legende && <caption className="vh">{legende}</caption>}
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.k} className={c.cls} scope="col">
                  {c.t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={cle(r)} className={ligneCls?.(r)}>
                {cols.map((c) => (
                  <td key={c.k} className={cls(c.cls, c.main && 'main', c.hideM && 'hide-m') || undefined} data-l={c.l ?? (typeof c.t === 'string' ? c.t : '')}>
                    {c.rendu(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pied && <div className="dt-foot">{pied}</div>}
    </div>
  )
}

export interface Choix<T extends string> {
  id: T
  t: ReactNode
  n?: number | null
  icone?: string
  to?: string
}
/** C.tabs / C.seg / C.chips : choix exclusif (liens si `to`, sinon boutons). */
export function Choix<T extends string>({ forme, items, actif, choisir, aria, className }: { forme: 'tabs' | 'seg' | 'chips'; items: Choix<T>[]; actif: T; choisir?: (id: T) => void; aria: string; className?: string }) {
  const item = forme === 'chips' ? 'chip' : ''
  return (
    <div className={cls(forme, className)} role="group" aria-label={aria}>
      {items.map((i) => {
        const on = i.id === actif
        const corps = (
          <>
            {i.icone && <Icone nom={i.icone} taille={forme === 'chips' ? 15 : 16} />}
            {i.t}
            {i.n !== undefined && i.n !== null && <span className="n">{i.n}</span>}
          </>
        )
        return i.to ? (
          <Link key={i.id} to={i.to} className={cls(item, on && 'on')} aria-current={on ? 'true' : undefined} replace>
            {corps}
          </Link>
        ) : (
          <button key={i.id} type="button" className={cls(item, on && 'on')} aria-pressed={on} onClick={() => choisir?.(i.id)}>
            {corps}
          </button>
        )
      })}
    </div>
  )
}

/** C.props : grille clé · valeur. */
export function Props({ paires }: { paires: [ReactNode, ReactNode][] }) {
  return (
    <div className="props">
      {paires.map(([k, v], i) => (
        <span key={i} style={{ display: 'contents' }}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </span>
      ))}
    </div>
  )
}

/** C.bar : barre de progression. */
export const Barre = ({ pct, ton, aria }: { pct: number; ton?: 'acc' | 'green' | 'red' | ''; aria?: string }) => (
  <div className={cls('bar', ton)} role={aria ? 'img' : undefined} aria-label={aria}>
    <i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }}></i>
  </div>
)

/**
 * C.fld : champ du prototype (libellé, cadre .inp) autour d'un vrai champ. Le premier enfant (input, select, textarea)
 * va dans le cadre ; les suivants (aide, erreur) dessous. `groupe` : cases ou choix (fieldset et légende, sans cadre) ;
 * `bloc` : contenu libre (choix d'un fichier), sans cadre.
 */
export function Champ({ t, children, groupe, bloc, className, style }: { t: ReactNode; children: ReactNode; groupe?: boolean; bloc?: boolean; className?: string; style?: CSSProperties }) {
  if (groupe)
    return (
      <fieldset className={cls('fld', 'fld-g', className)} style={style}>
        <legend className="fld-t">{t}</legend>
        {children}
      </fieldset>
    )
  if (bloc)
    return (
      <div className={cls('fld', className)} style={style}>
        <span className="fld-t">{t}</span>
        {children}
      </div>
    )
  const [champ, ...reste] = Children.toArray(children)
  return (
    <label className={cls('fld', 'fld-l', className)} style={style}>
      <span className="fld-t">{t}</span>
      <span className="inp">{champ}</span>
      {reste}
    </label>
  )
}

/** C.tg : interrupteur. */
export function Tg({ on, changer, libelle, lock }: { on: boolean; changer?: (v: boolean) => void; libelle: string; lock?: boolean }) {
  return <button type="button" className={cls('tg', on && 'on', lock && 'lock')} role="switch" aria-checked={on} aria-label={libelle} aria-disabled={lock || undefined} onClick={() => !lock && changer?.(!on)}></button>
}

/** C.hint : ligne d'aide. */
export const Hint = ({ children, icone = 'info' }: { children: ReactNode; icone?: string }) => (
  <div className="hint-l">
    <Icone nom={icone} taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>{children}</span>
  </div>
)

/** C.divide : séparateur titré. */
export const Divide = ({ children }: { children: ReactNode }) => <div className="divide">{children}</div>

/** C.tl : frise (étapes faites, en cours, en échec). */
export function Frise({ items }: { items: { t: ReactNode; d?: ReactNode; st?: 'done' | 'cur' | 'bad' | '' }[] }) {
  return (
    <div className="tl">
      {items.map((i, n) => (
        <div key={n} className={cls('ti', i.st)}>
          <div className="tt">{i.t}</div>
          {i.d && <div className="td">{i.d}</div>}
        </div>
      ))}
    </div>
  )
}

/** C.more : détail repliable. */
export function Plus({ libelle, children, ouvert, plat, icone = 'info' }: { libelle: ReactNode; children: ReactNode; ouvert?: boolean; plat?: boolean; icone?: string }) {
  return (
    <details className={cls('more', plat && 'flat')} open={ouvert}>
      <summary>
        <Icone nom={icone} taille={18} style={{ color: 'var(--e-txt)', flexShrink: 0 }} />
        <span className="grow">{libelle}</span>
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="more-b">{children}</div>
    </details>
  )
}

/** Avatar à initiales (C.who .av) seul ; `ton` gris : livreur indisponible. */
export function Av({ initiales, taille = 34, ton }: { initiales: string; taille?: number; ton?: 'gris' | 'red' | 'amber' }) {
  return (
    <span className={cls('av', 'av-seul', ton)} style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.34) }} aria-hidden="true">
      {initiales}
    </span>
  )
}

/** C.who : personne (avatar à initiales, nom, complément). */
export function Qui({ nom, sous, av }: { nom: ReactNode; sous?: ReactNode; av?: ReactNode }) {
  const init = typeof nom === 'string' ? nom.split(' ').map((x) => x[0]).slice(0, 2).join('') : ''
  return (
    <span className="who">
      <span className="av" aria-hidden="true">
        {av ?? init}
      </span>
      <span>
        <b>{nom}</b>
        {sous && <span>{sous}</span>}
      </span>
    </span>
  )
}

/**
 * C.ring : anneau d'une valeur sur un maximum (note sur 100, jours), la valeur ou un libellé au centre. Lisible à
 * toute taille : trait proportionnel (il ne mange pas le texte), nombre à la taille du cercle (cqw : % de sa largeur,
 * selon la longueur du libellé), couleur du texte (pas celle de l'anneau), centrage exact ; au téléphone, le cercle
 * ne descend pas sous une taille minimale (--ring-min, styles : .ring).
 */
export function Anneau({ v, max = 100, couleur, taille = 64, libelle, aria }: { v: number | null; max?: number; couleur?: string; taille?: number; libelle?: ReactNode; aria?: string }) {
  const trait = Math.max(4, Math.min(9, Math.round(taille * 0.075)))
  const r = (taille - trait) / 2 - 0.5
  const c = 2 * Math.PI * r
  const f = (c * Math.max(0, Math.min(v ?? 0, max))) / (max || 1)
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'fr' : 'fr'
  const centre = libelle ?? (v === null ? '—' : v.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 1 }))
  const n = typeof centre === 'string' || typeof centre === 'number' ? String(centre).replace(/\s/g, '').length : 5
  const k = n <= 2 ? 34 : n === 3 ? 29 : n === 4 ? 24 : n <= 6 ? 18 : 14
  return (
    <div className="ring" style={{ width: taille, height: taille, ['--ring-min' as string]: taille < 56 ? '48px' : '72px' }} role={aria ? 'img' : undefined} aria-label={aria}>
      <svg viewBox={`0 0 ${taille} ${taille}`} width="100%" height="100%" aria-hidden="true">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--sand-3)" strokeWidth={trait} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={couleur ?? 'var(--acc)'} strokeWidth={trait} strokeLinecap="round" strokeDasharray={`${f.toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <b style={{ fontSize: `${k}cqw`, padding: `0 ${trait + 2}px` }}>{centre}</b>
    </div>
  )
}

/** entA_row : ligne d'action (icône ou avatar, titre, sous-titre, à droite) ; `chaud` : la plus urgente (bord orange). */
export function Rangee(p: { icone?: string; ton?: string; av?: ReactNode; titre: ReactNode; sous?: ReactNode; droite?: ReactNode; chaud?: boolean; boutons?: boolean; retour?: boolean; style?: CSSProperties }) {
  return (
    <div className={cls('entA-row', p.chaud && 'hot', p.boutons && 'rb', p.retour && 'wrapr')} style={p.style}>
      <span className={cls('ic', p.ton)}>{p.av ?? <Icone nom={p.icone ?? 'circle'} taille={20} />}</span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>
          {p.titre}
        </span>
        {p.sous && (
          <span className="s" style={{ display: 'block' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.droite && <span className="r">{p.droite}</span>}
    </div>
  )
}

/** entA_step : étape d'une chaîne (numéro ou coche, titre, sous-titre, à droite) ; st : done | cur | wait | bad. */
export function Etape(p: { n: ReactNode; st?: 'done' | 'cur' | 'wait' | 'bad' | ''; titre: ReactNode; sous?: ReactNode; droite?: ReactNode }) {
  return (
    <div className={cls('entA-step', p.st)}>
      <span className="n">{p.st === 'done' ? <Icone nom="check" taille={16} trait={3} /> : p.st === 'bad' ? <Icone nom="x" taille={16} trait={3} /> : p.n}</span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>
          {p.titre}
        </span>
        {p.sous && (
          <span className="s" style={{ display: 'block' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.droite && <span className="r">{p.droite}</span>}
    </div>
  )
}

/** entA_lock : « Fixé par BelivaY ». */
export function Verrou({ children }: { children: ReactNode }) {
  return (
    <span className="entA-lock">
      <Icone nom="lock" taille={14} />
      {children}
    </span>
  )
}

/** CH.hbars : barres horizontales (libellé, barre, valeur). */
export function BarresH({ lignes, largeurLibelle = 120, largeurValeur = 54 }: { lignes: { l: ReactNode; v: number; max: number; r?: ReactNode; ton?: 'acc' | 'green' | 'red' | ''; label?: string }[]; largeurLibelle?: number; largeurValeur?: number }) {
  return (
    <>
      {lignes.map((r, i) => (
        <div key={i} className="row" style={{ gap: 10, padding: '7px 0' }} role="group" aria-label={r.label}>
          <span className="t13 b7" style={{ width: largeurLibelle, flexShrink: 0 }}>
            {r.l}
          </span>
          {/* Base de 48 px (et non 120) : la barre reste sur la ligne du libellé au téléphone ; elle ne passe dessous que dans une colonne vraiment étroite. */}
          <span className="grow" style={{ flexBasis: 48 }}>
            <Barre pct={(100 * r.v) / (r.max || 100)} ton={r.ton ?? 'acc'} />
          </span>
          <span className="t13 b8 right" style={{ width: largeurValeur, textAlign: 'right' }}>
            {r.r ?? r.v}
          </span>
        </div>
      ))}
    </>
  )
}

/** CH.spark : petite courbe. */
export function Courbe({ valeurs, l = 120, h = 34, couleur }: { valeurs: number[]; l?: number; h?: number; couleur?: string }) {
  if (valeurs.length < 2) return null
  const max = Math.max(...valeurs)
  const min = Math.min(...valeurs)
  const d = valeurs.map((v, i) => (i ? 'L' : 'M') + ((l * i) / (valeurs.length - 1)).toFixed(1) + ' ' + (h - 3 - ((h - 6) * (v - min)) / Math.max(1, max - min)).toFixed(1)).join(' ')
  return (
    <svg viewBox={`0 0 ${l} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true" style={{ maxWidth: l }}>
      <path d={d} fill="none" stroke={couleur ?? 'var(--acc)'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ═══════════════ Enrichissements « prototype → produit fini » (ENRICHISSEMENTS.md, motifs M5, M6, M8, M16, M17, M20) ═══════════════
// Versés du lot ENT-05..08 (ex composants/enrichi.tsx) : ils se posent DANS les blocs du prototype, sans les déplacer.
// ── Texte ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Texte comparable : minuscules, sans accents ni espaces doubles. */
export const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
/** Vrai si l'un des champs contient chaque mot de la recherche (vide : tout passe). */
export function correspond(q: string, ...champs: (string | number | null | undefined)[]): boolean {
  const mots = normaliser(q).split(' ').filter(Boolean)
  if (!mots.length) return true
  const texte = normaliser(champs.filter((c) => c !== null && c !== undefined).join(' '))
  return mots.every((m) => texte.includes(m))
}

// ── File hors connexion ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * Gestes gardés sans réseau (M8) : leur nombre, ce qu'ils sont, « Envoyer maintenant » quand le réseau est là,
 * « Retirer » pour l'un d'eux ; un geste refusé à l'envoi est montré avec sa raison. Rien quand la file est vide.
 */
export function FileEnAttente() {
  const { t, tf } = usePreferences()
  const f = useFile()
  const [envoi, setEnvoi] = useState(false)
  if (!f.gestes.length && !f.refuses.length) return null
  const envoyer = async () => {
    setEnvoi(true)
    const b = await envoyerLaFile()
    setEnvoi(false)
    jouer(b.refuses ? 'erreur' : 'fin')
  }
  return (
    <div className="en-file">
      {f.gestes.length > 0 && (
        <details className="en-file-b ambre" role="status">
          <summary>
            <Icone nom="cloud-upload" taille={18} />
            <span className="grow">
              <b>{tf('{n} geste(s) en attente d’envoi', { n: f.gestes.length })}</b> · {t('gardés sur cet appareil, envoyés dès le retour du réseau')}
            </span>
            <Icone nom="chevron-down" taille={16} />
          </summary>
          <ul>
            {f.gestes.map((g) => (
              <li key={g.id}>
                <span className="grow">
                  {t(g.libelle)}
                  {g.objet && <small> · {g.objet}</small>}
                </span>
                <button type="button" className="btn sm ghost" onClick={() => retirerDeLaFile(g.id)}>
                  {t('Retirer')}
                </button>
              </li>
            ))}
          </ul>
          {enLigneMaintenant() && (
            <button type="button" className="btn sm secondary" disabled={envoi} onClick={envoyer}>
              <Icone nom="send" taille={16} />
              {envoi ? t('Envoi…') : t('Envoyer maintenant')}
            </button>
          )}
        </details>
      )}
      {f.refuses.map((g) => (
        <div key={g.id} className="en-file-b rouge" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <span className="grow">
            <b>{tf('« {g} » n’a pas été accepté à l’envoi', { g: t(g.libelle) })}</b>
            {g.objet && ` · ${g.objet}`} · {/\s/.test(g.raison) ? t(g.raison) : tf('refusé par le serveur (code {c})', { c: g.raison })}
          </span>
          <button type="button" className="btn sm ghost" onClick={() => oublierRefus(g.id)}>
            {t('Compris')}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Compte à rebours ────────────────────────────────────────────────────────────────────────────────────────────
/** Temps restant en mots courts, à la seconde sous l'heure : « 2 h 05 », « 14 min 09 s », « 42 s ». */
export function useRestant() {
  const { tf } = usePreferences()
  return useCallback(
    (ms: number) => {
      const s = Math.max(0, Math.floor(ms / 1000))
      const j = Math.floor(s / 86400)
      const h = Math.floor((s % 86400) / 3600)
      const m = Math.floor((s % 3600) / 60)
      const r = s % 60
      if (j >= 1) return tf('{j} j {h} h', { j, h })
      if (h >= 1) return tf('{h} h {m}', { h, m: String(m).padStart(2, '0') })
      if (m >= 1) return tf('{m} min {s} s', { m, s: String(r).padStart(2, '0') })
      return tf('{s} s', { s })
    },
    [tf],
  )
}

/**
 * Compte à rebours en direct (M17) : une seconde de moins chaque seconde, à l'heure du serveur ; ambre sous `urgent`
 * (1 h par défaut), rouge sous `critique` (10 min) ; à zéro, `echu` (texte) et un signal sonore une fois.
 * `icone={false}` : l'heure seule (au centre d'un anneau, où l'icône brouillerait les chiffres).
 */
export function Rebours({ fin, urgent = 3_600_000, critique = 600_000, echu, avant, className, icone = true }: { fin: number; urgent?: number; critique?: number; echu?: ReactNode; avant?: ReactNode; className?: string; icone?: boolean }) {
  const { t } = usePreferences()
  const n = useHorloge(1000)
  const restant = useRestant()
  const ms = fin - n
  const sonne = useRef(ms <= 0)
  useEffect(() => {
    if (ms <= 0 && !sonne.current) {
      sonne.current = true
      jouer('erreur')
    }
  }, [ms])
  const ton = ms <= 0 ? 'echu' : ms < critique ? 'critique' : ms < urgent ? 'urgent' : ''
  return (
    <span className={'rebours ' + ton + (className ? ' ' + className : '')} role="timer" aria-live="off">
      {icone && <Icone nom={ms <= 0 ? 'clock-alert' : 'timer'} taille={14} />}
      {ms <= 0 ? (echu ?? t('Délai dépassé')) : (
        <>
          {avant}
          <b>{restant(ms)}</b>
        </>
      )}
    </span>
  )
}

// ── Annuler ─────────────────────────────────────────────────────────────────────────────────────────────────────
interface Differe {
  cle: string
  texte: string
  faire: () => Promise<void> | void
  fin: number
}

/**
 * Geste réversible (M16) : l'écran le montre fait tout de suite (`enCours` contient sa clé), l'appel part au bout de
 * `delai` (5 s) sauf « Annuler ». Quitter la page envoie les gestes encore en attente : rien n'est perdu.
 */
export function useAnnuler(delai = 5000) {
  const { t } = usePreferences()
  const [liste, setListe] = useState<Differe[]>([])
  const ref = useRef<Differe[]>([])
  ref.current = liste
  const minuteurs = useRef(new Map<string, number>())
  const partir = useCallback((d: Differe) => {
    minuteurs.current.delete(d.cle)
    setListe((l) => l.filter((x) => x.cle !== d.cle))
    void d.faire()
  }, [])
  const differer = useCallback(
    (cle: string, texte: string, faire: () => Promise<void> | void) => {
      const d = { cle, texte, faire, fin: Date.now() + delai }
      setListe((l) => [...l.filter((x) => x.cle !== cle), d])
      window.clearTimeout(minuteurs.current.get(cle))
      minuteurs.current.set(cle, window.setTimeout(() => partir(d), delai))
    },
    [delai, partir],
  )
  const annuler = useCallback((cle: string) => {
    window.clearTimeout(minuteurs.current.get(cle))
    minuteurs.current.delete(cle)
    setListe((l) => l.filter((x) => x.cle !== cle))
    jouer('retrait')
  }, [])
  useEffect(
    () => () => {
      for (const d of ref.current) {
        window.clearTimeout(minuteurs.current.get(d.cle))
        void d.faire()
      }
    },
    [],
  )
  const enCours = new Set(liste.map((d) => d.cle))
  const vue = liste.length ? (
    <div className="annuler-pile" aria-live="polite">
      {liste.map((d) => (
        <div key={d.cle} className="annuler" role="status">
          <Icone nom="circle-check" taille={18} />
          <span className="grow">{d.texte}</span>
          <button type="button" className="btn sm white" onClick={() => annuler(d.cle)}>
            <Icone nom="undo-2" taille={16} />
            {t('Annuler')}
          </button>
          <i style={{ animationDuration: `${delai}ms` }} aria-hidden="true" />
        </div>
      ))}
    </div>
  ) : null
  return { differer, annuler, enCours, vue }
}

// ── Listes ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** « / » met le curseur dans la recherche de la page (sauf pendant une saisie). */
export function useToucheRecherche() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return
      if (!ref.current) return
      e.preventDefault()
      ref.current.focus()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])
  return ref
}

/** Recherche d'une liste (classe srch du prototype), raccourci « / », bouton pour effacer. */
export function Recherche({ q: qAdresse, setQ: poserQ, placeholder, aria }: { q: string; setQ: (v: string) => void; placeholder: string; aria: string }) {
  const { t } = usePreferences()
  const ref = useToucheRecherche()
  // Saisie tenue localement : une recherche gardée dans l'adresse (?q=) se met à jour dans une transition du routeur,
  // en retard sur la frappe ; sans cela, une frappe rapide perd des caractères. L'adresse reprend la main hors saisie.
  const [q, setLocal] = useState(qAdresse)
  useEffect(() => {
    if (document.activeElement !== ref.current) setLocal(qAdresse)
  }, [qAdresse, ref])
  const setQ = (v: string) => (setLocal(v), poserQ(v))
  return (
    <label className="srch e-srch">
      <Icone nom="search" taille={16} />
      <input ref={ref} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={aria} aria-keyshortcuts="/" onKeyDown={(e) => e.key === 'Escape' && q && (e.stopPropagation(), setQ(''))} />
      {q ? (
        <button type="button" className="e-srch-x" aria-label={t('Effacer la recherche')} onClick={() => setQ('')}>
          <Icone nom="x" taille={16} />
        </button>
      ) : (
        <kbd className="e-kbd" aria-hidden="true">
          /
        </kbd>
      )}
    </label>
  )
}

/** Tri d'une liste (sélecteur, classe flt). */
export function Tri<T extends string>({ tri, setTri, options }: { tri: T; setTri: (v: T) => void; options: { id: T; t: string }[] }) {
  const { t } = usePreferences()
  return (
    <label className="flt e-tri">
      <Icone nom="arrow-down-up" taille={15} />
      <select value={tri} onChange={(e) => setTri(e.target.value as T)} aria-label={t('Trier')}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {t(o.t)}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Puces de filtre (Toutes / À répondre / Clos…) avec compteurs. */
export function Puces<T extends string>({ items, actif, choisir, aria }: { items: { id: T; t: string; n?: number }[]; actif: T; choisir: (v: T) => void; aria: string }) {
  const { t } = usePreferences()
  return (
    <div className="chips e-puces" role="group" aria-label={aria}>
      {items.map((i) => (
        <button key={i.id} type="button" className={'chip' + (i.id === actif ? ' on' : '')} aria-pressed={i.id === actif} onClick={() => choisir(i.id)}>
          {t(i.t)}
          {i.n !== undefined && <b className="e-puce-n">{i.n}</b>}
        </button>
      ))}
    </div>
  )
}

/** Résultat vide d'une recherche ou d'un filtre : la phrase et l'action qui débloque. */
export function AucunResultat({ effacer, texte }: { effacer: () => void; texte?: string }) {
  const { t } = usePreferences()
  return (
    <div className="vide e-zero">
      <div className="ei">
        <Icone nom="search-x" taille={26} />
      </div>
      <h3>{t('Aucun résultat')}</h3>
      <p>{texte ?? t('Rien ne correspond à la recherche ou aux filtres choisis.')}</p>
      <div className="btns mt10" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn sm secondary" onClick={effacer}>
          <Icone nom="x" taille={16} />
          {t('Effacer les filtres')}
        </button>
      </div>
    </div>
  )
}

/** « 12 sur 40 » : combien la liste filtrée en montre. */
export function Compte({ n, total }: { n: number; total: number }) {
  const { tf } = usePreferences()
  return (
    <p className="e-compte" aria-live="polite">
      {n === total ? tf('{n} élément(s)', { n: total }) : tf('{n} sur {total}', { n, total })}
    </p>
  )
}

// ── Exports ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const exporterCsv = (nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) => telecharger(new Blob([csv(entetes, lignes)], { type: 'text/csv;charset=utf-8' }), nom)
export const exporterPdf = (nom: string, lignes: LignePdf[]) => telecharger(pdf(lignes), nom)
/** Fichier rendu par la source ({ nom, contenu, type }), PDF compris. */
export const telechargerFichier = (f: { nom: string; contenu: string; type: string }) => telecharger(fichier(f.contenu, f.type), f.nom)

/** Boutons d'export d'une liste ou d'un document (CSV, PDF), à poser dans les actions ou les outils du tableau. */
export function Exports({ csv: faireCsv, pdf: fairePdf, libelle, desactive }: { csv?: () => void; pdf?: () => void; libelle?: string; desactive?: boolean }) {
  const { t } = usePreferences()
  return (
    <span className="e-exports" role="group" aria-label={libelle ?? t('Exporter')}>
      {faireCsv && (
        <button type="button" className="btn sm secondary" onClick={faireCsv} disabled={desactive}>
          <Icone nom="file-spreadsheet" taille={16} />
          CSV
        </button>
      )}
      {fairePdf && (
        <button type="button" className="btn sm secondary" onClick={fairePdf} disabled={desactive}>
          <Icone nom="file-down" taille={16} />
          PDF
        </button>
      )}
    </span>
  )
}

// ── Limites, droits ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Limite écrite là où elle s'applique (plafond, délai, quota) : ce qu'elle est, où l'on en est, et le message clair
 * quand elle est atteinte (`atteinte`).
 */
export function Limite({ icone = 'gauge', titre, texte, atteinte, children }: { icone?: string; titre: ReactNode; texte?: ReactNode; atteinte?: ReactNode; children?: ReactNode }) {
  return (
    <div className={'e-limite' + (atteinte ? ' atteinte' : '')} role={atteinte ? 'alert' : undefined}>
      <Icone nom={atteinte ? 'ban' : icone} taille={16} />
      <span className="grow">
        <b>{titre}</b>
        {texte && <> · {texte}</>}
        {atteinte && <span className="e-limite-a">{atteinte}</span>}
        {children}
      </span>
    </div>
  )
}


/** Ce qu'un rôle ne peut pas faire ici, expliqué (au lieu d'un bouton qui disparaît sans raison). */
export function Interdit({ roles, quoi }: { roles: Role[]; quoi: string }) {
  const { t, tf } = usePreferences()
  return (
    <p className="e-interdit">
      <Icone nom="lock" taille={14} />
      <span>{tf('{quoi} : réservé à {r}.', { quoi: t(quoi), r: roles.map((r) => t(NOM_ROLE[r])).join(' / ') })}</span>
    </p>
  )
}

// ── Zone du pouce ───────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Actions fréquentes d'un écran à portée du pouce au téléphone : barre fixe juste au-dessus de la barre du bas, gros
 * boutons (48 px). Sur tablette et ordinateur, rien ici : les mêmes actions sont en tête de page.
 */
export function BarrePouce({ children, aria }: { children: ReactNode; aria?: string }) {
  const { t } = usePreferences()
  const large = useLarge()
  if (large) return null
  return (
    <>
      <div className="e-pouce-place" aria-hidden="true" />
      <div className="e-pouce" role="toolbar" aria-label={aria ?? t('Actions principales')}>
        {children}
      </div>
    </>
  )
}
