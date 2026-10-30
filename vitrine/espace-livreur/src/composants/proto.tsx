// Composants du prototype livreur (objet « C » du moteur commun : C.pill, C.btn, C.sec, C.li, C.note, C.seg…),
// en React, avec le MÊME balisage et les MÊMES classes (src/styles/prototype.css, généré par outils/styles.mjs) :
// un écran repris garde la structure du prototype, son contenu vient de la source. Textes déjà traduits (t()).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from './Icone'
import { signal } from './signaux'
import { usePreferences } from '../preferences'

export type Ton = 'green' | 'amber' | 'red' | 'or' | 'acc' | 'blue' | 'ink' | 'violet' | 'dk' | 'night' | 'accs' | 'solid-acc' | 'solid-or' | 'bronze' | 'gold' | ''

/** C.pill : pastille d'état (point, icône), toujours doublée d'un texte. */
export function Pill({ ton = 'ink', sm, point, icone, children, style }: { ton?: Ton; sm?: boolean; point?: boolean; icone?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className={'pill ' + ton + (sm ? ' sm' : '')} style={style}>
      {point && <i className="d"></i>}
      {icone && <Icone nom={icone} taille={13} />}
      {children}
    </span>
  )
}
/** ST du prototype : pastille d'état métier (petite, à point). */
export const St = ({ ton, children }: { ton?: Ton; children: ReactNode }) => (
  <Pill ton={ton || 'ink'} sm point>
    {children}
  </Pill>
)

type Action = { vers?: string; remplacer?: boolean; onClick?: (e: MouseEvent) => void }

/** C.btn : bouton (lien quand `vers`). kind : primary, secondary, soft, acc, acc-soft, ghost, white, white-acc, dark, danger, red, green, urgent. */
export function Btn(p: Action & { kind?: string; icone?: string; apres?: string; cls?: string; off?: boolean; aria?: string; type?: 'button' | 'submit'; style?: CSSProperties; children?: ReactNode; form?: string }) {
  const cls = 'btn ' + (p.kind ?? 'primary') + (p.cls ? ' ' + p.cls : '') + (p.off ? ' off' : '')
  const dedans = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      {p.children !== undefined && p.children !== null && p.children !== false && <span>{p.children}</span>}
      {p.apres && <Icone nom={p.apres} taille={18} />}
    </>
  )
  if (p.vers)
    return (
      <Link className={cls} to={p.vers} replace={p.remplacer} onClick={p.onClick} aria-label={p.aria} style={p.style} aria-disabled={p.off || undefined}>
        {dedans}
      </Link>
    )
  return (
    <button type={p.type ?? 'button'} className={cls} onClick={p.onClick} disabled={p.off} aria-label={p.aria} style={p.style} form={p.form}>
      {dedans}
    </button>
  )
}

/** C.sec : titre de section, lien à droite. */
export function Sec({ titre, lien, vers, onClick, id, droite }: { titre: ReactNode; lien?: ReactNode; vers?: string; onClick?: () => void; id?: string; droite?: ReactNode }) {
  return (
    <div className="sec">
      <h2 id={id}>{titre}</h2>
      {lien &&
        (vers ? (
          <Link className="a" to={vers}>
            {lien}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        ) : (
          <button type="button" className="a" onClick={onClick} style={{ background: 'none', border: 0, padding: 0, minHeight: 44 }}>
            {lien}
            <Icone nom="chevron-right" taille={16} />
          </button>
        ))}
      {!lien && droite !== undefined && droite !== null && <span className="t13 b8 c3">{droite}</span>}
    </div>
  )
}

