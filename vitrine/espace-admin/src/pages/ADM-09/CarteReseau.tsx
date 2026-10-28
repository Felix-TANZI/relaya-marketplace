// Carte du réseau logistique (relais ADM-P17, zones ADM-P21, carte opérationnelle ADM-P22) : fond OpenStreetMap comme
// l'entreprise (composants/CarteOsm : tuiles, mention « © OpenStreetMap contributors », repli sur le plan des zones
// hors ligne, tuile en échec ou navigateur piloté), polygones des douze zones (logique-metier/livraison/
// zones-yaounde.geo.json, le fichier qui fait foi pour l'entreprise, le livreur et le kit), marqueurs communs des six
// applications (@client/composants/carte : un acteur, une couleur, une icône ; regroupés quand ils se touchent), cliquables
// (clavier : Entrée, Espace). Aucune adresse de client : un paquet à domicile est montré par son quartier (ADM-P22R-02).
import type { KeyboardEvent } from 'react'
import geo from '../../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'
import { usePreferences } from '../../preferences'
import type { Acteur, EtatLivreur, StatutMarqueur } from '@client/composants/carte/acteurs'
import { CoucheMarqueurs, LegendeCarte, type PointMarqueur } from '@client/composants/carte/Marqueurs'
import '../ADM-08/s4.css'

export interface ZoneGeo {
  code: string
  nom: string
  etiquette: [number, number]
  polygone: [number, number][]
}
export const ZONES_GEO: ZoneGeo[] = geo.features.map((f) => ({
  code: f.id as string,
  nom: f.properties.nom,
  etiquette: [f.properties.etiquette[0], f.properties.etiquette[1]],
  polygone: f.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon] as [number, number]),
}))

export interface PointReseau {
  id: string
  acteur: Acteur
  lat: number
  lng: number
  ton: string // état du point : 'red' alerte, 'amber' à surveiller, 'ink' en configuration ou hors connexion
  nom: string // nom accessible
  etiquette?: string
  etat?: EtatLivreur
}
/** Calque de la carte opérationnelle → acteur du marqueur commun. */
export const ACTEUR_CALQUE: Record<string, Acteur> = { relais: 'relais', boutiques: 'boutique', entreprises: 'entreprise', livreurs: 'livreur', paquets: 'paquet', alertes: 'alerte' }
const STATUT_TON: Record<string, StatutMarqueur | undefined> = { red: 'alerte', amber: 'attention', ink: 'inactif' }
const ZOOM = 13
const MARGE = 0.004

export function CarteReseau(p: {
  titre: string
  zones: Record<string, 'on' | 'vente' | 'alerte' | 'surveiller'>
  points?: PointReseau[]
  trajets?: { id: string; pts: [number, number][] }[]
  choisi?: string | null
  surPoint?: (id: string) => void
  surZone?: (code: string) => void
  cadreZones?: string[]
  zoneChoisie?: string | null
}) {
  const { t } = usePreferences()
  const fond = useFondOsm()
  const cadre = ZONES_GEO.filter((z) => !p.cadreZones || p.cadreZones.includes(z.code))
  const pts = cadre.flatMap((z) => z.polygone)
  const lats = pts.map((x) => x[0])
  const lngs = pts.map((x) => x[1])
  const lng0 = Math.min(...lngs) - MARGE
  const lng1 = Math.max(...lngs) + MARGE
  const c = cadrer({ lat0: Math.min(...lats) - MARGE, lat1: Math.max(...lats) + MARGE, lng0, lng1 }, Math.round(((lng1 - lng0) / 360) * 256 * 2 ** ZOOM), ZOOM)
  const proj = (lat: number, lng: number) => c.point(lat, lng)
  const touche = (f: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      f()
    }
  }
  const ETAT = { on: 'exploitée', vente: 'vente seulement', alerte: 'en alerte', surveiller: 'à surveiller' }
  return (
    <figure className="s4-carte" data-fond={fond.etat}>
      <svg viewBox={`0 0 ${c.l} ${c.h}`} role="group" aria-label={p.titre}>
        <rect className="fond-plan" width={c.l} height={c.h} />
        {fond.etat === 'osm' && <TuilesOsm cadre={c} echouer={fond.echouer} />}
        {ZONES_GEO.map((z) => {
          const ton = p.zones[z.code] ?? 'vente'
          const d = 'M' + z.polygone.map(([la, lo]) => proj(la, lo).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z'
          const [x, y] = proj(...z.etiquette)
          const nom = `${z.code} ${z.nom} · ${t(ETAT[ton])}`
          const forme = (
            <>
              <title>{nom}</title>
              <path className={'zone ' + (ton === 'on' ? '' : ton) + (p.zoneChoisie === z.code ? ' choisie' : '')} d={d} />
              <text className="etiq" x={x} y={y} textAnchor="middle" dominantBaseline="central">
                {z.code}
              </text>
            </>
          )
          return p.surZone ? (
            <g key={z.code} role="button" tabIndex={0} aria-label={nom} aria-pressed={p.zoneChoisie === z.code} onClick={() => p.surZone!(z.code)} onKeyDown={touche(() => p.surZone!(z.code))}>
              {forme}
            </g>
          ) : (
            <g key={z.code} aria-label={nom}>
              {forme}
            </g>
          )
        })}
        {(p.trajets ?? []).map((tr) => (
          <path key={tr.id} className="trajet" d={'M' + tr.pts.map(([la, lo]) => proj(la, lo).map((v) => v.toFixed(1)).join(' ')).join('L')} />
        ))}
        <CoucheMarqueurs
          points={(p.points ?? []).map((x): PointMarqueur => {
            const [cx, cy] = proj(x.lat, x.lng)
            const livreur = x.acteur === 'livreur'
            return {
              id: x.id,
              acteur: x.acteur,
              x: cx,
              y: cy,
              nom: x.nom,
              etiquette: x.etiquette,
              etat: livreur ? (x.etat ?? (x.ton === 'ink' ? 'hors_ligne' : 'mission')) : undefined,
              statut: livreur || x.acteur === 'alerte' ? undefined : STATUT_TON[x.ton],
              choisi: p.choisi === x.id,
              classe: 'pt ' + x.ton + (p.choisi === x.id ? ' choisi' : ''),
              surChoix: p.surPoint ? () => p.surPoint!(x.id) : undefined,
            }
          })}
        />
      </svg>
      <MentionOsm etat={fond.etat} demander={fond.demander} />
    </figure>
  )
}

// Légende des cartes du réseau : les zones (aplats), puis la légende commune des marqueurs (repliable).
export function Legende({ zones = [], acteurs = [], etats = [], statuts = [] }: { zones?: ['zone' | 'vente' | 'red', string][]; acteurs?: Acteur[]; etats?: EtatLivreur[]; statuts?: [StatutMarqueur, string][] }) {
  return <LegendeCarte acteurs={acteurs} etats={etats} statuts={statuts} autres={zones.map(([c, l]): [string, string] => ['s4-z ' + c, l])} />
}
