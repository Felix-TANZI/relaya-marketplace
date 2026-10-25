// Concordance avec la carte des zones (logique-metier/livraison/zones-yaounde.geo.json, DP-70) : douze zones, noms et
// niveaux de BV-DEV-07, zones exploitées du registre ; chaque point de la carte du réseau (relais, boutiques, agences,
// paquets) tombe dans la zone qu'il annonce ; relais et boutiques sont dans la zone de leur quartier (table quartier →
// zone de BV-DEV-07), au niveau de prix de ce quartier.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { chercher } from '@client/calculs/zones'
import REF from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import type { SourceAdmin } from '../donnees/source'
import { ZONES } from '../demo/jeu-essai'
import { ZONES_GEO } from '../pages/ADM-09/CarteReseau'
import { PARAMETRES } from './registre'
import { ZONES_YAOUNDE, zoneDuPoint } from './zones'

const D = REF as unknown as { zones: { zone: string; nom: string }[]; livraison: { zones_peripherie: string[] } }
/** Quartier de chaque relais du jeu d'essai (Elobi : quartier hors de la table, près de Mokolo). */
const QUARTIER_RELAIS: Record<string, string> = { 'r-bastos': 'Bastos', 'r-nlongkak': 'Nlongkak', 'r-mokolo': 'Mokolo', 'r-elobi': 'Mokolo', 'r-melen': 'Melen', 'r-obili': 'Obili', 'r-biyem': 'Biyem-Assi', 'r-mvogada': 'Mvog-Ada' }

let s: SourceAdmin
const memoire = new Map<string, string>()
beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  vi.useFakeTimers({ now: new Date('2026-10-13T13:05:00.500Z'), toFake: ['Date'] })
  s = (await import('../demo/source-demo')).sourceDemo
  await s.session.changerRole('superviseur')
})

describe('carte des zones', () => {
  it('douze zones : codes, noms et périphérie de BV-DEV-07 ; noms de la console et de la carte du réseau', () => {
    expect(ZONES_YAOUNDE.map((z) => `${z.code} ${z.nomComplet}`)).toEqual(D.zones.map((z) => `${z.zone} ${z.nom}`))
    expect(ZONES_YAOUNDE.filter((z) => z.niveau === 'peripherie').map((z) => z.code)).toEqual(D.livraison.zones_peripherie)
    expect(ZONES.map((z) => `${z.code} ${z.nom}`)).toEqual(ZONES_YAOUNDE.map((z) => `${z.code} ${z.nom}`))
    expect(ZONES_GEO.map((z) => z.code)).toEqual(ZONES.map((z) => z.code))
    for (const z of ZONES_YAOUNDE) expect(zoneDuPoint(...z.etiquette)).toBe(z.code)
    expect(zoneDuPoint(4.05, 9.7)).toBeNull() // Douala : hors zone
  })

  it('zones exploitées du registre : codes et noms de la carte', () => {
    expect(PARAMETRES.zonesExploitees.map((z) => `${z.code} ${z.nom}`)).toEqual(['Z1 Centre-ville', 'Z2 Nsam', 'Z3 Mokolo', 'Z6 Biyem-Assi'])
    for (const z of PARAMETRES.zonesExploitees) expect(ZONES.find((x) => x.code === z.code)?.nom).toBe(z.nom)
  })

  it('relais : point dans sa zone, celle de son quartier', async () => {
    const relais = await s.logistique.relais()
    expect(relais.map((r) => r.id).sort()).toEqual(Object.keys(QUARTIER_RELAIS).sort())
    for (const r of relais) {
      expect([r.nom, zoneDuPoint(r.lat, r.lng)]).toEqual([r.nom, r.zone])
      expect([r.nom, chercher(QUARTIER_RELAIS[r.id])?.zone]).toEqual([r.nom, r.zone])
    }
  })

  it('boutiques : point et quartier dans la zone annoncée, niveau de prix du quartier', async () => {
    for (const v of await s.acteurs.vendeurs()) {
      const q = chercher(v.quartier)
      expect([v.nom, zoneDuPoint(...v.position), q?.zone]).toEqual([v.nom, v.zone, v.zone])
      expect([v.nom, q?.niveau]).toEqual([v.nom, D.livraison.zones_peripherie.includes(v.zone) ? 'peripherie' : 'centre'])
    }
  })

  it('carte du réseau : relais, boutiques, agences et paquets dans la zone qu’ils annoncent', async () => {
    const pts = (await s.logistique.carte()).filter((p) => ['relais', 'boutiques', 'entreprises', 'paquets'].includes(p.calque))
    expect(pts.length).toBeGreaterThan(15)
    for (const p of pts) expect([p.calque, p.nom, zoneDuPoint(p.lat, p.lng)]).toEqual([p.calque, p.nom, p.zone])
  })
})
