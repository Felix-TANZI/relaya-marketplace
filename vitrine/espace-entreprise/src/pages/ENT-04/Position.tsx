// Position en direct d'un livreur en tournée (fiche du livreur, motif M19) : la dernière position envoyée pendant la
// mission (jamais hors mission : DP-61), sur un fond OpenStreetMap centré sur elle (composants/CarteOsm ; hors ligne,
// tuile en échec ou navigateur piloté : plan quadrillé avec la zone), avec l'heure de la donnée et son état (en
// mouvement, à l'arrêt, hors connexion : dernier état connu). Relue toutes les 30 s ; la carte des missions montre la
// tournée entière. Réservée à l'exploitation (propriétaire, répartiteur), comme la carte de la flotte.
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { Panel, Pill } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { useDates } from '../ENT-03/outils'
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'
import { capVers } from '@client/composants/carte/acteurs'
import { CoucheMarqueurs } from '@client/composants/carte/Marqueurs'

// Vue de 360 × 240 autour du point (≈ 900 m × 600 m) : zoom 16, tuiles presque à leur taille.
const L = 360
const DLNG = 0.004
const DLAT = (DLNG * 2) / 3
export function PositionDirecte({ livreurId }: { livreurId: string }) {
  const { t, tf } = usePreferences()
  const { heure, relatif } = useDates()
  const maintenant = useHorloge()
  const tic = Math.floor(maintenant / 30_000)
  const lecture = useLecture(() => source.carte.positions(), [tic])
  const fond = useFondOsm()
  const p = lecture.donnees?.find((x) => x.livreurId === livreurId)
  if (!lecture.donnees) return null
  if (!p)
    return (
      <Panel titre={t('Position en direct')} icone="navigation" className="mt14">
        <p className="t13 c3">{t('Aucune position pour l’instant : elle arrive dès que la mission démarre sur son téléphone.')}</p>
      </Panel>
    )
  const c = cadrer({ lat0: p.lat - DLAT, lat1: p.lat + DLAT, lng0: p.lng - DLNG, lng1: p.lng + DLNG }, L)
  const [px, py] = c.point(p.lat, p.lng)
  const ETAT = { en_mouvement: ['En mouvement', 'green'], arret: ['À l’arrêt', 'amber'], hors_connexion: ['Hors connexion', 'red'] } as const
  return (
    <Panel titre={t('Position en direct')} icone="navigation" className="mt14" droite={<Pill sm dot ton={ETAT[p.etat][1]}>{t(ETAT[p.etat][0])}</Pill>}>
      <div className="e-pos" data-fond={fond.etat}>
        <svg viewBox={`0 0 ${L} ${c.h}`} role="img" aria-label={tf('Position de {nom} en zone {z}, donnée de {h}', { nom: p.nom, z: p.zone, h: heure(p.le) })}>
          <defs>
            <pattern id="e-pos-grille" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0H0V30" className="e-pos-g" />
            </pattern>
          </defs>
          <rect width={L} height={c.h} className="e-pos-f" />
          {fond.etat === 'osm' ? (
            <TuilesOsm cadre={c} echouer={fond.echouer} />
          ) : (
            <>
              <rect width={L} height={c.h} fill="url(#e-pos-grille)" />
              <text x={12} y={22} className="e-pos-z">
                {tf('Zone {z}', { z: p.zone })}
              </text>
            </>
          )}
          <CoucheMarqueurs points={[{ id: p.livreurId, acteur: 'livreur', x: px, y: py, nom: p.nom, etat: p.etat === 'hors_connexion' ? 'hors_ligne' : 'mission', cap: p.etat === 'en_mouvement' && p.cap ? capVers(p, p.cap) : null, texte: p.initiales, classe: 'e-pos-pt ' + p.etat }]} taille={36} />
        </svg>
        <MentionOsm etat={fond.etat} demander={fond.demander} />
      </div>
      <p className="t13 mt10">
        {p.etat === 'hors_connexion' ? tf('Dernier état connu {d} : sa file d’envoi repartira au retour du réseau.', { d: relatif(p.le, maintenant) }) : tf('Donnée de {h} · zone {z} · paquet {pq}', { h: heure(p.le), z: p.zone, pq: p.paquetId })}
      </p>
      <div className="btns mt10">
        <Link className="btn secondary" to={chemin('missions', { id: p.missionId })}>
          <Icone nom="map" taille={16} />
          <span>{t('Voir la tournée sur la carte')}</span>
        </Link>
      </div>
    </Panel>
  )
}
