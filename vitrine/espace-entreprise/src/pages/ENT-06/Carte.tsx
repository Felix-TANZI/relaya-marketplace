// Carte de la flotte (ENT-P13) : fond OpenStreetMap de Yaoundé (composants/CarteOsm : tuiles, mention « © OpenStreetMap
// contributors » cliquable ; hors ligne, tuile en échec ou navigateur piloté : plan schématique), zones exploitées (tracées par leur polygone), tournées en cours (fait en trait plein,
// reste en pointillé), relais, boutiques, point de stockage, et les livreurs EN MISSION ACTIVE seulement (ENT-P13R-01) :
// en mouvement (pouls), à l'arrêt, hors connexion (ambre, dernière position connue). Le client n'apparaît jamais : sa
// zone seulement (cercle pointillé au bout d'une course à domicile). Mêmes données en production
// (GET /api/company/fleet/positions). Chaque livreur se choisit aussi au clavier (liste à côté).
// Posée dans le bloc « mapbox » du prototype (entB_map : carte, légende, encart par-dessus quand elle est vide).
import type { ReactNode } from 'react'
import type { LieuCarte, PositionLivreur, ZoneCarte } from '../../donnees/domaines/carte'
import type { PointRoute } from '../../donnees/domaines/missions'
import { usePreferences } from '../../preferences'
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'
import { capVers } from '@client/composants/carte/acteurs'
import { CoucheMarqueurs, LegendeCarte, type PointMarqueur } from '@client/composants/carte/Marqueurs'

export interface TraceCarte {
  missionId: string
  points: PointRoute[]
  depart: { lat: number; lng: number } | null
  ton: 'ok' | 'ambre' | 'rouge'
}

const L = 640
export function Carte({ zones, lieux, positions, traces, selection, choisir, hauteur = 420, legende = true, dessus }: { zones: ZoneCarte[]; lieux: LieuCarte[]; positions: PositionLivreur[]; traces: TraceCarte[]; selection: string | null; choisir?: (missionId: string) => void; hauteur?: number; legende?: boolean; dessus?: ReactNode }) {
  const { t, tf } = usePreferences()
  const KM = 1 / 111
  const zs: { lat: number; lng: number; rayonKm: number }[] = zones.length ? zones : [...positions.map((p) => ({ lat: p.lat, lng: p.lng, rayonKm: 1 })), { lat: 3.87, lng: 11.52, rayonKm: 2 }].slice(0, Math.max(1, positions.length))
  const lat0 = Math.min(...zs.map((z) => z.lat - z.rayonKm * KM)) - 0.004
  const lat1 = Math.max(...zs.map((z) => z.lat + z.rayonKm * KM)) + 0.004
  const lng0 = Math.min(...zs.map((z) => z.lng - z.rayonKm * KM)) - 0.01
  const lng1 = Math.max(...zs.map((z) => z.lng + z.rayonKm * KM)) + 0.01
  // Web Mercator (celle des tuiles) : à cette latitude, un kilomètre vaut presque le même nombre d'unités en x et en y.
  const fond = useFondOsm()
  const c = cadrer({ lat0, lat1, lng0, lng1 }, L)
  const H = c.h
  const x = (lng: number) => c.point(lat0, lng)[0]
  const y = (lat: number) => c.point(lat, lng0)[1]
  const r = (km: number) => (km * KM * L) / (lng1 - lng0)
  return (
    <div className="mapbox entb-mapb lv-carte" data-fond={fond.etat}>
      <svg className="map-svg" viewBox={`0 0 ${L} ${H}`} style={{ maxHeight: hauteur }} role="img" aria-label={tf('Carte de la flotte : {n} livreurs en mission active', { n: positions.length })}>
        <defs>
          <pattern id="lv-grille" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" className="lv-c-grille" />
          </pattern>
        </defs>
        <rect width={L} height={H} className="lv-c-fond" />
        {fond.etat === 'osm' ? <TuilesOsm cadre={c} echouer={fond.echouer} /> : <rect width={L} height={H} fill="url(#lv-grille)" />}
        {zones.map((z) => (
          <g key={z.code}>
            <path d={'M' + z.polygone.map(([la, lo]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join('L') + 'Z'} className="lv-c-zone" />
            <text x={x(z.lng)} y={y(z.lat) - 14} textAnchor="middle" className="lv-c-zt">
              {z.code} · {z.nom}
            </text>
          </g>
        ))}
        {traces.map((tr) => {
          const pts = [tr.depart, ...tr.points].filter(Boolean) as { lat: number; lng: number }[]
          const fin = tr.points[tr.points.length - 1]
          return (
            <g key={tr.missionId} className={'lv-c-trace ' + tr.ton + (selection === tr.missionId ? ' sel' : '')}>
              <polyline points={pts.map((p) => `${x(p.lng)},${y(p.lat)}`).join(' ')} />
              {fin?.type === 'domicile' && <circle cx={x(fin.lng)} cy={y(fin.lat)} r={r(0.45)} className="lv-c-client" />}
            </g>
          )
        })}
        <CoucheMarqueurs
          points={[
            ...lieux.map((l): PointMarqueur => ({ id: l.id, acteur: l.type === 'relais' ? 'relais' : l.type === 'stockage' ? 'stockage' : 'boutique', x: x(l.lng), y: y(l.lat), nom: l.nom, etiquette: l.type === 'relais' ? l.nom : undefined, classe: l.type === 'relais' ? 'lv-c-relais' : l.type === 'stockage' ? 'lv-c-stock' : 'lv-c-boutique' })),
            ...positions.map((p): PointMarqueur => ({
              id: p.livreurId,
              acteur: 'livreur',
              x: x(p.lng),
              y: y(p.lat),
              nom: tf('{n} · {e}', { n: p.nom, e: t(p.etat === 'hors_connexion' ? 'Hors connexion' : 'Livreur en mission') }),
              etat: p.etat === 'hors_connexion' ? 'hors_ligne' : 'mission',
              cap: p.etat === 'en_mouvement' && p.cap ? capVers(p, p.cap) : null,
              texte: p.initiales,
              choisi: selection === p.missionId,
              classe: 'lv-c-livreur ' + p.etat + (selection === p.missionId ? ' sel' : ''),
              // Sans choix possible (incident : un seul livreur) : un marqueur, pas un bouton.
              surChoix: choisir ? () => choisir(p.missionId) : undefined,
            })),
          ]}
        />
      </svg>
      <MentionOsm etat={fond.etat} demander={fond.demander} className="osm-mention lv-osm" />
      {legende && <LegendeCarte acteurs={['boutique', 'relais', ...(lieux.some((l) => l.type === 'stockage') ? (['stockage'] as const) : [])]} etats={['mission', 'hors_ligne']} autres={[['lv-c-l client', 'Course domicile (zone seulement)']]} dessus />}
      {dessus && <div className="entb-mapover">{dessus}</div>}
    </div>
  )
}