/** C.li : ligne de liste (icône teintée, titre, sous-titre, droite, chevron quand elle mène quelque part). */
export function Li(p: Action & { icone?: string; ton?: Ton; gauche?: ReactNode; t: ReactNode; s?: ReactNode; droite?: ReactNode; chev?: boolean; style?: CSSProperties; aria?: string; cls?: string; href?: string; disabled?: boolean }) {
  const dedans = (
    <>
      {p.icone && (
        <span className={'ic ' + (p.ton ?? '')}>
          <Icone nom={p.icone} taille={20} />
        </span>
      )}
      {p.gauche}
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {p.t}
        </span>
        {p.s !== undefined && p.s !== null && p.s !== '' && (
          <span className="ls" style={{ display: 'block' }}>
            {p.s}
          </span>
        )}
      </span>
      {p.droite}
      {(p.vers || p.onClick || p.href) && p.chev !== false && (
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      )}
    </>
  )
  const cls = 'li' + (p.cls ? ' ' + p.cls : '')
  if (p.vers)
    return (
      <Link className={cls} to={p.vers} replace={p.remplacer} onClick={p.onClick} style={p.style} aria-label={p.aria}>
        {dedans}
      </Link>
    )
  if (p.href)
    return (
      <a className={cls} href={p.href} style={p.style} aria-label={p.aria}>
        {dedans}
      </a>
    )
  if (p.onClick)
    return (
      <button type="button" className={cls} onClick={p.onClick} style={p.style} aria-label={p.aria} disabled={p.disabled}>
        {dedans}
      </button>
    )
  return (
    <div className={cls} style={p.style}>
      {dedans}
    </div>
  )
}

/** C.kv : paire libellé / valeur. */
export const Kv = ({ k, v, cls }: { k: ReactNode; v: ReactNode; cls?: string }) => (
  <div className="kv">
    <span className="k">{k}</span>
    <span className={'v ' + (cls ?? '')}>{v}</span>
  </div>
)

/** C.note : encadré teinté. */
export const Note = ({ ton, icone, children, role }: { ton: Ton; icone: string; children: ReactNode; role?: string }) => (
  <div className={'note ' + ton} role={role}>
    <Icone nom={icone} taille={18} />
    <div>{children}</div>
  </div>
)

/** C.hint : petite ligne d'explication. */
export const Hint = ({ icone = 'info', children }: { icone?: string; children: ReactNode }) => (
  <div className="hint-l">
    <Icone nom={icone} taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>{children}</span>
  </div>
)

/** C.foot : pied d'écran (état de la connexion, version). */
export const Foot = ({ icone = 'wifi', children }: { icone?: string; children: ReactNode }) => (
  <div className="foot">
    <Icone nom={icone} taille={16} />
    <span>{children}</span>
  </div>
)

/** C.offline : bandeau « Hors connexion » propre à l'écran (remplace le bandeau commun : data-hors-ligne). */
export const HorsConnexion = ({ children }: { children: ReactNode }) => (
  <div className="offline-banner" role="status" data-hors-ligne>
    <Icone nom="wifi-off" taille={18} />
    <span>{children}</span>
  </div>
)

export interface ItemSeg {
  t: ReactNode
  on?: boolean
  vers?: string
  onClick?: () => void
  icone?: string
  n?: ReactNode
  aria?: string
}
/** C.seg : segments (un seul choisi). */
export function Seg({ items, stack, label }: { items: ItemSeg[]; stack?: boolean; label?: string }) {
  return (
    <div className={'seg' + (stack ? ' stack' : '')} role="tablist" aria-label={label}>
      {items.map((i, k) => {
        const dedans = (
          <>
            {i.icone && <Icone nom={i.icone} taille={16} />}
            {i.t}
            {i.n !== undefined && <span className="n">{i.n}</span>}
          </>
        )
        return i.vers ? (
          <Link key={k} to={i.vers} replace className={i.on ? 'on' : ''} role="tab" aria-selected={!!i.on} aria-label={i.aria}>
            {dedans}
          </Link>
        ) : (
          <a key={k} href="#" onClick={(e) => (e.preventDefault(), i.onClick?.())} className={i.on ? 'on' : ''} role="tab" aria-selected={!!i.on} aria-label={i.aria}>
            {dedans}
          </a>
        )
      })}
    </div>
  )
}

