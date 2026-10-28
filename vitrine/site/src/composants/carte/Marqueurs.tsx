// Marqueurs des cartes en React (module commun des six applications ; dessin et couleurs : acteurs.ts) :
// - <CoucheMarqueurs> : à poser DANS le SVG d'une carte, après le fond et les zones. Chaque point est un marqueur
//   d'acteur (pastille colorée de son interface, icône nette, ombre légère, flèche de cap et état pour un livreur),
//   de taille constante à l'écran quelle que soit la largeur de la carte ; les points trop proches se regroupent
//   (pastille avec leur nombre) et se déplient d'un clic, d'Entrée ou d'Espace (Échap les regroupe).
//   Point cliquable : bouton au clavier ; sinon simple image nommée.
// - <LegendeCarte> : légende repliable des acteurs présents (et des états du livreur).
// Les textes passent par t() de l'application qui affiche la carte (son dictionnaire).
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { usePreferences } from '../../preferences'
import { ACTEURS, ETATS_LIVREUR, STATUTS, formesMarqueur, type Acteur, type ApparenceMarqueur, type EtatLivreur, type StatutMarqueur } from './acteurs'
import { deplier, regrouper } from './regroupement'
import './marqueurs.css'

export interface PointMarqueur extends ApparenceMarqueur {
  id: string
  acteur: Acteur
  x: number // position dans le repère de la vue (unités du SVG)
  y: number
  nom: string // nom accessible, déjà dans la langue de l'écran (l'écran le traduit)
  texte?: string // pastille de texte posée sur le marqueur (initiales d'un livreur)
  etiquette?: string // étiquette à droite (nom court d'un relais, numéro d'un paquet)
  statut?: StatutMarqueur // petite pastille d'état en haut à droite
  classe?: string // classes propres à l'écran (tests, styles)
  surChoix?: () => void
  lien?: boolean // le choix ouvre une autre page : rôle « lien » plutôt que « bouton »
}

const TAILLE = 30 // diamètre à l'écran, en pixels
const RAYON_GROUPE = 0.7 // en diamètres : deux marqueurs du même acteur plus proches se regroupent

/** Unités de la vue par pixel d'écran, mesurées sur le SVG qui contient la couche (1 tant qu'il n'est pas mesuré). */
function useEchelle() {
  const ref = useRef<SVGGElement>(null)
  const [mesure, setMesure] = useState({ k: 1, largeur: 0 })
  useLayoutEffect(() => {
    const svg = ref.current?.ownerSVGElement
    if (!svg) return
    // Mise à l'échelle « meet » du SVG : une unité vaut le plus petit des deux rapports (largeur, hauteur).
    const mesurer = () => {
      const vb = svg.viewBox.baseVal
      const { width: w, height: h } = svg.getBoundingClientRect()
      if (!vb?.width || !w || !h) return
      const k = Math.max(vb.width / w, vb.height / h)
      setMesure((x) => (Math.abs(x.k - k) > 0.01 || Math.abs(x.largeur - w) > 1 ? { k, largeur: w } : x))
    }
    mesurer()
    if (typeof ResizeObserver === 'undefined') return
    const o = new ResizeObserver(mesurer)
    o.observe(svg)
    return () => o.disconnect()
  }, [])
  return [ref, mesure.k, mesure.largeur] as const
}

const touches = (f: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    f()
  }
}

/** Formes d'un marqueur centré sur (0, 0), de diamètre t (unités de la vue). */
// echelle : unités de la vue par pixel d'écran (les textes gardent 12 px au moins, règle de lisibilité).
export function FormesMarqueur({ acteur, t, etat, cap, choisi, texte, statut, echelle = 1 }: ApparenceMarqueur & { acteur: Acteur; t: number; texte?: string; statut?: StatutMarqueur; echelle?: number }) {
  const police = Math.max(t * 0.25, 12 * echelle)
  const demiH = Math.max(t * 0.27, police * 0.72)
  const demiL = texte ? Math.max(demiH, texte.length * police * 0.34 + police * 0.4) : 0
  const f = formesMarqueur(acteur, t, { etat, cap, choisi })
  const dispo = acteur === 'livreur' && etat === 'disponible'
  const hors = acteur === 'livreur' && etat === 'hors_ligne'
  return (
    <>
      <circle className="mq-ombre" cy={f.ombre.cy} r={f.ombre.r} />
      {acteur === 'livreur' && etat === 'mission' && <circle className="mq-pouls" r={f.r} style={{ stroke: ACTEURS.livreur.fond }} />}
      {f.cap && <path className="mq-cap" d={f.cap} transform={`rotate(${cap ?? 0})`} style={{ fill: dispo ? ACTEURS.livreur.fond : f.c.fond }} />}
      <circle r={f.r} style={{ fill: f.c.bord }} />
      <circle r={f.r - 2} className={hors ? 'mq-hors' : dispo ? 'mq-dispo' : undefined} style={{ fill: f.c.fond, stroke: dispo ? ACTEURS.livreur.fond : undefined }} />
      <g transform={`translate(${f.icone.d} ${f.icone.d}) scale(${f.icone.k})`} className="mq-icone" style={{ stroke: f.c.trait }}>
        {ACTEURS[acteur].chemins.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {texte && (
        // Pastille de texte (initiales, numéro d'arrêt « 3 », « 3·4 ») : ronde, allongée pour un texte plus long.
        <g className="mq-texte" transform={`translate(${f.r * 0.78} ${f.r * 0.78})`}>
          <rect x={-demiL} y={-demiH} width={2 * demiL} height={2 * demiH} rx={demiH} />
          <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: police }}>
            {texte}
          </text>
        </g>
      )}
      {statut && <circle className="mq-statut" cx={f.r * 0.74} cy={-f.r * 0.74} r={t * 0.17} style={{ fill: STATUTS[statut] }} />}
      {choisi && <circle className="mq-choix" r={f.r + t * 0.12} />}
    </>
  )
}

