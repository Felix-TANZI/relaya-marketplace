// Le relais et le livreur sur le même appareil (src/demo/pont-livreur.ts) : les gestes du livreur arrivent dans les lots
// et les collectes du relais ; ce que le relais publie part vers le livreur, anonyme.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

// Stockage de l'appareil (le pont passe par localStorage, même origine).
const memoire = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memoire.get(k) ?? null,
  setItem: (k: string, v: string) => void memoire.set(k, String(v)),
  removeItem: (k: string) => void memoire.delete(k),
})
const journal = () => JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; app: string; cle: string; [k: string]: unknown }[]
const duLivreur = (e: Record<string, unknown>, cle: string) => memoire.set('blv_pont', JSON.stringify([...journal(), { ...e, cle, app: 'livreur', le: REFERENCE + journal().length * 60_000 }]))
let n = 0
const o = (): Origine => ({ cle: `essai-${++n}`, heure: REFERENCE, position: null })

describe('pont relais ↔ livreur', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const p = await import('./pont-livreur')
  const lot = async (id: string) => (await s.reception.lot(id))!

  it('dépôt de bout en bout : code vérifié, résultats et lot validé partent vers le livreur ; sa confirmation passe la garde au relais', async () => {
    const LOT = 'PQ-Z1-261013-003'
    duLivreur({ type: 'depart', paquetId: LOT }, 'depart-003')
    expect((await lot(LOT)).suivi).toBe('en_route')
    duLivreur({ type: 'courier.approaching', lot: LOT, arretId: 'A3', arriveeEstimee: REFERENCE + 20 * 60_000 }, 'approche-003')
    expect(await lot(LOT)).toMatchObject({ suivi: 'en_approche', arriveeEstimee: REFERENCE + 20 * 60_000 })
    // Au comptoir : code de dépôt (QR ou 6 chiffres), un résultat par colis, photo du lot et PIN.
    expect(await s.reception.verifierCodeDepot('418306', o())).toMatchObject({ ok: true, lot: LOT })
    for (const c of ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1']) expect(await s.reception.resultat(LOT, c, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null }, o())).toEqual({ ok: true })
    expect(await s.reception.resultat(LOT, 'BLV-00014-1', { resultat: 'refus', scelle: 'casse', photos: ['p1', 'p2', 'p3'], note: null, motif: 'abime' }, o())).toEqual({ ok: true })
    expect((await s.reception.validerLot(LOT, 'photo-lot', '240913', o())).ok).toBe(true)
    const relais = journal().filter((e) => e.app === 'relais')
    expect(relais.map((e) => e.type)).toEqual(['relay.drop_code.verified', 'relay.drop.item_result', 'relay.drop.item_result', 'relay.drop.item_result', 'relay.drop.item_result', 'relay.drop.validated'])
    expect(relais[4]).toMatchObject({ colis: 'BLV-00014-1', resultat: 'refuse', motif: 'Abîmé', photos: 3 })
    expect(Object.keys(relais[5].emplacements as object).sort()).toEqual(['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'])
    expect((await lot(LOT)).confirmeParLivreurA).toBeNull() // la garde attend le livreur
    // Le livreur accepte le constat en miroir et confirme.
    duLivreur({ type: 'relay.drop.report_accepted', lot: LOT, arretId: 'A3', colis: 'BLV-00014-1' }, 'constat-14')
    expect(p.constatsAcceptes(LOT)).toEqual(['BLV-00014-1'])
    duLivreur({ type: 'relay.drop.completed', lot: LOT, arretId: 'A3', remis: ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'], refuses: ['BLV-00014-1'], mode: 'scan' }, 'depot-003')
    const l = await lot(LOT)
    expect(l.suivi).toBe('depose')
    expect(l.confirmeParLivreurA).not.toBeNull()
    expect(l.prevenus).not.toBeNull()
    expect(p.confirmationLivreur(LOT)).toMatchObject({ remis: ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1'], refuses: ['BLV-00014-1'] })
    const pourClient = journal().filter((e) => e.app === 'relais' && e.type.startsWith('parcel.'))
    expect(pourClient.filter((e) => e.type === 'parcel.pickup_code').map((e) => [e.colis, e.paye])).toEqual([
      ['BLV-00008-1', true],
      ['BLV-00009-1', true],
      ['BLV-00011-1', false], // payable au comptoir : le code attend le paiement (ARL-01)
    ])
  })

  it('une confirmation du livreur arrivée avant la validation attend le lot validé', async () => {
    const LOT = 'PQ-Z1-261013-011'
    duLivreur({ type: 'relay.drop.completed', lot: LOT, arretId: 'V6', remis: [], refuses: [], mode: 'registre' }, 'depot-011')
    expect((await lot(LOT)).confirmeParLivreurA).toBeNull()
  })

  it('collecte : colis confirmés, manquant et scellé photographié par le livreur ; relais trouvé fermé', async () => {
    duLivreur({ type: 'relay.departure.confirmed', collecte: 'A4', colis: ['BLV-00004-2'], par: 'livreur' }, 'dep-1')
    duLivreur({ type: 'relay.departure.missing', collecte: 'A4', colis: 'BLV-00003-1' }, 'dep-2')
    duLivreur({ type: 'relay.departure.seal_photo', collecte: 'A4', colis: 'BLV-00004-2' }, 'dep-3')
    duLivreur({ type: 'relay.closure.undeclared', lot: 'PQ-Z1-261013-011', arretId: 'V6', photo: true }, 'ferme-011')
    expect(p.departsVusParLeLivreur('A4')).toEqual({ confirmes: ['BLV-00004-2'], manquants: ['BLV-00003-1'], scelles: ['BLV-00004-2'] })
    expect(p.incidentsDuLivreur().map((i) => i.genre)).toContain('relais_ferme')
  })

  it('publications du relais : vers le livreur, une fois par geste, sans code ni identité', () => {
    p.pontCodeVerifie('PQ-Z1-261013-011', o())
    p.pontCodeVerifie('PQ-Z1-261013-011', o()) // rejoué : un seul événement
    p.pontResultatColis('PQ-Z1-261013-011', 'BLV-00022-1', 'refus', 'Scellé cassé', 2, o())
    p.pontLotValide('PQ-Z1-261013-011', { 'BLV-00021-1': 'A-06' }, o())
    p.pontColisPresente('A4', 'BLV-00003-1', o())
    p.pontSortieValidee('A4', ['BLV-00004-2'], o())
    p.pontOccupation(41, 60, false, o())
    const relais = journal().filter((e) => e.app === 'relais' && !e.type.startsWith('parcel.') && (e.lot === 'PQ-Z1-261013-011' || e.collecte === 'A4' || e.type === 'relay.stock.updated'))
    expect(relais.map((e) => e.type)).toEqual(['relay.drop_code.verified', 'relay.drop.item_result', 'relay.drop.validated', 'relay.departure.scanned', 'relay.departure.confirmed', 'relay.stock.updated'])
    expect(relais[1]).toMatchObject({ resultat: 'refuse', motif: 'Scellé cassé', photos: 2 })
    const texte = JSON.stringify(journal())
    for (const code of ['275104', '418306', '630917']) expect(texte).not.toContain(code)
  })
})
