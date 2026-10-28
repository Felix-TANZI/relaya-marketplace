// Les douze zones (logique-metier/livraison/zones-yaounde.geo.json, carte du 23 oct. 2026, DP-70) : la tournée de
// démonstration (Z1 Centre-ville) a tous ses arrêts dans le contour de sa zone ; noms lus sur la carte.
import { expect, it } from 'vitest'
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import table from '../../../logique-metier/livraison/quartiers-zones.json' with { type: 'json' }
import { LIEUX, ZONES } from '../demo/tournee'
import { NOMS_ZONES } from '../demo/emploi'
import { ZONES_YAOUNDE, zoneYaounde } from './zones'

const dedans = (p: { lat: number; lng: number }, c: { lat: number; lng: number }[]) => {
  let d = false
  for (let i = 0, j = c.length - 1; i < c.length; j = i++)
    if (c[j].lat > p.lat !== c[i].lat > p.lat && p.lng < c[j].lng + ((p.lat - c[j].lat) * (c[i].lng - c[j].lng)) / (c[i].lat - c[j].lat)) d = !d
  return d
}
const zoneDe = (p: { lat: number; lng: number }) => ZONES_YAOUNDE.filter((z) => dedans(p, z.contour)).map((z) => z.code)

it('douze zones Z1–Z12 : codes, noms court et complet du fichier qui fait foi ; étiquette dans sa zone et elle seule', () => {
  expect(ZONES_YAOUNDE.map((z) => z.code)).toEqual(Array.from({ length: 12 }, (_, i) => `Z${i + 1}`))
  for (const [i, f] of geo.features.entries()) {
    expect(ZONES_YAOUNDE[i].nom).toBe(f.properties.nom)
    expect(ZONES_YAOUNDE[i].nomComplet).toBe(f.properties.nomComplet)
    expect(zoneDe(ZONES_YAOUNDE[i].etiquette)).toEqual([ZONES_YAOUNDE[i].code])
  }
  expect(ZONES_YAOUNDE.map((z) => `${z.code} ${z.nom}`)).toEqual(['Z1 Centre-ville', 'Z2 Nsam', 'Z3 Mokolo', 'Z4 Ngousso', 'Z5 Nsimeyong', 'Z6 Biyem-Assi', 'Z7 Simbock', 'Z8 Nkolbisson', 'Z9 Essos', 'Z10 Mimboman', 'Z11 Odza', 'Z12 Emana'])
  expect(NOMS_ZONES).toEqual(Object.fromEntries(ZONES_YAOUNDE.map((z) => [z.code, z.nom])))
})

it('la tournée porte le contour réel de Z1 et ses arrêts y sont ; le quartier Bastos est en Z1 dans la table', () => {
  expect(ZONES).toEqual([{ nom: 'Z1 Centre-ville', contour: zoneYaounde('Z1')!.contour }])
  for (const [id, l] of Object.entries(LIEUX)) expect([id, zoneDe(l)]).toEqual([id, ['Z1']])
  expect(table.quartiers.find((q) => q.quartier === 'Bastos')!.zone).toBe('Z1')
  expect(table.quartiers.find((q) => q.quartier === 'Nlongkak')!.zone).toBe('Z1')
})