/** C.chips : puces (filtres, choix). */
export function Chips({ items, scroll }: { items: ItemSeg[]; scroll?: boolean }) {
  return (
    <div className={'chips' + (scroll ? ' scroll' : '')}>
      {items.map((i, k) => {
        const dedans = (
          <>
            {i.icone && <Icone nom={i.icone} taille={15} />}
            {i.t}
            {i.n !== undefined && <span className="n">{i.n}</span>}
          </>
        )
        return i.vers ? (
          <Link key={k} to={i.vers} replace className={'chip' + (i.on ? ' on' : '')} aria-pressed={!!i.on}>
            {dedans}
          </Link>
        ) : i.onClick ? (
          <button key={k} type="button" onClick={i.onClick} className={'chip' + (i.on ? ' on' : '')} aria-pressed={!!i.on}>
            {dedans}
          </button>
        ) : (
          <span key={k} className={'chip' + (i.on ? ' on' : '')}>
            {dedans}
          </span>
        )
      })}
    </div>
  )
}

/** C.empty : état vide. */
export const Vide = ({ icone, t, s, children, ton }: { icone: string; t: ReactNode; s?: ReactNode; children?: ReactNode; ton?: 'or' }) => (
  <div className="empty">
    <div className="ei" style={ton === 'or' ? { background: 'var(--or-soft)', color: 'var(--or-txt)' } : undefined}>
      <Icone nom={icone} taille={26} />
    </div>
    <h3>{t}</h3>
    {s && <p>{s}</p>}
    {children}
  </div>
)

/** C.bar : barre de progression (pourcentage). */
export const Barre = ({ pct, ton, label }: { pct: number; ton?: string; label?: string }) => (
  <div className={'bar ' + (ton ?? '')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(100, pct)))} aria-label={label}>
    <i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }}></i>
  </div>
)

/** C.stepper : étapes numérotées. */
export const Stepper = ({ etapes, cur }: { etapes: ReactNode[]; cur: number }) => (
  <div className="stepper">
    {etapes.map((l, i) => (
      <div key={i} className={'st' + (i < cur ? ' done' : i === cur ? ' cur' : '')} aria-current={i === cur ? 'step' : undefined}>
        <b>{i < cur ? <Icone nom="check" taille={14} trait={3} /> : i + 1}</b>
        <span>{l}</span>
      </div>
    ))}
  </div>
)

/** C.steps : petits traits de progression. */
export const Steps = ({ n, cur }: { n: number; cur: number }) => (
  <div className="steps" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <i key={i} className={i < cur ? 'on' : i === cur ? 'cur' : ''}></i>
    ))}
  </div>
)

/** C.ring : anneau de progression. */
export function Anneau({ v, max, couleur, taille = 64, label }: { v: number; max: number; couleur?: string; taille?: number; label?: ReactNode }) {
  const r = (taille - 8) / 2
  const c = 2 * Math.PI * r
  const f = (c * Math.max(0, Math.min(v, max))) / max
  return (
    <div className="ring" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} aria-hidden="true">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--sand-3)" strokeWidth="6" />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={couleur ?? 'var(--acc)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${f.toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <b style={taille > 80 ? { fontSize: Math.round(taille / 3.4) } : undefined}>{label ?? v}</b>
    </div>
  )
}

/** C.tile : tuile chiffrée. */
export function Tuile(p: { k: ReactNode; v: ReactNode; petit?: ReactNode; s?: ReactNode; ton?: string; vers?: string; icone?: string }) {
  const dedans = (
    <>
      {p.icone && (
        <span className="ti">
          <Icone nom={p.icone} taille={17} />
        </span>
      )}
      <div className="tk">{p.k}</div>
      <div className="tv">
        {p.v}
        {p.petit !== undefined && <small>{p.petit}</small>}
      </div>
      {p.s && <div className="ts">{p.s}</div>}
    </>
  )
  return p.vers ? (
    <Link className={'tile ' + (p.ton ?? '')} to={p.vers}>
      {dedans}
    </Link>
  ) : (
    <div className={'tile ' + (p.ton ?? '')}>{dedans}</div>
  )
}

/** C.check : case cochée (lecture). */
export const Coche = ({ on, bad, children }: { on?: boolean; bad?: boolean; children: ReactNode }) => (
  <div className="check">
    <span className={'cbx' + (on ? ' on' : '') + (bad ? ' bad' : '')}>{on ? <Icone nom="check" taille={14} trait={3} /> : bad ? <Icone nom="x" taille={14} trait={3} /> : null}</span>
    <span className="grow">{children}</span>
  </div>
)