function Un({ p, t, x, y, k }: { p: PointMarqueur; t: number; x: number; y: number; k: number }) {
  const nom = p.nom
  const cls = 'mq mq-' + p.acteur + (p.etat ? ' mq-' + p.etat : '') + (p.statut ? ' mq-s-' + p.statut : '') + (p.choisi ? ' mq-choisi' : '') + (p.surChoix ? ' mq-bouton' : '') + (p.classe ? ' ' + p.classe : '')
  const corps = (
    <>
      {/* Zone de toucher invisible de 44 px au moins autour d'un marqueur cliquable. */}
      {p.surChoix && <circle className="mq-zone" r={Math.max(t / 2, 22 * k)} />}
      <FormesMarqueur acteur={p.acteur} t={t} etat={p.etat} cap={p.cap} choisi={p.choisi} texte={p.texte} statut={p.statut} echelle={k} />
    </>
  )
  return p.surChoix ? (
    <g className={cls} transform={`translate(${x} ${y})`} role={p.lien ? 'link' : 'button'} tabIndex={0} aria-label={nom} aria-pressed={p.lien ? undefined : !!p.choisi} data-id={p.id} onClick={p.surChoix} onKeyDown={touches(p.surChoix)}>
      {corps}
    </g>
  ) : (
    <g className={cls} transform={`translate(${x} ${y})`} role="img" aria-label={nom} data-id={p.id}>
      {corps}
    </g>
  )
}

/** Couche des marqueurs d'une carte (dans son SVG). `regrouper` : faux pour garder chaque point séparé. */
export function CoucheMarqueurs({ points, taille = TAILLE, regrouper: grouper = true }: { points: PointMarqueur[]; taille?: number; regrouper?: boolean }) {
  const { t, tf } = usePreferences()
  const [ref, k, largeur] = useEchelle()
  // Carte étroite (téléphone) : marqueurs un peu plus petits, étiquettes du seul point choisi (la carte reste lisible).
  const etroite = largeur > 0 && largeur < 480
  const d = taille * k * (etroite ? 0.8 : 1)
  const [ouvert, setOuvert] = useState<string | null>(null)
  // Regroupés acteur par acteur : un groupe garde la couleur et l'icône de ses membres (jamais un livreur caché
  // dans un groupe de boutiques).
  const parActeur = new Map<Acteur, PointMarqueur[]>()
  for (const p of points) parActeur.set(p.acteur, [...(parActeur.get(p.acteur) ?? []), p])
  const groupes = [...parActeur.values()].flatMap((ps) => regrouper(ps, grouper ? d * RAYON_GROUPE : 0))
  // Le groupe qui contient le point choisi se déplie de lui-même.
  const choisi = groupes.find((g) => g.membres.length > 1 && g.membres.some((m) => m.choisi))?.id ?? null
  const deplie = ouvert ?? choisi
  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOuvert(null)
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [ouvert])
  const rendus: ReactNode[] = []
  const dessus: ReactNode[] = []
  // Étiquettes (nom court d'un relais…) : une couche à part, au-dessus de tous les marqueurs, jamais masquées par eux.
  const etiquettes: ReactNode[] = []
  const etiqueter = (p: PointMarqueur, x: number, y: number) =>
    p.etiquette &&
    (!etroite || p.choisi || points.length === 1) &&
    etiquettes.push(
      <text key={'e-' + p.id} className="mq-etiq" x={x + d / 2 + d * 0.2} y={y} dominantBaseline="central" style={{ fontSize: Math.max(d * 0.4, 12 * k) }} aria-hidden="true">
        {p.etiquette}
      </text>,
    )
  for (const g of groupes) {
    if (g.membres.length === 1) {
      const p = g.membres[0]
      ;(p.choisi ? dessus : rendus).push(<Un key={p.id} p={p} t={d} x={p.x} y={p.y} k={k} />)
      etiqueter(p, p.x, p.y)
      continue
    }
    if (g.id === deplie) {
      const places = deplier(g, d * 1.15)
      places.forEach((m) => etiqueter(m.p, m.x, m.y))
      dessus.push(
        <g key={'g-' + g.id} className="mq-deplie">
          {places.map((m) => (
            <line key={'l-' + m.p.id} x1={g.x} y1={g.y} x2={m.x} y2={m.y} className="mq-fil" style={{ strokeWidth: 1.5 * k }} />
          ))}
          <g className="mq-centre" transform={`translate(${g.x} ${g.y})`} role="button" tabIndex={0} aria-label={t('Regrouper les points')} onClick={() => setOuvert(null)} onKeyDown={touches(() => setOuvert(null))}>
            <circle className="mq-zone" r={22 * k} />
            <circle className="mq-centre-p" r={d * 0.14} />
          </g>
          {places.map((m) => (
            <Un key={m.p.id} p={m.p} t={d} x={m.x} y={m.y} k={k} />
          ))}
        </g>,
      )
      continue
    }
    const acteur = g.membres[0].acteur
    const couleur = ACTEURS[acteur].fond
    const nom = tf('{n} points proches : {l}', { n: g.membres.length, l: g.membres.map((m) => m.nom).join(', ') })
    rendus.push(
      <g key={'g-' + g.id} className={'mq mq-groupe mq-groupe-' + acteur} data-n={g.membres.length} transform={`translate(${g.x} ${g.y})`} role="button" tabIndex={0} aria-label={nom} aria-expanded={false} onClick={() => setOuvert(g.id)} onKeyDown={touches(() => setOuvert(g.id))}>
        <circle className="mq-zone" r={Math.max(d * 0.56, 22 * k)} />
        <circle className="mq-ombre" cy={d * 0.06} r={d * 0.56} />
        {/* Groupe : anneau à la couleur de l'acteur, nombre foncé sur fond blanc (contraste, 12 px au moins). */}
        <circle r={d * 0.56} className="mq-pile" style={{ fill: couleur }} />
        <circle r={d * 0.4} className="mq-coeur" />
        <text textAnchor="middle" dominantBaseline="central" className="mq-nombre" style={{ fontSize: Math.max(d * 0.4, 12 * k) }}>
          {g.membres.length}
        </text>
      </g>,
    )
  }
  return (
    <g ref={ref} className="mq-couche">
      {rendus}
      {dessus}
      <g className="mq-etiquettes">{etiquettes}</g>
    </g>
  )
}

