// Socle du kit « compte » : textes (français, et anglais propre au kit), icônes, styles, avatar (photo ou initiales
// colorées), modale du bas, section repliable, champ de code à 6 chiffres, champ de mot de passe (règles sobres,
// afficher/masquer) et recadrage (cercle pour la photo, bandeau 3:1 pour la couverture ; image allégée sur le
// téléphone à 300 Ko au plus). Couleur d'accent : celle de l'application (--ck-acc, posée par <Kit couleur=…>).
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { env } from '../config/env'
import { usePreferences } from '../preferences'
import { CODE_DEMO, REGLES_MDP, initiales, teinte } from './etat'
import { ICONES_COMPTE } from './icones'
import { EN } from './textes'

// ── Textes ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** t() du kit : en anglais, la traduction du kit d'abord (aucune clé absente dans les applications). */
export function useTk() {
  const { t, langue } = usePreferences()
  const tk = useCallback((fr: string) => (langue === 'en' && EN[fr] !== undefined ? EN[fr] : t(fr)), [t, langue])
  const tkf = useCallback((fr: string, v: Record<string, string | number>) => tk(fr).replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? '')), [tk])
  return { tk, tkf, langue }
}

// ── Icônes ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function Ic({ n, s = 18, style }: { n: string; s?: number; style?: CSSProperties }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: ICONES_COMPTE[n] ?? '' }}
    />
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CSS = `
.ck{--ck-ink:var(--ink,#1c1917);--ck-mut:var(--ink-3,#6b6560);--ck-line:var(--line,rgba(0,0,0,.1));--ck-card:var(--card,#fff);--ck-red:var(--red,#B42318);--ck-green:var(--green,#1F7A4D);color:var(--ck-ink);font:inherit}
.ck *{box-sizing:border-box}
.ck button,.ck input{margin:0;letter-spacing:normal;text-transform:none}
.ck-card{background:var(--ck-card);border:1px solid var(--ck-line);border-radius:16px;padding:14px;margin:12px 0}
.ck-tete{display:flex;align-items:center;gap:14px}
.ck-av{flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;font-weight:800;color:#fff;letter-spacing:.02em}
.ck-av img{width:100%;height:100%;object-fit:cover;display:block}
.ck-couv{position:relative;height:96px;margin:-14px -14px 0;border-radius:15px 15px 0 0;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--ck-acc) 35%,transparent),var(--ck-acc))}
.ck-couv img{width:100%;height:100%;object-fit:cover;display:block}
.ck-couv+.ck-tete{margin-top:-36px;flex-direction:column;align-items:flex-start;gap:8px}
.ck-couv+.ck-tete .ck-av{box-shadow:0 0 0 3px var(--ck-card)}
.ck-nom{font-weight:800;font-size:17px;line-height:1.25}
.ck-sous{font-size:13px;color:var(--ck-mut);overflow-wrap:anywhere}
.ck-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ck-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid transparent;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer;text-decoration:none;background:var(--ck-acc);color:#fff}
.ck-btn[aria-disabled=true]{opacity:.45;cursor:not-allowed}
.ck-btn.sec{background:transparent;color:var(--ck-ink);border-color:var(--ck-line)}
.ck-btn.lien{background:none;border:0;color:var(--ck-acc-txt,var(--ck-acc));padding:0 4px;min-height:44px}
.ck-btn.rouge{background:var(--ck-red)}
.ck-btn.plein{width:100%}
.ck-btn.petit{min-height:44px;padding:0 12px;font-size:13.5px}
.ck-repli{border-top:1px solid var(--ck-line)}
.ck-repli:first-child{border-top:0}
.ck-repli>summary{display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 0;cursor:pointer;list-style:none}
.ck-repli>summary::-webkit-details-marker{display:none}
.ck-repli>summary .ck-ic{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--ck-acc) 14%,transparent);color:var(--ck-acc-txt,var(--ck-acc))}
.ck-repli>summary .ck-t{flex:1;min-width:0}
.ck-repli>summary b{display:block;font-size:15px}
.ck-repli>summary span.ck-sous{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ck-repli>summary>svg:last-child{color:var(--ck-mut);transition:transform .2s}
.ck-repli[open]>summary>svg:last-child{transform:rotate(180deg)}
.ck-repli>.ck-corps{padding:2px 0 14px}
.ck-fld{display:block;margin:10px 0 0}
.ck-fld>span:not(.ck-inp){display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.ck-inp{display:flex;flex-wrap:nowrap;align-items:center;gap:8px;min-height:48px;padding:0 12px;border:1.5px solid var(--ck-line);border-radius:12px;background:var(--ck-card)}
.ck-inp:focus-within{border-color:var(--ck-acc)}
.ck-inp.err{border-color:var(--ck-red)}
.ck-inp input{display:block;flex:1 1 auto;width:0;min-width:0;border:0;outline:0;background:none;color:inherit;font:inherit;font-size:16px;height:44px;padding:0;box-shadow:none}
.ck-inp button{flex:none;width:auto;padding:0;background:none;border:0;color:var(--ck-mut);cursor:pointer;display:grid;place-items:center;min-width:44px;min-height:44px}
.ck-code input{letter-spacing:.4em;font-weight:800;text-align:center}
.ck-regles{display:flex;flex-wrap:wrap;gap:6px 12px;margin:8px 0 0;padding:0;list-style:none;font-size:12.5px;color:var(--ck-mut)}
.ck-regles li{display:flex;align-items:center;gap:4px}
.ck-regles li.ok{color:var(--ck-green)}
.ck-note{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--ck-mut);margin:10px 0 0;line-height:1.4}
.ck-note.err{color:var(--ck-red)}
.ck-note.ok{color:var(--ck-green)}
.ck-pile>*+*{margin-top:8px}
.ck-li{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 0;background:none;border:0;border-top:1px solid var(--ck-line);color:inherit;font:inherit;text-align:left;cursor:pointer}
.ck-li:first-child{border-top:0}
.ck-li .ck-t{flex:1;min-width:0;font-weight:700;font-size:15px}
.ck-chk{display:flex;align-items:center;gap:10px;min-height:44px;margin:8px 0 0;font-size:14px;cursor:pointer}
.ck-chk input{width:20px;height:20px;accent-color:var(--ck-acc)}
.ck-discret{display:block;min-height:44px;padding:0 8px;margin:12px auto 6px;background:none;border:0;color:var(--ck-mut);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}
.ck-voile{position:fixed;inset:0;z-index:2147483000;background:rgba(10,8,6,.5);display:flex;align-items:flex-end;justify-content:center}
.ck-feuille{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--ck-card);color:var(--ck-ink);border-radius:22px 22px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom))}
@media(min-width:768px){.ck-voile{align-items:center}.ck-feuille{border-radius:22px}}
.ck-poignee{width:40px;height:4px;border-radius:2px;background:var(--ck-line);margin:2px auto 12px}
.ck-feuille h2{margin:0 0 4px;font-size:19px;font-weight:800}
.ck-feuille p.ck-sous{margin:0 0 6px}
.ck-rog{position:relative;width:100%;max-width:300px;aspect-ratio:1;margin:12px auto 0;overflow:hidden;border-radius:16px;background:#14100c;touch-action:none;user-select:none;outline:none;cursor:grab}
.ck-rog.couv{max-width:520px;aspect-ratio:3}
.ck-rog img{position:absolute;left:50%;top:50%;max-width:none;pointer-events:none}
.ck-rog i{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.55);pointer-events:none;outline:2px solid rgba(255,255,255,.85)}
.ck-rog.couv i{border-radius:8px}
.ck-zoom{display:flex;align-items:center;gap:10px;max-width:300px;margin:12px auto 0}
.ck-zoom input{flex:1;min-height:44px;accent-color:var(--ck-acc)}
.ck-mail{border:1px solid var(--ck-line);border-radius:14px;padding:14px;margin-top:10px}
.ck-mail small{display:block;color:var(--ck-mut);font-size:12px}
.ck-g{display:inline-grid;place-items:center;width:22px;height:22px;flex-shrink:0;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.12)}
.ck-sep{display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--ck-mut);font-size:12.5px}
.ck-sep:before,.ck-sep:after{content:"";flex:1;height:1px;background:var(--ck-line)}
.ck-avis{font-size:13px;color:var(--ck-mut);display:flex;gap:8px;padding:6px 0}
`