/** C.tl : chronologie. */
export const Chrono = ({ items }: { items: { t: ReactNode; d?: ReactNode; st?: 'done' | 'cur' | 'bad' | '' }[] }) => (
  <div className="tl">
    {items.map((i, k) => (
      <div key={k} className={'ti ' + (i.st ?? '')}>
        <div className="tt">{i.t}</div>
        {i.d && <div className="td">{i.d}</div>}
      </div>
    ))}
  </div>
)

/** Pastille de nombre (badge-num du prototype). */
export const BadgeNum = ({ n, ton }: { n: ReactNode; ton?: 'acc' | 'red' | '' }) => <span className={'badge-num ' + (ton ?? '')}>{n}</span>

/** Carte nommée du prototype (C.card) : `tight` pour une liste. */
export const Carte = ({ cls, style, children, id }: { cls?: string; style?: CSSProperties; children: ReactNode; id?: string }) => (
  <div className={'card ' + (cls ?? '')} style={style} id={id}>
    {children}
  </div>
)

/** Conteneur d'un écran de la tournée, du ramassage, des remises ou des incidents : porte les règles propres à ces
 * écrans (classe .lvp, et celle du groupe : .liv07, .l8). */
export function Lvp({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={'lvp' + (className ? ' ' + className : '')}>{children}</div>
}

/** C.title : titre de page (kicker, titre, sous-titre). */
export function Titre({ kicker, titre, sous }: { kicker?: ReactNode; titre: ReactNode; sous?: ReactNode }) {
  return (
    <div className="pg">
      {kicker && <div className="pg-k">{kicker}</div>}
      <h1 className="pg-t">{titre}</h1>
      {sous && <p className="pg-s">{sous}</p>}
    </div>
  )
}

/** C.stop : ligne d'arrêt numérotée (fait, en cours, en incident). */
export function Arret({ n, etat, titre, sous, droite, to, className }: { n: ReactNode; etat?: 'done' | 'cur' | 'bad' | ''; titre: ReactNode; sous?: ReactNode; droite?: ReactNode; to?: string; className?: string }) {
  const corps = (
    <>
      <span className="sn">{etat === 'done' ? <Icone nom="check" taille={15} trait={3} /> : n}</span>
      <span className="grow">
        <span className="st" style={{ display: 'block' }}>
          {titre}
        </span>
        {sous && (
          <span className="ss" style={{ display: 'block' }}>
            {sous}
          </span>
        )}
      </span>
      {droite}
    </>
  )
  const cls = 'stop ' + (etat ?? '') + (className ? ' ' + className : '')
  return to ? (
    <Link className={cls} to={to} style={{ display: 'flex' }}>
      {corps}
    </Link>
  ) : (
    <div className={cls}>{corps}</div>
  )
}

/** .mini (dans .split2 / .split3) : petit indicateur. */
export const Mini = ({ k, v }: { k: ReactNode; v: ReactNode }) => (
  <div className="mini">
    <div className="mk">{k}</div>
    <div className="mv">{v}</div>
  </div>
)

/** C.radio : choix dans une liste fermée (bouton radio accessible). */
export function Choix({ on, titre, sous, onClick, disabled, name }: { on: boolean; titre: ReactNode; sous?: ReactNode; onClick: () => void; disabled?: boolean; name?: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={'radio' + (on ? ' on' : '')} onClick={onClick} disabled={disabled} data-name={name}>
      <span className="rd" />
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {titre}
        </span>
        {sous && (
          <span className="rs" style={{ display: 'block' }}>
            {sous}
          </span>
        )}
      </span>
    </button>
  )
}

/** .bottom-cta du prototype : LA barre d'action du bas de l'application (une aide au-dessus, une action principale,
 * parfois une seconde). Fixée au bas de l'écran, au-dessus de la barre d'onglets quand elle existe, avec sa place
 * réservée dans la page (mesurée : rien n'est jamais caché dessous) ; dans le flux en mode une main désactivé. */
export function BarreAction({ aide, children, className }: { aide?: ReactNode; children: ReactNode; className?: string }) {
  const barre = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    const el = barre.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const o = new ResizeObserver(() => setH(el.offsetHeight))
    o.observe(el)
    setH(el.offsetHeight)
    return () => o.disconnect()
  }, [])
  return (
    <>
      <div className="bottom-cta-place" style={{ height: h }} aria-hidden="true" />
      <div ref={barre} className={'bottom-cta' + (className ? ' ' + className : '')}>
        {aide && <p className="aide">{aide}</p>}
        {children}
      </div>
    </>
  )
}