/** Petit marqueur seul (légende, liste à côté d'une carte). */
export function PastilleActeur({ acteur, etat, taille = 20 }: { acteur: Acteur; etat?: EtatLivreur; taille?: number }) {
  const l = taille + 6
  return (
    <svg className="mq-pastille" width={l} height={l} viewBox={`${-l / 2} ${-l / 2} ${l} ${l}`} aria-hidden="true">
      <FormesMarqueur acteur={acteur} t={taille} etat={etat} />
    </svg>
  )
}

/** Légende repliable : les acteurs montrés (et les états du livreur s'il y en a), plus des lignes propres à l'écran. */
// dessus : posée en bas à gauche sur la carte (conteneur en position relative), sinon sous la carte.
// libelles : nom d'un acteur propre à l'écran (« Zone de remise » plutôt qu'« Adresse du client »).
export function LegendeCarte({ acteurs, etats = [], autres = [], libelles = {}, statuts = [], ouverte, dessus = false }: { acteurs: readonly Acteur[]; etats?: EtatLivreur[]; autres?: [classe: string, libelle: string][]; libelles?: Partial<Record<Acteur, string>>; statuts?: [StatutMarqueur, string][]; ouverte?: boolean; dessus?: boolean }) {
  const { t } = usePreferences()
  // Repliée d'abord au téléphone (la carte reste lisible), ouverte sur grand écran.
  // Posée sur la carte : repliée d'abord (elle ne cache aucun marqueur).
  const [ouv, setOuv] = useState(() => ouverte ?? (!dessus && (typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 768px)').matches)))
  const lignes: [ReactNode, string][] = [
    ...acteurs.filter((a) => a !== 'livreur' || !etats.length).map((a): [ReactNode, string] => [<PastilleActeur key={a} acteur={a} />, libelles[a] ?? ACTEURS[a].libelle]),
    ...etats.map((e): [ReactNode, string] => [<PastilleActeur key={e} acteur="livreur" etat={e} />, ETATS_LIVREUR[e]]),
    ...statuts.map(([s, l]): [ReactNode, string] => [<i key={s} className="mq-l-statut" style={{ background: STATUTS[s] }} aria-hidden="true"></i>, l]),
    ...autres.map(([c, l]): [ReactNode, string] => [<i key={c} className={'mq-l ' + c} aria-hidden="true"></i>, l]),
  ]
  return (
    <div className={'mq-legende' + (ouv ? ' ouverte' : '') + (dessus ? ' dessus' : '')}>
      <button type="button" className="mq-leg-b" aria-expanded={ouv} onClick={() => setOuv(!ouv)}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="mq-leg-i">
          <path d="m6 9 6 6 6-6" />
        </svg>
        {t('Légende')}
      </button>
      {ouv && (
        <ul>
          {lignes.map(([i, l]) => (
            <li key={l}>
              {i}
              <span>{t(l)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
