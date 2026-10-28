// Carte de la tournée (LIV-P09, DP-49, DP-54) : fond OpenStreetMap en tuiles (mention « © OpenStreetMap contributors »
// visible), trajet précalculé, arrêts numérotés dans l'ordre imposé, position du livreur (GPS du téléphone, halo de
// précision) et cercle d'incertitude du point de remise. Sans réseau, les tuiles déjà vues restent dans le cache du
// navigateur ; sinon un quadrillage neutre garde le trajet, les arrêts et la position lisibles (carte hors connexion).
// Utilisable à une main : zoom par boutons de 48 px et recentrage, aucun geste de précision (LIV-01-R050).
// La source des tuiles est un serveur de tuiles OSM : en production, celui de BelivaY (pas de charge sur
// tile.openstreetmap.org, DP-49) — URL à poser dans la configuration (INTEGRATION.md).
// Repli schématique (quadrillage, trajet, zones et arrêts) seulement sans réseau ou sous navigateur piloté (tests :
// aucune requête sortante) ; il est annoncé sur la carte. Les arrêts au même endroit (relais servi dans les deux sens,
// vendeur revu pour un retour) forment un seul repère « 3·4 », qui se sépare en rapprochant la carte. Les zones de la
// tournée (contour du serveur) sont tracées en pointillés, avec leur nom. Repères : marqueurs communs des six applications
// (@client/composants/carte : boutique, relais, client, le livreur lui-même), numérotés dans l'ordre imposé.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from '../../composants/Icone'
import type { Acteur } from '@client/composants/carte/acteurs'
import { FormesMarqueur, LegendeCarte } from '@client/composants/carte/Marqueurs'
import type { TypeArret } from '../../donnees/communs'
import type { EtatArret, PointCarte } from '../../donnees/domaines/tournee'
import { usePreferences } from '../../preferences'

const TUILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const T = 256

