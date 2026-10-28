// Les douze zones (logique-metier/livraison/zones-yaounde.geo.json, carte du 23 oct. 2026, DP-70) : un point de
// Yaoundé est dans une zone et une seule ; chaque lieu de la démonstration est dans la zone qu'il annonce ; la
// démonstration suit la carte (noms, zones exploitées au lancement, table quartier → zone).
import { expect, it } from 'vitest'
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import table from '../../../logique-metier/livraison/quartiers-zones.json' with { type: 'json' }
import { LIEUX } from '../demo/paquets'
import { ZONES } from '../demo/jeu-essai'
import { ZONES_YAOUNDE, zoneDuPoint } from './zones'

it('douze zones nommées, centre et étiquette dans leur zone', () => {
  expect(ZONES_YAOUNDE.map((z) => `${z.code} ${z.nom}`)).toEqual(['Z1 Centre-ville', 'Z2 Nsam', 'Z3 Mokolo', 'Z4 Ngousso', 'Z5 Nsimeyong', 'Z6 Biyem-Assi', 'Z7 Simbock', 'Z8 Nkolbisson', 'Z9 Essos', 'Z10 Mimboman', 'Z11 Odza', 'Z12 Emana'])
  for (const z of ZONES_YAOUNDE) {
    expect(zoneDuPoint(...z.centre)).toBe(z.code)
    expect(zoneDuPoint(...z.etiquette)).toBe(z.code)
    expect(z.polygone.length).toBeGreaterThan(20)
  }
  expect(zoneDuPoint(4.05, 9.7)).toBeNull() // Douala : hors couverture
})

it('concordance avec le fichier qui fait foi : codes Z1–Z12, noms court et complet', () => {
  expect(ZONES_YAOUNDE.map((z) => z.code)).toEqual(Array.from({ length: 12 }, (_, i) => `Z${i + 1}`))
  for (const [i, f] of geo.features.entries()) {
    expect(ZONES_YAOUNDE[i].nom).toBe(f.properties.nom)
    expect(ZONES_YAOUNDE[i].nomComplet).toBe(f.properties.nomComplet)
  }
  expect(ZONES_YAOUNDE.find((z) => z.code === 'Z2')!.nomComplet).toBe('Nsam / Obili')
})

it('zones exploitées de la démonstration : Z1, Z2, Z3, Z6 sous le nom de la carte', () => {
  expect(ZONES.map((z) => `${z.code} ${z.nom}`)).toEqual(ZONES_YAOUNDE.filter((z) => ['Z1', 'Z2', 'Z3', 'Z6'].includes(z.code)).map((z) => `${z.code} ${z.nom}`))
})

it('chaque lieu de la démonstration est dans sa zone, et dans celle de son quartier selon la table', () => {
  const zoneTable = new Map<string, string>()
  for (const q of table.quartiers) for (const n of [q.quartier, ...q.alias]) zoneTable.set(n, q.zone)
  for (const l of Object.values(LIEUX)) {
    expect([l.nom, l.quartier, zoneDuPoint(l.lat, l.lng)]).toEqual([l.nom, l.quartier, l.zone])
    if (zoneTable.has(l.quartier)) expect([l.quartier, zoneTable.get(l.quartier)]).toEqual([l.quartier, l.zone])
  }
})