/** C.otp : cases d'un code, MASQUÉES (des points : un code n'est jamais affiché en clair) ; case courante cerclée,
 * toutes rouges en erreur, vertes une fois validé. */
export function Cases({ n, valeur, erreur, ok, actif = true, libelle }: { n: number; valeur: string; erreur?: boolean; ok?: boolean; actif?: boolean; libelle: string }) {
  return (
    <div className={'otp' + (erreur ? ' err' : ok ? ' ok' : '')} role="img" aria-label={libelle} aria-invalid={erreur || undefined}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={(i < valeur.length || ok ? 'f' : '') + (i === valeur.length && actif && !erreur && !ok ? ' f cur' : '')}>
          {i < valeur.length || ok ? '•' : ''}
        </span>
      ))}
    </div>
  )
}

/** C.keypad : LE pavé numérique de l'application (code PIN, code de remise, de livraison, de réception) : touches de
 * 52 px, clavier physique accepté, son au toucher ; `gauche` : touche optionnelle en bas à gauche. */
export function Pave({ ajouter, effacer, actif, vide, plein, gauche }: { ajouter: (c: string) => void; effacer: () => void; actif: boolean; vide: boolean; plein?: boolean; gauche?: ReactNode }) {
  const { t } = usePreferences()
  useEffect(() => {
    if (!actif) return
    const touche = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const cible = e.target as HTMLElement | null
      if (cible && /^(INPUT|TEXTAREA)$/.test(cible.tagName)) return
      if (/^\d$/.test(e.key)) ajouter(e.key)
      else if (e.key === 'Backspace') effacer()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [actif, ajouter, effacer])
  const chiffre = (c: string) => (
    <button key={c} type="button" disabled={!actif || plein} onClick={() => (signal('toucher'), ajouter(c))}>
      {c}
    </button>
  )
  return (
    <div className="keypad" role="group" aria-label={t('Pavé numérique')}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(chiffre)}
      {gauche ?? <span className="k0" />}
      {chiffre('0')}
      <button type="button" className="kp-x" disabled={!actif || vide} onClick={() => (signal('toucher'), effacer())} aria-label={t('Effacer le dernier chiffre')}>
        ⌫
      </button>
    </div>
  )
}

/** Saisie d'un code à usage unique (remise du vendeur, livraison de la cliente, réception du vendeur) : le livreur
 * TEND son téléphone, l'autre partie tape son code (ou le dicte) ; cases masquées et pavé commun ; longueur lue dans
 * le registre (CODE-LONGUEUR). Le code n'est jamais gardé ni journalisé : l'écran le vide après chaque essai. */
export function SaisieCode(p: { longueur: number; valeur: string; changer: (v: string) => void; desactive?: boolean; erreur?: boolean; ok?: boolean; libelle: string }) {
  const { t, tf } = usePreferences()
  const { longueur, valeur, changer, desactive } = p
  return (
    <>
      <Cases n={longueur} valeur={valeur} erreur={p.erreur} ok={p.ok} actif={!desactive} libelle={tf('{libelle} : {n} chiffres sur {total}', { libelle: t(p.libelle), n: valeur.length, total: longueur })} />
      <Pave actif={!desactive} vide={valeur.length === 0} plein={valeur.length >= longueur} ajouter={(c) => valeur.length < longueur && changer(valeur + c)} effacer={() => changer(valeur.slice(0, -1))} />
    </>
  )
}
