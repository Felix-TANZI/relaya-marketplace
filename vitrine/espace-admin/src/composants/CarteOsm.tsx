// Fond OpenStreetMap commun aux cartes (repris de l'entreprise ; carte opérationnelle ADM-P22, pilotage des zones ADM-P21,
// incident, position d'un livreur M19) : petit lecteur de tuiles maison, dessiné DANS le SVG de chaque carte (tuiles
// https://tile.openstreetmap.org/{z}/{x}/{y}.png, projection Web Mercator). Choix plutôt que Leaflet : zéro dépendance et
// zéro octet de bibliothèque, les zones, tournées et livreurs restent les mêmes éléments SVG accessibles (boutons au
// clavier, étiquettes) au-dessus du fond, et le repli est exactement le plan schématique d'avant. Le fond OSM n'est
// demandé qu'en ligne, hors navigateur piloté (navigator.webdriver : tests déterministes, politique d'usage des serveurs
// OSM), et, avec « Données économes » au téléphone, seulement sur demande (« Afficher le fond de carte »). Une tuile en
// échec ou une coupure réseau ramène le plan schématique (le retour du réseau relance le fond). Mention
// « © OpenStreetMap contributors » visible et cliquable dès que des tuiles sont affichées (DP-49). En sombre, les tuiles
// sont inversées par un filtre CSS (carte-osm.css) ; le fond de la carte reste posé sous les tuiles pendant leur
// chargement (aucun écran noir).
import { useEffect, useState } from 'react'
import { useDes } from '@client/composants/ecran'
import { usePreferences } from '../preferences'
import './carte-osm.css'

export const SERVEUR_TUILES = 'https://tile.openstreetmap.org'
const TUILE = 256

/** Coordonnées Web Mercator (pixels) au zoom z. */
export function mercator(lat: number, lng: number, z: number): [number, number] {
  const n = TUILE * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lng + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

/** Cadre d'une carte : vue de `largeur` unités sur la boîte donnée, zoom de tuiles choisi pour que la vue ne
 * réduise jamais les tuiles de plus de moitié (netteté) ; point(lat, lng) → coordonnées de la vue. */
export interface Cadre {
  z: number
  k: number
  minX: number
  minY: number
  l: number
  h: number
  point(lat: number, lng: number): [number, number]
}
export function cadrer(b: { lat0: number; lat1: number; lng0: number; lng1: number }, largeur: number, zoom?: number): Cadre {
  const [ax] = mercator(b.lat1, b.lng0, 0)
  const [bx] = mercator(b.lat0, b.lng1, 0)
  const z = zoom ?? Math.min(18, Math.max(0, Math.ceil(Math.log2(largeur / (bx - ax)))))
  const [minX, minY] = mercator(b.lat1, b.lng0, z)
  const [maxX, maxY] = mercator(b.lat0, b.lng1, z)
  const k = largeur / (maxX - minX)
  return {
    z,
    k,
    minX,
    minY,
    l: largeur,
    h: Math.round((maxY - minY) * k),
    point: (lat, lng) => {
      const [x, y] = mercator(lat, lng, z)
      return [(x - minX) * k, (y - minY) * k]
    },
  }
}

const pilote = () => typeof navigator !== 'undefined' && !!navigator.webdriver
const enLigne = () => typeof navigator === 'undefined' || navigator.onLine !== false

/** État du fond d'une carte : `osm` (tuiles affichées), `demande` (données économes au téléphone : sur demande),
 * `plan` (repli schématique : hors ligne, tuile en échec, navigateur piloté). */
export function useFondOsm() {
  const { donneesEconomes } = usePreferences()
  const large = useDes('tab')
  const [reseau, setReseau] = useState(enLigne)
  const [echec, setEchec] = useState(false)
  const [demande, setDemande] = useState(false)
  useEffect(() => {
    const en = () => (setReseau(true), setEchec(false))
    const hors = () => setReseau(false)
    window.addEventListener('online', en)
    window.addEventListener('offline', hors)
    return () => (window.removeEventListener('online', en), window.removeEventListener('offline', hors))
  }, [])
  const etat: 'osm' | 'demande' | 'plan' = pilote() || !reseau || echec ? 'plan' : donneesEconomes && !large && !demande ? 'demande' : 'osm'
  return { etat, echouer: () => setEchec(true), demander: () => setDemande(true) }
}

/** Tuiles OSM couvrant le cadre, dans le repère de la vue (à poser juste après le fond de la carte). */
export function TuilesOsm({ cadre, echouer }: { cadre: Cadre; echouer(): void }) {
  const { z, k, minX, minY, l, h } = cadre
  const n = 2 ** z
  const x0 = Math.floor(minX / TUILE)
  const x1 = Math.floor((minX + l / k) / TUILE)
  const y0 = Math.max(0, Math.floor(minY / TUILE))
  const y1 = Math.min(n - 1, Math.floor((minY + h / k) / TUILE))
  const tuiles: [number, number][] = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tuiles.push([x, y])
  return (
    <g className="osm-tuiles" aria-hidden="true" transform={`matrix(${k} 0 0 ${k} ${-minX * k} ${-minY * k})`}>
      {tuiles.map(([x, y]) => (
        <image key={`${z}/${x}/${y}`} className="osm-tuile" href={`${SERVEUR_TUILES}/${z}/${((x % n) + n) % n}/${y}.png`} x={x * TUILE} y={y * TUILE} width={TUILE + 0.5} height={TUILE + 0.5} preserveAspectRatio="none" onError={echouer} />
      ))}
    </g>
  )
}

/** Mention OSM (fond affiché) ou bouton « Afficher le fond de carte » (données économes) ; rien sur le plan seul. */
export function MentionOsm({ etat, demander, className = 'osm-mention' }: { etat: 'osm' | 'demande' | 'plan'; demander(): void; className?: string }) {
  const { t } = usePreferences()
  if (etat === 'plan') return null
  if (etat === 'demande')
    return (
      <button type="button" className={className + ' osm-demande'} onClick={demander}>
        {t('Afficher le fond de carte')}
      </button>
    )
  return (
    <span className={className}>
      ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap
      </a>{' '}
      {t('contributeurs')}
    </span>
  )
}
