// Carte schématique des 12 zones de livraison de Yaoundé (MAP.render du prototype) : les vrais polygones des zones
// (calculs/zones.ts : carte du 23 oct. 2026, logique-metier/livraison/ZONES.md), teintés selon leur rôle pour le
// livreur (principale, secondaire, hors de ses zones : hachurée), grands axes entre les centres, noms. Une
// illustration sans tuiles : la carte réelle (tuiles OpenStreetMap) reste celle de la tournée
// (composants/livraison/CarteZone.tsx).
import { useId } from 'react'
import { ZONES_YAOUNDE } from '../calculs/zones'

export type EtatZone = 'focus' | 'on' | 'sale' | 'off' | 'alert' | 'warn'
const TON: Record<EtatZone, string> = { focus: 'var(--acc)', on: 'var(--acc-2)', sale: 'var(--ink-4)', off: 'var(--ink-4)', alert: 'var(--red)', warn: 'var(--gold)' }
// Grands axes entre centres de zones voisines (carte du 23 oct. 2026) : nord-sud, ouest-est, sud-ouest, est, sud.
const AXES = [['Z12', 'Z1', 'Z2', 'Z5'], ['Z8', 'Z3', 'Z1', 'Z9', 'Z4'], ['Z7', 'Z6', 'Z2', 'Z10'], ['Z9', 'Z10', 'Z11'], ['Z6', 'Z3'], ['Z7', 'Z5', 'Z11'], ['Z4', 'Z12']]

// Projection plane : 40 unités par kilomètre, nord en haut (à cette latitude, un degré de longitude vaut cos 3,87° d'un
// degré de latitude).
const PAR_KM = 40
const K = Math.cos((3.87 * Math.PI) / 180)
const tous = ZONES_YAOUNDE.flatMap((z) => z.contour)
const LNG0 = Math.min(...tous.map((p) => p.lng))
const LAT1 = Math.max(...tous.map((p) => p.lat))
const px = (p: { lat: number; lng: number }): [number, number] => [(p.lng - LNG0) * K * 111.32 * PAR_KM, (LAT1 - p.lat) * 111.32 * PAR_KM]
const ZONES = ZONES_YAOUNDE.map((z) => ({ code: z.code, nom: z.nom, points: z.contour.map(px), centre: px(z.centre), etiquette: px(z.etiquette) }))
const LARGEUR = Math.ceil(Math.max(...ZONES.flatMap((z) => z.points.map((p) => p[0]))))
const HAUTEUR = Math.ceil(Math.max(...ZONES.flatMap((z) => z.points.map((p) => p[1]))))
const CENTRE: Record<string, [number, number]> = Object.fromEntries(ZONES.map((z) => [z.code, z.centre]))

