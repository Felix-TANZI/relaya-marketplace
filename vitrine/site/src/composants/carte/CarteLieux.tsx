// Carte de quelques lieux (module commun des cartes) : l'adresse du client, des relais, une boutique… avec les
// marqueurs communs (Marqueurs.tsx). Fournisseur : Google Maps quand il est configuré (connecteurs/cartes.ts :
// VITE_MAPS=google et sa clé ; mêmes marqueurs, posés en marqueurs avancés), sinon OpenStreetMap : tuiles
// https://tile.openstreetmap.org dessinées dans un SVG, sous les marqueurs (mention « © OpenStreetMap contributors »
// cliquable, DP-49). Repli schématique (quadrillage, mêmes marqueurs) hors ligne, tuile en échec ou navigateur piloté
// (tests déterministes, politique d'usage des serveurs OSM). Le cadre suit les points (zoom choisi pour qu'ils tiennent
// tous, 17 au plus) ; en sombre, les tuiles sont adoucies. Marqueur cliquable : `surChoix` (clavier : Entrée, Espace).
import { useEffect, useRef, useState } from 'react'
import { EVENEMENT_REPLI, afficherCarte, fournisseur, type Marqueur } from '../../connecteurs/cartes'
import { usePreferences } from '../../preferences'
import type { Acteur, StatutMarqueur } from './acteurs'
import { CoucheMarqueurs, LegendeCarte } from './Marqueurs'
import './marqueurs.css'

export interface Lieu {
  id: string
  acteur: Acteur
  lat: number
  lon: number
  nom: string
  etiquette?: string
  choisi?: boolean
  statut?: StatutMarqueur
  surChoix?: () => void
}

const TUILE = 256
const SERVEUR = 'https://tile.openstreetmap.org'
const ZOOM_MAX = 17
const MARGE = 44 // pixels autour des points (la moitié d'un marqueur et son étiquette)