const monde = (p: PointCarte, z: number) => {
  const n = T * 2 ** z
  const s = Math.sin((p.lat * Math.PI) / 180)
  return { x: ((p.lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n }
}
const metresParPixel = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z

export interface ZoneCarte {
  nom: string
  contour: PointCarte[]
}

/** Tuiles permises : réseau présent et navigateur non piloté (sinon le plan schématique). */
function useTuiles(): boolean {
  const permis = () => typeof navigator !== 'undefined' && navigator.onLine !== false && !navigator.webdriver
  const [ok, setOk] = useState(permis)
  useEffect(() => {
    const maj = () => setOk(permis())
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => (window.removeEventListener('online', maj), window.removeEventListener('offline', maj))
  }, [])
  return ok
}

const RANG_ETAT: Record<EtatArret, number> = { en_cours: 0, a_faire: 1, echec: 2, dissocie: 3, fait: 4 }

/** Repères proches à l'écran (moins de 24 px) réunis en un seul : numéros joints (« 3·4 »), l'état le plus utile
 * (en cours, puis à faire, puis échec, puis fait). */
export function grouperReperes<R extends { ordre: number; etat: EtatArret; courant: boolean; x: number; y: number }>(reperes: R[], seuil = 24): { tete: R; membres: R[]; x: number; y: number }[] {
  const groupes: { tete: R; membres: R[]; x: number; y: number }[] = []
  for (const r of [...reperes].sort((a, b) => a.ordre - b.ordre)) {
    const g = groupes.find((x) => Math.hypot(x.x - r.x, x.y - r.y) < seuil)
    if (!g) groupes.push({ tete: r, membres: [r], x: r.x, y: r.y })
    else {
      g.membres.push(r)
      const rang = (q: R) => (q.courant ? -1 : (RANG_ETAT[q.etat] ?? 5))
      if (rang(r) < rang(g.tete)) g.tete = r
    }
  }
  return groupes
}
const etiquette = (m: { ordre: number; etat: EtatArret }[]) =>
  m.every((x) => x.etat === 'fait') ? '✓' : m.length === 1 ? String(m[0].ordre) : m.length === 2 ? m.map((x) => x.ordre).join('·') : `${m[0].ordre}–${m[m.length - 1].ordre}`

export interface Repere extends PointCarte {
  id: string
  ordre: number
  type: TypeArret
  etat: EtatArret
  courant: boolean
}

export function CarteZone(p: {
  titre: string
  trajet: PointCarte[]
  fait?: number // nombre de points du trajet déjà parcourus (dessinés en pointillés)
  reperes: Repere[]
  position: (PointCarte & { precisionM: number }) | null
  incertitude?: (PointCarte & { rayonM: number }) | null
  hauteur?: number
  cadre?: PointCarte[] // points à faire tenir dans la vue (défaut : tout)
  sansCommandes?: boolean // vignette (tournée) : ni zoom ni recentrage, toute la carte est un lien
  zones?: ZoneCarte[] // contours des zones de la tournée (serveur)
}) {
  const { t, tf } = usePreferences()
  const tuilesOk = useTuiles()
  const [echecs, setEchecs] = useState(0)
  const boite = useRef<HTMLDivElement>(null)
  const [l, setL] = useState(340)
  const h = p.hauteur ?? 260
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const o = new ResizeObserver(() => setL(el.clientWidth || 340))
    o.observe(el)
    setL(el.clientWidth || 340)
    return () => o.disconnect()
  }, [])
  const points = p.cadre ?? [...p.trajet, ...p.reperes, ...(p.position ? [p.position] : [])]
  const zAuto = useMemo(() => {
    if (points.length < 2) return 16
    for (let z = 17; z >= 10; z--) {
      const xs = points.map((q) => monde(q, z))
      const w = Math.max(...xs.map((q) => q.x)) - Math.min(...xs.map((q) => q.x))
      const hh = Math.max(...xs.map((q) => q.y)) - Math.min(...xs.map((q) => q.y))
      // Marges : la place des commandes (zoom, cartouche) ; une vignette sans commandes garde juste l'air des repères.
      if (p.sansCommandes ? w <= l - 56 && hh <= h - 64 : w <= l - 96 && hh <= h - 110) return z
    }
    return 10
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), l, h])
  const [dz, setDz] = useState(0)
  const z = Math.max(10, Math.min(18, zAuto + dz))
  const centreMonde = useMemo(() => {
    const xs = points.map((q) => monde(q, z))
    if (!xs.length) return { x: 0, y: 0 }
    return { x: (Math.min(...xs.map((q) => q.x)) + Math.max(...xs.map((q) => q.x))) / 2, y: (Math.min(...xs.map((q) => q.y)) + Math.max(...xs.map((q) => q.y))) / 2 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), z])
  const ox = centreMonde.x - l / 2
  const oy = centreMonde.y - h / 2
  const ecran = (q: PointCarte) => {
    const m = monde(q, z)
    return { x: m.x - ox, y: m.y - oy }
  }
  const tuiles: { x: number; y: number; cle: string; src: string }[] = []
  const max = 2 ** z
  const schema = !tuilesOk || echecs > 2
  if (!schema)
  for (let tx = Math.floor(ox / T); tx <= Math.floor((ox + l) / T); tx++)
    for (let ty = Math.floor(oy / T); ty <= Math.floor((oy + h) / T); ty++) {
      if (ty < 0 || ty >= max) continue
      const wx = ((tx % max) + max) % max
      tuiles.push({ x: tx * T - ox, y: ty * T - oy, cle: `${z}-${tx}-${ty}`, src: TUILES.replace('{z}', String(z)).replace('{x}', String(wx)).replace('{y}', String(ty)) })
    }
  const ligne = (pts: PointCarte[]) => pts.map((q) => ecran(q)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')
  const fait = Math.max(0, Math.min(p.fait ?? 0, p.trajet.length))
  const pos = p.position ? ecran(p.position) : null
  const mpp = metresParPixel(p.position?.lat ?? p.reperes[0]?.lat ?? 3.88, z)
  // Légende repliable (carte avec commandes) : les acteurs des arrêts montrés, et le livreur lui-même.
  const presents = [...new Set(p.reperes.map((r): Acteur => (r.type === 'domicile' ? 'client' : r.type === 'relais' || r.type === 'collecte' ? 'relais' : 'boutique')))]
  return (
    <>
    <div className="lv-carte" ref={boite} style={{ height: h }} role="img" aria-label={t(p.titre)}>
      <div className="lv-carte-fond" aria-hidden="true">
        {tuiles.map((u) => (
          <img key={u.cle} src={u.src} alt="" width={T} height={T} style={{ left: u.x, top: u.y }} decoding="async" referrerPolicy="no-referrer" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden', setEchecs((n) => n + 1))} />
        ))}
      </div>
      <svg className="lv-carte-svg" width={l} height={h} aria-hidden="true">
        {(p.zones ?? []).map((zo) => {
          const pts = zo.contour.map((q) => ecran(q))
          const haut = pts.reduce((a, b) => (b.y < a.y ? b : a), pts[0] ?? { x: 0, y: 0 })
          // Nom de la zone au sommet du contour, seulement s'il tombe dans la carte, hors des commandes.
          const nom = haut.y > 4 && haut.y < h - 40 && haut.x > 50 && haut.x < l - 70
          return (
            <g key={zo.nom} className="lv-zone">
              <polygon points={pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} />
              {nom && (
                <text x={haut.x} y={haut.y + 16} textAnchor="middle">
                  {zo.nom}
                </text>
              )}
            </g>
          )
        })}
        {fait > 1 && <polyline points={ligne(p.trajet.slice(0, fait))} className="lv-trajet-fait" />}
        <polyline points={ligne(p.trajet.slice(Math.max(0, fait - 1)))} className="lv-trajet" />
        {p.incertitude && (() => {
          const c = ecran(p.incertitude)
          return <circle cx={c.x} cy={c.y} r={Math.max(10, p.incertitude.rayonM / mpp)} className="lv-incertain" />
        })()}
        {grouperReperes(p.reperes.map((r) => ({ ...r, ...ecran(r) }))).map(({ tete: r, membres, x, y }) => {
          const texte = etiquette(membres)
          const acteur: Acteur = r.type === 'domicile' ? 'client' : r.type === 'relais' || r.type === 'collecte' ? 'relais' : 'boutique'
          return (
            <g key={r.id} className={'mq lv-rep lv-rep-' + r.etat + (r.courant ? ' lv-rep-cour' : '') + (acteur === 'relais' ? ' lv-rep-relais' : '') + (r.type === 'domicile' ? ' lv-rep-dom' : '')} transform={`translate(${x},${y})`}>
              <FormesMarqueur acteur={acteur} t={r.courant ? 34 : 28} texte={texte} choisi={r.courant} statut={r.etat === 'echec' || r.etat === 'dissocie' ? 'alerte' : undefined} />
            </g>
          )
        })}
        {pos && p.position && (
          <g transform={`translate(${pos.x},${pos.y})`} className="mq lv-moi">
            <circle r={Math.max(12, p.position.precisionM / mpp)} className="lv-moi-halo" />
            <FormesMarqueur acteur="livreur" t={30} etat="mission" />
          </g>
        )}
      </svg>
      {!p.sansCommandes && (
      <div className="lv-carte-zoom">
        <button type="button" className="l-ibtn" aria-label={t('Rapprocher')} onClick={() => setDz((x) => Math.min(x + 1, 18 - zAuto))} disabled={z >= 18}>
          <Icone nom="plus" taille={22} />
        </button>
        <button type="button" className="l-ibtn" aria-label={t('Éloigner')} onClick={() => setDz((x) => Math.max(x - 1, 10 - zAuto))} disabled={z <= 10}>
          <span className="lv-moins" aria-hidden="true" />
        </button>
        <button type="button" className="l-ibtn" aria-label={t('Recentrer')} onClick={() => setDz(0)} disabled={dz === 0}>
          <Icone nom="locate-fixed" taille={22} />
        </button>
      </div>
      )}
      {schema ? (
        <span className={'lv-carte-osm lv-carte-schema' + (p.sansCommandes ? ' g' : '')}>{t(navigator.onLine === false ? 'Plan schématique · hors connexion' : 'Plan schématique')}</span>
      ) : (
        <span className={'lv-carte-osm' + (p.sansCommandes ? ' g' : '')}>{tf('© {osm} contributors', { osm: 'OpenStreetMap' })}</span>
      )}
    </div>
    {!p.sansCommandes && (
      <div className="lv-carte-leg">
        <LegendeCarte acteurs={[...(['boutique', 'relais', 'client'] as const).filter((a) => presents.includes(a)), ...(p.position ? (['livreur'] as const) : [])]} libelles={{ livreur: 'Ma position', client: 'Point de remise' }} ouverte={false} />
      </div>
    )}
    </>
  )
}