const Couleurs = createContext<CSSProperties>({})
const couleurs = (couleur: string, texte?: string): CSSProperties => ({ ['--ck-acc' as string]: couleur, ...(texte ? { ['--ck-acc-txt' as string]: texte } : {}) })

/** Racine du kit : styles et couleur d'accent de l'application (reprise par les modales, posées hors de la page). */
export function Kit({ couleur, texte, children, style }: { couleur: string; texte?: string; children: ReactNode; style?: CSSProperties }) {
  const c = couleurs(couleur, texte)
  return (
    <Couleurs.Provider value={c}>
      <div className="ck" style={{ ...c, ...style }}>
        <style>{CSS}</style>
        {children}
      </div>
    </Couleurs.Provider>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function Avatar({ photo, prenom, nom = '', taille = 40, label }: { photo: string | null; prenom: string; nom?: string; taille?: number; label?: string }) {
  return (
    <span className="ck-av" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.38), background: photo ? 'transparent' : teinte(prenom + nom) }}>
      {photo ? <img src={photo} alt="" /> : initiales(prenom, nom)}
    </span>
  )
}

// ── Modale du bas ──────────────────────────────────────────────────────────────────────────────────────────────
export function Modale({ ouverte, fermer, titre, children }: { ouverte: boolean; fermer: () => void; titre: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ouverte) return
    const avant = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', echap)
    return () => {
      window.removeEventListener('keydown', echap)
      avant?.focus?.()
    }
  }, [ouverte, fermer])
  const c = useContext(Couleurs)
  if (!ouverte) return null
  return createPortal(
    <div className="ck" style={c}>
      <style>{CSS}</style>
      <div className="ck-voile" onClick={(e) => e.target === e.currentTarget && fermer()}>
        <div ref={ref} className="ck-feuille" role="dialog" aria-modal="true" aria-label={titre} tabIndex={-1}>
          <div className="ck-poignee" />
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Section repliable ──────────────────────────────────────────────────────────────────────────────────────────
export function Repli({ icone, titre, sous, ouvert, basculer, children, id }: { icone: string; titre: string; sous?: string; ouvert: boolean; basculer: (o: boolean) => void; children: ReactNode; id?: string }) {
  return (
    <details className="ck-repli" open={ouvert} data-repli={id} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open !== ouvert && basculer((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        <span className="ck-ic">
          <Ic n={icone} s={19} />
        </span>
        <span className="ck-t">
          <b>{titre}</b>
          {sous && <span className="ck-sous">{sous}</span>}
        </span>
        <Ic n="chevron-down" s={18} />
      </summary>
      {ouvert && <div className="ck-corps">{children}</div>}
    </details>
  )
}

// ── Champs ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function Champ(p: { label: string; valeur: string; changer: (v: string) => void; type?: string; mode?: 'email' | 'tel' | 'numeric' | 'text'; auto?: string; err?: boolean; icone?: string; prefixe?: string; nomTest?: string }) {
  const id = useId()
  return (
    <label className="ck-fld" htmlFor={id}>
      <span>{p.label}</span>
      <span className={'ck-inp' + (p.err ? ' err' : '')}>
        {p.icone && <Ic n={p.icone} s={18} style={{ color: 'var(--ck-mut)' }} />}
        {p.prefixe && <b style={{ fontSize: 15 }}>{p.prefixe}</b>}
        <input id={id} data-ck={p.nomTest} type={p.type ?? 'text'} inputMode={p.mode} autoComplete={p.auto} value={p.valeur} onChange={(e) => p.changer(e.target.value)} />
      </span>
    </label>
  )
}

export function ChampMdp({ label, valeur, changer, regles, auto, nomTest, err }: { label: string; valeur: string; changer: (v: string) => void; regles?: boolean; auto?: string; nomTest?: string; err?: boolean }) {
  const { tk } = useTk()
  const [voir, setVoir] = useState(false)
  const id = useId()
  return (
    <div className="ck-fld">
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </label>
      <span className={'ck-inp' + (err ? ' err' : '')}>
        <Ic n="lock" s={18} style={{ color: 'var(--ck-mut)' }} />
        <input id={id} data-ck={nomTest} type={voir ? 'text' : 'password'} autoComplete={auto ?? 'current-password'} value={valeur} onChange={(e) => changer(e.target.value)} />
        <button type="button" aria-pressed={voir} aria-label={tk(voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} onClick={() => setVoir(!voir)}>
          <Ic n={voir ? 'eye-off' : 'eye'} s={18} />
        </button>
      </span>
      {regles && (
        <ul className="ck-regles" aria-label={tk('Règles du mot de passe')}>
          {REGLES_MDP.map(([r, f]) => (
            <li key={r} className={f(valeur) ? 'ok' : ''}>
              <Ic n={f(valeur) ? 'circle-check' : 'info'} s={13} />
              {tk(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Code à 6 chiffres reçu par SMS ou par e-mail ; en démonstration, le code est rappelé sous le champ. */
export function ChampCode({ vers, valeur, changer, err }: { vers: string; valeur: string; changer: (v: string) => void; err?: string | null }) {
  const { tk, tkf } = useTk()
  const id = useId()
  return (
    <div className="ck-fld ck-code">
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        {tkf('Code à 6 chiffres envoyé à {v}', { v: vers })}
      </label>
      <span className={'ck-inp' + (err ? ' err' : '')}>
        <input id={id} data-ck="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={valeur} onChange={(e) => changer(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      </span>
      {err && (
        <p className="ck-note err" role="alert">
          <Ic n="circle-alert" s={15} />
          {tk(err)}
        </p>
      )}
      {/* Aide de la démonstration seulement : avec le serveur, le code n'arrive que par SMS ou par e-mail. */}
      {env.source !== 'api' && (
        <p className="ck-note">
          <Ic n="info" s={15} />
          {tkf('Démonstration : le code est {c}.', { c: CODE_DEMO })}
        </p>
      )}
    </div>
  )
}

export const Note = ({ ton, icone, children }: { ton?: 'err' | 'ok'; icone?: string; children: ReactNode }) => (
  <p className={'ck-note' + (ton ? ' ' + ton : '')} role={ton ? 'status' : undefined}>
    <Ic n={icone ?? (ton === 'err' ? 'circle-alert' : ton === 'ok' ? 'circle-check' : 'info')} s={15} />
    <span>{children}</span>
  </p>
)

// ── Image : lecture, recadrage, allègement ─────────────────────────────────────────────────────────────────────
export type Forme = 'rond' | 'couverture'
const SORTIE: Record<Forme, [number, number]> = { rond: [512, 512], couverture: [1200, 400] }
export const POIDS_MAX = 300 * 1024
export const octets = (d: string) => Math.ceil(((d.length - d.indexOf(',') - 1) * 3) / 4)

export function lireImage(f: File): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    if (!f.type.startsWith('image/')) return ko(new Error('type'))
    if (f.size > 15 * 1024 * 1024) return ko(new Error('taille'))
    const r = new FileReader()
    r.onerror = () => ko(new Error('lecture'))
    r.onload = () => {
      const img = new Image()
      img.onload = () => ok(img)
      img.onerror = () => ko(new Error('lecture'))
      img.src = r.result as string
    }
    r.readAsDataURL(f)
  })
}

/** Image recadrée au format de sortie, en JPEG allégé jusqu'à 300 Ko au plus (qualité puis taille réduites). */
export function rogner(img: HTMLImageElement, c: { x: number; y: number; zoom: number }, W: number, H: number, forme: Forme): string {
  const [n0, m0] = SORTIE[forme]
  for (const reduction of [1, 0.8, 0.6, 0.45]) {
    const n = Math.round(n0 * reduction)
    const m = Math.round(m0 * reduction)
    const k = n / W
    const echelle = Math.max(W / img.naturalWidth, H / img.naturalHeight) * c.zoom
    const toile = document.createElement('canvas')
    toile.width = n
    toile.height = m
    const ctx = toile.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, n, m)
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(n / 2 + c.x * k, m / 2 + c.y * k)
    ctx.scale(echelle * k, echelle * k)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    for (const q of [0.86, 0.74, 0.62]) {
      const d = toile.toDataURL('image/jpeg', q)
      if (octets(d) <= POIDS_MAX) return d
    }
  }
  throw new Error('lourde')
}

/** Recadrage simple : glisser pour placer, curseur pour zoomer ; cercle (photo) ou bandeau 3:1 (couverture). */
export function Recadrage({ img, forme, annuler, utiliser }: { img: HTMLImageElement; forme: Forme; annuler: () => void; utiliser: (url: string) => void }) {
  const { tk } = useTk()
  const cadre = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(0)
  const H = forme === 'couverture' ? W / 3 : W
  const [c, setC] = useState({ x: 0, y: 0, zoom: 1 })
  const [erreur, setErreur] = useState(false)
  const doigt = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const el = cadre.current
    if (el) setW(el.clientWidth)
  }, [])
  const echelle = W ? Math.max(W / img.naturalWidth, H / img.naturalHeight) * c.zoom : 1
  const borner = (v: { x: number; y: number; zoom: number }) => {
    const zoom = Math.min(4, Math.max(1, v.zoom))
    const e = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom
    const mx = Math.max(0, (img.naturalWidth * e - W) / 2)
    const my = Math.max(0, (img.naturalHeight * e - H) / 2)
    return { zoom, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) }
  }
  const bouge = (e: PointerEvent<HTMLDivElement>) => {
    if (!doigt.current) return
    const dx = e.clientX - doigt.current.x
    const dy = e.clientY - doigt.current.y
    doigt.current = { x: e.clientX, y: e.clientY }
    setC((v) => borner({ ...v, x: v.x + dx, y: v.y + dy }))
  }
  const valider = () => {
    try {
      utiliser(rogner(img, c, W, H, forme))
    } catch {
      setErreur(true)
    }
  }
  return (
    <>
      <h2>{tk(forme === 'couverture' ? 'Recadrer la couverture' : 'Recadrer la photo')}</h2>
      <p className="ck-sous">{tk(forme === 'couverture' ? 'Faites glisser l’image dans le bandeau, zoomez avec le curseur.' : 'Faites glisser la photo pour placer le visage dans le cercle, zoomez avec le curseur.')}</p>
      <div
        ref={cadre}
        className={'ck-rog' + (forme === 'couverture' ? ' couv' : '')}
        data-ck="recadrage"
        tabIndex={0}
        role="group"
        aria-label={tk('Cadre de la photo : flèches pour déplacer')}
        onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), (doigt.current = { x: e.clientX, y: e.clientY }))}
        onPointerMove={bouge}
        onPointerUp={() => (doigt.current = null)}
        onPointerCancel={() => (doigt.current = null)}
        onKeyDown={(e) => {
          const d: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }
          if (!d[e.key]) return
          e.preventDefault()
          setC((v) => borner({ ...v, x: v.x + d[e.key][0], y: v.y + d[e.key][1] }))
        }}
      >
        {W > 0 && <img src={img.src} alt="" draggable={false} style={{ width: img.naturalWidth, height: img.naturalHeight, transform: `translate(-50%,-50%) translate(${c.x}px,${c.y}px) scale(${echelle})` }} />}
        <i />
      </div>
      <div className="ck-zoom">
        <Ic n="minus" s={16} />
        <input type="range" min={1} max={4} step={0.01} value={c.zoom} aria-label={tk('Zoom')} onChange={(e) => setC((v) => borner({ ...v, zoom: Number(e.target.value) }))} />
        <Ic n="zoom-in" s={16} />
      </div>
      {erreur && <Note ton="err">{tk('Cette image reste trop lourde : choisissez-en une autre.')}</Note>}
      <div className="ck-pile" style={{ marginTop: 14 }}>
        <button type="button" className="ck-btn plein" data-ck="utiliser" onClick={valider}>
          <Ic n="check" />
          {tk(forme === 'couverture' ? 'Utiliser cette couverture' : 'Utiliser cette photo')}
        </button>
        <button type="button" className="ck-btn sec plein" onClick={annuler}>
          {tk('Annuler')}
        </button>
      </div>
      <Note>{tk('L’image est allégée sur ce téléphone avant l’envoi (300 Ko au plus).')}</Note>
    </>
  )
}

/** Sélecteur de fichier caché (galerie ou appareil photo) et lecture de l'image choisie. */
export function useChoixImage(choisie: (img: HTMLImageElement) => void) {
  const galerie = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const lire = async (f: File | undefined) => {
    if (!f) return
    try {
      setErreur(null)
      choisie(await lireImage(f))
    } catch (x) {
      const m = (x as Error).message
      setErreur(m === 'taille' ? 'Cette image pèse plus de 15 Mo : choisissez-en une plus légère.' : m === 'type' ? 'Ce fichier n’est pas une image : choisissez une photo.' : 'Cette image ne s’ouvre pas : essayez-en une autre.')
    }
  }
  const entrees = (
    <>
      <input ref={galerie} type="file" accept="image/*" hidden data-ck="galerie" onChange={(e) => (void lire(e.target.files?.[0]), (e.target.value = ''))} />
      <input ref={camera} type="file" accept="image/*" capture="user" hidden data-ck="camera" onChange={(e) => (void lire(e.target.files?.[0]), (e.target.value = ''))} />
    </>
  )
  return { entrees, erreur, galerie: () => galerie.current?.click(), camera: () => camera.current?.click() }
}

/** Séparateur « ou » entre deux façons de se connecter. */
export function Ou() {
  const { tk } = useTk()
  return <div className="ck-sep">{tk('ou')}</div>
}
