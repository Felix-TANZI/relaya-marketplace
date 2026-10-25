// Carte des douze zones BelivaY de Yaoundé (ENT-P04 ; aussi tableau de bord et connexion) : fond OpenStreetMap
// (composants/CarteOsm : tuiles, mention « © OpenStreetMap contributors » visible et cliquable, DP-49), polygones des
// zones tenus par la console (la carte BelivaY fait foi : ENT-P04R-05), état de chaque zone par sa couleur (déclarée, en
// attente d'ouverture, alerte de santé, bloquée, en pause, vente seulement). Projection Web Mercator au zoom 13, dessinée
// dans un seul SVG qui suit la largeur. Hors ligne, tuile en échec ou navigateur piloté (tests) : le plan des zones seul,
// lisible sans tuiles. Chaque zone est un bouton quand l'écran sait l'ouvrir (clavier : Entrée, Espace).
import type { KeyboardEvent } from 'react'
import '../ENT-03/ent.css'
import type { ZoneCarte } from '../../donnees/domaines/zones'
import { usePreferences } from '../../preferences'
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'

const ZOOM = 13
const MARGE = 0.0013 // degrés autour des polygones (≈ 14 px au zoom 13)

export type TonZone = 'declaree' | 'attente' | 'alerte' | 'bloquee' | 'pause' | 'vente'
export function tonDe(z: ZoneCarte, alerte: boolean): TonZone {
  if (!z.declaree) return 'vente'
  if (z.etat === 'bloquee') return 'bloquee'
  if (z.etat === 'pause' || z.etat === 'retiree') return 'pause'
  if (!z.exploitee) return 'attente'
  return alerte ? 'alerte' : 'declaree'
}

export function CarteZones(p: { zones: ZoneCarte[]; titre: string; choisie?: string | null; surZone?: (code: string) => void; actives?: string[]; alertes?: string[]; etiquettes?: 'code' | 'nom'; hauteurMax?: number }) {
  const { t } = usePreferences()
  const fond = useFondOsm()
  const pts = p.zones.flatMap((z) => z.polygone)
  const lats = pts.map((x) => x[0])
  const lngs = pts.map((x) => x[1])
  const lng0 = Math.min(...lngs) - MARGE
  const lng1 = Math.max(...lngs) + MARGE
  const c = cadrer({ lat0: Math.min(...lats) - MARGE, lat1: Math.max(...lats) + MARGE, lng0, lng1 }, Math.round(((lng1 - lng0) / 360) * 256 * 2 ** ZOOM), ZOOM)
  const projeter = ([lat, lng]: [number, number]) => c.point(lat, lng)
  const touche = (code: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      p.surZone?.(code)
    }
  }
  return (
    <figure className="e-carte" data-fond={fond.etat} style={{ margin: 0, maxHeight: p.hauteurMax }}>
      <svg viewBox={`0 0 ${c.l} ${c.h}`} role="group" aria-label={p.titre} style={{ maxHeight: p.hauteurMax }}>
        <rect className="fond-plan" width={c.l} height={c.h} />
        {fond.etat === 'osm' && <TuilesOsm cadre={c} echouer={fond.echouer} />}
        {p.zones.map((z) => {
          const ton = tonDe(z, !!p.alertes?.includes(z.code))
          const d = 'M' + z.polygone.map((pt) => projeter(pt).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z'
          const [cx, cy] = projeter(z.etiquette ?? z.centre)
          const etat = { declaree: 'déclarée', attente: 'déclarée, en attente d’ouverture', alerte: 'déclarée, santé en alerte', bloquee: 'bloquée', pause: 'en pause', vente: z.exploitee ? 'exploitée, non déclarée' : 'vente seulement' }[ton]
          const nom = `${z.code} ${z.nom} · ${t(etat)}`
          const forme = (
            <>
              <path className={'zone ' + ton + (p.choisie === z.code ? ' choisie' : '')} d={d} />
              <text className="etiq" x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                {z.code}
                {p.etiquettes !== 'code' && (
                  <tspan className="etiq-n" x={cx} dy="20">
                    {z.nom}
                  </tspan>
                )}
              </text>
            </>
          )
          return p.surZone && (!p.actives || p.actives.includes(z.code)) ? (
            <g key={z.code} role="button" tabIndex={0} aria-label={nom} aria-pressed={p.choisie === z.code} onClick={() => p.surZone!(z.code)} onKeyDown={touche(z.code)}>
              <title>{nom}</title>
              {forme}
            </g>
          ) : (
            <g key={z.code} aria-label={nom}>
              <title>{nom}</title>
              {forme}
            </g>
          )
        })}
      </svg>
      <MentionOsm etat={fond.etat} demander={fond.demander} />
    </figure>
  )
}

export function LegendeZones() {
  const { t } = usePreferences()
  const l: [TonZone, string][] = [
    ['declaree', 'Déclarée'],
    ['alerte', 'Santé en alerte'],
    ['bloquee', 'Bloquée'],
    ['pause', 'En pause'],
    ['attente', 'En attente d’ouverture'],
    ['vente', 'Non déclarée ou vente seulement'],
  ]
  return (
    <div className="e-legende">
      {l.map(([c, n]) => (
        <span key={c}>
          <i className={c} />
          {t(n)}
        </span>
      ))}
    </div>
  )
}