// Petites rues, tirées une fois (même graine que le prototype : même dessin), sur l'emprise de la ville.
const RUES = (() => {
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646)
  let d = ''
  for (let i = 0; i < 160; i++) {
    const x = r() * LARGEUR
    const y = r() * HAUTEUR
    const a = r() * Math.PI
    const l = 40 + r() * 90
    d += `M${x.toFixed(0)} ${y.toFixed(0)} l${(Math.cos(a) * l).toFixed(0)} ${(Math.sin(a) * l).toFixed(0)} `
  }
  return d
})()
const GRANDS_AXES = AXES.map((rd) => {
  const p = rd.map((z) => CENTRE[z])
  let d = `M${p[0][0].toFixed(0)} ${p[0][1].toFixed(0)}`
  for (let i = 1; i < p.length; i++) {
    const mx = (p[i - 1][0] + p[i][0]) / 2 + (i % 2 ? 18 : -14)
    const my = (p[i - 1][1] + p[i][1]) / 2 + (i % 2 ? -12 : 16)
    d += ` Q${mx.toFixed(0)} ${my.toFixed(0)} ${p[i][0].toFixed(0)} ${p[i][1].toFixed(0)}`
  }
  return d
}).join(' ')
const CONTOURS: Record<string, string> = Object.fromEntries(ZONES.map((z) => [z.code, z.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')]))

/** Cadre [x, y, largeur, hauteur] qui contient les zones données (toute la ville sans zone), avec une marge. */
export function cadreDe(codes: string[] = [], marge = 30): [number, number, number, number] {
  const pts = ZONES.filter((z) => !codes.length || codes.includes(z.code)).flatMap((z) => z.points)
  const x0 = Math.min(...pts.map((p) => p[0])) - marge
  const y0 = Math.min(...pts.map((p) => p[1])) - marge
  return [Math.round(x0), Math.round(y0), Math.round(Math.max(...pts.map((p) => p[0])) + marge - x0), Math.round(Math.max(...pts.map((p) => p[1])) + marge - y0)]
}

/** Zones : code → état ; `cadre` : codes des zones à cadrer (défaut : toute la ville). */
export function CarteDesZones({ zones, cadre, hauteur, label }: { zones: Record<string, EtatZone>; cadre?: string[]; hauteur?: number; label: string }) {
  const id = useId().replace(/:/g, '')
  const vue = cadreDe(cadre)
  const corps = Math.max(14, Math.round(vue[3] / 13)) // noms lisibles quelle que soit l'étendue cadrée
  return (
    <div className="mapbox" style={hauteur ? { height: hauteur } : undefined}>
      <svg viewBox={vue.join(' ')} className="map-svg" preserveAspectRatio="xMidYMid meet" style={hauteur ? { height: hauteur, width: '100%' } : undefined} role="img" aria-label={label}>
        <defs>
          <pattern id={id + 'h'} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0 V10" stroke="var(--ink-4)" strokeWidth="1.4" opacity=".28" />
          </pattern>
          <clipPath id={id + 'v'}>
            {ZONES.map((z) => (
              <polygon key={z.code} points={CONTOURS[z.code]} />
            ))}
          </clipPath>
        </defs>
        <rect x={vue[0] - 2000} y={vue[1] - 2000} width={vue[2] + 4000} height={vue[3] + 4000} fill="var(--map-bg)" />
        {ZONES.map((z) => (
          <polygon key={z.code} points={CONTOURS[z.code]} fill="var(--map-block)" />
        ))}
        <path d={RUES} stroke="var(--map-road-2)" strokeWidth="3" strokeLinecap="round" fill="none" clipPath={`url(#${id}v)`} />
        {ZONES.map(({ code }) => {
          const st = zones[code]
          const vif = st && st !== 'off' && st !== 'sale'
          const fond = st === 'focus' ? 'rgba(var(--acc-rgb),.20)' : st === 'on' ? 'rgba(var(--acc-rgb),.10)' : st === 'alert' ? 'rgba(180,35,24,.14)' : st === 'warn' ? 'rgba(232,161,14,.16)' : st === 'sale' ? `url(#${id}h)` : 'transparent'
          return <polygon key={code} points={CONTOURS[code]} fill={fond} stroke={vif ? TON[st] : 'var(--ink-4)'} strokeOpacity={vif ? 0.75 : 0.3} strokeWidth={st === 'focus' ? 3 : 1.6} strokeDasharray={st === 'sale' ? '6 5' : undefined} strokeLinejoin="round" />
        })}
        <path d={GRANDS_AXES} stroke="var(--map-road)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" clipPath={`url(#${id}v)`} />
        {ZONES.map(({ code, nom, etiquette: c }) => {
          const st = zones[code]
          return (
            <text key={code} x={c[0].toFixed(0)} y={c[1].toFixed(0)} textAnchor="middle" fontSize={st === 'focus' ? Math.round(corps * 1.2) : corps} fontWeight="800" fill={st === 'focus' || st === 'on' ? 'var(--acc-txt)' : 'var(--map-txt)'} opacity={st ? 1 : 0.7} fontFamily="Plus Jakarta Sans,sans-serif" aria-hidden="true">
              {code} {nom}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
