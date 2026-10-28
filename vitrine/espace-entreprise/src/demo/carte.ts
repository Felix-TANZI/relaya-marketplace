// DONNÉES DE DÉMONSTRATION — domaine « carte » (ENT-P13) : position des livreurs EN MISSION ACTIVE seulement (du
// départ à la clôture : ENT-P13R-01), calculée le long de la tournée entre le dernier arrêt fait et le suivant, à
// l'heure de la démonstration (elle avance : la carte bouge) ; figée à la dernière position connue quand le livreur
// est hors connexion (ENT-RG-R103) ; à l'arrêt quand un incident bloque. Un livreur affecté non parti n'a pas de
// position (« Position affichée au départ de la tournée »). Fond : zones exploitées, relais, boutiques des tournées
// en cours, point de stockage ; le client n'apparaît jamais (sa zone seulement).
import type { DomaineCarte, LieuCarte, PositionLivreur } from '../donnees/domaines/carte'
import type { Instant } from '../donnees/communs'
import { MINUTE } from '../calculs/temps'
import { ZONES_YAOUNDE } from '../calculs/zones'
import { maintenant } from './horloge'
import { ZONES } from './jeu-essai'
import { exiger } from './acces'
import { LIEUX, idLivreur, livreurDe, paquetsDemo, type PaquetDemo } from './paquets'
import { repondre } from './stockage'

export const MISSION_ACTIVE = ['en_cours', 'incident']

/** Position d'une mission active à l'instant t (null : pas de mission active, ou pas encore partie). */
export function positionMission(p: PaquetDemo, t: Instant): Omit<PositionLivreur, 'livreurId' | 'nom' | 'initiales' | 'missionId'> | null {
  if (!idLivreur(p, t) || !MISSION_ACTIVE.includes(p.statut) || !p.depart || p.depart > t) return null
  const faits = p.arrets.filter((a) => a.fait)
  const suivant = p.arrets.find((a) => !a.fait)
  const de = LIEUX[faits.length ? faits[faits.length - 1].lieu : 'stock']
  const vers = suivant ? LIEUX[suivant.lieu] : de
  const t0 = faits.length ? faits[faits.length - 1].fait! : p.depart
  const t1 = p.eta ?? t0 + 20 * MINUTE
  const ici = p.horsConnexionDepuis ?? t
  let f = Math.min(0.92, Math.max(0, (ici - t0) / Math.max(1, t1 - t0)))
  if (p.statut === 'incident') f = 1
  const decalage = p.statut === 'incident' ? 0.00016 : 0
  return {
    lat: de.lat + (vers.lat - de.lat) * f + decalage,
    lng: de.lng + (vers.lng - de.lng) * f + decalage,
    le: p.horsConnexionDepuis ?? t,
    zone: p.zone,
    paquetId: p.id,
    etat: p.horsConnexionDepuis ? 'hors_connexion' : p.statut === 'incident' ? 'arret' : 'en_mouvement',
    cap: suivant ? { lat: vers.lat, lng: vers.lng } : null,
  }
}

/** Position d'un livreur s'il est en mission active (affectation : distance au premier arrêt). */
export function positionDe(livreurId: string, t: Instant): { lat: number; lng: number } | null {
  for (const p of paquetsDemo.lire().paquets) if (idLivreur(p, t) === livreurId) {
    const x = positionMission(p, t)
    if (x) return x
  }
  return null
}

export const idMission = (paquetId: string) => 'MS-' + paquetId.slice(3)

export const demoCarte: DomaineCarte = {
  async positions() {
    exiger(['proprietaire', 'repartiteur'], 'Carte de la flotte')
    const t = maintenant()
    const r: PositionLivreur[] = []
    for (const p of paquetsDemo.lire().paquets) {
      const x = positionMission(p, t)
      if (!x) continue
      const l = livreurDe(p, t)!
      r.push({ ...x, livreurId: l.id, nom: l.nom, initiales: l.initiales, missionId: idMission(p.id) })
    }
    return repondre(r)
  },
  async fond() {
    exiger(['proprietaire', 'repartiteur'], 'Carte de la flotte')
    const actifs = paquetsDemo.lire().paquets.filter((p) => ['affecte', ...MISSION_ACTIVE].includes(p.statut))
    const ids = new Set(['stock', 'r-z1', 'r-z3', 'r-z2', 'r-z6', ...actifs.flatMap((p) => p.arrets.map((a) => a.lieu))])
    const lieux: LieuCarte[] = [...ids]
      .map((id) => LIEUX[id])
      .filter((l) => l.type !== 'domicile')
      .map((l) => ({ id: l.id, type: l.type as LieuCarte['type'], nom: l.nom, lat: l.lat, lng: l.lng, zone: l.zone }))
    const zones = ZONES.map((c) => ZONES_YAOUNDE.find((z) => z.code === c.code)!).map((z) => ({ code: z.code, nom: z.nom, lat: z.centre[0], lng: z.centre[1], rayonKm: z.rayonKm, polygone: z.polygone }))
    return repondre({ zones, lieux })
  },
}