function mercator(lat: number, lon: number, z: number): [number, number] {
  const n = TUILE * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

/** Zoom et coin haut-gauche (pixels du monde) pour faire tenir les points dans l × h. Calcul pur. */
export function cadrage(points: { lat: number; lon: number }[], l: number, h: number, zoomMax = ZOOM_MAX): { z: number; x0: number; y0: number } {
  for (let z = zoomMax; z >= 3; z--) {
    const xy = points.map((p) => mercator(p.lat, p.lon, z))
    const xs = xy.map((p) => p[0])
    const ys = xy.map((p) => p[1])
    const [ax, bx, ay, by] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    if (z === 3 || (bx - ax <= l - 2 * MARGE && by - ay <= h - 2 * MARGE)) return { z, x0: (ax + bx) / 2 - l / 2, y0: (ay + by) / 2 - h / 2 }
  }
  return { z: 3, x0: 0, y0: 0 }
}

const tuilesPermises = () => typeof navigator !== 'undefined' && navigator.onLine !== false && !navigator.webdriver

// Fournisseur en cours (Google repasse à OpenStreetMap s'il ne répond pas).
function useFournisseur() {
  const [nom, setNom] = useState(() => fournisseur().nom)
  useEffect(() => {
    const repli = () => setNom(fournisseur().nom)
    window.addEventListener(EVENEMENT_REPLI, repli)
    return () => window.removeEventListener(EVENEMENT_REPLI, repli)
  }, [])
  return nom
}

function CarteGoogle({ titre, lieux, hauteur }: { titre: string; lieux: Lieu[]; hauteur: number }) {
  const el = useRef<HTMLDivElement>(null)
  const ref = useRef(lieux)
  useEffect(() => {
    ref.current = lieux
  })
  const cle = JSON.stringify(lieux.map((l) => [l.id, l.acteur, l.lat, l.lon, l.nom, !!l.choisi, l.statut]))
  useEffect(() => {
    if (!el.current || !lieux.length) return
    let retirer: (() => void) | null = null
    let fini = false
    const principal = lieux.find((l) => l.choisi) ?? lieux[0]
    const marqueurs: Marqueur[] = lieux.map((l) => ({ lat: l.lat, lon: l.lon, nom: l.nom, acteur: l.acteur, principal: l === principal, statut: l.statut, id: l.id }))
    const avecChoix = lieux.some((l) => l.surChoix)
    afficherCarte(el.current, { centre: principal, titre, marqueurs, choisir: avecChoix ? (m) => ref.current.find((l) => l.id === m.id)?.surChoix?.() : undefined }).then((f) => (fini ? f() : (retirer = f)))
    return () => {
      fini = true
      retirer?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, titre])
  return <div ref={el} className="mq-carte mq-google" style={{ height: hauteur }} role="group" aria-label={titre} />
}

function CarteOsm({ titre, lieux, hauteur, plan }: { titre: string; lieux: Lieu[]; hauteur: number; plan: boolean }) {
  const { t } = usePreferences()
  const boite = useRef<HTMLDivElement>(null)
  const [l, setL] = useState(340)
  const [permis, setPermis] = useState(tuilesPermises)
  const [echec, setEchec] = useState(false)
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const mesurer = () => setL(Math.round(el.clientWidth) || 340)
    mesurer()
    const o = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mesurer)
    o?.observe(el)
    const reseau = () => (setPermis(tuilesPermises()), setEchec(false))
    window.addEventListener('online', reseau)
    window.addEventListener('offline', reseau)
    return () => (o?.disconnect(), window.removeEventListener('online', reseau), window.removeEventListener('offline', reseau))
  }, [])
  const h = hauteur
  const { z, x0, y0 } = cadrage(lieux.length ? lieux : [{ lat: 3.8667, lon: 11.5167 }], l, h)
  const tuiles: [number, number][] = []
  const n = 2 ** z
  const osm = permis && !echec && !plan
  if (osm)
    for (let x = Math.floor(x0 / TUILE); x <= Math.floor((x0 + l) / TUILE); x++)
      for (let y = Math.max(0, Math.floor(y0 / TUILE)); y <= Math.min(n - 1, Math.floor((y0 + h) / TUILE)); y++) tuiles.push([x, y])
  return (
    <div ref={boite} className="mq-carte" data-fond={osm ? 'osm' : 'plan'} style={{ height: h }} role="group" aria-label={titre}>
      <svg viewBox={`0 0 ${l} ${h}`} width="100%" height={h}>
        <defs>
          <pattern id="mq-plan" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" className="mq-plan-g" />
          </pattern>
        </defs>
        <rect width={l} height={h} className="mq-plan-f" />
        {osm ? (
          <g aria-hidden="true">
            {tuiles.map(([x, y]) => (
              <image key={`${z}/${x}/${y}`} className="mq-tuile" href={`${SERVEUR}/${z}/${((x % n) + n) % n}/${y}.png`} x={x * TUILE - x0} y={y * TUILE - y0} width={TUILE + 0.5} height={TUILE + 0.5} preserveAspectRatio="none" onError={() => setEchec(true)} />
            ))}
          </g>
        ) : (
          <rect width={l} height={h} fill="url(#mq-plan)" aria-hidden="true" />
        )}
        <CoucheMarqueurs
          points={lieux.map((p) => {
            const [x, y] = mercator(p.lat, p.lon, z)
            return { id: p.id, acteur: p.acteur, x: x - x0, y: y - y0, nom: p.nom, etiquette: p.etiquette, choisi: p.choisi, statut: p.statut, surChoix: p.surChoix }
          })}
        />
      </svg>
      {osm ? (
        <span className="mq-mention">
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          {t('contributeurs')}
        </span>
      ) : (
        <span className="mq-mention">{t('Plan simplifié')}</span>
      )}
    </div>
  )
}

/** Carte des lieux, avec sa légende repliable (acteurs présents). titre et noms des lieux : déjà traduits par l'écran. plan : le plan schématique seul (données économes :
 * la carte s'affiche à la demande de l'écran). */
export function CarteLieux({ titre, lieux, hauteur = 180, legende = true, libelles, plan = false }: { titre: string; lieux: Lieu[]; hauteur?: number; legende?: boolean; libelles?: Partial<Record<Acteur, string>>; plan?: boolean }) {
  const nom = useFournisseur()
  const acteurs = [...new Set(lieux.map((l) => l.acteur))]
  return (
    <div className="mq-lieux">
      {nom === 'google' && !plan ? <CarteGoogle titre={titre} lieux={lieux} hauteur={hauteur} /> : <CarteOsm titre={titre} lieux={lieux} hauteur={hauteur} plan={plan} />}
      {legende && acteurs.length > 1 && <LegendeCarte acteurs={acteurs} libelles={libelles} ouverte={false} />}
    </div>
  )
}
