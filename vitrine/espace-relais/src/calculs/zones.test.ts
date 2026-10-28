// Les douze zones (logique-metier/livraison/zones-yaounde.geo.json, carte du 23 oct. 2026, DP-70) : le relais du jeu
// d'essai est dans sa zone ; noms et quartiers lus sur la carte ; la table des quartiers de l'inscription suit la carte.
import { describe, expect, it } from 'vitest'
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import table from '../../../logique-metier/livraison/quartiers-zones.json' with { type: 'json' }
import { RELAIS } from '../demo/jeu-essai'
import { RELAIS_DEMO } from '../demo/pont'
import { PARAMETRES } from './registre'
import { ZONES_YAOUNDE, boite, zoneDuPoint } from './zones'

describe('zones de Yaoundé', () => {
  it('douze zones Z1–Z12, chacune avec ses quartiers, noms court et complet du fichier qui fait foi', () => {
    expect(ZONES_YAOUNDE.map((z) => z.code)).toEqual(Array.from({ length: 12 }, (_, i) => `Z${i + 1}`))
    for (const [i, f] of geo.features.entries()) {
      expect(ZONES_YAOUNDE[i].nom).toBe(f.properties.nom)
      expect(ZONES_YAOUNDE[i].nomComplet).toBe(f.properties.nomComplet)
      expect(ZONES_YAOUNDE[i].quartiers.length).toBeGreaterThan(0)
      expect(zoneDuPoint(...ZONES_YAOUNDE[i].etiquette)).toBe(ZONES_YAOUNDE[i].code)
    }
    expect(ZONES_YAOUNDE[0].nomComplet).toBe('Centre-ville / Mballa')
  })
  it('le relais Bastos Carrefour est dans sa zone déclarée (Z1 Centre-ville), comme le relais du pont', () => {
    expect(zoneDuPoint(RELAIS.position.lat, RELAIS.position.lng)).toBe(RELAIS.zoneCode)
    expect(zoneDuPoint(RELAIS_DEMO.position.lat, RELAIS_DEMO.position.lng)).toBe(RELAIS.zoneCode)
    // Le pont (src/demo/pont.ts) est identique dans les six applications : son libellé suivra quand les six seront à jour.
    expect(RELAIS_DEMO.zone.split(' ')[0]).toBe(RELAIS.zoneCode)
    const q = table.quartiers.find((x) => x.quartier === RELAIS.quartier)!
    expect(q.zone).toBe(RELAIS.zoneCode)
  })
  it('zones de lancement du registre : « code nom » de la carte', () => {
    for (const z of PARAMETRES.acces.zonesExploitees) {
      const [code, ...nom] = z.split(' ')
      expect(nom.join(' ')).toBe(ZONES_YAOUNDE.find((x) => x.code === code)!.nom)
    }
  })
  it('hors de Yaoundé : aucune zone', () => {
    expect(zoneDuPoint(4.05, 9.7)).toBeNull()
  })
  it('la boîte contient la zone, marge comprise', () => {
    const z = ZONES_YAOUNDE.find((x) => x.code === 'Z1')!
    const b = boite([z.polygone])
    for (const [lat, lng] of z.polygone) expect(lat >= b.lat0 && lat <= b.lat1 && lng >= b.lng0 && lng <= b.lng1).toBe(true)
  })
})
