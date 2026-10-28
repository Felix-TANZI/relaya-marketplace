// Concordance avec la carte des zones (logique-metier/livraison/zones-yaounde.geo.json, DP-70) : douze zones, noms et
// niveaux de BV-DEV-07, zones exploitées du registre ; chaque point de la démonstration (boutique, lieux, relais,
// centres de quartier) tombe dans la zone qu'il annonce, et cette zone est celle de son quartier dans la table
// quartier → zone (BV-DEV-07), au bon niveau de prix.
import { describe, expect, it } from 'vitest'
import { chercher } from '@client/calculs'
import { CENTRES } from '@client/donnees/geo'
import REF from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { RELAIS } from '../demo/aj-a'
import { initial } from '../demo/boutique'
import { BOUTIQUE } from '../demo/jeu-essai'
import { ZONES, zoneDe } from '../demo/session'
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import { REGISTRE } from './registre'
import { ZONES_EXPLOITEES, ZONES_YAOUNDE, zoneDuPoint } from './zones'

const D = REF as unknown as { zones: { zone: string; nom: string; peripherie: boolean }[]; livraison: { zones_peripherie: string[] } }
/** Quartier de la démonstration → quartier de la table (nom écrit autrement). */
const TABLE: Record<string, string> = { 'Mvog-Mbi / Mvog-Ada': 'Mvog-Mbi', Nkolndongo: 'Nkol-Ndongo 1' }
const zoneDuQuartier = (q: string) => chercher(TABLE[q] ?? q)

describe('carte des zones', () => {
  it('douze zones, noms et niveaux de BV-DEV-07, périphérie de R06', () => {
    expect(ZONES_YAOUNDE.map((z) => z.code)).toEqual(D.zones.map((z) => z.zone))
    expect(ZONES_YAOUNDE.map((z) => z.nomComplet)).toEqual(D.zones.map((z) => z.nom))
    expect(ZONES_YAOUNDE.filter((z) => z.niveau === 'peripherie').map((z) => z.code)).toEqual(D.livraison.zones_peripherie)
    expect(ZONES.map((z) => `${z.code} ${z.quartiers}`)).toEqual(D.zones.map((z) => `${z.zone} ${z.nom}`))
    expect(zoneDuPoint(4.05, 9.7)).toBeNull() // Douala : hors zone
  })

  it('zones exploitées : celles du registre (ZONES-EXPLOITEES), au nom de la carte', () => {
    expect(ZONES_EXPLOITEES).toEqual(['Z1', 'Z2', 'Z3', 'Z6'])
    for (const z of REGISTRE['ZONES-EXPLOITEES'].split(',').map((x) => x.trim())) {
      const [code, nom] = [z.split(' ')[0], z.split(' ').slice(1).join(' ')]
      expect(ZONES_YAOUNDE.find((x) => x.code === code)?.nom).toBe(nom)
    }
  })

  it('boutique du jeu d’essai : point dans sa zone, celle de son quartier, au niveau centre', () => {
    expect(zoneDuPoint(BOUTIQUE.position.lat, BOUTIQUE.position.lon)).toBe(BOUTIQUE.zone)
    expect(zoneDuQuartier(BOUTIQUE.quartier)).toMatchObject({ zone: BOUTIQUE.zone, niveau: 'centre' })
    expect(zoneDe(BOUTIQUE.position)).toEqual({ code: 'Z10', quartiers: 'Mimboman / Kondengui', exploitee: false })
  })

  it('zone du point : même forme que le kit (vendeur_session.ouverture.zone_du_point), douze zones, « exploitee »', () => {
    for (const f of geo.features) {
      const [lat, lon] = f.properties.etiquette
      expect(zoneDe({ lat, lon })).toEqual({ code: f.properties.code, quartiers: f.properties.nomComplet, exploitee: ZONES_EXPLOITEES.includes(f.properties.code) })
    }
    expect(zoneDe({ lat: 4.05, lon: 9.7 })).toBeNull()
  })

  it('lieux, relais et centres de quartier : dans la zone de leur quartier', () => {
    for (const l of initial().lieux) {
      expect([l.nom, zoneDuPoint(l.position.lat, l.position.lon)]).toEqual([l.nom, l.zone])
      expect([l.nom, zoneDuQuartier(l.quartier ?? '')?.zone]).toEqual([l.nom, l.zone])
    }
    for (const r of RELAIS) expect([r.nom, zoneDuPoint(r.position.lat, r.position.lon)]).toEqual([r.nom, zoneDuQuartier(r.quartier)?.zone])
    for (const [q, [lat, lon]] of Object.entries(CENTRES)) expect([q, zoneDuPoint(lat, lon)]).toEqual([q, zoneDuQuartier(q)?.zone])
  })
})
